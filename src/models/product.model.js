// Product model (Sequelize)
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { PRODUCT_STATUS } = require('../config/constants');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  subcategory: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  images: {
    // store array of image paths as JSON
    type: DataTypes.JSONB,
    allowNull: true,
  },
  price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  pricingType: {
    type: DataTypes.ENUM('fixed', 'daily', 'weekly'),
    defaultValue: 'fixed',
    allowNull: false,
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'kg',
  },
  stock: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  minStockLevel: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM(...Object.values(PRODUCT_STATUS)),
    defaultValue: PRODUCT_STATUS.ACTIVE,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  createdById: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'products',
  timestamps: true,
});

module.exports = Product;
