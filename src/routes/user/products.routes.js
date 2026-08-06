// User product routes
const {
  getCategories,
  getProducts,
  getProduct,
  getProductById,
  getProductsBySubcategory,
  getFeaturedProducts,
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

  // Must be registered before /products/:id so "featured" is not treated as a category id
  fastify.get('/products/featured', {
    schema: {
      tags: ['user'],
      summary: 'Get featured products for home (rate-type filtered)',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer' },
        },
      },
    },
    preHandler: [authenticate],
  }, getFeaturedProducts);

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

  fastify.get('/products/detail/:id', {
    schema: {
      tags: ['user'],
      summary: 'Get single product by ID',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
    },
    preHandler: [authenticate],
  }, getProductById);

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
};

module.exports = productRoutes;
