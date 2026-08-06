/**
 * Normalize product visibility for catalog vs Fixed-Price Excel contracts.
 *
 * Catalog (admin Products sidebar + Daily/Weekly app): isContractOnly === false
 * Contract (Fixed Excel / customer pricing): isContractOnly === true
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
    // 1) Explicit default: missing flag → catalog (false)
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
    const pricingIds = [
      ...new Set(
        pricingRows
          .map((row) => Number(row.productId))
          .filter((id) => Number.isFinite(id) && id > 0)
      ),
    ];

    // 2) Pricing-linked Excel-style rows (no images) → contract-only
    if (pricingIds.length > 0) {
      const priced = await Product.updateMany(
        {
          id: { $in: pricingIds },
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

    // 3) Duplicate names: keep one catalog row, mark extra Excel copies contract-only
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
    for (const group of groups.values()) {
      if (group.length < 2) continue;

      const pricingSet = new Set(pricingIds);
      const inPricing = group.filter((p) => pricingSet.has(Number(p.id)));
      const notInPricing = group.filter((p) => !pricingSet.has(Number(p.id)));

      if (inPricing.length > 0 && notInPricing.length > 0) {
        // Catalog row exists separately from pricing-linked copies
        for (const p of inPricing) {
          if (p.isContractOnly !== true && hasNoImages(p)) {
            duplicateContractIds.push(Number(p.id));
          }
        }
        continue;
      }

      // All duplicates are pricing-linked (or none are): keep lowest id as catalog if it has
      // images; otherwise mark every no-image duplicate except the oldest as contract-only.
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
