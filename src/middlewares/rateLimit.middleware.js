// Rate limiting middleware
const { RATE_LIMIT_WINDOW, RATE_LIMIT_MAX, NODE_ENV } = require('../config/env');

// Simple in-memory rate limiter (use Redis in production)
const requestCounts = new Map();

const rateLimit = async (request, reply) => {
  // Skip rate limiting in development mode
  if (NODE_ENV === 'development') {
    return;
  }

  // Skip rate limiting for static files and health check
  const path = request.url;
  if (path.startsWith('/uploads/') || path === '/health' || path === '/api-docs' || path.startsWith('/api-docs/')) {
    return;
  }

  const ip = request.ip;
  const now = Date.now();
  const windowMs = RATE_LIMIT_WINDOW * 60 * 1000;

  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
    return;
  }

  const record = requestCounts.get(ip);

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    return;
  }

  record.count++;

  if (record.count > RATE_LIMIT_MAX) {
    return reply.status(429).send({
      success: false,
      message: 'Too many requests, please try again later',
    });
  }
};

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of requestCounts.entries()) {
    if (now > record.resetTime) {
      requestCounts.delete(ip);
    }
  }
}, 60000); // Cleanup every minute

module.exports = rateLimit;
