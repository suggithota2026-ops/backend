// Route auto-loader
const authRoutes = require('./auth/auth.routes');
const contactRoutes = require('./contact.routes');
const userProductRoutes = require('./user/products.routes');
const userOrderRoutes = require('./user/orders.routes');
const userProfileRoutes = require('./user/profile.routes');
const userCouponRoutes = require('./user/coupons.routes');
const userOfferRoutes = require('./user/offers.routes');
const userBrandRoutes = require('./user/brands.routes');
const adminDashboardRoutes = require('./admin/dashboard.routes');
const adminAuthRoutes = require('./admin/auth.routes');
const adminProductRoutes = require('./admin/products.routes');
const adminCategoryRoutes = require('./admin/categories.routes');
const adminOrderRoutes = require('./admin/orders.routes');
const adminHotelRoutes = require('./admin/hotels.routes');
const adminReportRoutes = require('./admin/reports.routes');
const adminNotificationRoutes = require('./admin/notifications.routes');
const adminMgmtRoutes = require('./admin/admin_mgmt.routes');
const adminContactRoutes = require('./admin/contact.routes');
const adminOfferRoutes = require('./admin/offers.routes');
const adminOfferAdminRoutes = require('./admin/offer-admin.routes');
const adminBrandRoutes = require('./admin/brands.routes');
const invoiceRoutes = require('./invoiceRoutes');

const registerRoutes = async (fastify) => {
  // Auth routes (no prefix)
  await fastify.register(authRoutes, { prefix: '/api/auth' });

  // Contact routes (public)
  await fastify.register(contactRoutes, { prefix: '/api/contact' });

  // User routes
  await fastify.register(userProductRoutes, { prefix: '/api/user' });
  await fastify.register(userOrderRoutes, { prefix: '/api/user' });
  await fastify.register(userProfileRoutes, { prefix: '/api/user' });
  await fastify.register(userCouponRoutes, { prefix: '/api/user' });
  await fastify.register(userOfferRoutes, { prefix: '/api/user' });
  await fastify.register(userBrandRoutes, { prefix: '/api/brands' });

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
  await fastify.register(adminContactRoutes, { prefix: '/api/admin' });
  await fastify.register(adminOfferRoutes, { prefix: '/api/admin' });
  await fastify.register(adminOfferAdminRoutes, { prefix: '/api/admin' });
  await fastify.register(adminBrandRoutes, { prefix: '/api/admin/brands' });
  await fastify.register(invoiceRoutes, { prefix: '/api' });

  // Root route
  fastify.get('/', async (request, reply) => {
    return {
      success: true,
      message: 'PRK Smiles API is running',
      version: '1.0.0',
      docs: '/api-docs'
    };
  });

  // Health check
  fastify.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
};

module.exports = registerRoutes;
