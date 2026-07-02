// CORS plugin – allow frontend origins (Vercel + local)
const fp = require('fastify-plugin');
const fastifyCors = require('@fastify/cors');

const DEFAULT_ALLOWED_ORIGINS = [
  'https://suggithota.com',
  'https://www.suggithota.com',
  'https://frontend-puce-three-76.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
  'http://localhost:52402',
];

function expandOriginVariants(origin) {
  const variants = new Set([origin]);
  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return variants;

    const host = url.hostname;
    if (host.startsWith('www.')) {
      const alt = `${url.protocol}//${host.slice(4)}${url.port ? `:${url.port}` : ''}`;
      variants.add(alt);
    } else {
      const alt = `${url.protocol}//www.${host}${url.port ? `:${url.port}` : ''}`;
      variants.add(alt);
    }
  } catch {
    // Ignore invalid URLs
  }
  return variants;
}

function getAllowedOrigins() {
  const envList = process.env.CORS_ORIGINS || process.env.ALLOWED_ORIGINS;
  const seedOrigins = envList
    ? envList.split(',').map((o) => o.trim()).filter(Boolean)
    : [...DEFAULT_ALLOWED_ORIGINS];

  const frontendUrl = process.env.FRONTEND_URL && process.env.FRONTEND_URL.trim();
  if (frontendUrl) seedOrigins.unshift(frontendUrl);

  const origins = new Set();
  for (const origin of seedOrigins) {
    expandOriginVariants(origin).forEach((variant) => origins.add(variant));
  }

  return [...origins];
}

function isLocalDevOrigin(origin) {
  try {
    const url = new URL(origin);
    return (
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
    );
  } catch {
    return false;
  }
}

async function corsPlugin(fastify, options) {
  const allowedOrigins = getAllowedOrigins();
  const isProduction = process.env.NODE_ENV === 'production';

  await fastify.register(fastifyCors, {
    origin: (origin, cb) => {
      // No origin (e.g. Postman, server-to-server) – allow
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      // Flutter web / local dev uses random ports (e.g. localhost:62060)
      if (isLocalDevOrigin(origin)) return cb(null, true);
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
