// Daily report job
const { getDailyReport } = require('../services/report.service');
const logger = require('../utils/logger');

const runDailyReport = async () => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const report = await getDailyReport(yesterday);
    logger.info('Daily report generated:', {
      date: yesterday,
      totalOrders: report.totalOrders,
      totalSales: report.totalSales,
    });

    // TODO: Send report via email or save to storage
  } catch (error) {
    logger.error('Error generating daily report:', error);
  }
};

// Run daily at 9 AM
const scheduleDailyReport = () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  const msUntilTomorrow = tomorrow.getTime() - now.getTime();

  setTimeout(() => {
    runDailyReport();
    // Schedule next run (24 hours)
    setInterval(runDailyReport, 24 * 60 * 60 * 1000);
  }, msUntilTomorrow);
};

module.exports = {
  runDailyReport,
  scheduleDailyReport,
};
