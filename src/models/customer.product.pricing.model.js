const { mongoose } = require('../config/db');
const { applyAutoIncrement } = require('./_autoIncrement');
const { applySequelizeCompat } = require('./_sequelizeCompat');

const CustomerProductPricingSchema = new mongoose.Schema(
  {
    customerId: { type: Number, required: true, index: true },
    productId: { type: Number, required: true, index: true },
    fixedPrice: { type: Number, required: true },
    contractStartDate: { type: Date, required: true },
    contractEndDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CustomerProductPricingSchema.index({ customerId: 1, productId: 1 }, { unique: true });

applyAutoIncrement(CustomerProductPricingSchema, { sequenceName: 'customer_product_pricing' });
applySequelizeCompat(CustomerProductPricingSchema);

module.exports =
  mongoose.models.CustomerProductPricing ||
  mongoose.model('CustomerProductPricing', CustomerProductPricingSchema);