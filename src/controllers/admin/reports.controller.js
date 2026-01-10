// Admin reports controller
const reportService = require('../../services/report.service');
const { sendSuccess, sendError } = require('../../utils/response');
const logger = require('../../utils/logger');

const getDailyReport = async (request, reply) => {
  try {
    const { date } = request.query;
    const reportDate = date ? new Date(date) : new Date();
    const report = await reportService.getDailyReport(reportDate);
    return sendSuccess(reply, report, 'Daily report retrieved successfully');
  } catch (error) {
    logger.error('Error fetching daily report:', error);
    return sendError(reply, 'Failed to fetch daily report', 500);
  }
};

const getWeeklyReport = async (request, reply) => {
  try {
    const { date } = request.query;
    const reportDate = date ? new Date(date) : new Date();
    const report = await reportService.getWeeklyReport(reportDate);
    return sendSuccess(reply, report, 'Weekly report retrieved successfully');
  } catch (error) {
    logger.error('Error fetching weekly report:', error);
    return sendError(reply, 'Failed to fetch weekly report', 500);
  }
};

const getMonthlyReport = async (request, reply) => {
  try {
    const { date } = request.query;
    const reportDate = date ? new Date(date) : new Date();
    const report = await reportService.getMonthlyReport(reportDate);
    return sendSuccess(reply, report, 'Monthly report retrieved successfully');
  } catch (error) {
    logger.error('Error fetching monthly report:', error);
    return sendError(reply, 'Failed to fetch monthly report', 500);
  }
};

const getGSTReport = async (request, reply) => {
  try {
    const { startDate, endDate } = request.query;
    
    if (!startDate || !endDate) {
      return sendError(reply, 'Start date and end date are required', 400);
    }

    const report = await reportService.getGSTReport(new Date(startDate), new Date(endDate));
    return sendSuccess(reply, report, 'GST report retrieved successfully');
  } catch (error) {
    logger.error('Error fetching GST report:', error);
    return sendError(reply, 'Failed to fetch GST report', 500);
  }
};

module.exports = {
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getGSTReport,
};

