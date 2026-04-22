const bcrypt = require('bcryptjs');
const Admin = require('../models/admin.model');
const logger = require('./logger');
const {
  DEFAULT_ADMIN_MOBILE,
  DEFAULT_ADMIN_USERNAME,
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_ADMIN_NAME,
} = require('../config/env');

async function seedDefaultAdmin() {
  if (!DEFAULT_ADMIN_MOBILE) return;

  const mobileNumber = String(DEFAULT_ADMIN_MOBILE).trim();
  if (!mobileNumber) return;

  const existingByMobile = await Admin.findOne({ where: { mobileNumber } });
  if (existingByMobile) return;

  // Ensure username uniqueness (Mongo unique index)
  let username = String(DEFAULT_ADMIN_USERNAME || 'admin').trim() || 'admin';
  const existingByUsername = await Admin.findOne({ where: { username } });
  if (existingByUsername) {
    username = `${username}_${mobileNumber}`;
  }

  const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);

  await Admin.create({
    username,
    password: hashedPassword,
    name: DEFAULT_ADMIN_NAME,
    mobileNumber,
    role: 'ADMIN',
    isActive: true,
  });

  logger.info(`Seeded default admin for mobile ${mobileNumber}`);
}

module.exports = { seedDefaultAdmin };

