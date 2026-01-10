// Stock alert job
const Product = require('../models/product.model');
const logger = require('../utils/logger');

const checkStockLevels = async () => {
  try {
    const products = await Product.find({
      isActive: true,
      stock: { $lte: { $expr: '$minStockLevel' } },
    });

    if (products.length > 0) {
      logger.warn(`Stock alert: ${products.length} products below minimum stock level`, {
        products: products.map(p => ({
          id: p._id,
          name: p.name,
          stock: p.stock,
          minStockLevel: p.minStockLevel,
        })),
      });

      // TODO: Send alert via email or notification to admin
    }
  } catch (error) {
    logger.error('Error checking stock levels:', error);
  }
};

// Run every 6 hours
const scheduleStockAlert = () => {
  checkStockLevels();
  setInterval(checkStockLevels, 6 * 60 * 60 * 1000);
};

module.exports = {
  checkStockLevels,
  scheduleStockAlert,
};
