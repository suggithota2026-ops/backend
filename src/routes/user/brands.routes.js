const { getAllBrands, getBrandById } = require('../../controllers/user/brand.controller');

const userBrandRoutes = async (fastify, options) => {
  // GET /api/brands - Public endpoint for all active brands
  fastify.get('/', {
    schema: {
      description: 'Get all active brands (public)',
      tags: ['Public - Brands'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  name: { type: 'string' },
                  imageUrl: { type: 'string' },
                  description: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, getAllBrands);

  // GET /api/brands/:id - Public endpoint for specific brand
  fastify.get('/:id', {
    schema: {
      description: 'Get brand by ID (public)',
      tags: ['Public - Brands'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'integer' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                name: { type: 'string' },
                imageUrl: { type: 'string' },
                description: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, getBrandById);
};

module.exports = userBrandRoutes;