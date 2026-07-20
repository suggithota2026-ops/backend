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
  hotelName: Joi.string().trim().max(100).optional().allow('', null),
  name: Joi.string().trim().max(100).optional().allow('', null),
  hotel_name: Joi.string().trim().max(100).optional().allow('', null),
  address: Joi.string().trim().max(500).optional().allow('', null),
  hotelAddress: Joi.string().trim().max(500).optional().allow('', null),
  hotel_address: Joi.string().trim().max(500).optional().allow('', null),
  // GST format is validated in the controller so other fields can still save
  gstNumber: Joi.string().trim().max(20).optional().allow('', null),
  gst_number: Joi.string().trim().max(20).optional().allow('', null),
  gstin: Joi.string().trim().max(20).optional().allow('', null),
  gst: Joi.string().trim().max(20).optional().allow('', null),
  fcmToken: Joi.string().optional().allow('', null),
  fcm_token: Joi.string().optional().allow('', null),
}).unknown(true);

const updateFCMTokenSchema = Joi.object({
  fcmToken: Joi.string().required(),
});

module.exports = {
  sendOTPSchema,
  verifyOTPSchema,
  setupProfileSchema,
  updateFCMTokenSchema,
};
