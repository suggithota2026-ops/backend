// Auth business logic
const User = require('../models/user.model');
const ContactMessage = require('../models/contact.model');
const { generateOTPWithExpiry, verifyOTP: verifyOTPService, sendOTP: sendOTPService } = require('../services/otp.service');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');
const { NODE_ENV, OTP_EXPIRY_MINUTES } = require('../config/env');
const {
  normalizeMobileNumber,
  userMobileWhere,
  contactNumberWhere,
} = require('../utils/userMobile');

// POST /api/auth/send-otp
const sendOTP = async (request, reply) => {
  try {
    const mobileNumber = normalizeMobileNumber(request.body.mobileNumber);
    if (mobileNumber.length !== 10) {
      return sendError(reply, 'Please enter a valid 10-digit mobile number', 400);
    }

    let user = await User.findOne({ where: userMobileWhere(mobileNumber) });

    // If user doesn't exist, they need to register and get admin approval first
    if (!user) {
      const pendingEnquiry = await ContactMessage.findOne({
        where: {
          ...contactNumberWhere(mobileNumber),
          status: 'pending',
        },
      });

      if (pendingEnquiry) {
        return sendError(
          reply,
          'Your registration is pending admin approval. Please wait — you can login after approval.',
          403
        );
      }

      return sendError(
        reply,
        'No account found for this number. Please register in the app first, then login after admin approves.',
        404
      );
    }

    if (user.mobileNumber !== mobileNumber) {
      user.mobileNumber = mobileNumber;
      await user.save();
    }

    // Check if hotel is blocked
    if (user.role === 'hotel' && user.isBlocked) {
      return sendError(
        reply,
        'Your account has been blocked. Please contact support for assistance.',
        403
      );
    }

    // Check if user is a hotel (role = 'hotel')
    // Hotels in the hotels table can always login (if not blocked)
    // Non-hotel users need to be verified
    if (user.role !== 'hotel' && !user.isVerified) {
      return sendError(
        reply,
        'Your account is not yet approved. Please wait for admin approval or contact support.',
        403
      );
    }

    // Generate and send OTP for existing users
    const otpData = generateOTPWithExpiry();

    // Update OTP for existing user
    user.otpCode = otpData.code;
    user.otpExpiresAt = otpData.expiresAt;
    await user.save();

    // Send OTP via SMS — if Twilio daily quota is hit, still allow login with OTP in response
    let smsWarning = null;
    try {
      await sendOTPService(mobileNumber, otpData.code);
    } catch (smsError) {
      if (smsError?.code === 'SMS_DAILY_LIMIT') {
        smsWarning =
          'SMS daily limit reached. Please try again tomorrow or use the OTP shown below.';
        logger.warn(`Twilio daily SMS limit hit for ${mobileNumber}`);
      } else {
        logger.error('Error sending OTP SMS:', smsError);
        return sendError(
          reply,
          smsError?.message || 'Failed to send OTP. Please try again later.',
          smsError?.statusCode || 500
        );
      }
    }

    // Log OTP to terminal for development/testing
    logger.info(`OTP sent to ${mobileNumber}: ${otpData.code} (expires in ${OTP_EXPIRY_MINUTES} minutes)`);
    console.log(`\n========================================`);
    console.log(`OTP for ${mobileNumber}: ${otpData.code}`);
    console.log(`Expires at: ${otpData.expiresAt.toISOString()}`);
    console.log(`NODE_ENV: ${NODE_ENV}`);
    console.log(`========================================\n`);

    const response = {
      success: true,
      message: smsWarning || 'OTP sent successfully',
      data: {
        otp: String(otpData.code),
        expiresAt: otpData.expiresAt.toISOString(),
        expiresInMinutes: OTP_EXPIRY_MINUTES,
        ...(smsWarning ? { smsWarning } : {}),
      },
    };

    reply.type('application/json');
    return reply.status(200).send(response);
  } catch (error) {
    logger.error('Error sending OTP:', error);
    return sendError(
      reply,
      error?.message && !/AC[a-f0-9]{32}/i.test(error.message)
        ? error.message
        : 'Failed to send OTP. Please try again later.',
      error?.statusCode || 500
    );
  }
};

