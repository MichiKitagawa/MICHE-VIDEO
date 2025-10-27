/**
 * Winston Logger Configuration
 *
 * Provides structured logging with multiple transports:
 * - Console: Development logging with colors
 * - File: Production logging with rotation
 * - Error: Separate error log file
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const LOG_DIR = process.env.LOG_DIR || 'logs';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Custom log format with timestamp and JSON structure
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

/**
 * Console format with colors (for development)
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

/**
 * Daily rotating file transport for general logs
 */
const fileTransport = new DailyRotateFile({
  filename: path.join(LOG_DIR, 'application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d', // Keep logs for 14 days
  format: logFormat,
});

/**
 * Daily rotating file transport for error logs
 */
const errorFileTransport = new DailyRotateFile({
  level: 'error',
  filename: path.join(LOG_DIR, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d', // Keep error logs for 30 days
  format: logFormat,
});

/**
 * Console transport (for all environments)
 */
const consoleTransport = new winston.transports.Console({
  format: NODE_ENV === 'production' ? logFormat : consoleFormat,
});

/**
 * Winston logger instance
 */
export const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: logFormat,
  defaultMeta: {
    service: 'video-platform-api',
    environment: NODE_ENV,
  },
  transports: [
    consoleTransport,
    ...(NODE_ENV === 'production' ? [fileTransport, errorFileTransport] : []),
  ],
  exitOnError: false,
});

/**
 * Stream for Morgan HTTP request logging
 */
export const httpLogStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

/**
 * Log levels:
 * - error: Error events that might still allow the application to continue running
 * - warn: Warning messages for potentially harmful situations
 * - info: Informational messages that highlight the progress of the application
 * - http: HTTP request logging
 * - verbose: Verbose informational messages
 * - debug: Debug-level messages for troubleshooting
 * - silly: Very detailed debug information
 */

// Create logs directory if it doesn't exist
import fs from 'fs';
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export default logger;
