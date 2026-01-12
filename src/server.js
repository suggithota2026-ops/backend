// Server start (listen)
const buildApp = require('./app');
const { PORT, NODE_ENV } = require('./config/env');
const { initializeFirebase } = require('./config/firebase');
const { connectDB } = require('./config/db');
const logger = require('./utils/logger');

const start = async () => {
  try {
    // Initialize Firebase
    initializeFirebase();

    // Connect to PostgreSQL and auto-sync models
    await connectDB();

    // Run schema migration (for Render free tier without shell access)
    const { runSchemaMigration } = require('./utils/schema-migration');
    await runSchemaMigration();

    // Build Fastify app
    const app = await buildApp();

    // Start server
    await app.listen({ port: PORT, host: '0.0.0.0' });

    logger.info(`Server running on port ${PORT} in ${NODE_ENV} mode`);
    logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
  } catch (error) {
    logger.error('Error starting server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

start();
