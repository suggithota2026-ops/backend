// Admin product routes
const {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  getProductsBySubcategory,
  updatePrice,
} = require('../../controllers/admin/product.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { requireAdmin } = require('../../middlewares/admin.middleware');
const { sendValidationError } = require('../../utils/response');
const {
  createProductSchema,
  updateProductSchema,
  updateStockSchema,
  updatePriceSchema,
} = require('../../validations/product.validation');

const productRoutes = async (fastify, options) => {
  fastify.post('/products', {
    schema: {
      tags: ['admin'],
      summary: 'Create new product',
      security: [{ bearerAuth: [] }],
      consumes: ['multipart/form-data'],
    },
    // preHandler: [authenticate, requireAdmin],
    preValidation: async (request, reply) => {
      const { error } = createProductSchema.validate(request.body);
      if (error) {
        return sendValidationError(reply, error.details);
      }
    },
  }, createProduct);

  fastify.get('/products', {
    schema: {
      tags: ['admin'],
      summary: 'Get all products',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number' },
          limit: { type: 'number' },
          category: { type: 'string' },
          subcategory: { type: 'string' },
          status: { type: 'string' },
          isActive: { type: 'boolean' },
          search: { type: 'string' },
        },
      },
    },
    // preHandler: [authenticate, requireAdmin],
  }, getProducts);

  fastify.get('/products/:id', {
    schema: {
      tags: ['admin'],
      summary: 'Get product by ID',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
    },
    // preHandler: [authenticate, requireAdmin],
  }, getProduct);

  fastify.put('/products/:id', {
    schema: {
      tags: ['admin'],
      summary: 'Update product',
      security: [{ bearerAuth: [] }],
      consumes: ['multipart/form-data', 'application/json'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
    },
    // preHandler: [authenticate, requireAdmin],
  }, updateProduct);

  fastify.delete('/products/:id', {
    schema: {
      tags: ['admin'],
      summary: 'Delete product',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
    },
    // preHandler: [authenticate, requireAdmin],
  }, deleteProduct);

  fastify.patch('/products/:id/stock', {
    schema: {
      tags: ['admin'],
      summary: 'Update product stock',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['stock'],
        properties: {
          stock: { type: 'number' },
        },
      },
    },
    // preHandler: [authenticate, requireAdmin],
    preValidation: async (request, reply) => {
      const logger = require('../../utils/logger');

      // Ensure request.body exists
      if (!request.body) {
        request.body = {};
      }

      // Convert stock to number if it's a string
      if (request.body.stock !== undefined && request.body.stock !== null) {
        if (typeof request.body.stock === 'string') {
          const numValue = parseFloat(request.body.stock);
          if (!isNaN(numValue)) {
            request.body.stock = numValue;
          } else {
            logger.error('Invalid stock value:', request.body.stock);
            return sendValidationError(reply, [{ message: 'Stock must be a valid number' }]);
          }
        }
      }

      logger.info('Stock update validation - request.body:', JSON.stringify(request.body));

      const { error } = updateStockSchema.validate(request.body);
      if (error) {
        logger.error('Stock update validation error:', JSON.stringify(error.details));
        return sendValidationError(reply, error.details);
      }
    },
  }, updateStock);

  fastify.patch('/products/:id/price', {
    schema: {
      tags: ['admin'],
      summary: 'Update product price',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['price'],
        properties: {
          price: { type: 'number' },
        },
      },
    },
    // preHandler: [authenticate, requireAdmin],
    preValidation: async (request, reply) => {
      const logger = require('../../utils/logger');
      if (!request.body) request.body = {};
      if (request.body.price !== undefined && request.body.price !== null) {
        if (typeof request.body.price === 'string') {
          const numValue = parseFloat(request.body.price);
          if (!isNaN(numValue)) {
            request.body.price = numValue;
          } else {
            return sendValidationError(reply, [{ message: 'Price must be a valid number' }]);
          }
        }
      }
      const { error } = updatePriceSchema.validate(request.body);
      if (error) {
        return sendValidationError(reply, error.details);
      }
    },
  }, updatePrice);

  fastify.get('/products/subcategory/:subcategoryId', {
    schema: {
      tags: ['admin'],
      summary: 'Get products by subcategory ID',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          subcategoryId: { type: 'string' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number' },
          limit: { type: 'number' },
        },
      },
    },
    // preHandler: [authenticate, requireAdmin],
  }, getProductsBySubcategory);
};

module.exports = productRoutes;
