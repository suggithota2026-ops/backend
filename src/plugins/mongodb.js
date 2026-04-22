// Fastify Mongo plugin
const fp = require('fastify-plugin');
const { connectDB } = require('../config/db');
const mongoose = require('mongoose');

async function mongodbPlugin(fastify, options) {
  try {
    await connectDB();
    fastify.decorate('mongoose', mongoose);
  } catch (error) {
    fastify.log.error('MongoDB plugin error:', error);
    throw error;
  }
}

module.exports = fp(mongodbPlugin);
