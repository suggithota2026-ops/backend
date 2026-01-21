// Admin-specific offers routes (for the Offers tab in admin panel)
const { 
  getAdminOffers, 
  getAdminOfferById, 
  updateAdminOffer, 
  deleteAdminOffer 
} = require('../../controllers/admin/offer.controller');
const { authenticate, authorizeAdmin, requireSuperAdmin } = require('../../middlewares/auth.middleware');
const { sendValidationError } = require('../../utils/response');

const offerAdminRoutes = async (fastify, options) => {
  // Get all offers for admin panel (with additional analytics)
  fastify.get('/offers-admin', {
    schema: {
      tags: ['admin'],
      summary: 'Get all offers for admin panel',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number' },
          limit: { type: 'number' },
          searchTerm: { type: 'string' },
          isActive: { type: 'boolean' },
          sortBy: { type: 'string', enum: ['createdAt', 'usedCount', 'validUntil'] },
          sortOrder: { type: 'string', enum: ['ASC', 'DESC'] },
        },
      },
    },
    preHandler: [authenticate, authorizeAdmin],
  }, getAdminOffers);

  // Get specific offer for admin panel
  fastify.get('/offers-admin/:id', {
    schema: {
      tags: ['admin'],
      summary: 'Get specific offer for admin panel',
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
  }, getAdminOfferById);

  // Update offer (admin panel)
  fastify.put('/offers-admin/:id', {
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
          discountType: { type: 'string', enum: ['percentage', 'flat'] },
          discountValue: { type: 'number' },
          validFrom: { type: 'string', format: 'date-time' },
          validUntil: { type: 'string', format: 'date-time' },
          minOrderAmount: { type: 'number' },
          maxDiscountAmount: { type: 'number' },
          usageLimit: { type: 'number' },
          isActive: { type: 'boolean' },
          metadata: { type: 'object' },
          hotelIds: { type: 'array', items: { type: 'integer' } },
        },
        required: ['code', 'discountType', 'discountValue'],
      },
    },
    preHandler: [authenticate, authorizeAdmin],
  }, updateAdminOffer);

  // Delete offer (admin panel)
  fastify.delete('/offers-admin/:id', {
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
  }, deleteAdminOffer);
};

module.exports = offerAdminRoutes;