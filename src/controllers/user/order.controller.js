// User order controller
const Order = require('../../models/order.model');
const Product = require('../../models/product.model');
const User = require('../../models/user.model');
const Invoice = require('../../models/invoice.model');
const { sendSuccess, sendError } = require('../../utils/response');
const { ORDER_STATUS } = require('../../config/constants');
const { sendAdminOrderNotification } = require('../../services/notification.service');
const logger = require('../../utils/logger');
const { getActiveCustomerPricing } = require('../../controllers/admin/hotel.controller');

async function buildOrderItems(items, hotelId) {
  const user = await User.findByPk(hotelId);
  if (!user) {
    return { error: 'User not found', statusCode: 404 };
  }

  const orderItems = [];
  let subtotal = 0;

  for (const item of items) {
    const productId = parseInt(item.product);
    if (isNaN(productId)) {
      logger.error(`Invalid product ID: ${item.product}`);
      return { error: `Invalid product ID: ${item.product}`, statusCode: 400 };
    }

    const product = await Product.findByPk(productId);
    if (!product) {
      logger.error(`Product not found: ${productId}`);
      return { error: `Product ${item.product} not found`, statusCode: 400 };
    }

    if (!product.isActive || product.status !== 'active') {
      logger.error(`Product out of stock: ${productId}, isActive: ${product.isActive}, status: ${product.status}`);
      return { error: `Product ${product.name} is currently out of stock`, statusCode: 400 };
    }

    if (item.quantity < product.stock) {
      return {
        error: `Minimum order quantity for ${product.name} is ${product.stock} ${product.unit || 'units'}.`,
        statusCode: 400,
      };
    }

    let unitPrice;
    if (user.rateType === 'Fixed Price') {
      const customerSpecificPrice = await getActiveCustomerPricing(hotelId, productId);
      unitPrice = customerSpecificPrice
        ? parseFloat(customerSpecificPrice)
        : parseFloat(product.price);
    } else {
      unitPrice = parseFloat(product.price);
    }

    const totalPrice = unitPrice * item.quantity;
    subtotal += totalPrice;

    orderItems.push({
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      unit: product.unit,
      unitPrice,
      totalPrice,
    });
  }

  if (orderItems.length === 0) {
    return { error: 'Order must have at least one item', statusCode: 400 };
  }

  return { orderItems, subtotal };
}

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

    // Get the user to check their rate type
    const user = await User.findByPk(finalHotelId);
    if (!user) {
      return sendError(reply, 'User not found', 404);
    }

    const built = await buildOrderItems(items, finalHotelId);
    if (built.error) {
      return sendError(reply, built.error, built.statusCode);
    }

    const { orderItems, subtotal } = built;

    // Create order
    const deliveryCharge = subtotal < 299 ? 40 : 0;

    const order = await Order.create({
      hotelId: finalHotelId,
      items: orderItems,
      subtotal,
      deliveryCharge,
      totalAmount: subtotal + deliveryCharge, // GST will be calculated in invoice
      specialInstructions,
      deliveryTime: deliveryTime ? new Date(deliveryTime) : undefined,
      status: ORDER_STATUS.PENDING,
    });

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
    const message =
      process.env.NODE_ENV === 'production'
        ? 'Failed to create order'
        : error.message || 'Failed to create order';
    return sendError(reply, message, 500);
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

const updateOrder = async (request, reply) => {
  try {
    const userId = request.user.id;
    const { id } = request.params;
    const orderId = parseInt(id);
    const { items, specialInstructions, deliveryTime } = request.body;

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

    if (order.status !== ORDER_STATUS.PENDING) {
      return sendError(reply, 'Only pending orders can be edited', 400);
    }

    const built = await buildOrderItems(items, parseInt(userId));
    if (built.error) {
      return sendError(reply, built.error, built.statusCode);
    }

    const { orderItems, subtotal } = built;
    const deliveryCharge = subtotal < 299 ? 40 : 0;

    await order.update({
      items: orderItems,
      subtotal,
      deliveryCharge,
      totalAmount: subtotal + deliveryCharge,
      specialInstructions: specialInstructions !== undefined ? specialInstructions : order.specialInstructions,
      deliveryTime: deliveryTime ? new Date(deliveryTime) : order.deliveryTime,
    });

    await order.reload();

    const hotel = await User.findByPk(parseInt(userId), {
      attributes: ['id', 'hotelName', 'mobileNumber', 'address'],
    });

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

    return sendSuccess(reply, responseData, 'Order updated successfully');
  } catch (error) {
    logger.error('Error updating order:', error);
    return sendError(reply, 'Failed to update order', 500);
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
  updateOrder,
  reorder,
  getInvoice,
};
