/**
 * Validate create/update doctor payload.
 * @param {object} body
 * @param {{ partial?: boolean }} [options]
 * @returns {string[]}
 */
function validateDoctorPayload(body, options = {}) {
  const { partial = false } = options;
  const errors = [];

  if (!body || typeof body !== 'object') {
    return ['Request body must be a JSON object'];
  }

  const hasName = Object.prototype.hasOwnProperty.call(body, 'name');
  const hasSpecialty = Object.prototype.hasOwnProperty.call(body, 'specialty');
  const hasFee = Object.prototype.hasOwnProperty.call(body, 'consultation_fee');
  const hasRoom = Object.prototype.hasOwnProperty.call(body, 'room');

  if (!partial || hasName) {
    if (body.name === undefined || body.name === null || String(body.name).trim() === '') {
      errors.push('name is required');
    } else if (String(body.name).trim().length > 100) {
      errors.push('name must be at most 100 characters');
    }
  }

  if (!partial || hasSpecialty) {
    if (
      body.specialty === undefined ||
      body.specialty === null ||
      String(body.specialty).trim() === ''
    ) {
      errors.push('specialty is required');
    } else if (String(body.specialty).trim().length > 100) {
      errors.push('specialty must be at most 100 characters');
    }
  }

  if (!partial || hasFee) {
    if (body.consultation_fee === undefined || body.consultation_fee === null || body.consultation_fee === '') {
      errors.push('consultation_fee is required');
    } else {
      const fee = Number(body.consultation_fee);
      if (!Number.isFinite(fee)) {
        errors.push('consultation_fee must be a number');
      } else if (fee < 0) {
        errors.push('consultation_fee must be greater than or equal to 0');
      }
    }
  }

  if (!partial || hasRoom) {
    if (body.room === undefined || body.room === null || String(body.room).trim() === '') {
      errors.push('room is required');
    } else if (String(body.room).trim().length > 20) {
      errors.push('room must be at most 20 characters');
    }
  }

  if (partial && !hasName && !hasSpecialty && !hasFee && !hasRoom) {
    errors.push('At least one of name, specialty, consultation_fee, or room must be provided');
  }

  return errors;
}

function validateCreateDoctor(req, res, next) {
  const errors = validateDoctorPayload(req.body, { partial: false });
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join('; ') });
  }
  next();
}

function validateUpdateDoctor(req, res, next) {
  const errors = validateDoctorPayload(req.body, { partial: true });
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join('; ') });
  }
  next();
}

module.exports = {
  validateDoctorPayload,
  validateCreateDoctor,
  validateUpdateDoctor,
};
