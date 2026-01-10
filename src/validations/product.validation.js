// Product validation schemas
const Joi = require('joi');
const { PRODUCT_STATUS } = require('../config/constants');

const createProductSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  description: Joi.string().trim().max(1000).optional().allow(''),
  category: Joi.string().required(),
  subcategory: Joi.string().trim().optional().allow(''),
  price: Joi.number().min(0).required(),
  pricingType: Joi.string().valid('fixed', 'daily', 'weekly').default('fixed'),
  unit: Joi.string().trim().default('kg'),
  stock: Joi.number().min(0).default(0),
  minStockLevel: Joi.number().min(0).default(0),
  status: Joi.string()
    .valid(...Object.values(PRODUCT_STATUS))
    .default(PRODUCT_STATUS.ACTIVE),
  isActive: Joi.boolean().default(true),
  displayOrder: Joi.number().default(0),
});

const updateProductSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  description: Joi.string().trim().max(1000).optional().allow(''),
  category: Joi.string().optional(),
  subcategory: Joi.string().trim().optional().allow(''),
  price: Joi.number().min(0).optional(),
  pricingType: Joi.string().valid('fixed', 'daily', 'weekly').optional(),
  unit: Joi.string().trim().optional(),
  stock: Joi.number().min(0).optional(),
  minStockLevel: Joi.number().min(0).optional(),
  status: Joi.string()
    .valid(...Object.values(PRODUCT_STATUS))
    .optional(),
  isActive: Joi.boolean().optional(),
  displayOrder: Joi.number().optional(),
});

const updateStockSchema = Joi.object({
  stock: Joi.number().min(0).required(),
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  updateStockSchema,
};
