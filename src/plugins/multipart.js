// Multipart plugin for file uploads
const fp = require('fastify-plugin');
const fastifyMultipart = require('@fastify/multipart');
const { MAX_FILE_SIZE } = require('../config/env');

async function multipartPlugin(fastify, options) {
  await fastify.register(fastifyMultipart, {
    limits: {
      fileSize: MAX_FILE_SIZE,
    },
  });
}

module.exports = fp(multipartPlugin);
