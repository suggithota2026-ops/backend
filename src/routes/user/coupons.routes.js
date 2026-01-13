// User coupons routes
const { validateCoupon, redeemCoupon } = require('../../controllers/user/coupon.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

const couponRoutes = async (fastify, options) => {
  // Validate coupon code (User endpoint)
  fastify.post('/coupons/validate', {
    schema: {
      tags: ['user'],
      summary: 'Validate coupon code',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['code'],
        properties: {
          code: { type: 'string' },
        },
      },
    },
    // preHandler: [authenticate], // Uncomment if authentication is required for validation
  }, validateCoupon);

  // Redeem coupon code (User endpoint)
  fastify.post('/coupons/redeem', {
    schema: {
      tags: ['user'],
      summary: 'Redeem coupon code',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['code'],
        properties: {
          code: { type: 'string' },
        },
      },
    },
    preHandler: [authenticate], // User must be authenticated to redeem
  }, redeemCoupon);
};

module.exports = couponRoutes;