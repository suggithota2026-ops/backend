// MongoDB connection via Mongoose
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { MONGODB_URI, NODE_ENV } = require('./env');

const connectDB = async () => {
  try {
    if (!MONGODB_URI) {
      throw new Error('Missing MONGODB_URI in environment');
    }

    // Avoid re-connecting in hot-reload / tests
    if (mongoose.connection.readyState === 1) return;

    await mongoose.connect(MONGODB_URI, {
      autoIndex: NODE_ENV !== 'production',
      serverSelectionTimeoutMS: 10000,
    });

    logger.info(`MongoDB connected successfully in ${NODE_ENV} mode`);
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    throw error;
  }
};

module.exports = { mongoose, connectDB };
