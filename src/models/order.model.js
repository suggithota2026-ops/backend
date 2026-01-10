// Order model (Sequelize)
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { ORDER_STATUS, PAYMENT_METHOD } = require('../config/constants');
const User = require('./user.model');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  orderNumber: {
    type: DataTypes.STRING,
    unique: true,
  },
  hotelId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  // Store order items as JSONB (array of { productId, productName, quantity, unitPrice, totalPrice })
  items: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  gstAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  gstRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
  },
  totalAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM(...Object.values(ORDER_STATUS)),
    defaultValue: ORDER_STATUS.PENDING,
  },
  paymentMethod: {
    type: DataTypes.ENUM(...Object.values(PAYMENT_METHOD)),
    defaultValue: PAYMENT_METHOD.CASH,
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'paid'),
    defaultValue: 'pending',
  },
  specialInstructions: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  deliveryTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  assignedTo: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  invoiceId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'orders',
  timestamps: true,
});

// Generate order number before create
Order.addHook('beforeCreate', async (order) => {
  if (!order.orderNumber) {
    const count = await Order.count();
    order.orderNumber = `ORD${String(count + 1).padStart(6, '0')}`;
  }
});

// Define associations (must be after model definition)
Order.belongsTo(User, {
  foreignKey: 'hotelId',
  as: 'hotel',
});

module.exports = Order;
