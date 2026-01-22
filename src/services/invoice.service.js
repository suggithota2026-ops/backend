// Invoice service
const Invoice = require('../models/invoice.model');
const Order = require('../models/order.model');
const User = require('../models/user.model');
const { generateInvoicePDF } = require('../utils/pdfGenerator');
const logger = require('../utils/logger');
const { INVOICE_STATUS } = require('../config/constants');

const generateInvoice = async (orderId) => {
  try {
    const order = await Order.findByPk(orderId, {
      include: [{
        model: User,
        as: 'hotel',
        attributes: ['hotelName', 'address', 'gstNumber'],
      }],
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Check if invoice already exists
    let invoice = await Invoice.findOne({ where: { orderId } });
    if (invoice) {
      return invoice;
    }

    // Calculate GST if hotel has GST number
    const gstRate = order.hotel && order.hotel.gstNumber ? 18 : 0; // 18% GST
    const subtotal = parseFloat(order.subtotal);
    const deliveryCharge = parseFloat(order.deliveryCharge || 0);
    const gstAmount = (subtotal * gstRate) / 100;
    const totalAmount = subtotal + deliveryCharge + gstAmount;

    // Create invoice
    invoice = await Invoice.create({
      orderId,
      hotelId: order.hotelId,
      subtotal,
      deliveryCharge,
      gstAmount,
      gstRate,
      totalAmount,
      status: INVOICE_STATUS.GENERATED,
    });

    // Generate PDF
    const { filePath, fileName } = await generateInvoicePDF(
      invoice,
      order,
      order.hotel
    );

    invoice.pdfPath = filePath;
    await invoice.save();

    // Update order with invoice reference
    order.invoiceId = invoice.id;
    await order.save();

    logger.info(`Invoice generated: ${invoice.invoiceNumber}`);
    return invoice;
  } catch (error) {
    logger.error('Error generating invoice:', error);
    throw error;
  }
};

const getInvoiceByOrder = async (orderId) => {
  return await Invoice.findOne({
    where: { orderId },
    include: [
      { model: Order, as: 'order' }, // Assuming association exists or will be ignored if not needed here
      // Invoice doesn't directly belong to Hotel usually, it belongs to Order which belongs to Hotel
      // But if Invoice model has hotelId, we can include User as hotel
      /* { model: User, as: 'hotel' } */
    ],
  });
};

const markInvoiceAsPaid = async (invoiceId) => {
  const invoice = await Invoice.findByPk(invoiceId);
  if (!invoice) {
    throw new Error('Invoice not found');
  }

  invoice.status = INVOICE_STATUS.PAID;
  invoice.paidAt = new Date();
  await invoice.save();

  // Update order payment status
  const order = await Order.findByPk(invoice.orderId);
  if (order) {
    await order.update({ paymentStatus: 'paid' });
  }

  return invoice;
};

module.exports = {
  generateInvoice,
  getInvoiceByOrder,
  markInvoiceAsPaid,
};
