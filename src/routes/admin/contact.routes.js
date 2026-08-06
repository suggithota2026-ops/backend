// Admin contact routes
const {
  getContactMessages,
  getContactMessage,
  updateContactMessage,
  deleteContactMessage,
  acceptEnquiry,
  rejectEnquiry,
} = require('../../controllers/contact.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { requirePermission } = require('../../middlewares/admin.middleware');
const { sendValidationError } = require('../../utils/response');
const { updateContactMessageSchema } = require('../../validations/contact.validation');
const { PERMISSIONS } = require('../../config/permissions');

const adminContactRoutes = async (fastify, options) => {
  // Get all contact messages
  fastify.get('/contact-messages', {
    schema: {
      tags: ['admin'],
      summary: 'Get all contact messages',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number' },
          limit: { type: 'number' },
          status: { type: 'string', enum: ['pending', 'contacted', 'resolved'] },
        },
      },
    },
    preHandler: [authenticate, requirePermission(PERMISSIONS.ENQUIRY_VIEW)],
  }, getContactMessages);

  // Get single contact message
  fastify.get('/contact-messages/:id', {
    schema: {
      tags: ['admin'],
      summary: 'Get contact message by ID',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
    },
    preHandler: [authenticate, requirePermission(PERMISSIONS.ENQUIRY_VIEW)],
  }, getContactMessage);

  // Update contact message
  fastify.put('/contact-messages/:id', {
    schema: {
      tags: ['admin'],
      summary: 'Update contact message status/notes',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        additionalProperties: true,
        properties: {
          status: { type: 'string', enum: ['pending', 'contacted', 'resolved'] },
          notes: { type: 'string' },
          hotelName: { type: 'string' },
          contactNumber: { type: 'string' },
          address: { type: 'string' },
          city: { type: 'string' },
          pinCode: { type: 'string' },
          landmark: { type: 'string' },
          email: { type: 'string' },
          message: { type: 'string' },
        },
      },
    },
    preValidation: async (request, reply) => {
      const { error } = updateContactMessageSchema.validate(request.body || {}, { allowUnknown: true });
      if (error) {
        return sendValidationError(reply, error.details);
      }
    },
    preHandler: [authenticate, requirePermission(PERMISSIONS.ENQUIRY_VIEW)],
  }, updateContactMessage);

  // Delete contact message
  fastify.delete('/contact-messages/:id', {
    schema: {
      tags: ['admin'],
      summary: 'Delete contact message',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
    },
    preHandler: [authenticate, requirePermission(PERMISSIONS.ENQUIRY_VIEW)],
  }, deleteContactMessage);

  // Accept enquiry (create hotel account)
  fastify.post('/contact-messages/:id/accept', {
    schema: {
      tags: ['admin'],
      summary: 'Accept enquiry and create hotel account',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
    },
    preHandler: [authenticate, requirePermission(PERMISSIONS.ENQUIRY_VIEW)],
  }, acceptEnquiry);

  // Reject enquiry
  fastify.post('/contact-messages/:id/reject', {
    schema: {
      tags: ['admin'],
      summary: 'Reject enquiry',
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
          reason: { type: 'string' },
        },
      },
    },
    preHandler: [authenticate, requirePermission(PERMISSIONS.ENQUIRY_VIEW)],
  }, rejectEnquiry);
};

module.exports = adminContactRoutes;