// POST /api/auth/verify-otp
const verifyOTP = async (request, reply) => {
  try {
    const { otp } = request.body;
    const mobileNumber = normalizeMobileNumber(request.body.mobileNumber);
    if (mobileNumber.length !== 10) {
      return sendError(reply, 'Please enter a valid 10-digit mobile number', 400);
    }

    const user = await User.findOne({ where: userMobileWhere(mobileNumber) });
    if (!user) {
      return sendError(reply, 'User not found', 404);
    }

    // Check if hotel is blocked
    if (user.role === 'hotel' && user.isBlocked) {
      return sendError(
        reply,
        'Your account has been blocked. Please contact support for assistance.',
        403
      );
    }

    // Check if user account is approved
    // Hotels (role = 'hotel') can always login (if not blocked), others need verification
    if (user.role !== 'hotel' && !user.isVerified) {
      return sendError(
        reply,
        'Your account is not yet approved by admin. Please wait for approval.',
        403
      );
    }

    const isValid = verifyOTPService(user.otpCode, otp, user.otpExpiresAt);
    if (!isValid) {
      return sendError(reply, 'Invalid or expired OTP', 400);
    }

    // Clear OTP and update last login
    user.otpCode = null;
    user.otpExpiresAt = null;
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
        hotelName: user.hotelName,
        address: user.address,
        city: user.city,
        pinCode: user.pinCode,
        latitude: user.latitude,
        longitude: user.longitude,
        isProfileComplete: !!(user.hotelName && user.address),
      },
    }, 'OTP verified successfully');
  } catch (error) {
    logger.error('Error verifying OTP:', error);
    return sendError(reply, 'Failed to verify OTP', 500);
  }
};

const applyLocationFields = (updateData, body, { fillAddressIfEmpty = false, currentAddress = null } = {}) => {
  const address = body.address ?? body.hotelAddress ?? body.hotel_address;
  const city = body.city;
  const pinCode = body.pinCode ?? body.pincode ?? body.postalCode;
  const latitude = body.latitude ?? body.lat;
  const longitude = body.longitude ?? body.lng ?? body.lon;

  if (address !== undefined && address !== null && String(address).trim()) {
    if (!fillAddressIfEmpty || !currentAddress) {
      updateData.address = String(address).trim();
    }
  }
  if (city !== undefined && city !== null && String(city).trim()) {
    updateData.city = String(city).trim();
  }
  if (pinCode !== undefined && pinCode !== null && String(pinCode).trim()) {
    updateData.pinCode = String(pinCode).trim();
  }
  if (latitude !== undefined && latitude !== null && latitude !== '') {
    const lat = Number(latitude);
    if (!Number.isNaN(lat)) updateData.latitude = lat;
  }
  if (longitude !== undefined && longitude !== null && longitude !== '') {
    const lng = Number(longitude);
    if (!Number.isNaN(lng)) updateData.longitude = lng;
  }
};

