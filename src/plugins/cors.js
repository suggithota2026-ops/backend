// CORS plugin – allow frontend origins (Vercel + local)
const fp = require('fastify-plugin');
const fastifyCors = require('@fastify/cors');

const DEFAULT_ALLOWED_ORIGINS = [
  'https://frontend-puce-three-76.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
];

function getAllowedOrigins() {
  // Explicit list from env (comma-separated) – use as-is
  const envList = process.env.CORS_ORIGINS || process.env.ALLOWED_ORIGINS;
  let origins = envList
    ? envList.split(',').map((o) => o.trim()).filter(Boolean)
    : [...DEFAULT_ALLOWED_ORIGINS];

  // Add FRONTEND_URL from env so you can set it in Render/Vercel without replacing the whole list
  const frontendUrl = process.env.FRONTEND_URL && process.env.FRONTEND_URL.trim();
  if (frontendUrl && !origins.includes(frontendUrl)) {
    origins = [frontendUrl, ...origins];
  }

  return origins;
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
