/**
 * Migrate legacy isContractOnly / image heuristics to productSource + ownerCustomerId.
 */
const Product = require('../models/product.model');
const CustomerProductPricing = require('../models/customer.product.pricing.model');
const { PRODUCT_SOURCE } = require('./productVisibility');
const logger = require('./logger');

const backfillProductSources = async () => {
  try {
    const catalogFromLegacy = await Product.updateMany(
      {
        $or: [{ productSource: { $exists: false } }, { productSource: null }],
        isContractOnly: { $ne: true },
      },
      {
        $set: {
          productSource: PRODUCT_SOURCE.CATALOG,
          ownerCustomerId: null,
          isContractOnly: false,
        },
      }
    );
    if (catalogFromLegacy?.modifiedCount > 0) {
      logger.info(
        `Set productSource=catalog on ${catalogFromLegacy.modifiedCount} Product Master row(s)`
      );
    }

    const contractFromLegacy = await Product.updateMany(
      {
        $or: [{ productSource: { $exists: false } }, { productSource: null }],
        isContractOnly: true,
      },
      {
        $set: {
          productSource: PRODUCT_SOURCE.CUSTOMER_FIXED,
          isContractOnly: true,
        },
      }
    );
    if (contractFromLegacy?.modifiedCount > 0) {
      logger.info(
        `Set productSource=customer_fixed on ${contractFromLegacy.modifiedCount} legacy contract row(s)`
      );
    }

    const pricingRows = await CustomerProductPricing.findAll({
      attributes: ['customerId', 'productId'],
    });

    const productToCustomers = new Map();
    for (const row of pricingRows) {
      const pid = Number(row.productId);
      const cid = Number(row.customerId);
      if (!pid || !cid) continue;
      if (!productToCustomers.has(pid)) productToCustomers.set(pid, new Set());
      productToCustomers.get(pid).add(cid);
    }

    let assigned = 0;
    for (const [productId, customerSet] of productToCustomers.entries()) {
      if (customerSet.size !== 1) continue;
      const [customerId] = [...customerSet];
      const result = await Product.updateMany(
        {
          id: productId,
          $or: [{ ownerCustomerId: null }, { ownerCustomerId: { $exists: false } }],
        },
        {
          $set: {
            productSource: PRODUCT_SOURCE.CUSTOMER_FIXED,
            ownerCustomerId: customerId,
            isContractOnly: true,
          },
        }
      );
      assigned += result?.modifiedCount || 0;
    }
    if (assigned > 0) {
      logger.info(`Assigned ownerCustomerId on ${assigned} customer-fixed product(s)`);
    }

    const unsetCatalog = await Product.updateMany(
      { productSource: PRODUCT_SOURCE.CATALOG, ownerCustomerId: { $ne: null } },
      { $set: { ownerCustomerId: null } }
    );
    if (unsetCatalog?.modifiedCount > 0) {
      logger.info(
        `Cleared ownerCustomerId on ${unsetCatalog.modifiedCount} catalog product(s)`
      );
    }
  } catch (error) {
    logger.warn(`Product source backfill skipped: ${error?.message || error}`);
  }
};

module.exports = { backfillProductSources };
