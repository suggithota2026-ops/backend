// Hotel validation schemas
const Joi = require('joi');

const createHotelSchema = Joi.object({
  mobileNumber: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required(),
  hotelName: Joi.string().trim().min(2).max(100).required(),
  address: Joi.string().trim().min(5).max(500).required(),
  gstNumber: Joi.string()
    .trim()
    .pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .optional()
    .allow(''),
  creditLimit: Joi.number().min(0).default(0),
  rateType: Joi.string().trim().valid('Dairy Prize', 'Weekly Fixes', 'Fixed Price', 'Daily Price', 'Weekly Price').optional(),
  pricePerUnit: Joi.number().min(0).optional(),
  contractDuration: Joi.string().valid('6 Months', '1 Year').optional(),
  customerProductPricing: Joi.array().items(
    Joi.object({
      productId: Joi.number().integer().positive().required(),
      fixedPrice: Joi.number().positive().required()
    })
  ).optional(),
  contractStartDate: Joi.date().iso().optional(),
  contractEndDate: Joi.date().iso().optional(),
});

const updateHotelSchema = Joi.object({
  hotelName: Joi.string().trim().min(2).max(100).optional(),
  address: Joi.string().trim().min(5).max(500).optional(),
  gstNumber: Joi.string()
    .trim()
    .pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .optional()
    .allow(''),
  creditLimit: Joi.number().min(0).optional(),
  isBlocked: Joi.boolean().optional(),
  rateType: Joi.string().trim().valid('Dairy Prize', 'Weekly Fixes', 'Fixed Price', 'Daily Price', 'Weekly Price').optional(),
  pricePerUnit: Joi.number().min(0).optional(),
  contractDuration: Joi.string().valid('6 Months', '1 Year').optional(),
  customerProductPricing: Joi.array().items(
    Joi.object({
      productId: Joi.number().integer().positive().required(),
      fixedPrice: Joi.number().positive().required()
    })
  ).optional(),
  contractStartDate: Joi.date().iso().optional(),
  contractEndDate: Joi.date().iso().optional(),
}).unknown(true);

module.exports = {
  createHotelSchema,
  updateHotelSchema,
};
