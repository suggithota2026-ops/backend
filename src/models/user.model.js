// Hotel/User model (Sequelize)
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { ROLES } = require('../config/constants');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  mobileNumber: {
    type: DataTypes.STRING(15),
    allowNull: false,
    unique: true,
  },
  otpCode: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  otpExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  role: {
    type: DataTypes.ENUM(...Object.values(ROLES)),
    defaultValue: ROLES.HOTEL,
  },
  hotelName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  gstNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  creditLimit: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  isBlocked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  fcmToken: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  rateType: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  pricePerUnit: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
}, {
  tableName: 'users',
  timestamps: true,
});

// Add association for customer product pricing
User.hasMany(require('./customer.product.pricing.model'), {
  foreignKey: 'customerId',
  as: 'customerProductPricing'
});

module.exports = User;
