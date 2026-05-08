// Admin authorization middleware
const { authenticate, requireRole } = require('./auth.middleware');
const { ROLES } = require('../config/constants');
const { sendError } = require('../utils/response');

const authenticateAdmin = async (request, reply) => {
  // First authenticate the user
  const authResult = await authenticate(request, reply);
  
  // If authentication failed, return the result
  if (reply.sent) return authResult;
  
  // Check if the user has admin role
  if (!request.user || request.user.role !== ROLES.ADMIN) {
    const { sendError } = require('../utils/response');
    return sendError(reply, 'Insufficient permissions. Admin access required.', 403);
  }
};

const requireAdmin = requireRole(ROLES.ADMIN);

const requirePermission = (...requiredPermissions) => {
  return async (request, reply) => {
    if (!request.user) {
      return sendError(reply, 'Authentication required', 401);
    }

    const role = String(request.user.role || '').toUpperCase();
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      return;
    }

    const userPermissions = Array.isArray(request.user.permissions)
      ? request.user.permissions
      : [];

    const hasAnyPermission = requiredPermissions.some((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasAnyPermission) {
      return sendError(reply, 'Insufficient permissions for this action', 403);
    }
  };
};

module.exports = {
  authenticateAdmin,
  requireAdmin,
  requirePermission,
};
