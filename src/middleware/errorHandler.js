const logger = require('../utils/logger');

/**
 * Handle 404 for undefined routes
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
};

/**
 * Centralized error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = null;

  // Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value '${err.value}' for field '${err.path}'.`;
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => e.message);
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    statusCode = 409;
    message = `Duplicate value entered for ${Object.keys(err.keyValue).join(', ')}`;
  }

  // Malformed JSON Payload Error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Malformed JSON payload';
  }

  // Log server errors (5xx)
  if (statusCode >= 500) {
    logger.error(`[Unhandled Error] ${err.stack || err.message}`);
  } else {
    logger.warn(`[Client Error ${statusCode}] ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    error: err.name || 'Error',
    message,
    ...(details && { details }),
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

module.exports = {
  notFoundHandler,
  errorHandler,
};

