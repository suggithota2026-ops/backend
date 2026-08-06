const { mongoose } = require('../config/db');
const { applyAutoIncrement } = require('./_autoIncrement');
const { applySequelizeCompat } = require('./_sequelizeCompat');

const ContactMessageSchema = new mongoose.Schema(
  {
    hotelName: { type: String, required: true },
    contactNumber: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, default: null },
    pinCode: { type: String, default: null },
    landmark: { type: String, default: null },
    email: { type: String, default: null },
    message: { type: String, required: true },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    status: { type: String, enum: ['pending', 'contacted', 'resolved'], default: 'pending' },
    notes: { type: String, default: null },
  },
  { timestamps: true }
);

applyAutoIncrement(ContactMessageSchema, { sequenceName: 'contact_messages' });
applySequelizeCompat(ContactMessageSchema);

module.exports = mongoose.models.ContactMessage || mongoose.model('ContactMessage', ContactMessageSchema);
