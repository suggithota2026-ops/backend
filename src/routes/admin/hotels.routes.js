// Admin hotel routes
const {
  createHotel,
  getHotels,
  getHotel,
  updateHotel,
  blockHotel,
  deleteHotel,
} = require('../../controllers/admin/hotel.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { requireAdmin } = require('../../middlewares/admin.middleware');
const { sendValidationError } = require('../../utils/response');
const {
  createHotelSchema,
  updateHotelSchema,
} = require('../../validations/hotel.validation');

const hotelRoutes = async (fastify, options) => {
  fastify.post('/hotels', {
    schema: {
      tags: ['admin'],
      summary: 'Create new hotel',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['mobileNumber', 'hotelName', 'address'],
        properties: {
          mobileNumber: { type: 'string' },
          hotelName: { type: 'string' },
          address: { type: 'string' },
          gstNumber: { type: 'string' },
          creditLimit: { type: 'number' },
        },
      },
    },
    // preHandler: [authenticate, requireAdmin],
    preValidation: async (request, reply) => {
      const { error } = createHotelSchema.validate(request.body);
      if (error) {
        return sendValidationError(reply, error.details);
      }
    },
  }, createHotel);

  fastify.get('/hotels', {
    schema: {
      tags: ['admin'],
      summary: 'Get all hotels',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number' },
          limit: { type: 'number' },
          isBlocked: { type: 'boolean' },
          search: { type: 'string' },
        },
      },
    },
    // preHandler: [authenticate, requireAdmin],
  }, getHotels);

  fastify.get('/hotels/:id', {
    schema: {
      tags: ['admin'],
      summary: 'Get hotel by ID',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
    },
    // preHandler: [authenticate, requireAdmin],
  }, getHotel);

  fastify.put('/hotels/:id', {
    schema: {
      tags: ['admin'],
      summary: 'Update hotel',
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
          hotelName: { type: 'string' },
          address: { type: 'string' },
          gstNumber: { type: 'string' },
          creditLimit: { type: 'number' },
          isBlocked: { type: 'boolean' },
        },
      },
    },
    // preHandler: [authenticate, requireAdmin],
    preValidation: async (request, reply) => {
      const { error } = updateHotelSchema.validate(request.body);
      if (error) {
        return sendValidationError(reply, error.details);
      }
    },
  }, updateHotel);

  fastify.patch('/hotels/:id/block', {
    schema: {
      tags: ['admin'],
      summary: 'Block/Unblock hotel',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['isBlocked'],
        properties: {
          isBlocked: { type: 'boolean' },
        },
      },
    },
    // preHandler: [authenticate, requireAdmin],
  }, blockHotel);

  fastify.delete('/hotels/:id', {
    schema: {
      tags: ['admin'],
      summary: 'Delete hotel',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
    },
    // preHandler: [authenticate, requireAdmin],
  }, deleteHotel);
};

module.exports = hotelRoutes;
