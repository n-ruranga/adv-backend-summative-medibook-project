const redis = require('../config/redis');

const CONFIRMATION_QUEUE_KEY = 'queue:confirmations';

/**
 * Enqueue a confirmation notification job for a booked appointment.
 * @param {object} appointment
 */
async function enqueueConfirmation(appointment) {
  const job = {
    type: 'confirmation',
    appointmentId: appointment.id,
    patientId: appointment.patient_id,
    doctorId: appointment.doctor_id,
    apptDatetime: appointment.appt_datetime,
    amountPaid: appointment.amount_paid,
    enqueuedAt: new Date().toISOString(),
    message: `Confirmation: appointment ${appointment.id} booked for patient ${appointment.patient_id} with doctor ${appointment.doctor_id} at ${appointment.appt_datetime}.`,
  };

  await redis.rpush(CONFIRMATION_QUEUE_KEY, JSON.stringify(job));
  return job;
}

/**
 * Blocking pop of the next confirmation job.
 * @param {number} timeoutSeconds
 * @returns {Promise<object|null>}
 */
async function popConfirmation(timeoutSeconds = 5) {
  const result = await redis.blpop(CONFIRMATION_QUEUE_KEY, timeoutSeconds);
  if (!result) {
    return null;
  }
  return JSON.parse(result[1]);
}

module.exports = {
  CONFIRMATION_QUEUE_KEY,
  enqueueConfirmation,
  popConfirmation,
};
