// User order routes
const {
  createOrder,
  getOrders,
  getOrder,
  reorder,
  getInvoice,
} = require('../../controllers/user/order.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { sendValidationError } = require('../../utils/response');
const logger = require('../../utils/logger');
const {
  createOrderSchema,
  reorderSchema,
} = require('../../validations/order.validation');

const orderRoutes = async (fastify, options) => {
  fastify.post('/orders', {
    schema: {
      tags: ['user'],
      summary: 'Create new order',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['items'],
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['product', 'quantity'],
              properties: {
                product: { type: 'string' },
                quantity: { type: 'number' },
              },
            },
          },
          specialInstructions: { type: 'string' },
          deliveryTime: { type: 'string', format: 'date-time' },
          hotelId: { type: ['string', 'number'] },
        },
      },
    },
    preHandler: [authenticate],
    preValidation: async (request, reply) => {
      // Convert product IDs to strings and quantity to numbers (for validation)
      if (request.body && request.body.items && Array.isArray(request.body.items)) {
        request.body.items = request.body.items.map((item) => ({
          ...item,
          product: String(item.product), // Convert to string for validation
          quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity, // Convert to number
        }));
      }

      // Convert hotelId if provided
      if (request.body && request.body.hotelId !== undefined) {
        if (typeof request.body.hotelId === 'string') {
          const parsed = parseInt(request.body.hotelId);
          request.body.hotelId = isNaN(parsed) ? request.body.hotelId : parsed;
        }
      }

      const { error } = createOrderSchema.validate(request.body);
      if (error) {
        logger.error('Order validation error:', error.details);
        return sendValidationError(reply, error.details);
      }
    },
  }, createOrder);

  fastify.get('/orders', {
    schema: {
      tags: ['user'],
      summary: 'Get user orders',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number' },
          limit: { type: 'number' },
          status: { type: 'string' },
        },
      },
    },
    preHandler: [authenticate],
  }, getOrders);

  fastify.get('/orders/:id', {
    schema: {
      tags: ['user'],
      summary: 'Get order by ID',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
    },
    preHandler: [authenticate],
  }, getOrder);

  fastify.post('/orders/reorder', {
    schema: {
      tags: ['user'],
      summary: 'Reorder previous order',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['orderId'],
        additionalProperties: true,
        properties: {
          orderId: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: true,
              properties: {
                product: { type: 'string' },
                quantity: { type: 'number' },
              },
            },
          },
          specialInstructions: { type: 'string' },
          deliveryTime: { type: 'string', format: 'date-time' },
        },
      },
    },
    preHandler: [authenticate],
    preValidation: async (request, reply) => {
      const { error } = reorderSchema.validate(request.body);
      if (error) {
        return sendValidationError(reply, error.details);
      }
    },
  }, reorder);

  fastify.get('/orders/:orderId/invoice', {
    schema: {
      tags: ['user'],
      summary: 'Get invoice for order',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          orderId: { type: 'string' },
        },
      },
    },
    preHandler: [authenticate],
  }, getInvoice);
};

module.exports = orderRoutes;
