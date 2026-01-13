// User offers routes
const { getOffers } = require('../../controllers/user/offer.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { sendValidationError } = require('../../utils/response');

const offerRoutes = async (fastify, options) => {
  // Get all offers for the user
  fastify.get('/offers', {
    schema: {
      tags: ['user'],
      summary: 'Get user offers',
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
  }, getOffers);
};

module.exports = offerRoutes;