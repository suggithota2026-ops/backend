// User profile routes
const {
  getProfile,
  updateProfile,
  getNotifications,
  markNotificationAsRead,
} = require('../../controllers/user/profile.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { sendValidationError } = require('../../utils/response');
const { setupProfileSchema } = require('../../validations/auth.validation');

const profileRoutes = async (fastify, options) => {
  fastify.get('/profile', {
    schema: {
      tags: ['user'],
      summary: 'Get user profile',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [authenticate],
  }, getProfile);

  fastify.post('/profile', {
    schema: {
      tags: ['user'],
      summary: 'Setup user profile',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          hotelName: { type: 'string' },
          address: { type: 'string' },
          gstNumber: { type: 'string' },
        },
      },
    },
    preHandler: [authenticate],
    preValidation: async (request, reply) => {
      const { error } = setupProfileSchema.validate(request.body, { allowUnknown: true });
      if (error) {
        return sendValidationError(reply, error.details);
      }
    },
  }, updateProfile);

  fastify.put('/profile', {
    schema: {
      tags: ['user'],
      summary: 'Update user profile',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          hotelName: { type: 'string' },
          address: { type: 'string' },
          gstNumber: { type: 'string' },
        },
      },
    },
    preHandler: [authenticate],
    preValidation: async (request, reply) => {
      const { error } = setupProfileSchema.validate(request.body, { allowUnknown: true });
      if (error) {
        return sendValidationError(reply, error.details);
      }
    },
  }, updateProfile);

  fastify.get('/notifications', {
    schema: {
      tags: ['user'],
      summary: 'Get user notifications',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number' },
          limit: { type: 'number' },
          isRead: { type: 'boolean' },
        },
      },
    },
    preHandler: [authenticate],
  }, getNotifications);

  fastify.put('/notifications/:id/read', {
    schema: {
      tags: ['user'],
      summary: 'Mark notification as read',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
    },
    preHandler: [authenticate],
  }, markNotificationAsRead);
};

module.exports = profileRoutes;
