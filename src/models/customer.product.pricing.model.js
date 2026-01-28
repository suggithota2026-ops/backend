// Customer Product Pricing model (Sequelize)
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const CustomerProductPricing = sequelize.define('CustomerProductPricing', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  customerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  fixedPrice: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  contractStartDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  contractEndDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'customer_product_pricing',
  timestamps: true,
});

module.exports = CustomerProductPricing;