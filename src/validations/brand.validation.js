// Brand validation schemas
const Joi = require('joi');

const createBrandSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Brand name is required',
      'string.min': 'Brand name must be at least 1 character',
      'string.max': 'Brand name cannot exceed 100 characters',
      'any.required': 'Brand name is required'
    }),
  imageUrl: Joi.string()
    .uri()
    .required()
    .messages({
      'string.uri': 'Invalid image URL',
      'any.required': 'Image URL is required'
    }),
  description: Joi.string()
    .optional()
    .allow('')
    .max(500)
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    })
});

const updateBrandSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Brand name must be at least 1 character',
      'string.max': 'Brand name cannot exceed 100 characters'
    }),
  imageUrl: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'Invalid image URL'
    }),
  description: Joi.string()
    .optional()
    .allow('')
    .max(500)
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),
  isActive: Joi.boolean()
    .optional()
});

const brandIdSchema = Joi.object({
  id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Brand ID must be a number',
      'number.integer': 'Brand ID must be an integer',
      'number.positive': 'Brand ID must be positive',
      'any.required': 'Brand ID is required'
    })
});

module.exports = {
  createBrandSchema,
  updateBrandSchema,
  brandIdSchema
};