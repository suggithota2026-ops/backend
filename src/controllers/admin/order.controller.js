// Admin order controller
const { Op } = require('sequelize');
const Order = require('../../models/order.model');
const User = require('../../models/user.model');
const { sendSuccess, sendError } = require('../../utils/response');
const { sendOrderNotification } = require('../../services/notification.service');
const { generateInvoice } = require('../../services/invoice.service');
const { ORDER_STATUS } = require('../../config/constants');
const logger = require('../../utils/logger');

const getOrders = async (request, reply) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      hotel,
      startDate,
      endDate,
    } = request.query;

    const where = {};
    if (status) where.status = status;
    if (hotel) where.hotelId = parseInt(hotel);
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      Order.findAll({
        where,
        include: [{
          model: User,
          as: 'hotel',
          attributes: ['id', 'hotelName', 'mobileNumber', 'address'],
          required: false,
        }],
        order: [['createdAt', 'DESC']],
        offset,
        limit: parseInt(limit),
      }),
      Order.count({ where }),
    ]);

    return sendSuccess(reply, {
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    }, 'Orders retrieved successfully');
  } catch (error) {
    logger.error('Error fetching orders:', error);
    return sendError(reply, 'Failed to fetch orders', 500);
  }
};

const getOrder = async (request, reply) => {
  try {
    const { id } = request.params;
    const orderId = parseInt(id);
    
    if (isNaN(orderId)) {
      return sendError(reply, 'Invalid order ID', 400);
    }
    
    const order = await Order.findByPk(orderId, {
      include: [{
        model: User,
        as: 'hotel',
        attributes: ['id', 'hotelName', 'mobileNumber', 'address', 'gstNumber'],
        required: false,
      }],
    });
    
    if (!order) {
      return sendError(reply, 'Order not found', 404);
    }

    return sendSuccess(reply, order, 'Order retrieved successfully');
  } catch (error) {
    logger.error('Error fetching order:', error);
    return sendError(reply, 'Failed to fetch order', 500);
  }
};

const updateOrderStatus = async (request, reply) => {
  try {
    const { id } = request.params;
    const { status, assignedTo } = request.body;
    const orderId = parseInt(id);
    
    if (isNaN(orderId)) {
      return sendError(reply, 'Invalid order ID', 400);
    }

    const order = await Order.findByPk(orderId, {
      include: [{
        model: User,
        as: 'hotel',
        required: false,
      }],
    });
    
    if (!order) {
      return sendError(reply, 'Order not found', 404);
    }

    const oldStatus = order.status;
    const updateData = { status };
    if (assignedTo) {
      updateData.assignedTo = assignedTo;
    }

    await order.update(updateData);
    
    // Reload order to get updated data
    await order.reload({
      include: [{
        model: User,
        as: 'hotel',
        required: false,
      }],
    });

    // Send notification based on status change
    if (status === ORDER_STATUS.CONFIRMED && oldStatus === ORDER_STATUS.PENDING) {
      await sendOrderNotification(order, 'order_confirmation', order.hotelId);
    } else if (status === ORDER_STATUS.DISPATCHED && oldStatus !== ORDER_STATUS.DISPATCHED) {
      await sendOrderNotification(order, 'order_dispatched', order.hotelId);
    } else if (status === ORDER_STATUS.DELIVERED && oldStatus !== ORDER_STATUS.DELIVERED) {
      await sendOrderNotification(order, 'order_delivered', order.hotelId);
      // Generate invoice when order is delivered
      await generateInvoice(order.id);
    } else if (status === ORDER_STATUS.CANCELLED && oldStatus !== ORDER_STATUS.CANCELLED) {
      await sendOrderNotification(order, 'order_cancelled', order.hotelId);
    }

    return sendSuccess(reply, order, 'Order status updated successfully');
  } catch (error) {
    logger.error('Error updating order status:', error);
    return sendError(reply, 'Failed to update order status', 500);
  }
};

const generateOrderInvoice = async (request, reply) => {
  try {
    const { id } = request.params;
    const invoice = await generateInvoice(id);
    return sendSuccess(reply, invoice, 'Invoice generated successfully');
  } catch (error) {
    logger.error('Error generating invoice:', error);
    return sendError(reply, error.message || 'Failed to generate invoice', 500);
  }
};

module.exports = {
  getOrders,
  getOrder,
  updateOrderStatus,
  generateOrderInvoice,
};
