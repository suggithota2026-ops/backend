// User offer controller
const { Op } = require('sequelize');
const { sequelize } = require('../../config/db');
const Notification = require('../../models/notification.model');
const Order = require('../../models/order.model');
const { sendSuccess, sendError } = require('../../utils/response');
const logger = require('../../utils/logger');

const getOffers = async (request, reply) => {
  try {
    const userId = request.user.id;
    const { page = 1, limit = 20, isRead } = request.query;

    const where = {
      type: 'offer', // Only fetch offer notifications
      [Op.or]: [
        { recipientId: userId }, // Offers specifically for this user
        { recipientId: null },   // Broadcast offers for all users
      ],
    };

    if (isRead !== undefined) {
      where.isRead = isRead === 'true';
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows: offers, count: total } = await Notification.findAndCountAll({
      where,
      include: [{
        model: Order,
        as: 'order',
        attributes: ['orderNumber'],
      }],
      order: [['sentAt', 'DESC']],
      offset,
      limit: parseInt(limit),
    });

    return sendSuccess(reply, {
      offers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    }, 'Offers retrieved successfully');
  } catch (error) {
    logger.error('Error fetching offers:', error);
    return sendError(reply, 'Failed to fetch offers', 500);
  }
};

module.exports = {
  getOffers,
};