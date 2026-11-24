/**
 * Central Express error-handling middleware.
 * Must be registered after all routes.
 *
 * Controllers should set err.status (or err.statusCode) and err.message.
 * Optional err.details may hold structured extras (e.g. waitlist offer fields).
 */
function errorHandler(err, req, res, next) {
  // Malformed JSON body from express.json()
  if (err instanceof SyntaxError && Object.prototype.hasOwnProperty.call(err, 'body')) {
    return res.status(400).json({ error: 'Request body must be valid JSON' });
  }

  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Common MySQL driver codes if a model error leaks through
  if (err.code === 'ER_DUP_ENTRY') {
    status = 409;
    message = message || 'Duplicate entry conflicts with an existing record';
  } else if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
    status = 400;
    message = message || 'Referenced patient or doctor does not exist';
  } else if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
    status = 409;
    message = message || 'Record is referenced by existing appointments';
  } else if (err.code === 'ECONNREFUSED') {
    status = 503;
    message = 'Database or Redis service is unavailable';
  }

  if (status >= 500) {
    console.error(err);
  }

  const body = { error: message };
  if (err.details && typeof err.details === 'object') {
    Object.assign(body, err.details);
  }

  res.status(status).json(body);
}

/**
 * Catch-all for unknown API/HTML routes.
 */
function notFoundHandler(req, res, next) {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.status = 404;
  next(err);
}

module.exports = errorHandler;
module.exports.notFoundHandler = notFoundHandler;
