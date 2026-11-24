const appointmentModel = require('../models/appointmentModel');
const { validateAppointmentSlot } = require('../services/slotValidation');
const { appendAudit } = require('../services/auditLog');
const { enqueueConfirmation } = require('../services/confirmationQueue');
const { enqueuePromotionJob } = require('../services/waitlist');

function createHttpError(status, message, details) {
  const err = new Error(message);
  err.status = status;
  if (details && typeof details === 'object') {
    err.details = details;
  }
  return err;
}

/**
 * POST /api/appointments — book an appointment.
 * Body: { patient_id, doctor_id, appt_datetime }
 */
async function bookAppointment(req, res, next) {
  try {
    const { patient_id: patientIdRaw, doctor_id: doctorIdRaw, appt_datetime: apptDatetimeRaw } =
      req.body || {};

    const patientId = Number(patientIdRaw);
    const doctorId = Number(doctorIdRaw);

    if (!Number.isInteger(patientId) || patientId <= 0) {
      return next(createHttpError(400, 'patient_id must be a positive integer'));
    }
    if (!Number.isInteger(doctorId) || doctorId <= 0) {
      return next(createHttpError(400, 'doctor_id must be a positive integer'));
    }
    if (apptDatetimeRaw === undefined || apptDatetimeRaw === null || apptDatetimeRaw === '') {
      return next(createHttpError(400, 'appt_datetime is required'));
    }

    const slot = validateAppointmentSlot(apptDatetimeRaw);
    if (!slot.valid) {
      return next(createHttpError(400, slot.error));
    }

    const appointment = await appointmentModel.createBooking({
      patientId,
      doctorId,
      apptDatetime: slot.date,
    });

    await appendAudit('booking', {
      appointmentId: appointment.id,
      patientId: appointment.patient_id,
      doctorId: appointment.doctor_id,
      apptDatetime: appointment.appt_datetime,
      amountPaid: appointment.amount_paid,
    });

    try {
      await enqueueConfirmation(appointment);
    } catch (queueErr) {
      console.error('Failed to enqueue confirmation job:', queueErr.message);
    }

    return res.status(201).json(appointment);
  } catch (err) {
    if (err.code === 'PATIENT_NOT_FOUND' || err.code === 'DOCTOR_NOT_FOUND') {
      return next(createHttpError(404, err.message));
    }
    if (err.code === 'SLOT_TAKEN') {
      return next(
        createHttpError(409, err.message, {
          waitlistOffer: true,
          suggestedScope: 'slot',
          joinPath: 'POST /api/waitlist',
          message:
            'That slot is taken. Join the waitlist with scope "slot" via POST /api/waitlist.',
          request: {
            patient_id: Number(req.body && req.body.patient_id),
            doctor_id: Number(req.body && req.body.doctor_id),
            appt_datetime: req.body && req.body.appt_datetime,
            scope: 'slot',
          },
        })
      );
    }
    if (err.code === 'DAY_FULL') {
      return next(
        createHttpError(409, err.message, {
          waitlistOffer: true,
          suggestedScope: 'day',
          joinPath: 'POST /api/waitlist',
          message:
            'This doctor is fully booked for that day. Join the waitlist with scope "day" via POST /api/waitlist.',
          request: {
            patient_id: Number(req.body && req.body.patient_id),
            doctor_id: Number(req.body && req.body.doctor_id),
            appt_datetime: req.body && req.body.appt_datetime,
            scope: 'day',
          },
        })
      );
    }
    return next(err);
  }
}

/**
 * POST /api/appointments/:id/cancel — cancel and compute refund server-side.
 * Any client-supplied refund amount is ignored.
 */
async function cancelAppointment(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return next(createHttpError(400, 'Appointment id must be a positive integer'));
    }

    const { appointment, refund } = await appointmentModel.cancelAppointment(id);

    await appendAudit('cancellation', {
      appointmentId: appointment.id,
      patientId: appointment.patient_id,
      doctorId: appointment.doctor_id,
      apptDatetime: appointment.appt_datetime,
      amountPaid: appointment.amount_paid,
      refundAmount: refund.refundAmount,
      refundRate: refund.refundRate,
      refundTier: refund.tier,
    });

    try {
      await enqueuePromotionJob({
        doctorId: appointment.doctor_id,
        apptDatetime: appointment.appt_datetime,
      });
    } catch (queueErr) {
      console.error('Failed to enqueue waitlist promotion job:', queueErr.message);
    }

    return res.status(200).json({
      appointment,
      refundAmount: refund.refundAmount,
      refundRate: refund.refundRate,
      refundTier: refund.tier,
      noticeHours: refund.noticeHours,
      waitlistNotified: true,
    });
  } catch (err) {
    if (err.code === 'APPOINTMENT_NOT_FOUND') {
      return next(createHttpError(404, err.message));
    }
    if (err.code === 'ALREADY_CANCELLED') {
      return next(createHttpError(409, err.message));
    }
    return next(err);
  }
}

module.exports = {
  bookAppointment,
  cancelAppointment,
};
