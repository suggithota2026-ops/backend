// Fastify Mongo plugin
const fp = require('fastify-plugin');
const { connectDB } = require('../config/db');

async function mongodbPlugin(fastify, options) {
  try {
    await connectDB();
    fastify.decorate('mongoose', require('mongoose'));
  } catch (error) {
    fastify.log.error('MongoDB plugin error:', error);
    throw error;
  }
}

module.exports = fp(mongodbPlugin);
