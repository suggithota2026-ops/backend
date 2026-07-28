const CustomerProductPricing = require('../models/customer.product.pricing.model');
const User = require('../models/user.model');
const logger = require('../utils/logger');

const toStartOfDay = (value) => {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const toEndOfDay = (value) => {
  const date = new Date(value);
  date.setUTCHours(23, 59, 59, 999);
  return date;
};

const getActiveCustomerPricing = async (customerId, productId) => {
  try {
    const now = new Date();
    const pricing = await CustomerProductPricing.findOne({
      where: {
        customerId: Number(customerId),
        productId: Number(productId),
        isActive: true,
        contractStartDate: { $lte: now },
        contractEndDate: { $gte: now },
      },
      attributes: ['fixedPrice'],
    });

    return pricing ? Number(pricing.fixedPrice) : null;
  } catch (error) {
    logger.error('Error getting active customer pricing:', error);
    return null;
  }
};

/** Map of productId -> fixedPrice for active contract rows */
const getActiveCustomerPricingMap = async (customerId) => {
  const priceMap = new Map();
  try {
    const now = new Date();
    const rows = await CustomerProductPricing.findAll({
      where: {
        customerId: Number(customerId),
        isActive: true,
        contractStartDate: { $lte: now },
        contractEndDate: { $gte: now },
      },
      attributes: ['productId', 'fixedPrice'],
    });

    for (const row of rows) {
      priceMap.set(Number(row.productId), Number(row.fixedPrice));
    }
  } catch (error) {
    logger.error('Error getting active customer pricing map:', error);
  }
  return priceMap;
};

/**
 * For Fixed Price customers, override product.price with contract price.
 * Keeps catalogPrice so callers can still see the base rate if needed.
 */
const applyCustomerPricesToProducts = async (products, userId) => {
  if (!userId || !Array.isArray(products) || products.length === 0) {
    return products;
  }

  try {
    const user = await User.findByPk(userId);
    if (!user || user.rateType !== 'Fixed Price') {
      return products;
    }

    const priceMap = await getActiveCustomerPricingMap(user.id);
    if (priceMap.size === 0) {
      return products;
    }

    return products.map((product) => {
      const data = product && typeof product === 'object' ? { ...product } : product;
      if (!data || data.id == null) return data;

      const fixedPrice = priceMap.get(Number(data.id));
      if (fixedPrice == null || Number.isNaN(fixedPrice)) {
        return data;
      }

      return {
        ...data,
        catalogPrice: data.price,
        price: fixedPrice,
        isCustomerFixedPrice: true,
      };
    });
  } catch (error) {
    logger.error('Error applying customer prices to products:', error);
    return products;
  }
};

module.exports = {
  toStartOfDay,
  toEndOfDay,
  getActiveCustomerPricing,
  getActiveCustomerPricingMap,
  applyCustomerPricesToProducts,
};
