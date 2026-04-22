const { mongoose } = require('../config/db');
const { applyAutoIncrement } = require('./_autoIncrement');
const { applySequelizeCompat } = require('./_sequelizeCompat');
const { NOTIFICATION_TYPES } = require('../config/constants');

const NotificationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: Object.values(NOTIFICATION_TYPES), required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    recipientId: { type: Number, default: null },
    orderId: { type: Number, default: null },
    isRead: { type: Boolean, default: false },
    sentAt: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

applyAutoIncrement(NotificationSchema, { sequenceName: 'notifications' });
applySequelizeCompat(NotificationSchema);

module.exports = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
