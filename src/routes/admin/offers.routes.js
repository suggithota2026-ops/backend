// Admin offers routes
const { 
  getAllOffers, 
  getOfferById, 
  updateOffer, 
  deleteOffer 
} = require('../../controllers/admin/offer.controller');
const { authenticate, authorizeAdmin } = require('../../middlewares/auth.middleware');
const { sendValidationError } = require('../../utils/response');

const offerRoutes = async (fastify, options) => {
  // Get all offers
  fastify.get('/offers', {
    schema: {
      tags: ['admin'],
      summary: 'Get all offers',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number' },
          limit: { type: 'number' },
          searchTerm: { type: 'string' },
          isActive: { type: 'boolean' },
        },
      },
    },
    preHandler: [authenticate, authorizeAdmin],
  }, getAllOffers);

  // Get offer by ID
  fastify.get('/offers/:id', {
    schema: {
      tags: ['admin'],
      summary: 'Get offer by ID',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' },
        },
        required: ['id'],
      },
    },
    preHandler: [authenticate, authorizeAdmin],
  }, getOfferById);

  // Update offer
  fastify.put('/offers/:id', {
    schema: {
      tags: ['admin'],
      summary: 'Update offer',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          discountType: { type: 'string', enum: ['percentage', 'fixed'] },
          discountValue: { type: 'number' },
          validFrom: { type: 'string', format: 'date-time' },
          validUntil: { type: 'string', format: 'date-time' },
          minOrderAmount: { type: 'number' },
          maxDiscountAmount: { type: 'number' },
          usageLimit: { type: 'number' },
          isActive: { type: 'boolean' },
          metadata: { type: 'object' },
        },
        required: ['code', 'discountType', 'discountValue'],
      },
    },
    preHandler: [authenticate, authorizeAdmin],
  }, updateOffer);

  // Delete offer
  fastify.delete('/offers/:id', {
    schema: {
      tags: ['admin'],
      summary: 'Delete offer',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' },
        },
        required: ['id'],
      },
    },
    preHandler: [authenticate, authorizeAdmin],
  }, deleteOffer);
};

module.exports = offerRoutes;