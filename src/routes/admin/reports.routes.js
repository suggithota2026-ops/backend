// Admin reports routes
const {
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getGSTReport,
} = require('../../controllers/admin/reports.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { requireAdmin } = require('../../middlewares/admin.middleware');

const reportRoutes = async (fastify, options) => {
  fastify.get('/reports/daily', {
    schema: {
      tags: ['admin'],
      summary: 'Get daily report',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          date: { type: 'string', format: 'date' },
        },
      },
    },
    // preHandler: [authenticate, requireAdmin],
  }, getDailyReport);

  fastify.get('/reports/weekly', {
    schema: {
      tags: ['admin'],
      summary: 'Get weekly report',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          date: { type: 'string', format: 'date' },
        },
      },
    },
    // preHandler: [authenticate, requireAdmin],
  }, getWeeklyReport);

  fastify.get('/reports/monthly', {
    schema: {
      tags: ['admin'],
      summary: 'Get monthly report',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          date: { type: 'string', format: 'date' },
        },
      },
    },
    // preHandler: [authenticate, requireAdmin],
  }, getMonthlyReport);

  fastify.get('/reports/gst', {
    schema: {
      tags: ['admin'],
      summary: 'Get GST report',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        required: ['startDate', 'endDate'],
        properties: {
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
        },
      },
    },
    // preHandler: [authenticate, requireAdmin],
  }, getGSTReport);
};

module.exports = reportRoutes;
