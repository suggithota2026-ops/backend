// ===============================
// Required Modules
// ===============================
const fastify = require('fastify')({
  logger: true,
  bodyLimit: 10 * 1024 * 1024 // 10MB for base64 uploads
});

const path = require('path');

// Routes & Plugins
const registerRoutes = require('./routes');
const authPlugin = require('./plugins/auth');
const corsPlugin = require('./plugins/cors');
const multipartPlugin = require('./plugins/multipart');
const swaggerPlugin = require('./plugins/swagger');
const rateLimit = require('./middlewares/rateLimit.middleware');

// Config & Utils
const { PORT, NODE_ENV } = require('./config/env');
const { initializeFirebase } = require('./config/firebase');
const { connectDB } = require('./config/db');
const { runSchemaMigration } = require('./utils/schema-migration');
const logger = require('./utils/logger');


// ===============================
// Build & Start Server
// ===============================
const start = async () => {
  try {
    // -------------------------------
    // Initialize External Services
    // -------------------------------
    initializeFirebase();
    await connectDB();
    await runSchemaMigration();

    // -------------------------------
    // Register Plugins
    // -------------------------------
    await fastify.register(corsPlugin);
    await fastify.register(authPlugin);
    await fastify.register(multipartPlugin);
    await fastify.register(swaggerPlugin);

    // -------------------------------
    // Static File Serving
    // -------------------------------
    const uploadsPath = path.join(__dirname, '../uploads');

    await fastify.register(require('@fastify/static'), {
      root: uploadsPath,
      prefix: '/uploads/',
      cacheControl: NODE_ENV === 'production',
      maxAge: NODE_ENV === 'production' ? '1d' : '5m',
    });

    // -------------------------------
    // Global Rate Limiting
    // -------------------------------
    fastify.addHook('onRequest', rateLimit);

    // -------------------------------
    // Register Routes
    // -------------------------------
    await registerRoutes(fastify);

    // -------------------------------
    // Error Handler
    // -------------------------------
    fastify.setErrorHandler((error, request, reply) => {
      logger.error('Error:', error);
      reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Internal server error',
      });
    });

    // -------------------------------
    // 404 Handler
    // -------------------------------
    fastify.setNotFoundHandler((request, reply) => {
      reply.status(404).send({
        success: false,
        message: 'Route not found',
      });
    });

    // -------------------------------
    // Start Server
    // -------------------------------
    await fastify.listen({ port: PORT, host: '0.0.0.0' });

    logger.info(`Server running on port ${PORT} in ${NODE_ENV} mode`);
    logger.info(`API Docs available at http://localhost:${PORT}/api-docs`);

  } catch (error) {
    logger.error('Error starting server:', error);
    process.exit(1);
  }
};


// ===============================
// Graceful Shutdown
// ===============================
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// ===============================
// Run Server
// ===============================
start();