// src/middleware/errorHandler.js
import { createLogger } from '../lib/logger.js';

const logger = createLogger('error');

export const errorHandler = (err, req, res, next) => {
  logger.error(`${req.method} ${req.path} — ${err.message}`);

  if (process.env.NODE_ENV === 'development') {
    logger.error(err.stack);
  }

  const statusCode = err.statusCode || err.status || 500;

  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
