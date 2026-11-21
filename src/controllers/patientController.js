const patientModel = require('../models/patientModel');

function createHttpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function createPatient(req, res, next) {
  try {
    const name = String(req.body.name).trim();
    const email = String(req.body.email).trim().toLowerCase();
    const phone = String(req.body.phone).trim();

    const patient = await patientModel.create({ name, email, phone });
    return res.status(201).json(patient);
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return next(createHttpError(409, 'A patient with this email already exists'));
    }
    return next(err);
  }
}

async function listPatients(req, res, next) {
  try {
    const patients = await patientModel.findAll();
    return res.status(200).json(patients);
  } catch (err) {
    return next(err);
  }
}

async function getPatient(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return next(createHttpError(400, 'Patient id must be a positive integer'));
    }

    const patient = await patientModel.findById(id);
    if (!patient) {
      return next(createHttpError(404, `Patient with id ${id} not found`));
    }

    return res.status(200).json(patient);
  } catch (err) {
    return next(err);
  }
}

async function updatePatient(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return next(createHttpError(400, 'Patient id must be a positive integer'));
    }

    const existing = await patientModel.findById(id);
    if (!existing) {
      return next(createHttpError(404, `Patient with id ${id} not found`));
    }

    const fields = {};
    if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
      fields.name = String(req.body.name).trim();
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'email')) {
      fields.email = String(req.body.email).trim().toLowerCase();
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'phone')) {
      fields.phone = String(req.body.phone).trim();
    }

    const patient = await patientModel.update(id, fields);
    return res.status(200).json(patient);
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return next(createHttpError(409, 'A patient with this email already exists'));
    }
    return next(err);
  }
}

async function deletePatient(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return next(createHttpError(400, 'Patient id must be a positive integer'));
    }

    const deleted = await patientModel.remove(id);
    if (!deleted) {
      return next(createHttpError(404, `Patient with id ${id} not found`));
    }

    return res.status(204).send();
  } catch (err) {
    if (err && err.code === 'ER_ROW_IS_REFERENCED_2') {
      return next(
        createHttpError(409, 'Cannot delete patient with existing appointments')
      );
    }
    return next(err);
  }
}

module.exports = {
  createPatient,
  listPatients,
  getPatient,
  updatePatient,
  deletePatient,
};
