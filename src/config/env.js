// Environment variables loader
require('dotenv').config();

const NODE_ENV = process.env.NODE_ENV || 'development';

module.exports = {
  NODE_ENV,
  PORT: process.env.PORT || 3001,

  // PostgreSQL
  DATABASE_URL: process.env.DATABASE_URL || null,
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
  DB_NAME: process.env.DB_NAME || 'prk_smiles',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_DIALECT: process.env.DB_DIALECT || 'postgres',

  // Auth
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // Firebase
  FIREBASE_SERVICE_ACCOUNT: process.env.FIREBASE_SERVICE_ACCOUNT || '',
  FIREBASE_DATABASE_URL: process.env.FIREBASE_DATABASE_URL || '',

  // OTP
  OTP_EXPIRY_MINUTES: parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10),
  OTP_LENGTH: parseInt(process.env.OTP_LENGTH || '6', 10),

  // Uploads
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB

  // Rate limiting
  // In development, use higher limits; in production, use stricter limits
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || (NODE_ENV === 'development' ? '1' : '15'), 10), // minutes
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || (NODE_ENV === 'development' ? '1000' : '100'), 10), // requests
};
