// CORS plugin
const fp = require('fastify-plugin');
const fastifyCors = require('@fastify/cors');

async function corsPlugin(fastify, options) {
  await fastify.register(fastifyCors, {
    origin: true, // Allow all origins in development, configure for production
    credentials: true,
  });
}

module.exports = fp(corsPlugin);
