// Admin notifications routes
const {
    getNotifications,
    pushPromotionalOffer,
    markAsRead,
} = require('../../controllers/admin/notifications.controller');
const { authenticate, requireSuperAdmin } = require('../../middlewares/auth.middleware');
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
    
    // New route for pushing promotional offers
    fastify.post('/notifications/promotional-offer', {
        schema: {
            tags: ['admin'],
            summary: 'Push promotional offer notification',
            security: [{ bearerAuth: [] }],
            body: {
                type: 'object',
                required: ['title', 'description', 'discountType', 'discountValue', 'validUntil'],
                properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    promoCode: { type: 'string' },
                    discountType: { type: 'string', enum: ['percentage', 'flat'] },
                    discountValue: { type: 'number' },
                    validUntil: { type: 'string', format: 'date' },
                    categoryIds: { type: 'array', items: { type: 'integer' } },
                    subcategoryNames: { type: 'array', items: { type: 'string' } },
                    hotelIds: { type: 'array', items: { type: 'integer' } },
                },
            },
        },
        preHandler: [authenticate, requireAdmin],
    }, pushPromotionalOffer);
};

module.exports = notificationRoutes;
