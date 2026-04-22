const { mongoose } = require('../config/db');
const { applyAutoIncrement } = require('./_autoIncrement');
const { applySequelizeCompat } = require('./_sequelizeCompat');
const { INVOICE_STATUS } = require('../config/constants');

const InvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, unique: true, sparse: true },
    orderId: { type: Number, required: true, unique: true, index: true },
    hotelId: { type: Number, required: true, index: true },
    subtotal: { type: Number, required: true },
    deliveryCharge: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    gstRate: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: Object.values(INVOICE_STATUS), default: INVOICE_STATUS.PENDING },
    pdfPath: { type: String, default: null },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

applyAutoIncrement(InvoiceSchema, { sequenceName: 'invoices' });
applySequelizeCompat(InvoiceSchema);

InvoiceSchema.pre('save', async function preSave(next) {
  try {
    if (this.isNew && !this.invoiceNumber) {
      const year = new Date().getFullYear();
      const count = await this.constructor.countDocuments({
        createdAt: { $gte: new Date(`${year}-01-01T00:00:00.000Z`), $lt: new Date(`${year + 1}-01-01T00:00:00.000Z`) },
      });
      this.invoiceNumber = `INV${year}${String(count + 1).padStart(5, '0')}`;
    }
    next();
  } catch (e) {
    next(e);
  }
});

module.exports = mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);
