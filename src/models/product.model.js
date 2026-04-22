const { mongoose } = require('../config/db');
const { applyAutoIncrement } = require('./_autoIncrement');
const { applySequelizeCompat } = require('./_sequelizeCompat');
const { PRODUCT_STATUS } = require('../config/constants');

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    categoryId: { type: Number, required: true, index: true },
    subcategory: { type: String, default: null },
    images: { type: [String], default: [] },
    price: { type: Number, required: true },
    pricingType: { type: String, enum: ['fixed', 'daily', 'weekly'], default: 'fixed' },
    unit: { type: String, default: 'kg' },
    stock: { type: Number, default: 0 },
    minStockLevel: { type: Number, default: 0 },
    status: { type: String, enum: Object.values(PRODUCT_STATUS), default: PRODUCT_STATUS.ACTIVE },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
    createdById: { type: Number, default: null },
  },
  { timestamps: true }
);

applyAutoIncrement(ProductSchema, { sequenceName: 'products' });
applySequelizeCompat(ProductSchema);

module.exports = mongoose.models.Product || mongoose.model('Product', ProductSchema);
