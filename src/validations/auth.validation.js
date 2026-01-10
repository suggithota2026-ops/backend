// Auth validation schemas
const Joi = require('joi');

const sendOTPSchema = Joi.object({
  mobileNumber: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({
      'string.pattern.base': 'Mobile number must be 10 digits',
      'any.required': 'Mobile number is required',
    }),
});

const verifyOTPSchema = Joi.object({
  mobileNumber: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required(),
  otp: Joi.string()
    .length(6)
    .pattern(/^[0-9]{6}$/)
    .required()
    .messages({
      'string.length': 'OTP must be 6 digits',
      'any.required': 'OTP is required',
    }),
});

const setupProfileSchema = Joi.object({
  hotelName: Joi.string().trim().max(100).optional().allow(''),
  address: Joi.string().trim().max(500).optional().allow(''),
  gstNumber: Joi.string()
    .trim()
    .pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'Invalid GST number format',
    }),
  fcmToken: Joi.string().optional().allow(''),
});

const updateFCMTokenSchema = Joi.object({
  fcmToken: Joi.string().required(),
});

module.exports = {
  sendOTPSchema,
  verifyOTPSchema,
  setupProfileSchema,
  updateFCMTokenSchema,
};
