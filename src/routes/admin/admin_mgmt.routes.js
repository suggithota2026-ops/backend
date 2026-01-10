const {
    getAdmins,
    createAdmin,
    updateAdmin,
    deleteAdmin,
} = require('../../controllers/admin/admin_mgmt.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { requireAdmin } = require('../../middlewares/admin.middleware');

const adminMgmtRoutes = async (fastify, options) => {
    // Staff Routes
    fastify.get('/staff', {
        schema: {
            tags: ['admin'],
            summary: 'Get all staff members',
            security: [{ bearerAuth: [] }],
        },
        // preHandler: [authenticate, requireAdmin],
    }, (request, reply) => {
        const { Op } = require('sequelize');
        request.query.role = { [Op.in]: ['staff', 'ADMIN'] };
        return getAdmins(request, reply);
    });

    fastify.post('/staff', {
        schema: {
            tags: ['admin'],
            summary: 'Create new staff member',
            security: [{ bearerAuth: [] }],
        },
        // preHandler: [authenticate, requireAdmin],
    }, (request, reply) => {
        // Default to staff if not specified, but the controller handles whatever is in body.role
        if (!request.body.role) request.body.role = 'staff';
        return createAdmin(request, reply);
    });

    // Driver Routes
    fastify.get('/drivers', {
        schema: {
            tags: ['admin'],
            summary: 'Get all drivers',
            security: [{ bearerAuth: [] }],
        },
        // preHandler: [authenticate, requireAdmin],
    }, (request, reply) => {
        request.query.role = 'driver';
        return getAdmins(request, reply);
    });

    fastify.post('/drivers', {
        schema: {
            tags: ['admin'],
            summary: 'Create new driver',
            security: [{ bearerAuth: [] }],
        },
        // preHandler: [authenticate, requireAdmin],
    }, (request, reply) => {
        request.body.role = 'driver';
        return createAdmin(request, reply);
    });

    // Common Routes
    fastify.put('/users/:id', {
        schema: {
            tags: ['admin'],
            summary: 'Update user (staff/driver/admin)',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
            },
        },
        // preHandler: [authenticate, requireAdmin],
    }, updateAdmin);

    fastify.delete('/users/:id', {
        schema: {
            tags: ['admin'],
            summary: 'Delete user (staff/driver/admin)',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
            },
        },
        // preHandler: [authenticate, requireAdmin],
    }, deleteAdmin);
};

module.exports = adminMgmtRoutes;
