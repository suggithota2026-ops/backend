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
const { requireAdmin } = require('../../middlewares/admin.middleware');

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
    // preHandler: [authenticate, requireAdmin],
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
    // preHandler: [authenticate, requireAdmin],
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
        properties: {
          status: { type: 'string', enum: ['pending', 'contacted', 'resolved'] },
          notes: { type: 'string' },
        },
      },
    },
    // preHandler: [authenticate, requireAdmin],
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
    // preHandler: [authenticate, requireAdmin],
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
    // preHandler: [authenticate, requireAdmin],
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
    // preHandler: [authenticate, requireAdmin],
  }, rejectEnquiry);
};

module.exports = adminContactRoutes;
