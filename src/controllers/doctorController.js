const doctorModel = require('../models/doctorModel');

function createHttpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function createDoctor(req, res, next) {
  try {
    const name = String(req.body.name).trim();
    const specialty = String(req.body.specialty).trim();
    const consultation_fee = Number(req.body.consultation_fee);
    const room = String(req.body.room).trim();

    const doctor = await doctorModel.create({
      name,
      specialty,
      consultation_fee,
      room,
    });
    return res.status(201).json(doctor);
  } catch (err) {
    return next(err);
  }
}

async function listDoctors(req, res, next) {
  try {
    const doctors = await doctorModel.findAll();
    return res.status(200).json(doctors);
  } catch (err) {
    return next(err);
  }
}

async function getDoctor(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return next(createHttpError(400, 'Doctor id must be a positive integer'));
    }

    const doctor = await doctorModel.findById(id);
    if (!doctor) {
      return next(createHttpError(404, `Doctor with id ${id} not found`));
    }

    return res.status(200).json(doctor);
  } catch (err) {
    return next(err);
  }
}

async function updateDoctor(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return next(createHttpError(400, 'Doctor id must be a positive integer'));
    }

    const existing = await doctorModel.findById(id);
    if (!existing) {
      return next(createHttpError(404, `Doctor with id ${id} not found`));
    }

    const fields = {};
    if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
      fields.name = String(req.body.name).trim();
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'specialty')) {
      fields.specialty = String(req.body.specialty).trim();
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'consultation_fee')) {
      fields.consultation_fee = Number(req.body.consultation_fee);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'room')) {
      fields.room = String(req.body.room).trim();
    }

    const doctor = await doctorModel.update(id, fields);
    return res.status(200).json(doctor);
  } catch (err) {
    return next(err);
  }
}

async function deleteDoctor(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return next(createHttpError(400, 'Doctor id must be a positive integer'));
    }

    const deleted = await doctorModel.remove(id);
    if (!deleted) {
      return next(createHttpError(404, `Doctor with id ${id} not found`));
    }

    return res.status(204).send();
  } catch (err) {
    if (err && err.code === 'ER_ROW_IS_REFERENCED_2') {
      return next(
        createHttpError(409, 'Cannot delete doctor with existing appointments')
      );
    }
    return next(err);
  }
}

module.exports = {
  createDoctor,
  listDoctors,
  getDoctor,
  updateDoctor,
  deleteDoctor,
};
