// Admin notifications controller
const { Op } = require('sequelize');
const Notification = require('../../models/notification.model');
const Order = require('../../models/order.model');
const { sendSuccess, sendError } = require('../../utils/response');
const logger = require('../../utils/logger');

const getNotifications = async (request, reply) => {
    try {
        const { page = 1, limit = 20, isRead } = request.query;
        const { NOTIFICATION_TYPES } = require('../../config/constants');

        const where = {
            type: {
                [Op.in]: [
                    NOTIFICATION_TYPES.NEW_ORDER,           // New orders placed by users
                    NOTIFICATION_TYPES.ORDER_CANCELLED,     // Orders cancelled by users  
                    NOTIFICATION_TYPES.ADMIN_MESSAGE,       // Admin-specific messages
                    NOTIFICATION_TYPES.BROADCAST,           // Broadcast notifications
                ],
            },
        };

        if (isRead !== undefined) {
            where.isRead = isRead === 'true';
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { rows: notifications, count: total } = await Notification.findAndCountAll({
            where,
            include: [{
                model: Order,
                as: 'order',
                attributes: ['orderNumber', 'totalAmount'],
            }],
            order: [['sentAt', 'DESC']],
            offset,
            limit: parseInt(limit),
        });

        return sendSuccess(reply, {
            notifications,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        }, 'Admin notifications retrieved successfully');
    } catch (error) {
        logger.error('Error fetching admin notifications:', error);
        return sendError(reply, 'Failed to fetch notifications', 500);
    }
};

const markAsRead = async (request, reply) => {
    try {
        const { id } = request.params;

        const notification = await Notification.findByPk(id);
        if (!notification) {
            return sendError(reply, 'Notification not found', 404);
        }

        await notification.update({ isRead: true });

        return sendSuccess(reply, notification, 'Notification marked as read');
    } catch (error) {
        logger.error('Error marking notification as read:', error);
        return sendError(reply, 'Failed to update notification', 500);
    }
};

module.exports = {
    getNotifications,
    markAsRead,
};
