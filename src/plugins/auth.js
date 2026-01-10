// JWT authentication plugin
const fp = require('fastify-plugin');
const fastifyJwt = require('@fastify/jwt');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');

async function authPlugin(fastify, options) {
  await fastify.register(fastifyJwt, {
    secret: JWT_SECRET,
    sign: {
      expiresIn: JWT_EXPIRES_IN,
    },
  });

  fastify.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });
}

module.exports = fp(authPlugin);
