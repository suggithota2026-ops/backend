// Admin notifications routes
const {
    getNotifications,
    markAsRead,
} = require('../../controllers/admin/notifications.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { requireAdmin } = require('../../middlewares/admin.middleware');

const notificationRoutes = async (fastify, options) => {
    fastify.get('/notifications', {
        schema: {
            tags: ['admin'],
            summary: 'Get all notifications (Admin)',
            security: [{ bearerAuth: [] }],
            querystring: {
                type: 'object',
                properties: {
                    page: { type: 'number' },
                    limit: { type: 'number' },
                    isRead: { type: 'boolean' },
                },
            },
        },
        // preHandler: [authenticate, requireAdmin],
    }, getNotifications);

    fastify.put('/notifications/:id/read', {
        schema: {
            tags: ['admin'],
            summary: 'Mark notification as read (Admin)',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
            },
        },
        // preHandler: [authenticate, requireAdmin],
    }, markAsRead);
};

module.exports = notificationRoutes;
