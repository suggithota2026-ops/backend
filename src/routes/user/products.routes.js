// User product routes
const {
  getCategories,
  getProducts,
  getProduct,
  getProductsBySubcategory,
} = require('../../controllers/user/product.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

const productRoutes = async (fastify, options) => {
  fastify.get('/categories', {
    schema: {
      tags: ['user'],
      summary: 'Get all active categories',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [authenticate],
  }, getCategories);

  fastify.get('/products', {
    schema: {
      tags: ['user'],
      summary: 'Get all active products',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          subcategory: { type: 'string' },
          search: { type: 'string' },
        },
      },
    },
    preHandler: [authenticate],
  }, getProducts);

  fastify.get('/products/:id', {
    schema: {
      tags: ['user'],
      summary: 'Get products by category ID',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
    },
    preHandler: [authenticate],
  }, getProduct);

  fastify.get('/products/subcategory/:subcategoryId', {
    schema: {
      tags: ['user'],
      summary: 'Get products by subcategory ID',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          subcategoryId: { type: 'string' },
        },
      },
    },
    preHandler: [authenticate],
  }, getProductsBySubcategory);
};

module.exports = productRoutes;
