const CustomerProductPricing = require('../models/customer.product.pricing.model');
const logger = require('../utils/logger');
const { isFixedPriceRateType } = require('./customerPricing.service');

/** Deactivate all fixed-price contract rows for a customer */
const deactivateCustomerFixedPricing = async (customerId) => {
  const cid = Number(customerId);
  if (!cid) return 0;

  const [modifiedCount] = await CustomerProductPricing.update(
    { isActive: false },
    { where: { customerId: cid } }
  );

  return modifiedCount || 0;
};

/**
 * Run side effects when admin changes a customer's rate type.
 * Leaving Fixed Price must immediately stop fixed SKUs from appearing in the app.
 */
const handleCustomerRateTypeTransition = async (customerId, fromRateType, toRateType) => {
  const from = String(fromRateType || '').trim();
  const to = String(toRateType || '').trim();
  if (from === to) return { deactivatedPricingRows: 0 };

  const wasFixed = isFixedPriceRateType(from);
  const willBeFixed = isFixedPriceRateType(to);

  if (wasFixed && !willBeFixed) {
    const count = await deactivateCustomerFixedPricing(customerId);
    logger.info(
      `Customer ${customerId}: deactivated ${count} fixed-pricing row(s) (${from} → ${to})`
    );
    return { deactivatedPricingRows: count };
  }

  return { deactivatedPricingRows: 0 };
};

module.exports = {
  deactivateCustomerFixedPricing,
  handleCustomerRateTypeTransition,
};
