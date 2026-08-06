// Contact routes (public)
const { sendMessage } = require('../controllers/contact.controller');
const { sendValidationError } = require('../utils/response');
const { sendMessageSchema } = require('../validations/contact.validation');

const contactRoutes = async (fastify, options) => {
  fastify.post('/send-message', {
    schema: {
      tags: ['contact'],
      summary: 'Send contact message',
      description: 'Submit a contact form with hotel details and message',
      body: {
        type: 'object',
        additionalProperties: true,
        required: ['hotelName', 'contactNumber', 'address'],
        properties: {
          hotelName: { type: 'string', minLength: 2, maxLength: 100 },
          contactNumber: { type: 'string' },
          address: { type: 'string', minLength: 1, maxLength: 500 },
          city: { type: 'string', maxLength: 100 },
          pinCode: { type: 'string', maxLength: 20 },
          landmark: { type: 'string', maxLength: 200 },
          email: { type: 'string' },
          message: { type: 'string', maxLength: 1000 },
          latitude: { type: 'number' },
          longitude: { type: 'number' },
        },
      },
    },
    preValidation: async (request, reply) => {
      const { error } = sendMessageSchema.validate(request.body || {}, { allowUnknown: true });
      if (error) {
        return sendValidationError(reply, error.details);
      }
    },
  }, sendMessage);
};

module.exports = contactRoutes;
