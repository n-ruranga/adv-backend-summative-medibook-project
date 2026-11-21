const appointmentModel = require('../models/appointmentModel');
const { validateAppointmentSlot } = require('../services/slotValidation');

function createHttpError(status, message, extra = {}) {
  const err = new Error(message);
  err.status = status;
  err.extra = extra;
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

    return res.status(201).json(appointment);
  } catch (err) {
    if (err.code === 'PATIENT_NOT_FOUND' || err.code === 'DOCTOR_NOT_FOUND') {
      return next(createHttpError(404, err.message));
    }
    if (err.code === 'SLOT_TAKEN') {
      return next(createHttpError(409, err.message));
    }
    if (err.code === 'DAY_FULL') {
      // Waitlist join endpoint comes in a later commit; offer is stubbed here.
      return res.status(409).json({
        error: err.message,
        waitlistOffer: true,
        message:
          'This doctor is fully booked for that day. You may join the waitlist (coming soon).',
      });
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

    return res.status(200).json({
      appointment,
      refundAmount: refund.refundAmount,
      refundRate: refund.refundRate,
      refundTier: refund.tier,
      noticeHours: refund.noticeHours,
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
