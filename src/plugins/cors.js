// CORS plugin – allow frontend origins (Vercel + local)
const fp = require('fastify-plugin');
const fastifyCors = require('@fastify/cors');

const DEFAULT_ALLOWED_ORIGINS = [
  'https://prk-smile-frontend.vercel.app',
  'https://www.prk-smile-frontend.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
];

function getAllowedOrigins() {
  const env = process.env.CORS_ORIGINS || process.env.ALLOWED_ORIGINS;
  if (env) {
    return env.split(',').map((o) => o.trim()).filter(Boolean);
  }
  return DEFAULT_ALLOWED_ORIGINS;
}

async function corsPlugin(fastify, options) {
  const allowedOrigins = getAllowedOrigins();
  const isProduction = process.env.NODE_ENV === 'production';

  await fastify.register(fastifyCors, {
    origin: (origin, cb) => {
      // No origin (e.g. Postman, server-to-server) – allow
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      // In development, allow any origin; in production only allowed list
      if (!isProduction) return cb(null, true);
      cb(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  });
}

module.exports = fp(corsPlugin);
