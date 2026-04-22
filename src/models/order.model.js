const { mongoose } = require('../config/db');
const { applyAutoIncrement } = require('./_autoIncrement');
const { applySequelizeCompat } = require('./_sequelizeCompat');
const { ORDER_STATUS, PAYMENT_METHOD } = require('../config/constants');

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true, sparse: true },
    hotelId: { type: Number, required: true, index: true },
    items: { type: [mongoose.Schema.Types.Mixed], required: true },
    subtotal: { type: Number, required: true },
    deliveryCharge: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    gstRate: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: Object.values(ORDER_STATUS), default: ORDER_STATUS.PENDING },
    paymentMethod: { type: String, enum: Object.values(PAYMENT_METHOD), default: PAYMENT_METHOD.COD },
    paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    specialInstructions: { type: String, default: null },
    deliveryTime: { type: Date, default: null },
    assignedTo: { type: String, default: null },
    invoiceId: { type: Number, default: null },
  },
  { timestamps: true }
);

applyAutoIncrement(OrderSchema, { sequenceName: 'orders' });
applySequelizeCompat(OrderSchema);

OrderSchema.pre('save', async function preSave(next) {
  try {
    if (this.isNew && !this.orderNumber) {
      const count = await this.constructor.countDocuments({});
      this.orderNumber = `ORD${String(count + 1).padStart(6, '0')}`;
    }
    next();
  } catch (e) {
    next(e);
  }
});

module.exports = mongoose.models.Order || mongoose.model('Order', OrderSchema);
