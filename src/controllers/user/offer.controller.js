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

    // Enhance offers with additional information from metadata
    const enhancedOffers = offers.map(offer => {
      const enhancedOffer = offer.toJSON();
      
      // Extract offer details from metadata
      const metadata = enhancedOffer.metadata || {};
      
      return {
        ...enhancedOffer,
        title: enhancedOffer.title,
        description: enhancedOffer.message,
        promoCode: metadata.promoCode || '',
        discountType: metadata.discountType || '',
        discountValue: metadata.discountValue || 0,
        validUntil: metadata.validUntil || null,
        categoryIds: metadata.categoryIds || [],
        subcategoryNames: metadata.subcategoryNames || [],
        offerType: metadata.offerType || 'promotional',
      };
    });

    return sendSuccess(reply, {
      offers: enhancedOffers,
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