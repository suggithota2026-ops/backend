// Fastify app initialization
const fastify = require('fastify')({ logger: true });
const registerRoutes = require('./routes');
const authPlugin = require('./plugins/auth');
const corsPlugin = require('./plugins/cors');
const multipartPlugin = require('./plugins/multipart');
const swaggerPlugin = require('./plugins/swagger');
const rateLimit = require('./middlewares/rateLimit.middleware');
const logger = require('./utils/logger');

const buildApp = async () => {
  try {
    // Register plugins
    await fastify.register(corsPlugin);
    await fastify.register(authPlugin);
    await fastify.register(multipartPlugin);
    await fastify.register(swaggerPlugin);

    // Serve static files
    const path = require('path');
    
    // Determine the uploads directory path based on environment
    const uploadsPath = process.env.NODE_ENV === 'production' 
      ? path.join(__dirname, '../uploads')
      : path.join(__dirname, '../uploads');
    
    await fastify.register(require('@fastify/static'), {
      root: uploadsPath,
      prefix: '/uploads/',
      // Enable caching in production
      cacheControl: process.env.NODE_ENV === 'production',
      maxAge: process.env.NODE_ENV === 'production' ? '1d' : '5m',
    });

    // Global rate limiting
    fastify.addHook('onRequest', rateLimit);

    // Register routes
    await registerRoutes(fastify);

    // Error handler
    fastify.setErrorHandler((error, request, reply) => {
      logger.error('Error:', error);
      reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Internal server error',
      });
    });

    // 404 handler
    fastify.setNotFoundHandler((request, reply) => {
      reply.status(404).send({
        success: false,
        message: 'Route not found',
      });
    });

    return fastify;
  } catch (error) {
    logger.error('Error building app:', error);
    throw error;
  }
};

module.exports = buildApp;
