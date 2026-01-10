// Admin dashboard controller
const { getDashboardStats } = require('../../services/report.service');
const { sendSuccess, sendError } = require('../../utils/response');
const logger = require('../../utils/logger');

const getDashboard = async (request, reply) => {
  try {
    const stats = await getDashboardStats();
    return sendSuccess(reply, stats, 'Dashboard stats retrieved successfully');
  } catch (error) {
    logger.error('Error fetching dashboard stats:', error);
    return sendError(reply, 'Failed to fetch dashboard stats', 500);
  }
};

module.exports = {
  getDashboard,
};
