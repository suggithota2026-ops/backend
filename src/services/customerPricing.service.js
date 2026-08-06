const CustomerProductPricing = require('../models/customer.product.pricing.model');
const User = require('../models/user.model');
const logger = require('../utils/logger');

const isFixedPriceRateType = (rateType) =>
  String(rateType || '').trim().toLowerCase() === 'fixed price';

/** Parse YYYY-MM-DD (or Date) as local calendar start-of-day */
const toStartOfDay = (value) => {
  if (value == null || value === '') return null;
  const raw = String(value);
  const dayPart = raw.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dayPart)) {
    const [y, m, d] = dayPart.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

/** Parse YYYY-MM-DD (or Date) as local calendar end-of-day */
const toEndOfDay = (value) => {
  if (value == null || value === '') return null;
  const raw = String(value);
  const dayPart = raw.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dayPart)) {
    const [y, m, d] = dayPart.split('-').map(Number);
    return new Date(y, m - 1, d, 23, 59, 59, 999);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(23, 59, 59, 999);
  return date;
};

/**
 * Active window check using local calendar days so IST admin date pickers
 * match the full selected start/end dates (avoids UTC midnight edge cases).
 */
const isContractActiveToday = (startDate, endDate, now = new Date()) => {
  const start = toStartOfDay(startDate);
  const end = toEndOfDay(endDate);
  if (!start || !end) return false;
  return now >= start && now <= end;
};

const getActiveCustomerPricing = async (customerId, productId) => {
  try {
    const rows = await CustomerProductPricing.findAll({
      where: {
        customerId: Number(customerId),
        productId: Number(productId),
        isActive: true,
      },
      attributes: ['fixedPrice', 'contractStartDate', 'contractEndDate'],
    });

    const now = new Date();
    const active = rows.find((row) =>
      isContractActiveToday(row.contractStartDate, row.contractEndDate, now)
    );

    return active ? Number(active.fixedPrice) : null;
  } catch (error) {
    logger.error('Error getting active customer pricing:', error);
    return null;
  }
};

/** Map of productId -> fixedPrice for active contract rows */
const getActiveCustomerPricingMap = async (customerId) => {
  const priceMap = new Map();
  try {
    const rows = await CustomerProductPricing.findAll({
      where: {
        customerId: Number(customerId),
        isActive: true,
      },
      attributes: ['productId', 'fixedPrice', 'contractStartDate', 'contractEndDate'],
    });

    const now = new Date();
    for (const row of rows) {
      if (isContractActiveToday(row.contractStartDate, row.contractEndDate, now)) {
        priceMap.set(Number(row.productId), Number(row.fixedPrice));
      }
    }
  } catch (error) {
    logger.error('Error getting active customer pricing map:', error);
  }
  return priceMap;
};

/**
 * For Fixed Price customers:
 * - Only products with an active fixed price are returned
 * - product.price is the contract fixedPrice (not daily catalog rate)
 * Daily / Weekly: same catalog as admin Products sidebar (isContractOnly === false).
 */
const applyCustomerPricesToProducts = async (products, userId) => {
  if (!userId || !Array.isArray(products) || products.length === 0) {
    return products;
  }

  try {
    const user = await User.findByPk(Number(userId));
    if (!user || !isFixedPriceRateType(user.rateType)) {
      // Daily / Weekly — identical to admin Products sidebar filter
      return products.filter(
        (product) => product && typeof product === 'object' && product.isContractOnly === false
      );
    }

    const priceMap = await getActiveCustomerPricingMap(user.id);
    if (priceMap.size === 0) {
      return [];
    }

    return products
      .map((product) => {
        const data = product && typeof product === 'object' ? { ...product } : product;
        if (!data || data.id == null) return null;

        const fixedPrice = priceMap.get(Number(data.id));
        if (fixedPrice == null || Number.isNaN(fixedPrice)) {
          return null;
        }

        return {
          ...data,
          catalogPrice: data.price,
          price: fixedPrice,
          isCustomerFixedPrice: true,
        };
      })
      .filter(Boolean);
  } catch (error) {
    logger.error('Error applying customer prices to products:', error);
    try {
      const user = await User.findByPk(Number(userId));
      if (user && isFixedPriceRateType(user.rateType)) {
        return [];
      }
    } catch (_) {
      // ignore
    }
    return products.filter(
      (product) => product && typeof product === 'object' && product.isContractOnly === false
    );
  }
};

module.exports = {
  toStartOfDay,
  toEndOfDay,
  isContractActiveToday,
  isFixedPriceRateType,
  getActiveCustomerPricing,
  getActiveCustomerPricingMap,
  applyCustomerPricesToProducts,
};
