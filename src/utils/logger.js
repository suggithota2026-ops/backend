// Winston logger configuration
const winston = require('winston');
const path = require('path');
const { NODE_ENV } = require('../config/env');

const logDir = path.join(__dirname, '../../logs');

const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  })
];

// Add file transports if NOT on a cloud platform (optional)
if (process.env.WRITE_LOGS_TO_FILE === 'true') {
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log')
    })
  );
}

const logger = winston.createLogger({
  level: NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'prk-smiles-api' },
  transports
});

module.exports = logger;
