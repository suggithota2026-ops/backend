// PostgreSQL connection via Sequelize
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');
const {
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  DB_DIALECT,
  NODE_ENV,
} = require('./env');

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: DB_DIALECT,
  logging: NODE_ENV === 'development' ? console.log : false,
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info(`PostgreSQL connected successfully in ${NODE_ENV} mode`);

    // Load associations
    const defineAssociations = require('../models/associations');
    defineAssociations();

    // Auto-create tables from models
    await sequelize.sync();
    logger.info('Database synchronized (tables ensured)');
  } catch (error) {
    logger.error('PostgreSQL connection failed:', error);
    throw error;
  }
};

module.exports = { sequelize, connectDB };
