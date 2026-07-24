// User profile controller
const User = require('../../models/user.model');
const Order = require('../../models/order.model');
const Notification = require('../../models/notification.model');
const { sendSuccess, sendError } = require('../../utils/response');
const logger = require('../../utils/logger');

const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const formatProfileResponse = (user) => {
  const data = user.toJSON ? user.toJSON() : user;
  return {
    ...data,
    personalDetails: {
      name: data.name || null,
      mobileNumber: data.mobileNumber || null,
      email: data.email || null,
    },
    businessDetails: {
      hotelName: data.hotelName || null,
      gstNumber: data.gstNumber || null,
      address: data.address || null,
    },
  };
};

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
    const orderStats = await Order.aggregate([
      { $match: { hotelId: Number(userId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    return sendSuccess(reply, {
      user: formatProfileResponse(user),
      orderStats: orderStats.map(stat => ({
        _id: stat._id,
        count: parseInt(stat.count || 0),
      })),
    }, 'Profile retrieved successfully');
  } catch (error) {
    logger.error('Error fetching profile:', error);
    return sendError(reply, 'Failed to fetch profile', 500);
  }
};

const updateProfile = async (request, reply) => {
  try {
    const userId = Number(request.user.id);
    const body = request.body || {};
    const personal = body.personalDetails || body.personal || {};
    const business = body.businessDetails || body.business || {};

    // Personal details (separate from business)
    const personalName =
      personal.name ?? body.personalName ?? body.name;
    const email = personal.email ?? body.email;

    // Business details (separate from personal)
    const hotelName =
      business.hotelName ??
      business.name ??
      body.hotelName ??
      body.hotel_name ??
      body.businessName;
    const address =
      business.address ??
      body.address ??
      body.hotelAddress ??
      body.hotel_address;
    const gstNumber =
      business.gstNumber ??
      body.gstNumber ??
      body.gst_number ??
      body.gstin ??
      body.gst;
    const fcmToken = body.fcmToken ?? body.fcm_token;

    if (
      personalName === undefined &&
      email === undefined &&
      hotelName === undefined &&
      address === undefined &&
      gstNumber === undefined &&
      fcmToken === undefined
    ) {
      return sendError(
        reply,
        'No profile fields to update. Send personalDetails (name, email) and/or businessDetails (hotelName, address, gstNumber).',
        400
      );
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return sendError(reply, 'User not found', 404);
    }

    const updateData = {};

    // Personal
    if (personalName !== undefined) {
      const value = String(personalName).trim();
      updateData.name = value || null;
    }

    if (email !== undefined) {
      const value = String(email).trim().toLowerCase();
      if (value && !EMAIL_REGEX.test(value)) {
        return sendError(reply, 'Invalid email format', 400);
      }
      updateData.email = value || null;
    }

    // Business
    if (hotelName !== undefined) {
      const value = String(hotelName).trim();
      updateData.hotelName = value || null;
    }

    if (address !== undefined) {
      const value = String(address).trim();
      updateData.address = value || null;
    }

    if (gstNumber !== undefined) {
      const gst = String(gstNumber).trim().toUpperCase();
      if (gst && !GST_REGEX.test(gst)) {
        return sendError(reply, 'Invalid GST number format', 400);
      }
      updateData.gstNumber = gst || null;
    }

    if (fcmToken !== undefined) {
      updateData.fcmToken = fcmToken ? String(fcmToken).trim() : null;
    }

    // Persist with $set so changes always write to MongoDB
    const updated = await User.findOneAndUpdate(
      { id: userId },
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-otpCode -otpExpiresAt');

    if (!updated) {
      return sendError(reply, 'User not found', 404);
    }

    logger.info(
      `Profile updated for user ${userId}: ${Object.keys(updateData).join(', ')}`
    );

    return sendSuccess(
      reply,
      { user: formatProfileResponse(updated) },
      'Profile updated successfully'
    );
  } catch (error) {
    logger.error('Error updating profile:', error);
    return sendError(reply, 'Failed to update profile', 500);
  }
};

const getNotifications = async (request, reply) => {
  try {
    const userId = request.user.id;
    const { page = 1, limit = 20, isRead } = request.query;

    const baseWhere = {
      type: { $ne: 'offer' },
      $or: [
        { recipientId: Number(userId) },
        {
          recipientId: null,
          type: { $nin: ['new_order', 'order_cancelled', 'admin_message'] },
        },
      ],
    };
    if (isRead !== undefined) baseWhere.isRead = isRead === 'true';

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total] = await Promise.all([
      Notification.find(baseWhere).sort({ sentAt: -1 }).skip(offset).limit(parseInt(limit)).exec(),
      Notification.countDocuments(baseWhere).exec(),
    ]);

    const orderIds = [...new Set(notifications.map(n => n.orderId).filter(Boolean))];
    const orders = orderIds.length
      ? await Order.findAll({ where: { id: { $in: orderIds } }, attributes: ['id', 'orderNumber'] })
      : [];
    const orderMap = new Map(orders.map(o => [o.id, o]));

    const enriched = notifications.map(n => {
      const obj = n.toJSON();
      if (obj.orderId) obj.order = orderMap.get(obj.orderId) || null;
      return obj;
    });

    return sendSuccess(reply, {
      notifications: enriched,
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
        id: Number(id),
        type: { $ne: 'offer' },
        $or: [
          { recipientId: Number(userId) },
          { recipientId: null, type: { $nin: ['new_order', 'order_cancelled', 'admin_message'] } },
        ],
      },
    });

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
  getProfile,
  updateProfile,
  getNotifications,
  markNotificationAsRead,
};
