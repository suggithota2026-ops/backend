// Admin category routes
const {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
} = require('../../controllers/admin/category.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { requireAdmin } = require('../../middlewares/admin.middleware');

const categoryRoutes = async (fastify, options) => {
  fastify.post('/categories', {
    schema: {
      tags: ['admin'],
      summary: 'Create new category',
      security: [{ bearerAuth: [] }],
      consumes: ['multipart/form-data'],
    },
    // preHandler: [authenticate, requireAdmin],
  }, createCategory);

  fastify.get('/categories', {
    schema: {
      tags: ['admin'],
      summary: 'Get all categories',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          isActive: { type: 'boolean' },
        },
      },
    },
    // preHandler: [authenticate, requireAdmin],
  }, getCategories);

  fastify.get('/categories/:id', {
    schema: {
      tags: ['admin'],
      summary: 'Get category by ID',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
    },
    // preHandler: [authenticate, requireAdmin],
  }, getCategory);

  fastify.put('/categories/:id', {
    schema: {
      tags: ['admin'],
      summary: 'Update category',
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
  }, updateCategory);

  fastify.delete('/categories/:id', {
    schema: {
      tags: ['admin'],
      summary: 'Delete category',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
    },
    // preHandler: [authenticate, requireAdmin],
  }, deleteCategory);
};

module.exports = categoryRoutes;
