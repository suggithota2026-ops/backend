// Contact validation schemas
const Joi = require('joi');

const sendMessageSchema = Joi.object({
  hotelName: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Please enter your name or business name',
      'string.min': 'Name must be at least 2 characters',
      'any.required': 'Please enter your name or business name',
    }),
  contactNumber: Joi.string()
    .trim()
    .required()
    .messages({
      'any.required': 'Please enter your mobile number',
    }),
  address: Joi.string()
    .trim()
    .min(3)
    .max(500)
    .required()
    .messages({
      'string.empty': 'Please enter your address',
      'string.min': 'Please enter your address',
      'any.required': 'Please enter your address',
    }),
  city: Joi.string().trim().max(100).optional().allow('', null),
  pinCode: Joi.string().trim().max(20).optional().allow('', null),
  landmark: Joi.string().trim().max(200).optional().allow('', null),
  email: Joi.string().trim().email().optional().allow('', null).messages({
    'string.email': 'Please enter a valid email address',
  }),
  message: Joi.string().trim().max(1000).optional().allow('', null),
  latitude: Joi.number().optional().allow(null),
  longitude: Joi.number().optional().allow(null),
}).unknown(true);

const updateContactMessageSchema = Joi.object({
  status: Joi.string().valid('pending', 'contacted', 'resolved').optional(),
  notes: Joi.string().trim().max(2000).optional().allow('', null),
  hotelName: Joi.string().trim().min(2).max(100).optional(),
  contactNumber: Joi.string().trim().optional(),
  address: Joi.string().trim().max(500).optional().allow('', null),
  city: Joi.string().trim().max(100).optional().allow('', null),
  pinCode: Joi.string().trim().max(20).optional().allow('', null),
  landmark: Joi.string().trim().max(200).optional().allow('', null),
  email: Joi.string().trim().email().optional().allow('', null),
  message: Joi.string().trim().max(1000).optional().allow('', null),
}).unknown(true);

module.exports = {
  sendMessageSchema,
  updateContactMessageSchema,
};
