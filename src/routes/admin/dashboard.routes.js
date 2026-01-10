// Admin dashboard routes
const { getDashboard } = require('../../controllers/admin/dashboard.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { requireAdmin } = require('../../middlewares/admin.middleware');

const dashboardRoutes = async (fastify, options) => {
  fastify.get('/dashboard', {
    schema: {
      tags: ['admin'],
      summary: 'Get dashboard statistics',
      security: [{ bearerAuth: [] }],
    },
    // preHandler: [authenticate, requireAdmin],
  }, getDashboard);
};

module.exports = dashboardRoutes;
