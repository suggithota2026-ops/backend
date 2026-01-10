// Admin authorization middleware
const { requireRole } = require('./auth.middleware');
const { ROLES } = require('../config/constants');

const requireAdmin = requireRole(ROLES.ADMIN);

module.exports = {
  requireAdmin,
};
