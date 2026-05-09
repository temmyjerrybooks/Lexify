const logger = require('../utils/logger');

// Fields that must never appear in logs (PII / credentials)
const SENSITIVE_FIELDS = new Set(['password', 'new_password', 'token', 'refresh_token', 'access_token', 'card_number', 'cvv']);

// FIX [S3]: Strip sensitive fields before logging req.body so passwords and
// tokens are never written to log files or shipped to a log aggregator.
const sanitizeBody = (body) => {
  if (!body || typeof body !== 'object') return body;
  const safe = { ...body };
  for (const field of SENSITIVE_FIELDS) {
    if (field in safe) safe[field] = '[REDACTED]';
  }
  return safe;
};

// Centralized error handler — catches all errors passed via next(err)
const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || err.status || 500;

  if (statusCode >= 500) {
    logger.error(`[${req.method}] ${req.path} — ${err.message}`, {
      stack: err.stack,
      body: sanitizeBody(req.body),
      userId: req.userId,
    });
  } else {
    logger.warn(`[${req.method}] ${req.path} — ${statusCode} ${err.message}`);
  }

  res.status(statusCode).json({
    error: err.message || 'An unexpected error occurred.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// Factory for creating typed app errors
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

module.exports = errorHandler;
module.exports.AppError = AppError;
