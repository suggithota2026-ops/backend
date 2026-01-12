// OTP login APIs
const { sendOTP, verifyOTP, resendOTP, setupProfile, updateFCMToken } = require('../../controllers/auth.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { sendValidationError } = require('../../utils/response');
const {
  sendOTPSchema,
  verifyOTPSchema,
  setupProfileSchema,
  updateFCMTokenSchema,
} = require('../../validations/auth.validation');

const authRoutes = async (fastify, options) => {
  // Send OTP
  fastify.post('/send-otp', {
    schema: {
      tags: ['auth'],
      summary: 'Send OTP to mobile number',
      body: {
        type: 'object',
        required: ['mobileNumber'],
        properties: {
          mobileNumber: { type: 'string', pattern: '^[0-9]{10}$' },
        },
      },
      // Response schema removed - Fastify was stripping the data
      // response: {
      //   200: {
      //     type: 'object',
      //     properties: {
      //       success: { type: 'boolean' },
      //       message: { type: 'string' },
      //       data: { type: 'object' },
      //     },
      //   },
      // },
    },
    preHandler: async (request, reply) => {
      const { error } = sendOTPSchema.validate(request.body);
      if (error) {
        return sendValidationError(reply, error.details);
      }
    },
    onSend: async (request, reply, payload) => {
      // Log what's being sent and ensure data is preserved
      const logger = require('../../utils/logger');
      try {
        let payloadObj;
        if (typeof payload === 'string') {
          payloadObj = JSON.parse(payload);
        } else {
          payloadObj = payload;
        }
        
        logger.info('ON_SEND Hook - Payload object:', JSON.stringify(payloadObj, null, 2));
        console.log('ON_SEND Hook - Payload object:', JSON.stringify(payloadObj, null, 2));
        console.log('ON_SEND Hook - Data in payload:', payloadObj?.data);
        
        // Ensure data is not empty
        if (payloadObj && payloadObj.data && Object.keys(payloadObj.data).length === 0) {
          console.error('WARNING: Data object is empty in onSend hook!');
          logger.error('WARNING: Data object is empty in onSend hook!', payloadObj);
        }
      } catch (e) {
        logger.error('Error in onSend hook:', e);
        console.error('Error in onSend hook:', e);
      }
      return payload;
    },
  }, sendOTP);

  // Verify OTP
  fastify.post('/verify-otp', {
    schema: {
      tags: ['auth'],
      summary: 'Verify OTP and login',
      body: {
        type: 'object',
        required: ['mobileNumber', 'otp'],
        properties: {
          mobileNumber: { type: 'string', pattern: '^[0-9]{10}$' },
          otp: { type: 'string', pattern: '^[0-9]{6}$' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                token: { type: 'string' },
                user: { type: 'object' },
              },
            },
          },
        },
      },
    },
    preHandler: async (request, reply) => {
      const { error } = verifyOTPSchema.validate(request.body);
      if (error) {
        return sendValidationError(reply, error.details);
      }
    },
  }, verifyOTP);

  // Resend OTP
  fastify.post('/resend-otp', {
    schema: {
      tags: ['auth'],
      summary: 'Resend OTP to mobile number',
      body: {
        type: 'object',
        required: ['mobileNumber'],
        properties: {
          mobileNumber: { type: 'string', pattern: '^[0-9]{10}$' },
        },
      },
    },
    preHandler: async (request, reply) => {
      const { error } = sendOTPSchema.validate(request.body);
      if (error) {
        return sendValidationError(reply, error.details);
      }
    },
  }, resendOTP);

  // Setup Profile (after first login)
  fastify.post('/setup-profile', {
    schema: {
      tags: ['auth'],
      summary: 'Setup user profile',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['hotelName', 'address'],
        properties: {
          hotelName: { type: 'string' },
          address: { type: 'string' },
          gstNumber: { type: 'string' },
          fcmToken: { type: 'string' },
        },
      },
    },
    preHandler: [authenticate],
    preValidation: async (request, reply) => {
      const { error } = setupProfileSchema.validate(request.body);
      if (error) {
        return sendValidationError(reply, error.details);
      }
    },
  }, setupProfile);

  // Update FCM Token
  fastify.post('/fcm-token', {
    schema: {
      tags: ['auth'],
      summary: 'Update FCM token for push notifications',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['fcmToken'],
        properties: {
          fcmToken: { type: 'string' },
        },
      },
    },
    preHandler: [authenticate],
    preValidation: async (request, reply) => {
      const { error } = updateFCMTokenSchema.validate(request.body);
      if (error) {
        return sendValidationError(reply, error.details);
      }
    },
  }, updateFCMToken);
};

module.exports = authRoutes;
