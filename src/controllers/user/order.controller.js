// User order controller
const Order = require('../../models/order.model');
const Product = require('../../models/product.model');
const User = require('../../models/user.model');
const Invoice = require('../../models/invoice.model');
const { sendSuccess, sendError } = require('../../utils/response');
const { ORDER_STATUS } = require('../../config/constants');
const { sendAdminOrderNotification } = require('../../services/notification.service');
const logger = require('../../utils/logger');

const createOrder = async (request, reply) => {
  try {
    const userId = request.user.id;
    const { items, specialInstructions, deliveryTime, hotelId } = request.body;

    // Determine which hotel ID to use
    let finalHotelId;
    if (hotelId) {
      // If hotelId is provided in request, validate it exists
      const hotelIdInt = parseInt(hotelId);
      if (isNaN(hotelIdInt)) {
        return sendError(reply, 'Invalid hotel ID', 400);
      }

      const hotel = await User.findByPk(hotelIdInt);
      if (!hotel) {
        return sendError(reply, 'Hotel not available', 400);
      }

      // Check if hotel is blocked
      if (hotel.isBlocked) {
        return sendError(reply, 'Hotel not available', 400);
      }

      finalHotelId = hotelIdInt;
    } else {
      // If no hotelId provided, use authenticated user's ID
      finalHotelId = parseInt(userId);
    }

    // Validate and fetch products
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const productId = parseInt(item.product);
      if (isNaN(productId)) {
        logger.error(`Invalid product ID: ${item.product}`);
        return sendError(reply, `Invalid product ID: ${item.product}`, 400);
      }

      const product = await Product.findByPk(productId);
      if (!product) {
        logger.error(`Product not found: ${productId}`);
        return sendError(reply, `Product ${item.product} not found`, 400);
      }

      if (!product.isActive || product.status !== 'active') {
        logger.error(`Product out of stock: ${productId}, isActive: ${product.isActive}, status: ${product.status}`);
        return sendError(reply, `Product ${product.name} is currently out of stock`, 400);
      }

      if (item.quantity < product.stock) {
        // Validation for Minimum Order Quantity
        // product.stock now represents the Minimum Order Quantity
        return sendError(reply, `Minimum order quantity for ${product.name} is ${product.stock} ${product.unit || 'units'}.`, 400);
      }

      const unitPrice = parseFloat(product.price);
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      orderItems.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
      });
    }

    if (orderItems.length === 0) {
      return sendError(reply, 'Order must have at least one item', 400);
    }

    // Create order
    const order = await Order.create({
      hotelId: finalHotelId,
      items: orderItems,
      subtotal,
      totalAmount: subtotal, // GST will be calculated in invoice
      specialInstructions,
      deliveryTime: deliveryTime ? new Date(deliveryTime) : undefined,
      status: ORDER_STATUS.PENDING,
    });

    // Reload order to get orderNumber (generated in beforeCreate hook)
    await order.reload();

    // Update product stock - REMOVED
    // We are now using 'stock' as Minimum Order Quantity, so it should not decrease.
    /*
    for (const item of items) {
      const productId = parseInt(item.product);
      const product = await Product.findByPk(productId);
      if (product) {
        await product.update({
          stock: product.stock - item.quantity,
        });
      }
    }
    */

    // Fetch hotel information to include in response
    const hotel = await User.findByPk(finalHotelId, {
      attributes: ['id', 'hotelName', 'mobileNumber', 'address'],
    });

    // Send notification to all admins about the new order
    try {
      await sendAdminOrderNotification(order, hotel);
    } catch (notificationError) {
      // Log error but don't fail the order creation
      logger.error('Error sending admin notification for new order:', notificationError);
    }

    // Prepare response with hotel information
    const orderData = order.toJSON();
    const responseData = {
      ...orderData,
      hotel: hotel ? {
        id: hotel.id,
        name: hotel.hotelName,
        mobileNumber: hotel.mobileNumber,
        address: hotel.address,
      } : null,
    };

    return sendSuccess(reply, responseData, 'Order placed successfully', 201);
  } catch (error) {
    logger.error('Error creating order:', error);
    return sendError(reply, 'Failed to create order', 500);
  }
};

const getOrders = async (request, reply) => {
  try {
    const userId = request.user.id;
    const { page = 1, limit = 20, status } = request.query;

    const where = { hotelId: parseInt(userId) };
    if (status) {
      where.status = status;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      Order.findAll({
        where,
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
    const userId = request.user.id;
    const { id } = request.params;
    const orderId = parseInt(id);

    if (isNaN(orderId)) {
      return sendError(reply, 'Invalid order ID', 400);
    }

    const order = await Order.findOne({
      where: {
        id: orderId,
        hotelId: parseInt(userId),
      },
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

const reorder = async (request, reply) => {
  try {
    const userId = request.user.id;
    const { orderId } = request.body;
    const prevOrderId = parseInt(orderId);

    if (isNaN(prevOrderId)) {
      return sendError(reply, 'Invalid order ID', 400);
    }

    const previousOrder = await Order.findOne({
      where: {
        id: prevOrderId,
        hotelId: parseInt(userId),
      },
    });

    if (!previousOrder) {
      return sendError(reply, 'Previous order not found', 404);
    }

    // Create new order with same items
    const newItems = previousOrder.items.map((item) => ({
      product: item.productId || item.product,
      quantity: item.quantity,
    }));

    const { items, specialInstructions, deliveryTime } = request.body;
    const orderData = {
      items: items || newItems,
      specialInstructions: specialInstructions || previousOrder.specialInstructions,
      deliveryTime: deliveryTime || previousOrder.deliveryTime,
    };

    // Reuse create order logic
    request.body = orderData;
    return await createOrder(request, reply);
  } catch (error) {
    logger.error('Error reordering:', error);
    return sendError(reply, 'Failed to reorder', 500);
  }
};

const getInvoice = async (request, reply) => {
  try {
    const userId = request.user.id;
    const { orderId } = request.params;
    const orderIdInt = parseInt(orderId);

    if (isNaN(orderIdInt)) {
      return sendError(reply, 'Invalid order ID', 400);
    }

    const order = await Order.findOne({
      where: {
        id: orderIdInt,
        hotelId: parseInt(userId),
      },
    });
    if (!order) {
      return sendError(reply, 'Order not found', 404);
    }

    const invoice = await Invoice.findOne({
      where: { orderId: orderIdInt },
    });
    if (!invoice) {
      return sendError(reply, 'Invoice not generated yet', 404);
    }

    return sendSuccess(reply, invoice, 'Invoice retrieved successfully');
  } catch (error) {
    logger.error('Error fetching invoice:', error);
    return sendError(reply, 'Failed to fetch invoice', 500);
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrder,
  reorder,
  getInvoice,
};
