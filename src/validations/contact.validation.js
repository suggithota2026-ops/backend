// Contact validation schemas
const Joi = require('joi');

const sendMessageSchema = Joi.object({
  hotelName: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Hotel name is required',
      'string.min': 'Hotel name must be at least 2 characters',
      'string.max': 'Hotel name must not exceed 100 characters',
    }),
  contactNumber: Joi.string()
    .trim()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({
      'string.pattern.base': 'Contact number must be a valid 10-digit number',
      'any.required': 'Contact number is required',
    }),
  address: Joi.string()
    .trim()
    .min(5)
    .max(500)
    .required()
    .messages({
      'string.empty': 'Address is required',
      'string.min': 'Address must be at least 5 characters',
      'string.max': 'Address must not exceed 500 characters',
    }),
  city: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'City is required',
      'string.min': 'City must be at least 2 characters',
    }),
  pinCode: Joi.string()
    .trim()
    .pattern(/^[0-9]{6}$/)
    .required()
    .messages({
      'string.pattern.base': 'PIN code must be a valid 6-digit number',
      'any.required': 'PIN code is required',
    }),
  landmark: Joi.string()
    .trim()
    .max(200)
    .allow('')
    .optional(),
  email: Joi.string()
    .trim()
    .email()
    .allow('')
    .optional()
    .messages({
      'string.email': 'Please provide a valid email address',
    }),
  message: Joi.string()
    .trim()
    .min(10)
    .max(1000)
    .required()
    .messages({
      'string.empty': 'Message is required',
      'string.min': 'Message must be at least 10 characters',
      'string.max': 'Message must not exceed 1000 characters',
    }),
});

module.exports = {
  sendMessageSchema,
};
