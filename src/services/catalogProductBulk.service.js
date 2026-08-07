const Product = require('../models/product.model');
const { PRODUCT_SOURCE } = require('../utils/productVisibility');
const {
  MAX_BULK_ITEMS,
  normalizeProductName,
  loadCategoryMaps,
  resolveCategoryId,
  resolveSubcategoryId,
} = require('./customerFixedProduct.service');
const logger = require('../utils/logger');

const validateCatalogBulkItem = (item, categoryMaps, { requireSubcategory = false } = {}) => {
  const name = String(item.name || '').trim();
  const categoryId = resolveCategoryId(
    item.categoryId ?? item.category ?? item.categoryName,
    categoryMaps
  );
  const price = Number(item.price);
  const unit = String(item.unit || 'kg').trim() || 'kg';
  const stock =
    item.stock != null && item.stock !== '' ? Number(item.stock) : 0.5;

  if (!name || name.length < 2) {
    throw new Error('invalid name');
  }
  if (!categoryId) {
    throw new Error('invalid category');
  }
  if (Number.isNaN(price) || price < 0) {
    throw new Error('invalid price');
  }
  if (Number.isNaN(stock) || stock < 0) {
    throw new Error('invalid minimumQuantity');
  }

  let subcategory =
    item.subcategory != null && String(item.subcategory).trim()
      ? String(item.subcategory).trim()
      : null;

  if (requireSubcategory && !subcategory) {
    throw new Error('subcategory is required');
  }

  if (subcategory) {
    const resolved = resolveSubcategoryId(categoryId, subcategory, categoryMaps.byId);
    const category = categoryMaps.byId.get(categoryId);
    const subs = category?.subcategories || [];
    if (subs.length > 0 && !resolved) {
      // Skip invalid subcategory — still create product without it
      subcategory = null;
    } else {
      subcategory = resolved || subcategory;
    }
  }

  return { name, categoryId, subcategory, price, unit, stock };
};

const loadExistingCatalogProducts = async () => {
  const rows = await Product.find({
    $and: [
      { productSource: { $ne: PRODUCT_SOURCE.CUSTOMER_FIXED } },
      {
        $or: [{ isContractOnly: { $ne: true } }, { isContractOnly: { $exists: false } }],
      },
      {
        $or: [{ ownerCustomerId: null }, { ownerCustomerId: { $exists: false } }],
      },
    ],
  })
    .select('id name categoryId')
    .lean();

  const byNormalizedName = new Map();
  for (const row of rows) {
    const key = normalizeProductName(row.name);
    if (!key) continue;
    if (!byNormalizedName.has(key)) {
      byNormalizedName.set(key, row);
    }
  }
  return byNormalizedName;
};

/**
 * Bulk-create Product Master (catalog) products in ONE request.
 * Never creates customer_fixed SKUs.
 */
const bulkCreateCatalogProducts = async ({ items, createdById }) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('products array is required');
  }
  if (items.length > MAX_BULK_ITEMS) {
    throw new Error(
      `Maximum ${MAX_BULK_ITEMS} products allowed per upload. Split the Excel and try again.`
    );
  }

  const categoryMaps = await loadCategoryMaps();
  const existingByName = await loadExistingCatalogProducts();

  const created = [];
  const matched = [];
  const errors = [];
  const batchNames = new Set();

  for (let i = 0; i < items.length; i++) {
    const item = items[i] || {};
    const rowNumber = item.rowNumber != null ? Number(item.rowNumber) : i + 1;

    try {
      const validated = validateCatalogBulkItem(item, categoryMaps, {
        requireSubcategory: false,
      });
      const normName = normalizeProductName(validated.name);

      if (batchNames.has(normName)) {
        throw new Error('duplicate product name in this upload');
      }
      batchNames.add(normName);

      const existing = existingByName.get(normName);
      if (existing) {
        matched.push({
          id: Number(existing.id),
          name: existing.name,
          categoryId: Number(existing.categoryId || validated.categoryId),
          rowNumber,
          duplicate: true,
        });
        continue;
      }

      const product = await Product.create({
        name: validated.name,
        description: null,
        categoryId: validated.categoryId,
        subcategory: validated.subcategory,
        price: validated.price,
        pricingType: 'fixed',
        productSource: PRODUCT_SOURCE.CATALOG,
        ownerCustomerId: null,
        unit: validated.unit,
        stock: validated.stock,
        minStockLevel: 0,
        status: 'active',
        isActive: true,
        isContractOnly: false,
        displayOrder: 0,
        images: [],
        createdById: createdById ? parseInt(createdById, 10) : null,
      });

      existingByName.set(normName, product);
      created.push({
        id: Number(product.id),
        name: product.name,
        categoryId: product.categoryId,
        price: product.price,
        rowNumber,
      });
    } catch (rowError) {
      errors.push({
        rowNumber,
        name: item.name || null,
        message: rowError.message || 'failed to create',
      });
      logger.warn(`Row ${rowNumber} bulk catalog create failed: ${rowError.message}`);
    }
  }

  return { created, matched, errors };
};

module.exports = {
  bulkCreateCatalogProducts,
  validateCatalogBulkItem,
};
