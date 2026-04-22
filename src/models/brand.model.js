const { mongoose } = require('../config/db');
const { applyAutoIncrement } = require('./_autoIncrement');
const { applySequelizeCompat } = require('./_sequelizeCompat');

const BrandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    imageUrl: { type: String, required: true },
    description: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Number, default: null },
  },
  { timestamps: true }
);

applyAutoIncrement(BrandSchema, { sequenceName: 'brands' });
applySequelizeCompat(BrandSchema);

module.exports = mongoose.models.Brand || mongoose.model('Brand', BrandSchema);