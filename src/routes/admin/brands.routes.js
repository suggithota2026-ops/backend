// Brand routes
const { 
  getAllBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
  toggleBrandStatus
} = require('../../controllers/admin/brand.controller');
const { authenticateAdmin } = require('../../middlewares/admin.middleware');

const brandRoutes = async (fastify, options) => {
  // GET /api/admin/brands - Get all brands
  fastify.get('/', {
    preHandler: authenticateAdmin,
    schema: {
      description: 'Get all brands',
      tags: ['Admin - Brands'],
      querystring: {
        type: 'object',
        properties: {
          isActive: { type: 'string', enum: ['true', 'false'] }
        }
      },
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
                  description: { type: 'string' },
                  isActive: { type: 'boolean' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                  creator: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      name: { type: 'string' },
                      mobile: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, getAllBrands);

  // GET /api/admin/brands/:id - Get brand by ID
  fastify.get('/:id', {
    preHandler: authenticateAdmin,
    schema: {
      description: 'Get brand by ID',
      tags: ['Admin - Brands'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'integer' }
        },
        required: ['id']
      }
    }
  }, getBrandById);

  // POST /api/admin/brands - Create new brand
  fastify.post('/', {
    preHandler: authenticateAdmin,
    schema: {
      description: 'Create new brand',
      tags: ['Admin - Brands'],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          imageUrl: { type: 'string', minLength: 1 },
          description: { type: 'string' }
        },
        required: ['name', 'imageUrl']
      }
    }
  }, createBrand);

  // PUT /api/admin/brands/:id - Update brand
  fastify.put('/:id', {
    preHandler: authenticateAdmin,
    schema: {
      description: 'Update brand',
      tags: ['Admin - Brands'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'integer' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          imageUrl: { type: 'string' },
          description: { type: 'string' },
          isActive: { type: 'boolean' }
        }
      }
    }
  }, updateBrand);

  // DELETE /api/admin/brands/:id - Delete brand
  fastify.delete('/:id', {
    preHandler: authenticateAdmin,
    schema: {
      description: 'Delete brand',
      tags: ['Admin - Brands'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'integer' }
        },
        required: ['id']
      }
    }
  }, deleteBrand);

  // PATCH /api/admin/brands/:id/toggle-status - Toggle brand status
  fastify.patch('/:id/toggle-status', {
    preHandler: authenticateAdmin,
    schema: {
      description: 'Toggle brand active status',
      tags: ['Admin - Brands'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'integer' }
        },
        required: ['id']
      }
    }
  }, toggleBrandStatus);
};

module.exports = brandRoutes;