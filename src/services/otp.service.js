// OTP service
const { OTP_LENGTH, OTP_EXPIRY_MINUTES } = require('../config/env');
const logger = require('../utils/logger');
const User = require('../models/user.model');
const { sendPushNotification } = require('./notification.service');
const { getFirebaseAdminApp } = require('../config/firebase');
const admin = require('firebase-admin');

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

        // 2. Send SMS OTP via external service (Twilio, Firebase Functions, etc.)
    // For now, we'll use a placeholder for the SMS service integration
    const adminApp = getFirebaseAdminApp();
    if (adminApp) {
      // In a real implementation, you would call an SMS service API here
      // Example with a hypothetical SMS service:
      const formattedNumber = mobileNumber.startsWith('+') ? mobileNumber : `+91${mobileNumber}`;
      
      logger.info(`OTP ${message.split(' ').pop()} should be sent to ${formattedNumber} via SMS service`);
      
      // Simulate sending SMS - in production, integrate with Twilio, Fast2SMS, etc.
      // Example API call would be something like:
      /*
      const smsResult = await axios.post('https://api.sms-service.com/send', {
        phoneNumber: formattedNumber,
        message: message,
        apiKey: process.env.SMS_SERVICE_API_KEY
      });
      */
      
      // For development, just log the OTP (it will be visible in the response for testing)
      return true;
    } else {
      logger.warn('Firebase Admin SDK not available, but continuing with OTP flow');
      // Continue without SMS service - OTP will be returned in the API response for development
      return true;
    }
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
