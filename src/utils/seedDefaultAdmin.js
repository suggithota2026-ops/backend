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

  const username = String(DEFAULT_ADMIN_USERNAME || 'admin').trim() || 'admin';
  const existingByMobile = await Admin.findOne({ where: { mobileNumber } });
  const existingByUsername = await Admin.findOne({ where: { username } });

  const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);

  const baseUpdate = {
    password: hashedPassword,
    name: DEFAULT_ADMIN_NAME,
    role: 'ADMIN',
    isActive: true,
  };

  if (existingByMobile) {
    const updateData = { ...baseUpdate };

    // Avoid unique-index conflict when another admin already owns this username.
    if (!existingByUsername || existingByUsername.id === existingByMobile.id) {
      updateData.username = username;
    } else {
      logger.warn(
        `Keeping username for mobile ${mobileNumber}: "${username}" is already assigned to another admin`
      );
    }

    await Admin.update(updateData, { where: { id: existingByMobile.id } });
    logger.info(`Updated default admin for mobile ${mobileNumber}`);
    return;
  }

  if (existingByUsername) {
    const mobileTakenByOtherAdmin = await Admin.findOne({
      where: { mobileNumber },
    });

    if (mobileTakenByOtherAdmin && mobileTakenByOtherAdmin.id !== existingByUsername.id) {
      await Admin.update(baseUpdate, { where: { id: existingByUsername.id } });
      logger.warn(
        `Updated credentials for username ${username}; could not assign mobile ${mobileNumber} because it belongs to another admin`
      );
      return;
    }

    await Admin.update(
      {
        ...baseUpdate,
        mobileNumber,
      },
      { where: { id: existingByUsername.id } }
    );
    logger.info(`Updated default admin username ${username} with mobile ${mobileNumber}`);
    return;
  }

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

