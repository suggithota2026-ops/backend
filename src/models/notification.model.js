// Notification model (Sequelize)
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { NOTIFICATION_TYPES } = require('../config/constants');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  type: {
    type: DataTypes.ENUM(...Object.values(NOTIFICATION_TYPES)),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  recipientId: {
    type: DataTypes.INTEGER,
    allowNull: true, // null means broadcast
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  sentAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
}, {
  tableName: 'notifications',
  timestamps: true,
});

module.exports = Notification;
