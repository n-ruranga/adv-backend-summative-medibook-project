require('dotenv').config();

const { popConfirmation, enqueueConfirmation } = require('./services/confirmationQueue');
const {
  popPromotionJob,
  dequeueForSlot,
  requeueFront,
} = require('./services/waitlist');
const { appendAudit } = require('./services/auditLog');
const appointmentModel = require('./models/appointmentModel');
const { parseAppointmentDate } = require('./services/slotValidation');

let running = true;

process.on('SIGINT', () => {
  running = false;
});
process.on('SIGTERM', () => {
  running = false;
});

/**
 * Process confirmation SMS/email jobs by writing them to the audit log.
 */
async function processConfirmations() {
  const job = await popConfirmation(1);
  if (!job) {
    return false;
  }

  await appendAudit('confirmation', {
    appointmentId: job.appointmentId,
    patientId: job.patientId,
    doctorId: job.doctorId,
    apptDatetime: job.apptDatetime,
    message: job.message,
  });
  console.log(`Processed confirmation for appointment ${job.appointmentId}`);
  return true;
}

/**
 * When a cancellation frees a slot, promote the first waitlisted patient.
 * On booking failure, re-queue the patient so they are never lost from both
 * Redis and MySQL.
 */
async function processPromotions() {
  const job = await popPromotionJob(1);
  if (!job) {
    return false;
  }

  const entry = await dequeueForSlot(job.doctorId, job.apptDatetime);
  if (!entry) {
    console.log(`No waitlisted patient for doctor ${job.doctorId} at ${job.apptDatetime}`);
    return true;
  }

  const apptDatetime = parseAppointmentDate(entry.apptDatetime);
  if (!apptDatetime) {
    console.error('Invalid waitlist apptDatetime; re-queuing entry');
    await requeueFront(entry);
    return true;
  }

  try {
    const appointment = await appointmentModel.createBooking({
      patientId: entry.patientId,
      doctorId: entry.doctorId,
      apptDatetime,
    });

    await appendAudit('waitlist_promotion', {
      appointmentId: appointment.id,
      patientId: appointment.patient_id,
      doctorId: appointment.doctor_id,
      apptDatetime: appointment.appt_datetime,
      source: entry.scope,
    });

    try {
      await enqueueConfirmation(appointment);
    } catch (queueErr) {
      console.error('Failed to enqueue confirmation after promotion:', queueErr.message);
    }

    console.log(
      `Promoted waitlisted patient ${entry.patientId} onto appointment ${appointment.id}`
    );
  } catch (err) {
    console.error(
      `Promotion booking failed for patient ${entry.patientId}: ${err.message}. Re-queuing.`
    );
    await requeueFront(entry);
    await appendAudit('waitlist_promotion_failed', {
      patientId: entry.patientId,
      doctorId: entry.doctorId,
      apptDatetime: entry.apptDatetime,
      error: err.message,
      requeued: true,
    });
  }

  return true;
}

async function loop() {
  console.log('MediBook worker started (confirmations + waitlist promotions)');
  while (running) {
    try {
      const didConfirmation = await processConfirmations();
      const didPromotion = await processPromotions();
      if (!didConfirmation && !didPromotion) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    } catch (err) {
      console.error('Worker loop error:', err.message);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  console.log('MediBook worker stopped');
  process.exit(0);
}

loop();
