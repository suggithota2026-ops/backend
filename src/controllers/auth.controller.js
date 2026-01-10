// Auth business logic
const User = require('../models/user.model');
const { generateOTPWithExpiry, verifyOTP: verifyOTPService, sendOTP: sendOTPService } = require('../services/otp.service');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');
const { NODE_ENV, OTP_EXPIRY_MINUTES } = require('../config/env');

// POST /api/auth/send-otp
const sendOTP = async (request, reply) => {
  try {
    const { mobileNumber } = request.body;

    // Find user by mobile using Sequelize
    let user = await User.findOne({ where: { mobileNumber } });

    const otpData = generateOTPWithExpiry();

    if (!user) {
      // Create new user
      user = await User.create({
        mobileNumber,
        otpCode: otpData.code,
        otpExpiresAt: otpData.expiresAt,
        isVerified: false,
      });
    } else {
      // Update OTP for existing user
      user.otpCode = otpData.code;
      user.otpExpiresAt = otpData.expiresAt;
      await user.save();
    }

    // Send OTP (in production, integrate with SMS service)
    await sendOTPService(mobileNumber, otpData.code);

    // Log OTP to terminal for development/testing
    logger.info(`OTP sent to ${mobileNumber}: ${otpData.code} (expires in ${OTP_EXPIRY_MINUTES} minutes)`);
    console.log(`\n========================================`);
    console.log(`OTP for ${mobileNumber}: ${otpData.code}`);
    console.log(`Expires at: ${otpData.expiresAt.toISOString()}`);
    console.log(`NODE_ENV: ${NODE_ENV}`);
    console.log(`========================================\n`);

    // Include OTP in response (always include for now, can be restricted in production later)
    const responseData = {
      otp: String(otpData.code), // Ensure it's a string
      expiresAt: otpData.expiresAt.toISOString(),
      expiresInMinutes: OTP_EXPIRY_MINUTES,
    };

    // Debug log to verify data
    console.log('\n=== SENDING RESPONSE ===');
    console.log('OTP Code:', otpData.code);
    console.log('Response Data:', JSON.stringify(responseData, null, 2));
    console.log('Full Response Object:', JSON.stringify({
      success: true,
      message: 'OTP sent successfully',
      data: responseData,
    }, null, 2));
    console.log('========================\n');

    // Send response directly to ensure data is included
    const response = {
      success: true,
      message: 'OTP sent successfully',
      data: {
        otp: String(otpData.code),
        expiresAt: otpData.expiresAt.toISOString(),
        expiresInMinutes: OTP_EXPIRY_MINUTES,
      },
    };

    logger.info('Sending response with OTP:', JSON.stringify(response, null, 2));
    console.log('Controller - Final response object:', JSON.stringify(response, null, 2));
    console.log('Controller - Response data:', response.data);
    
    // Ensure content type is set
    reply.type('application/json');
    
    return reply.status(200).send(response);
  } catch (error) {
    logger.error('Error sending OTP:', error);
    return sendError(reply, 'Failed to send OTP', 500);
  }
};

// POST /api/auth/verify-otp
const verifyOTP = async (request, reply) => {
  try {
    const { mobileNumber, otp } = request.body;

    const user = await User.findOne({ where: { mobileNumber } });
    if (!user) {
      return sendError(reply, 'User not found', 404);
    }

    const isValid = verifyOTPService(user.otpCode, otp, user.otpExpiresAt);
    if (!isValid) {
      return sendError(reply, 'Invalid or expired OTP', 400);
    }

    // Clear OTP and mark verified
    user.otpCode = null;
    user.otpExpiresAt = null;
    user.isVerified = true;
    user.lastLoginAt = new Date();
    await user.save();

    // Generate JWT token
    const token = await reply.jwtSign({
      id: user.id,
      role: user.role,
      type: 'user',
      mobileNumber: user.mobileNumber,
    });

    return sendSuccess(reply, {
      token,
      user: {
        id: user.id,
        mobileNumber: user.mobileNumber,
        role: user.role,
        isProfileComplete: !!(user.hotelName && user.address),
      },
    }, 'OTP verified successfully');
  } catch (error) {
    logger.error('Error verifying OTP:', error);
    return sendError(reply, 'Failed to verify OTP', 500);
  }
};

// POST /api/auth/setup-profile
const setupProfile = async (request, reply) => {
  try {
    const userId = request.user.id;
    const { hotelName, address, gstNumber, fcmToken } = request.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return sendError(reply, 'User not found', 404);
    }

    user.hotelName = hotelName;
    user.address = address;
    if (gstNumber) {
      user.gstNumber = gstNumber.toUpperCase();
    }
    if (fcmToken) {
      user.fcmToken = fcmToken;
    }

    await user.save();

    return sendSuccess(reply, {
      user: {
        id: user.id,
        mobileNumber: user.mobileNumber,
        hotelName: user.hotelName,
        address: user.address,
        gstNumber: user.gstNumber,
      },
    }, 'Profile updated successfully');
  } catch (error) {
    logger.error('Error setting up profile:', error);
    return sendError(reply, 'Failed to update profile', 500);
  }
};

// POST /api/auth/fcm-token
const updateFCMToken = async (request, reply) => {
  try {
    const userId = request.user.id;
    const { fcmToken } = request.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return sendError(reply, 'User not found', 404);
    }

    user.fcmToken = fcmToken;
    await user.save();

    return sendSuccess(reply, null, 'FCM token updated successfully');
  } catch (error) {
    logger.error('Error updating FCM token:', error);
    return sendError(reply, 'Failed to update FCM token', 500);
  }
};

module.exports = {
  sendOTP,
  verifyOTP,
  setupProfile,
  updateFCMToken,
};
