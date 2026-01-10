// Route auto-loader
const authRoutes = require('./auth/auth.routes');
const userProductRoutes = require('./user/products.routes');
const userOrderRoutes = require('./user/orders.routes');
const userProfileRoutes = require('./user/profile.routes');
const adminDashboardRoutes = require('./admin/dashboard.routes');
const adminAuthRoutes = require('./admin/auth.routes');
const adminProductRoutes = require('./admin/products.routes');
const adminCategoryRoutes = require('./admin/categories.routes');
const adminOrderRoutes = require('./admin/orders.routes');
const adminHotelRoutes = require('./admin/hotels.routes');
const adminReportRoutes = require('./admin/reports.routes');
const adminNotificationRoutes = require('./admin/notifications.routes');
const adminMgmtRoutes = require('./admin/admin_mgmt.routes');

const registerRoutes = async (fastify) => {
  // Auth routes (no prefix)
  await fastify.register(authRoutes, { prefix: '/api/auth' });

  // User routes
  await fastify.register(userProductRoutes, { prefix: '/api/user' });
  await fastify.register(userOrderRoutes, { prefix: '/api/user' });
  await fastify.register(userProfileRoutes, { prefix: '/api/user' });

  // Admin routes
  await fastify.register(adminAuthRoutes, { prefix: '/api/admin' });
  await fastify.register(adminDashboardRoutes, { prefix: '/api/admin' });
  await fastify.register(adminProductRoutes, { prefix: '/api/admin' });
  await fastify.register(adminCategoryRoutes, { prefix: '/api/admin' });
  await fastify.register(adminOrderRoutes, { prefix: '/api/admin' });
  await fastify.register(adminHotelRoutes, { prefix: '/api/admin' });
  await fastify.register(adminReportRoutes, { prefix: '/api/admin' });
  await fastify.register(adminNotificationRoutes, { prefix: '/api/admin' });
  await fastify.register(adminMgmtRoutes, { prefix: '/api/admin' });

  // Health check
  fastify.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
};

module.exports = registerRoutes;
