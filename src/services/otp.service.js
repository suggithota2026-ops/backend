// OTP service
const { OTP_LENGTH, OTP_EXPIRY_MINUTES } = require('../config/env');
const logger = require('../utils/logger');
const User = require('../models/user.model');
const { sendPushNotification } = require('./notification.service');
const { sendSms } = require('./twilio.service');

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

const sendMessage = async (mobileNumber, message) => {
  try {
    const user = await User.findOne({ where: { mobileNumber } });

    if (user && user.fcmToken) {
      await sendPushNotification(
        user.fcmToken,
        'Notification',
        message,
        { type: 'general' }
      );
      logger.info(`Push notification sent to ${mobileNumber}`);
    } else {
      logger.info(`No FCM token for ${mobileNumber}, skipping push notification.`);
    }

    await sendSms(mobileNumber, message);
    return true;
  } catch (error) {
    logger.error('Error sending message:', error);
    return false;
  }
};

const sendOTP = async (mobileNumber, otp) => {
  console.log('sendOTP', mobileNumber, otp);
  const text = `Your verification code is ${otp}. It is valid for ${OTP_EXPIRY_MINUTES} minutes. Do not share this code.`;
  await sendSms(mobileNumber, text);
};

module.exports = {
  generateOTP,
  generateOTPWithExpiry,
  verifyOTP,
  sendOTP,
  sendMessage,
};
