// User offer controller
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
      $or: [{ recipientId: Number(userId) }, { recipientId: null }],
    };

    if (isRead !== undefined) {
      where.isRead = isRead === 'true';
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows: offers, count: total } = await Notification.findAndCountAll({
      where,
      order: [['sentAt', 'DESC']],
      offset,
      limit: parseInt(limit),
    });

    const orderIds = [...new Set(offers.map(o => o.orderId).filter(Boolean))];
    const orders = orderIds.length
      ? await Order.findAll({ where: { id: { $in: orderIds } }, attributes: ['id', 'orderNumber'] })
      : [];
    const orderMap = new Map(orders.map(o => [o.id, o]));

    // Enhance offers with additional information from metadata
    const enhancedOffers = offers.map(offer => {
      const enhancedOffer = offer.toJSON();
      if (enhancedOffer.orderId) enhancedOffer.order = orderMap.get(enhancedOffer.orderId) || null;
      
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