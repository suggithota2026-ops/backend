// Swagger documentation plugin
const fastifySwagger = require('@fastify/swagger');
const fastifySwaggerUI = require('@fastify/swagger-ui');

async function swaggerPlugin(fastify) {
  await fastify.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'PRK Smiles API',
        description: 'B2B Food Ordering System API Documentation',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server',
        },
      ],
      tags: [
        { name: 'auth', description: 'Authentication endpoints' },
        { name: 'admin', description: 'Admin endpoints' },
        { name: 'user', description: 'User/Hotel endpoints' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  await fastify.register(fastifySwaggerUI, {
    routePrefix: '/api-docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });
}

// Do not wrap with fastify-plugin: swagger-ui needs its own encapsulation context
module.exports = swaggerPlugin;
