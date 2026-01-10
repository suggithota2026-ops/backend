// OTP service
const { OTP_LENGTH, OTP_EXPIRY_MINUTES } = require('../config/env');
const logger = require('../utils/logger');
const User = require('../models/user.model');
const { sendPushNotification } = require('./notification.service');

const generateOTP = () => {
  const digits = '0123456789';
  let OTP = '';
  for (let i = 0; i < OTP_LENGTH; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }
  return OTP;
};

const generateOTPWithExpiry = () => {
  const code = generateOTP();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

  return {
    code,
    expiresAt,
  };
};

const verifyOTP = (storedOTP, providedOTP, expiresAt) => {
  if (!storedOTP || !providedOTP) {
    return false;
  }

  if (new Date() > new Date(expiresAt)) {
    logger.warn('OTP expired');
    return false;
  }

  return storedOTP === providedOTP;
};

// In production, integrate with SMS service (Twilio, AWS SNS, etc.)
const sendMessage = async (mobileNumber, message) => {
  try {
    // 1. Try to send via Firebase Push Notification if user exists and has token
    const user = await User.findOne({ where: { mobileNumber } });

    if (user && user.fcmToken) {
      await sendPushNotification(
        user.fcmToken,
        'Notification', // Title
        message,        // Body
        { type: 'general' }
      );
      logger.info(`Push notification sent to ${mobileNumber}`);
    } else {
      logger.info(`No FCM token for ${mobileNumber}, skipping push notification.`);
    }

    // TODO: Integrate with SMS service (Twilio/Fast2SMS) for non-app users
    logger.info(`Message for ${mobileNumber}: ${message}`);

    return true;
  } catch (error) {
    logger.error('Error sending message:', error);
    // Don't throw error if message fails, just log it so flow continues
    return false;
  }
};

const sendOTP = async (mobileNumber, otp) => {
  return sendMessage(mobileNumber, `Your OTP is ${otp}`);
};

module.exports = {
  generateOTP,
  generateOTPWithExpiry,
  verifyOTP,
  sendOTP,
  sendMessage,
};
