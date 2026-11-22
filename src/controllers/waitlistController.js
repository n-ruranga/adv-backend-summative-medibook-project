const patientModel = require('../models/patientModel');
const doctorModel = require('../models/doctorModel');
const { validateAppointmentSlot } = require('../services/slotValidation');
const { enqueueWaitlist } = require('../services/waitlist');

function createHttpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * POST /api/waitlist
 * Body: { patient_id, doctor_id, appt_datetime, scope?: 'day'|'slot' }
 */
async function joinWaitlist(req, res, next) {
  try {
    const {
      patient_id: patientIdRaw,
      doctor_id: doctorIdRaw,
      appt_datetime: apptDatetimeRaw,
      scope: scopeRaw,
    } = req.body || {};

    const patientId = Number(patientIdRaw);
    const doctorId = Number(doctorIdRaw);
    const scope = scopeRaw === 'slot' ? 'slot' : 'day';

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

    const patient = await patientModel.findById(patientId);
    if (!patient) {
      return next(createHttpError(404, `Patient with id ${patientId} not found`));
    }

    const doctor = await doctorModel.findById(doctorId);
    if (!doctor) {
      return next(createHttpError(404, `Doctor with id ${doctorId} not found`));
    }

    const result = await enqueueWaitlist({
      patientId,
      doctorId,
      apptDatetime: slot.date,
      scope,
    });

    return res.status(201).json({
      message: 'Joined waitlist',
      ...result,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  joinWaitlist,
};
