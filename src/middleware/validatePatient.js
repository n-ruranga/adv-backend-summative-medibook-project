const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate create/update patient payload.
 * @param {object} body
 * @param {{ partial?: boolean }} [options] - partial=true allows missing fields on update
 * @returns {string[]} list of validation error messages (empty if valid)
 */
function validatePatientPayload(body, options = {}) {
  const { partial = false } = options;
  const errors = [];

  if (!body || typeof body !== 'object') {
    return ['Request body must be a JSON object'];
  }

  const hasName = Object.prototype.hasOwnProperty.call(body, 'name');
  const hasEmail = Object.prototype.hasOwnProperty.call(body, 'email');
  const hasPhone = Object.prototype.hasOwnProperty.call(body, 'phone');

  if (!partial || hasName) {
    if (body.name === undefined || body.name === null || String(body.name).trim() === '') {
      errors.push('name is required');
    } else if (String(body.name).trim().length > 100) {
      errors.push('name must be at most 100 characters');
    }
  }

  if (!partial || hasEmail) {
    if (body.email === undefined || body.email === null || String(body.email).trim() === '') {
      errors.push('email is required');
    } else if (!EMAIL_REGEX.test(String(body.email).trim())) {
      errors.push('email must be a valid email address');
    } else if (String(body.email).trim().length > 150) {
      errors.push('email must be at most 150 characters');
    }
  }

  if (!partial || hasPhone) {
    if (body.phone === undefined || body.phone === null || String(body.phone).trim() === '') {
      errors.push('phone is required');
    } else if (String(body.phone).trim().length > 30) {
      errors.push('phone must be at most 30 characters');
    }
  }

  if (partial && !hasName && !hasEmail && !hasPhone) {
    errors.push('At least one of name, email, or phone must be provided');
  }

  return errors;
}

/**
 * Express middleware for POST /patients (full create payload).
 */
function validateCreatePatient(req, res, next) {
  const errors = validatePatientPayload(req.body, { partial: false });
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join('; ') });
  }
  next();
}

/**
 * Express middleware for PUT/PATCH /patients/:id (partial update allowed).
 */
function validateUpdatePatient(req, res, next) {
  const errors = validatePatientPayload(req.body, { partial: true });
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join('; ') });
  }
  next();
}

module.exports = {
  validatePatientPayload,
  validateCreatePatient,
  validateUpdatePatient,
};
