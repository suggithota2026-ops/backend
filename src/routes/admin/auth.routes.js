const { login, sendOtp, verifyOtp, createAdmin } = require('../../controllers/admin/auth.controller');
const { sendValidationError } = require('../../utils/response');
const Joi = require('joi');

const loginSchema = Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required(),
});

const createAdminSchema = Joi.object({
    username: Joi.string().required(),
    password: Joi.string().min(6).required(),
    name: Joi.string().optional(),
});

const adminAuthRoutes = async (fastify, options) => {
    fastify.post('/auth/login', {
        schema: {
            tags: ['admin'],
            summary: 'Admin login',
            body: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                    username: { type: 'string' },
                    password: { type: 'string' },
                },
            },
        },
        preValidation: async (request, reply) => {
            const { error } = loginSchema.validate(request.body);
            if (error) {
                return sendValidationError(reply, error.details);
            }
        },
    }, login);

    fastify.post('/auth/send-otp', {
        schema: {
            tags: ['admin'],
            summary: 'Send OTP to Admin',
            body: {
                type: 'object',
                required: ['mobileNumber'],
                properties: {
                    mobileNumber: { type: 'string' },
                },
            },
        },
    }, sendOtp);

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

    // Hidden/Protected route for creating admins manually via API if needed (or keep it script only)
    // For now, I'll expose it but maybe it should be protected? 
    // The user asked for a script, which I provided. I'll add this endpoint for convenience 
    // but maybe protect it later. For now, let's keep it open or require an existing admin token?
    // Let's just stick to login for now as the script is the safer way to create the first admin.
};

module.exports = adminAuthRoutes;
