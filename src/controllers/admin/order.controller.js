// Admin order controller
const Order = require('../../models/order.model');
const Invoice = require('../../models/invoice.model');
const Notification = require('../../models/notification.model');
const { sendSuccess, sendError } = require('../../utils/response');
const { sendOrderNotification } = require('../../services/notification.service');
const { generateInvoice } = require('../../services/invoice.service');
const { ORDER_STATUS } = require('../../config/constants');
const logger = require('../../utils/logger');
const { getStartOfDay, getEndOfDay } = require('../../utils/date');
const { attachHotelsToOrders } = require('../../utils/orderEnrichment');

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
      if (startDate) where.createdAt.$gte = getStartOfDay(new Date(startDate));
      if (endDate) where.createdAt.$lte = getEndOfDay(new Date(endDate));
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [ordersRaw, total] = await Promise.all([
      Order.findAll({
        where,
        order: [['createdAt', 'DESC']],
        offset,
        limit: parseInt(limit),
      }),
      Order.count({ where }),
    ]);

    const orders = await attachHotelsToOrders(ordersRaw);

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

    const order = await Order.findByPk(orderId);

    if (!order) {
      return sendError(reply, 'Order not found', 404);
    }

    const enrichedOrder = await attachHotelsToOrders(order);

    return sendSuccess(reply, enrichedOrder, 'Order retrieved successfully');
  } catch (error) {
    logger.error('Error fetching order:', error);
    return sendError(reply, 'Failed to fetch order', 500);
  }
};

const updateOrder = async (request, reply) => {
  try {
    const { id } = request.params;
    const {
      status,
      assignedTo,
      deliveryCharge,
      paymentMethod,
      specialInstructions,
      items
    } = request.body;

    const orderId = parseInt(id);

    if (isNaN(orderId)) {
      return sendError(reply, 'Invalid order ID', 400);
    }

    const order = await Order.findByPk(orderId);

    if (!order) {
      return sendError(reply, 'Order not found', 404);
    }

    const oldStatus = order.status;
    const updateData = {};

    // Update simple fields
    if (status) updateData.status = status;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo; // Allow null
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    if (specialInstructions !== undefined) updateData.specialInstructions = specialInstructions;

    // Handle Items and Pricing
    let currentSubtotal = parseFloat(order.subtotal);
    let currentDeliveryCharge = parseFloat(order.deliveryCharge);

    if (items && Array.isArray(items)) {
      updateData.items = items;
      // Recalculate subtotal from items
      currentSubtotal = items.reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0);
      updateData.subtotal = currentSubtotal;
    }

    if (deliveryCharge !== undefined) {
      currentDeliveryCharge = parseFloat(deliveryCharge);
      updateData.deliveryCharge = currentDeliveryCharge;
    }

    // Recalculate Total Amount
    updateData.totalAmount = currentSubtotal + currentDeliveryCharge;

    await order.update(updateData);

    await order.reload();

    // Send notification based on status change
    if (status && status !== oldStatus) {
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
    }

    const enrichedOrder = await attachHotelsToOrders(order);

    return sendSuccess(reply, enrichedOrder, 'Order updated successfully');
  } catch (error) {
    logger.error('Error updating order:', error);
    return sendError(reply, 'Failed to update order', 500);
  }
};

const updateOrderStatus = async (request, reply) => {
  try {
    const { id } = request.params;
    const { status, assignedTo, deliveryCharge, paymentMethod } = request.body;
    const orderId = parseInt(id);

    if (isNaN(orderId)) {
      return sendError(reply, 'Invalid order ID', 400);
    }

    const order = await Order.findByPk(orderId);

    if (!order) {
      return sendError(reply, 'Order not found', 404);
    }

    const oldStatus = order.status;
    const updateData = {};
    if (status) updateData.status = status.toLowerCase();

    if (assignedTo !== undefined) {
      updateData.assignedTo = assignedTo;
    }

    if (deliveryCharge !== undefined) {
      updateData.deliveryCharge = parseFloat(deliveryCharge);
      // Recalculate totalAmount: subtotal + new deliveryCharge
      updateData.totalAmount = parseFloat(order.subtotal) + updateData.deliveryCharge;
    }

    if (paymentMethod) {
      updateData.paymentMethod = paymentMethod;
    }

    await order.update(updateData);

    await order.reload();

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

    const enrichedOrder = await attachHotelsToOrders(order);

    return sendSuccess(reply, enrichedOrder, 'Order status updated successfully');
  } catch (error) {
    logger.error('Error updating order status:', error);
    return sendError(reply, 'Failed to update order status', 500);
  }
};

