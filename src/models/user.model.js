const { mongoose } = require('../config/db');
const { applyAutoIncrement } = require('./_autoIncrement');
const { applySequelizeCompat } = require('./_sequelizeCompat');
const { ROLES } = require('../config/constants');

const UserSchema = new mongoose.Schema(
  {
    mobileNumber: { type: String, required: true, unique: true, trim: true },
    otpCode: { type: String, default: null },
    otpExpiresAt: { type: Date, default: null },
    isVerified: { type: Boolean, default: false },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.HOTEL },
    // Personal details
    name: { type: String, default: null },
    email: { type: String, default: null, trim: true, lowercase: true },
    // Business details
    hotelName: { type: String, default: null },
    address: { type: String, default: null },
    gstNumber: { type: String, default: null },
    creditLimit: { type: Number, default: 0 },
    isBlocked: { type: Boolean, default: false },
    fcmToken: { type: String, default: null },
    lastLoginAt: { type: Date, default: null },
    rateType: { type: String, default: null },
    pricePerUnit: { type: Number, default: null },
  },
  { timestamps: true }
);

applyAutoIncrement(UserSchema, { sequenceName: 'users' });
applySequelizeCompat(UserSchema);

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
