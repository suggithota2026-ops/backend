// User profile controller
const { Op } = require('sequelize');
const { sequelize } = require('../../config/db');
const User = require('../../models/user.model');
const Order = require('../../models/order.model');
const Notification = require('../../models/notification.model');
const { sendSuccess, sendError } = require('../../utils/response');
const logger = require('../../utils/logger');

const getProfile = async (request, reply) => {
  try {
    const userId = request.user.id;
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['otpCode', 'otpExpiresAt'] },
    });

    if (!user) {
      return sendError(reply, 'User not found', 404);
    }

    // Get order statistics
    // Group by status and count
    const orderStats = await Order.findAll({
      where: { hotelId: userId },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['status'],
      raw: true,
    });

    return sendSuccess(reply, {
      user,
      orderStats: orderStats.map(stat => ({
        _id: stat.status, // Preserve frontend expectation
        count: parseInt(stat.count),
      })),
    }, 'Profile retrieved successfully');
  } catch (error) {
    logger.error('Error fetching profile:', error);
    return sendError(reply, 'Failed to fetch profile', 500);
  }
};

const updateProfile = async (request, reply) => {
  try {
    const userId = request.user.id;
    const { hotelName, address, gstNumber } = request.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return sendError(reply, 'User not found', 404);
    }

    const updateData = {};
    if (hotelName) updateData.hotelName = hotelName;
    if (address) updateData.address = address;
    if (gstNumber !== undefined) {
      updateData.gstNumber = gstNumber ? gstNumber.toUpperCase() : null;
    }

    await user.update(updateData);

    return sendSuccess(reply, user, 'Profile updated successfully');
  } catch (error) {
    logger.error('Error updating profile:', error);
    return sendError(reply, 'Failed to update profile', 500);
  }
};

const getNotifications = async (request, reply) => {
  try {
    const userId = request.user.id;
    const { page = 1, limit = 20, isRead } = request.query;

    const where = {
      [Op.or]: [
        { recipientId: userId },
        {
          recipientId: null, // Broadcast notifications
          type: {
            [Op.notIn]: ['new_order', 'order_cancelled', 'admin_message'] // Exclude admin-specific notifications
          }
        },
      ],
    };

    if (isRead !== undefined) {
      where.isRead = isRead === 'true';
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows: notifications, count: total } = await Notification.findAndCountAll({
      where,
      include: [{
        model: Order,
        as: 'order', // Ensure association exists in models
        attributes: ['orderNumber'],
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
    }, 'Notifications retrieved successfully');
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    return sendError(reply, 'Failed to fetch notifications', 500);
  }
};

const markNotificationAsRead = async (request, reply) => {
  try {
    const userId = request.user.id;
    const { id } = request.params;

    const notification = await Notification.findOne({
      where: {
        id,
        [Op.or]: [
          { recipientId: userId },
          {
            recipientId: null,
            type: {
              [Op.notIn]: ['new_order', 'order_cancelled', 'admin_message'] // Exclude admin-specific notifications
            }
          },
        ],
      },
    });

    if (!notification) {
      return sendError(reply, 'Notification not found', 404);
    }

    // Sequelize update
    await notification.update({ isRead: true });

    return sendSuccess(reply, notification, 'Notification marked as read');
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    return sendError(reply, 'Failed to update notification', 500);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getNotifications,
  markNotificationAsRead,
};
