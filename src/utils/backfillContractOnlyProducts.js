/**
 * Mark Fixed Excel / contract products so Daily/Weekly + admin Products sidebar
 * only show true catalog rows (isContractOnly === false).
 */
const Product = require('../models/product.model');
const CustomerProductPricing = require('../models/customer.product.pricing.model');
const logger = require('./logger');

const normalizeName = (name) =>
  String(name || '')
    .toLowerCase()
    .replace(/[()[\],./\\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const hasNoImages = (product) => {
  const images = product?.images;
  return !Array.isArray(images) || images.length === 0;
};

const backfillContractOnlyProducts = async () => {
  try {
    const defaults = await Product.updateMany(
      { isContractOnly: { $exists: false } },
      { $set: { isContractOnly: false } }
    );
    if (defaults?.modifiedCount > 0) {
      logger.info(
        `Set isContractOnly=false on ${defaults.modifiedCount} legacy catalog product(s)`
      );
    }

    const pricingRows = await CustomerProductPricing.findAll({
      attributes: ['productId'],
    });
    const productIds = [
      ...new Set(
        pricingRows
          .map((row) => Number(row.productId))
          .filter((id) => Number.isFinite(id) && id > 0)
      ),
    ];

    if (productIds.length > 0) {
      const priced = await Product.updateMany(
        {
          id: { $in: productIds },
          isContractOnly: { $ne: true },
          $or: [
            { images: { $exists: false } },
            { images: null },
            { images: { $size: 0 } },
            { images: [] },
          ],
        },
        { $set: { isContractOnly: true } }
      );
      if (priced?.modifiedCount > 0) {
        logger.info(
          `Marked ${priced.modifiedCount} pricing-linked product(s) as contract-only`
        );
      }
    }

    const allProducts = await Product.findAll({
      attributes: ['id', 'name', 'images', 'isContractOnly'],
    });

    const groups = new Map();
    for (const product of allProducts) {
      const key = normalizeName(product.name);
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(product);
    }

    const duplicateContractIds = [];
    const pricingSet = new Set(productIds);
    for (const group of groups.values()) {
      if (group.length < 2) continue;

      const inPricing = group.filter((p) => pricingSet.has(Number(p.id)));
      const notInPricing = group.filter((p) => !pricingSet.has(Number(p.id)));

      if (inPricing.length > 0 && notInPricing.length > 0) {
        for (const p of inPricing) {
          if (p.isContractOnly !== true && hasNoImages(p)) {
            duplicateContractIds.push(Number(p.id));
          }
        }
        continue;
      }

      const sorted = [...group].sort((a, b) => Number(a.id) - Number(b.id));
      const keep = sorted.find((p) => !hasNoImages(p)) || sorted[0];
      for (const p of sorted) {
        if (Number(p.id) === Number(keep.id)) continue;
        if (hasNoImages(p) && p.isContractOnly !== true) {
          duplicateContractIds.push(Number(p.id));
        }
      }
    }

    if (duplicateContractIds.length > 0) {
      const uniqueIds = [...new Set(duplicateContractIds)];
      const dupResult = await Product.updateMany(
        { id: { $in: uniqueIds } },
        { $set: { isContractOnly: true } }
      );
      if (dupResult?.modifiedCount > 0) {
        logger.info(
          `Marked ${dupResult.modifiedCount} duplicate Excel product(s) as contract-only`
        );
      }
    }
  } catch (error) {
    logger.warn(
      `Contract-only product backfill skipped: ${error?.message || error}`
    );
  }
};

module.exports = { backfillContractOnlyProducts };
