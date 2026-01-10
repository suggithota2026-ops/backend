// Notification service
const { Op } = require('sequelize');
const Notification = require('../models/notification.model');
const { getFirebaseApp } = require('../config/firebase');
const logger = require('../utils/logger');
const User = require('../models/user.model');

const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  try {
    const app = getFirebaseApp();
    if (!app) {
      logger.warn('Firebase not initialized, skipping push notification');
      return false;
    }

    const messaging = app.messaging();
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
      token: fcmToken,
    };

    await messaging.send(message);
    logger.info(`Push notification sent to ${fcmToken}`);
    return true;
  } catch (error) {
    logger.error('Error sending push notification:', error);
    return false;
  }
};

const createNotification = async (notificationData) => {
  try {
    // Correct field mapping for Sequelize model
    const payload = {
      ...notificationData,
      recipientId: notificationData.recipient,
      orderId: notificationData.order,
      // Ensure metadata is valid JSON or object
      metadata: notificationData.metadata || {},
    };

    const notification = await Notification.create(payload);

    // Send push notification if recipient has FCM token
    if (notificationData.recipient) {
      const user = await User.findByPk(notificationData.recipient);
      if (user && user.fcmToken) {
        await sendPushNotification(
          user.fcmToken,
          notificationData.title,
          notificationData.message,
          {
            type: notificationData.type,
            orderId: notificationData.order ? String(notificationData.order) : '',
          }
        );
      }
    } else {
      // Broadcast notification to all users with FCM tokens
      const users = await User.findAll({
        where: { fcmToken: { [Op.ne]: null } }
      });

      for (const user of users) {
        await sendPushNotification(
          user.fcmToken,
          notificationData.title,
          notificationData.message,
          {
            type: notificationData.type,
          }
        );
      }
    }

    return notification;
  } catch (error) {
    logger.error('Error creating notification:', error);
    throw error;
  }
};

const sendOrderNotification = async (order, type, hotelId) => {
  const orderId = order.orderNumber || `#${order.id}`;

  const messages = {
    order_confirmation: {
      title: 'Order Confirmed 🥕🍎',
      message: `Order ID: ${orderId}\n\nYour order has been confirmed! We're carefully picking fresh fruits and vegetables just for you. 🧺`,
    },
    order_dispatched: {
      title: 'Order Dispatched 🚚',
      message: `Order ID: ${orderId}\n\nGood news! Your fresh fruits and vegetables are on the way and will reach you shortly. 🥬🍌`,
    },
    order_delivered: {
      title: 'Order Delivered ✅',
      message: `Order ID: ${orderId}\n\nYour order has been successfully delivered! We hope you enjoy your fresh fruits and vegetables. Thank you for choosing us! 🎉🥕🍎`,
    },
    order_cancelled: {
      title: 'Order Cancelled ❌',
      message: `Order ID: ${orderId}\n\nYour order has been cancelled. If this was a mistake or you need help, please contact our support team. We're here for you.`,
    },
  };

  const notificationData = messages[type];
  if (!notificationData) return;

  return await createNotification({
    type,
    title: notificationData.title,
    message: notificationData.message,
    recipient: hotelId,
    order: order.id,
  });
};

const sendAdminOrderNotification = async (order, hotel) => {
  try {
    const { NOTIFICATION_TYPES } = require('../config/constants');

    const orderId = order.orderNumber || `#${order.id}`;
    const hotelName = hotel?.hotelName || 'Unknown Hotel';

    // Format item list
    const items = order.items || [];
    let itemList = '';
    let itemCount = 0;

    if (items.length > 0) {
      itemList = items.map((item, index) => {
        const productName = item.productName || 'Unknown Product';
        const quantity = item.quantity || 0;
        itemCount += quantity;
        return `${index + 1}. ${productName} - Qty: ${quantity}`;
      }).join('\n');
    } else {
      itemList = 'No items';
    }

    const title = 'New Order Received 📦';
    const message = `Order ID: ${orderId}\n\nHotel Name: ${hotelName}\n\nItem List:\n${itemList}\n\nItem Count: ${itemCount}\n\nA new order has been placed and is waiting for your confirmation.`;

    // Create a broadcast notification (recipientId: null) for all admins to see
    const notification = await createNotification({
      type: NOTIFICATION_TYPES.NEW_ORDER,
      title,
      message,
      recipient: null,  // Broadcast to all admins
      order: order.id,
      metadata: {
        orderId: order.id,
        orderNumber: orderId,
        hotelId: hotel?.id,
        hotelName: hotelName,
        totalAmount: order.totalAmount,
        itemCount: itemCount,
      },
    });

    logger.info(`Sent new order notification for order ${orderId}`);
    return notification;
  } catch (error) {
    logger.error('Error sending admin order notification:', error);
    throw error;
  }
};

module.exports = {
  createNotification,
  sendPushNotification,
  sendOrderNotification,
  sendAdminOrderNotification,
};
