// Contact routes (public)
const { sendMessage } = require('../controllers/contact.controller');
const { sendValidationError } = require('../utils/response');
const { sendMessageSchema } = require('../validations/contact.validation');

const contactRoutes = async (fastify, options) => {
  // Send contact message (Public)
  fastify.post('/send-message', {
    schema: {
      tags: ['contact'],
      summary: 'Send contact message',
      description: 'Submit a contact form with hotel details and message',
      body: {
        type: 'object',
        required: ['hotelName', 'contactNumber', 'address', 'city', 'pinCode', 'message'],
        properties: {
          hotelName: { type: 'string', minLength: 2, maxLength: 100 },
          contactNumber: { type: 'string', pattern: '^[0-9]{10}$' },
          address: { type: 'string', minLength: 5, maxLength: 500 },
          city: { type: 'string', minLength: 2, maxLength: 100 },
          pinCode: { type: 'string', pattern: '^[0-9]{6}$' },
          landmark: { type: 'string', maxLength: 200 },
          email: { type: 'string', format: 'email' },
          message: { type: 'string', minLength: 10, maxLength: 1000 },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                hotelName: { type: 'string' },
                status: { type: 'string' },
              },
            },
          },
        },
      },
    },
    preValidation: async (request, reply) => {
      const { error } = sendMessageSchema.validate(request.body);
      if (error) {
        return sendValidationError(reply, error.details);
      }
    },
  }, sendMessage);
};

module.exports = contactRoutes;
