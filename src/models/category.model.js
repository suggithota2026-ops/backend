const { mongoose } = require('../config/db');
const { applyAutoIncrement } = require('./_autoIncrement');
const { applySequelizeCompat } = require('./_sequelizeCompat');

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: null },
    image: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
    createdById: { type: Number, default: null },
    subcategories: {
      type: [
        {
          id: { type: String, required: true },
          name: { type: String, required: true },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

applyAutoIncrement(CategorySchema, { sequenceName: 'categories' });
applySequelizeCompat(CategorySchema);

module.exports = mongoose.models.Category || mongoose.model('Category', CategorySchema);
