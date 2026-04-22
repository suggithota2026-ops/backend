const { mongoose } = require('../config/db');
const { applyAutoIncrement } = require('./_autoIncrement');
const { applySequelizeCompat } = require('./_sequelizeCompat');

const AdminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    mobileNumber: { type: String, default: null, unique: true, sparse: true },
    password: { type: String, required: true },
    otpCode: { type: String, default: null },
    otpExpiresAt: { type: Date, default: null },
    name: { type: String, default: null },
    role: { type: String, default: 'ADMIN' },
    email: { type: String, default: null },
    bio: { type: String, default: null },
    dob: { type: Date, default: null },
    country: { type: String, default: null },
    city: { type: String, default: null },
    postalCode: { type: String, default: null },
    address: { type: String, default: null },
    gstNumber: { type: String, default: null },
    businessName: { type: String, default: null },
    avatarUrl: { type: String, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

applyAutoIncrement(AdminSchema, { sequenceName: 'admins' });
applySequelizeCompat(AdminSchema);

module.exports = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);
