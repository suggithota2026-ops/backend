// Admin order routes
const {
  getOrders,
  getOrder,
  updateOrderStatus,
  generateOrderInvoice,
  getTodaysOrdersSummary,
} = require('../../controllers/admin/order.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { requireAdmin } = require('../../middlewares/admin.middleware');
const { sendValidationError } = require('../../utils/response');
const { updateOrderStatusSchema } = require('../../validations/order.validation');

const orderRoutes = async (fastify, options) => {
  fastify.get('/orders', {
    schema: {
      tags: ['admin'],
      summary: 'Get all orders',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number' },
          limit: { type: 'number' },
          status: { type: 'string' },
          hotel: { type: 'string' },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
        },
      },
    },
    // preHandler: [authenticate, requireAdmin],
  }, getOrders);

  fastify.get('/orders/:id', {
    schema: {
      tags: ['admin'],
      summary: 'Get order by ID',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
    },
    // preHandler: [authenticate, requireAdmin],
  }, getOrder);

  fastify.patch('/orders/:id/status', {
    schema: {
      tags: ['admin'],
      summary: 'Update order status',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          assignedTo: { type: 'string' },
          deliveryCharge: { type: 'number' },
          paymentMethod: { type: 'string' },
        },
      },
    },
    // preHandler: [authenticate, requireAdmin],
    preValidation: async (request, reply) => {
      const { error } = updateOrderStatusSchema.validate(request.body);
      if (error) {
        return sendValidationError(reply, error.details);
      }
    },
  }, updateOrderStatus);

  fastify.post('/orders/:id/invoice', {
    schema: {
      tags: ['admin'],
      summary: 'Generate invoice for order',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
    },
    // preHandler: [authenticate, requireAdmin],
  }, generateOrderInvoice);

  fastify.get('/orders/today/summary', {
    schema: {
      tags: ['admin'],
      summary: 'Get today\'s orders summary',
      security: [{ bearerAuth: [] }],
      description: 'Returns client-wise item summary for today\'s orders with quantities and totals'
    },
    // preHandler: [authenticate, requireAdmin],
  }, getTodaysOrdersSummary);
};

module.exports = orderRoutes;
