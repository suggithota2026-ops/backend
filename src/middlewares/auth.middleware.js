// Authentication middleware
const { sendError } = require('../utils/response');
const User = require('../models/user.model');
const Admin = require('../models/admin.model');

const authenticate = async (request, reply) => {
  try {
    // This verifies the JWT and sets request.user from token payload
    await request.jwtVerify();
    const { id, type, role } = request.user;

    if (!id) {
      console.log('Auth Failed: No user ID in token');
      return sendError(reply, 'Invalid token: missing user ID', 401);
    }

    // Determine user type - if not specified, try to infer from role or default to 'user'
    let userType = type;
    if (!userType) {
      // If type is not in token, infer from role or default to 'user'
      if (role === 'ADMIN') {
        userType = 'admin';
      } else {
        userType = 'user';
      }
    }

    let user;
    if (userType === 'admin') {
      user = await Admin.findByPk(id);
    } else {
      user = await User.findByPk(id);
    }

    if (!user) {
      const logger = require('../utils/logger');
      logger.warn(`Auth Failed: User not found for id ${id} and type ${userType}. Token payload:`, { id, type, role });
      return sendError(reply, 'User not found. Please login again.', 401);
    }

    // Check if user is blocked (only for User model, Admin might not have this field)
    if (user.isBlocked !== undefined && user.isBlocked) {
      return sendError(reply, 'Your account has been blocked', 403);
    }

    // Normalized user data on request
    request.user = {
      id: user.id,
      role: user.role || role, // 'ADMIN' or 'HOTEL'
      type: userType,
      mobileNumber: user.mobileNumber, // Admin might not have this, usage should be safe
      name: user.name || user.hotelName, // Generic name field
    };

    return;
  } catch (error) {
    const logger = require('../utils/logger');
    logger.error('Authentication Error:', error.message);
    
    // Provide more specific error messages
    if (error.message.includes('expired')) {
      return sendError(reply, 'Token expired. Please login again.', 401);
    }
    if (error.message.includes('invalid') || error.message.includes('malformed')) {
      return sendError(reply, 'Invalid token. Please login again.', 401);
    }
    
    return sendError(reply, 'Unauthorized: ' + error.message, 401);
  }
};

const requireRole = (...allowedRoles) => {
  return async (request, reply) => {
    if (!request.user) {
      return sendError(reply, 'Authentication required', 401);
    }

    if (!allowedRoles.includes(request.user.role)) {
      return sendError(reply, 'Insufficient permissions', 403);
    }

    return;
  };
};

const authorizeAdmin = requireRole('ADMIN', 'super_admin');

module.exports = {
  authenticate,
  requireRole,
  authorizeAdmin,
};