// POST /api/auth/update-location — capture GPS address after login/register
const updateLocation = async (request, reply) => {
  try {
    const userId = Number(request.user.id);
    const body = request.body || {};

    const user = await User.findByPk(userId);
    if (!user) {
      return sendError(reply, 'User not found', 404);
    }

    const updateData = {};
    applyLocationFields(updateData, body, {
      fillAddressIfEmpty: true,
      currentAddress: user.address,
    });

    // Always fill empty address from captured location
    const incomingAddress = body.address ?? body.hotelAddress ?? body.hotel_address;
    if ((!user.address || !String(user.address).trim()) && incomingAddress && String(incomingAddress).trim()) {
      updateData.address = String(incomingAddress).trim();
    }

    if (Object.keys(updateData).length === 0) {
      return sendError(reply, 'No location fields provided', 400);
    }

    const updated = await User.findOneAndUpdate(
      { id: userId },
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-otpCode -otpExpiresAt');

    return sendSuccess(reply, {
      user: {
        id: updated.id,
        mobileNumber: updated.mobileNumber,
        hotelName: updated.hotelName,
        address: updated.address,
        city: updated.city,
        pinCode: updated.pinCode,
        latitude: updated.latitude,
        longitude: updated.longitude,
      },
    }, 'Location updated successfully');
  } catch (error) {
    logger.error('Error updating location:', error);
    return sendError(reply, 'Failed to update location', 500);
  }
};

// POST /api/auth/resend-otp
const resendOTP = async (request, reply) => {
  try {
    const mobileNumber = normalizeMobileNumber(request.body.mobileNumber);
    if (mobileNumber.length !== 10) {
      return sendError(reply, 'Please enter a valid 10-digit mobile number', 400);
    }

    const user = await User.findOne({ where: userMobileWhere(mobileNumber) });
    if (!user) {
      return sendError(reply, 'User not found. Please register first.', 404);
    }

    // Generate new OTP
    const otpData = generateOTPWithExpiry();

    // Update user with new OTP
    user.otpCode = otpData.code;
    user.otpExpiresAt = otpData.expiresAt;
    await user.save();

    // Send OTP
    await sendOTPService(mobileNumber, otpData.code);

    // Log OTP for development/testing
    logger.info(`OTP resent to ${mobileNumber}: ${otpData.code} (expires in ${OTP_EXPIRY_MINUTES} minutes)`);
    console.log(`\n========================================`);
    console.log(`RESENT OTP for ${mobileNumber}: ${otpData.code}`);
    console.log(`Expires at: ${otpData.expiresAt.toISOString()}`);
    console.log(`========================================\n`);

    // Return response with OTP (for development)
    const response = {
      success: true,
      message: 'OTP resent successfully',
      data: {
        otp: String(otpData.code),
        expiresAt: otpData.expiresAt.toISOString(),
        expiresInMinutes: OTP_EXPIRY_MINUTES,
      },
    };

    reply.type('application/json');
    return reply.status(200).send(response);
  } catch (error) {
    logger.error('Error resending OTP:', error);
    return sendError(reply, 'Failed to resend OTP', 500);
  }
};

// POST /api/auth/setup-profile
const setupProfile = async (request, reply) => {
  try {
    const userId = Number(request.user.id);
    const body = request.body || {};
    const hotelName = body.hotelName ?? body.name ?? body.hotel_name;
    const address = body.address ?? body.hotelAddress ?? body.hotel_address;
    const gstNumber = body.gstNumber ?? body.gst_number ?? body.gstin ?? body.gst;
    const fcmToken = body.fcmToken ?? body.fcm_token;

    if (!hotelName || !String(hotelName).trim()) {
      return sendError(reply, 'Hotel name is required', 400);
    }
    if (!address || !String(address).trim()) {
      return sendError(reply, 'Address is required', 400);
    }

    const updateData = {
      hotelName: String(hotelName).trim(),
      address: String(address).trim(),
    };

    applyLocationFields(updateData, body);

    if (gstNumber !== undefined) {
      const gst = String(gstNumber).trim().toUpperCase();
      if (
        gst &&
        !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst)
      ) {
        return sendError(reply, 'Invalid GST number format', 400);
      }
      updateData.gstNumber = gst || null;
    }

    if (fcmToken) {
      updateData.fcmToken = String(fcmToken).trim();
    }

    const updated = await User.findOneAndUpdate(
      { id: userId },
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-otpCode -otpExpiresAt');

    if (!updated) {
      return sendError(reply, 'User not found', 404);
    }

    return sendSuccess(reply, {
      user: {
        id: updated.id,
        mobileNumber: updated.mobileNumber,
        hotelName: updated.hotelName,
        address: updated.address,
        city: updated.city,
        pinCode: updated.pinCode,
        latitude: updated.latitude,
        longitude: updated.longitude,
        gstNumber: updated.gstNumber,
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
  resendOTP,
  setupProfile,
  updateLocation,
  updateFCMToken,
};
