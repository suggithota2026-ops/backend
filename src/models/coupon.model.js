const { mongoose } = require('../config/db');
const { applyAutoIncrement } = require('./_autoIncrement');
const { applySequelizeCompat } = require('./_sequelizeCompat');

const CouponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    discountType: { type: String, enum: ['percentage', 'flat'], required: true },
    discountValue: { type: Number, required: true },
    validFrom: { type: Date, default: Date.now },
    validUntil: { type: Date, required: true },
    minOrderAmount: { type: Number, default: 0 },
    maxDiscountAmount: { type: Number, default: null },
    usageLimit: { type: Number, default: null },
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Number, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    orderId: { type: Number, default: null, index: true },
  },
  { timestamps: true }
);

applyAutoIncrement(CouponSchema, { sequenceName: 'coupons' });
applySequelizeCompat(CouponSchema);

module.exports = mongoose.models.Coupon || mongoose.model('Coupon', CouponSchema);