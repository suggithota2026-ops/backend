// Admin authorization middleware
const { authenticate, requireRole } = require('./auth.middleware');
const { ROLES } = require('../config/constants');

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

module.exports = {
  authenticateAdmin,
  requireAdmin,
};
