// PDF invoice generator using PDFKit
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { formatDate } = require('./date');

const generateInvoicePDF = (invoice, order, hotel) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const fileName = `invoice_${invoice.invoiceNumber}_${Date.now()}.pdf`;
      const filePath = path.join(__dirname, '../../uploads/invoices', fileName);

      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Header
      doc.fontSize(20).text('PRK SMILES', { align: 'center' });
      doc.fontSize(14).text('INVOICE', { align: 'center' });
      doc.moveDown();

      // Invoice details
      doc.fontSize(10);
      doc.text(`Invoice Number: ${invoice.invoiceNumber}`, 50, 120);
      doc.text(`Date: ${formatDate(invoice.createdAt, 'YYYY-MM-DD')}`, 50, 135);
      doc.text(`Order ID: ${order.orderNumber}`, 50, 150);

      // Hotel details
      doc.text('Bill To:', 350, 120);
      doc.text(hotel.hotelName || 'N/A', 350, 135);
      doc.text(hotel.address || 'N/A', 350, 150);
      if (hotel.gstNumber) {
        doc.text(`GST: ${hotel.gstNumber}`, 350, 165);
      }

      doc.moveDown(2);

      // Items table
      let yPosition = 200;
      doc.fontSize(12).text('Items', 50, yPosition);
      yPosition += 20;

      // Table header
      doc.fontSize(10);
      doc.text('Product', 50, yPosition);
      doc.text('Qty', 250, yPosition);
      doc.text('Unit Price', 300, yPosition);
      doc.text('Total', 400, yPosition);
      yPosition += 15;

      // Table line
      doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
      yPosition += 10;

      // Items
      order.items.forEach((item) => {
        doc.text(item.productName || 'N/A', 50, yPosition);
        doc.text(String(item.quantity), 250, yPosition);
        doc.text(`₹${parseFloat(item.unitPrice).toFixed(2)}`, 300, yPosition);
        doc.text(`₹${parseFloat(item.totalPrice).toFixed(2)}`, 400, yPosition);
        yPosition += 20;
      });

      yPosition += 10;
      doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
      yPosition += 20;

      // Totals
      doc.text(`Subtotal: ₹${parseFloat(invoice.subtotal).toFixed(2)}`, 350, yPosition);
      yPosition += 15;

      if (parseFloat(invoice.gstAmount) > 0) {
        doc.text(`GST (${invoice.gstRate}%): ₹${parseFloat(invoice.gstAmount).toFixed(2)}`, 350, yPosition);
        yPosition += 15;
      }

      doc.fontSize(12).text(`Total: ₹${parseFloat(invoice.totalAmount).toFixed(2)}`, 350, yPosition, { align: 'right' });

      // Footer
      doc.fontSize(8).text('Payment Method: Cash on Delivery', 50, 700);
      doc.text('Thank you for your business!', 50, 720, { align: 'center' });

      doc.end();

      stream.on('finish', () => {
        resolve({ filePath, fileName });
      });

      stream.on('error', (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateInvoicePDF };
