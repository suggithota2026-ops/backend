const { login, sendOtp, verifyOtp, resendOtp, getProfile, updateProfile } = require('../../controllers/admin/auth.controller');
const { sendValidationError } = require('../../utils/response');
const { authenticate } = require('../../middlewares/auth.middleware');
const Joi = require('joi');

// ... (existing schemas) ...

const adminAuthRoutes = async (fastify, options) => {
    // ... (existing routes) ...

    fastify.post('/auth/verify-otp', {
        schema: {
            tags: ['admin'],
            summary: 'Verify Admin OTP and login',
            body: {
                type: 'object',
                required: ['mobileNumber', 'otp'],
                properties: {
                    mobileNumber: { type: 'string' },
                    otp: { type: 'string' },
                },
            },
        },
    }, verifyOtp);

    fastify.post('/auth/resend-otp', {
        schema: {
            tags: ['admin'],
            summary: 'Resend OTP to Admin',
            body: {
                type: 'object',
                required: ['mobileNumber'],
                properties: {
                    mobileNumber: { type: 'string' },
                },
            },
        },
    }, resendOtp);

    // Profile Routes
    fastify.get('/auth/profile', {
        schema: {
            tags: ['admin'],
            summary: 'Get current admin profile',
            security: [{ bearerAuth: [] }],
        },
        preHandler: [authenticate],
    }, getProfile);

    fastify.put('/auth/profile', {
        schema: {
            tags: ['admin'],
            summary: 'Update current admin profile',
            security: [{ bearerAuth: [] }],
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    mobileNumber: { type: 'string' },
                    email: { type: ['string', 'null'] },
                    bio: { type: ['string', 'null'] },
                    dob: { type: ['string', 'null'], format: 'date' },
                    country: { type: ['string', 'null'] },
                    city: { type: ['string', 'null'] },
                    postalCode: { type: ['string', 'null'] },
                    avatarUrl: { type: ['string', 'null'] },
                },
            },
        },
        preHandler: [authenticate],
    }, updateProfile);
};

module.exports = adminAuthRoutes;
