// Order validation schemas
const Joi = require('joi');
const { ORDER_STATUS, PAYMENT_METHOD } = require('../config/constants');

const createOrderSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        product: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
        quantity: Joi.number().min(1).required(),
      })
    )
    .min(1)
    .required(),
  specialInstructions: Joi.string().trim().max(500).optional().allow(''),
  deliveryTime: Joi.date().optional(),
  hotelId: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
}).options({ stripUnknown: true });

const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(ORDER_STATUS))
    .required(),
  assignedTo: Joi.string().trim().optional().allow(''),
});

const reorderSchema = Joi.object({
  orderId: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
  items: Joi.array()
    .items(
      Joi.object({
        product: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
        quantity: Joi.number().min(1).required(),
      }).unknown(true)
    )
    .optional(),
  specialInstructions: Joi.string().trim().max(500).optional().allow(''),
  deliveryTime: Joi.date().optional(),
}).unknown(true);

module.exports = {
  createOrderSchema,
  updateOrderStatusSchema,
  reorderSchema,
};
