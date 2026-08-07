// Rate limiting middleware
const { RATE_LIMIT_WINDOW, RATE_LIMIT_MAX, NODE_ENV } = require('../config/env');

// Simple in-memory rate limiter (use Redis in production)
const requestCounts = new Map();

const isDev = String(NODE_ENV || '').trim().toLowerCase() === 'development';

// Paths that are polled often by the admin UI — don't burn the global budget
const SKIP_PATH_PREFIXES = [
  '/uploads/',
  '/api-docs',
  '/favicon',
  '/api/admin/', // Excel bulk uploads + admin UI must never hit 429
];

const SKIP_EXACT_PATHS = new Set([
  '/health',
  '/',
]);

const getPathname = (url = '') => String(url).split('?')[0];

const rateLimit = async (request, reply) => {
  // Skip rate limiting in development mode
  if (isDev) {
    return;
  }

  // CORS preflight must not be rate-limited
  if (request.method === 'OPTIONS') {
    return;
  }

  const path = getPathname(request.url);
  if (
    SKIP_EXACT_PATHS.has(path) ||
    SKIP_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))
  ) {
    return;
  }

  const authHeader = request.headers?.authorization || '';
  const hasBearer =
    typeof authHeader === 'string' && authHeader.startsWith('Bearer ');

  // Prefer authenticated user key so shared NAT IPs don't block the whole office
  const userKey = hasBearer
    ? `user:${authHeader.slice(0, 48)}`
    : `ip:${request.ip}`;

  const now = Date.now();
  const windowMs = Math.max(1, Number(RATE_LIMIT_WINDOW) || 15) * 60 * 1000;
  const maxRequests = Math.max(200, Number(RATE_LIMIT_MAX) || 2000);

  if (!requestCounts.has(userKey)) {
    requestCounts.set(userKey, { count: 1, resetTime: now + windowMs });
    return;
  }

  const record = requestCounts.get(userKey);

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    return;
  }

  record.count += 1;

  if (record.count > maxRequests) {
    const retryAfterSec = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
    reply.header('Retry-After', String(retryAfterSec));
    return reply.status(429).send({
      success: false,
      message: 'Too many requests, please try again later',
    });
  }
};

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestCounts.entries()) {
    if (now > record.resetTime) {
      requestCounts.delete(key);
    }
  }
}, 60000);

module.exports = rateLimit;
