const winston = require('winston');
const path = require('path');

// FIX [S9]: Added maxsize and maxFiles to prevent unbounded log growth on disk.
// In production the error log rotates at 10 MB and keeps the last 5 files.
const fileTransports = process.env.NODE_ENV === 'production'
  ? [
      new winston.transports.File({
        filename: path.join('logs', 'error.log'),
        level: 'error',
        maxsize: 10 * 1024 * 1024, // 10 MB per file
        maxFiles: 5,
        tailable: true,            // most recent log always named 'error.log'
      }),
      new winston.transports.File({
        filename: path.join('logs', 'combined.log'),
        maxsize: 20 * 1024 * 1024, // 20 MB per file
        maxFiles: 5,
        tailable: true,
      }),
    ]
  : [];

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.printf(({ level, message, timestamp, stack }) =>
          `${timestamp} [${level.toUpperCase()}] ${stack || message}`
        )
  ),
  transports: [
    new winston.transports.Console(),
    ...fileTransports,
  ],
});

module.exports = logger;
