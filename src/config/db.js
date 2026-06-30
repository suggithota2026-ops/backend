// MongoDB connection via Mongoose
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { MONGODB_URI, NODE_ENV } = require('./env');

const connectDB = async () => {
  if (!MONGODB_URI) {
    throw new Error('Missing MONGODB_URI in environment');
  }

  if (mongoose.connection.readyState === 1) return;

  const maxAttempts = 5;
  const retryDelayMs = 3000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await mongoose.connect(MONGODB_URI, {
        autoIndex: NODE_ENV !== 'production',
        serverSelectionTimeoutMS: 30000,
      });
      logger.info(`MongoDB connected successfully in ${NODE_ENV} mode`);
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        logger.error('MongoDB connection failed:', error);
        throw error;
      }
      logger.warn(
        `MongoDB connection attempt ${attempt}/${maxAttempts} failed, retrying in ${retryDelayMs / 1000}s...`
      );
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
};

module.exports = { mongoose, connectDB };