const deleteOrder = async (request, reply) => {
  try {
    const orderId = parseInt(request.params.id, 10);

    if (isNaN(orderId)) {
      return sendError(reply, 'Invalid order ID', 400);
    }

    const order = await Order.findByPk(orderId);

    if (!order) {
      return sendError(reply, 'Order not found', 404);
    }

    const invoice = await Invoice.findOne({ where: { orderId } });
    if (invoice) {
      await invoice.destroy();
    }

    await Notification.deleteMany({ orderId });

    await order.destroy();

    logger.info(`Order deleted: ${orderId}`);
    return sendSuccess(reply, null, 'Order deleted successfully');
  } catch (error) {
    logger.error('Error deleting order:', error);
    return sendError(reply, 'Failed to delete order', 500);
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

const parseQueryDateTime = (dateTimeStr, endOfMinute = false) => {
  const match = dateTimeStr.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const [, datePart, hours, minutes] = match;
  const [year, month, day] = datePart.split('-').map(Number);
  return new Date(
    year,
    month - 1,
    day,
    Number(hours),
    Number(minutes),
    endOfMinute ? 59 : 0,
    endOfMinute ? 999 : 0
  );
};

const getTodaysOrdersSummary = async (request, reply) => {
  try {
    const { startDateTime, endDateTime } = request.query;
    const now = new Date();
    const rangeStart = startDateTime
      ? parseQueryDateTime(startDateTime)
      : getStartOfDay(now);
    const rangeEnd = endDateTime
      ? parseQueryDateTime(endDateTime, true)
      : getEndOfDay(now);

    if (!rangeStart || !rangeEnd) {
      return sendError(reply, 'Invalid date-time range', 400);
    }

    if (rangeStart >= rangeEnd) {
      return sendError(reply, 'Start date-time must be before end date-time', 400);
    }

    // Fetch orders within the selected date/time range
    const ordersRaw = await Order.findAll({
      where: {
        createdAt: {
          $gte: rangeStart,
          $lte: rangeEnd,
        },
      },
      order: [['createdAt', 'ASC']],
    });

    const orders = await attachHotelsToOrders(ordersRaw);

    // Process orders to create client-wise item summary
    const itemSummary = {};

    orders.forEach(order => {
      const clientName = order.hotel?.hotelName || `Hotel #${order.hotelId}`;

      // Process each item in the order
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const itemName = item.productName || item.name || 'Unknown Item';
          const quantity = parseFloat(item.quantity) || 0;

          // Create unique key for item-client combination
          const itemKey = `${itemName}`;

          if (!itemSummary[itemKey]) {
            itemSummary[itemKey] = {
              itemName: itemName,
              clients: {},
              totalQuantity: 0
            };
          }

          // Add client entry if not exists
          if (!itemSummary[itemKey].clients[clientName]) {
            itemSummary[itemKey].clients[clientName] = 0;
          }

          // Add quantity to client
          itemSummary[itemKey].clients[clientName] += quantity;

          // Add to total quantity
          itemSummary[itemKey].totalQuantity += quantity;
        });
      }
    });

    // Convert to array format for easier frontend processing
    const summaryArray = Object.entries(itemSummary).map(([itemName, data]) => ({
      itemName: data.itemName,
      clients: Object.entries(data.clients).map(([clientName, quantity]) => ({
        clientName,
        quantity
      })),
      totalQuantity: data.totalQuantity
    }));

    // Sort by item name
    summaryArray.sort((a, b) => a.itemName.localeCompare(b.itemName));

    const formatTime = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const formatDateOnly = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    return sendSuccess(reply, {
      startDate: formatDateOnly(rangeStart),
      endDate: formatDateOnly(rangeEnd),
      startTime: formatTime(rangeStart),
      endTime: formatTime(rangeEnd),
      startDateTime: rangeStart.toISOString(),
      endDateTime: rangeEnd.toISOString(),
      totalOrders: orders.length,
      summary: summaryArray
    }, 'Orders summary retrieved successfully');

  } catch (error) {
    logger.error('Error fetching today\'s orders summary:', error);
    return sendError(reply, 'Failed to fetch today\'s orders summary', 500);
  }
};

module.exports = {
  getOrders,
  getOrder,
  updateOrderStatus,
  updateOrder,
  deleteOrder,
  generateOrderInvoice,
  getTodaysOrdersSummary,
};
