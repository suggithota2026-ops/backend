const Product = require('../models/product.model');
const Category = require('../models/category.model');
const User = require('../models/user.model');
const { ROLES } = require('../config/constants');
const { PRODUCT_SOURCE } = require('../utils/productVisibility');
const logger = require('../utils/logger');

const MAX_BULK_ITEMS = 500;

const normalizeProductName = (name) =>
  String(name || '')
    .toLowerCase()
    .replace(/[()[\],./\\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Load all categories once for upload validation */
const loadCategoryMaps = async () => {
  const categories = await Category.findAll({
    attributes: ['id', 'name', 'subcategories'],
  });
  const byId = new Map();
  const byName = new Map();
  for (const cat of categories) {
    const data = cat.toJSON ? cat.toJSON() : cat;
    byId.set(Number(data.id), data);
    byName.set(String(data.name || '').trim().toLowerCase(), data);
  }
  return { byId, byName, categories };
};

const resolveCategoryId = (value, { byId, byName }) => {
  if (value == null || value === '') return null;
  const asNumber = parseInt(value, 10);
  if (!Number.isNaN(asNumber) && asNumber > 0 && byId.has(asNumber)) {
    return asNumber;
  }
  const normalized = String(value).trim().toLowerCase();
  const byExactName = byName.get(normalized);
  if (byExactName) return Number(byExactName.id);

  const partial = [];
  for (const [name, cat] of byName.entries()) {
    if (name.includes(normalized) || normalized.includes(name)) {
      partial.push(cat);
    }
  }
  if (partial.length === 1) return Number(partial[0].id);
  return null;
};

const resolveSubcategoryId = (categoryId, subcategoryValue, byId) => {
  if (!subcategoryValue) return null;
  const category = byId.get(Number(categoryId));
  const subs = category?.subcategories || [];
  if (subs.length === 0) return String(subcategoryValue).trim();

  const raw = String(subcategoryValue).trim();
  const byIdMatch = subs.find((s) => s.id === raw);
  if (byIdMatch) return byIdMatch.id;
  const byName = subs.find(
    (s) => String(s.name || '').trim().toLowerCase() === raw.toLowerCase()
  );
  return byName ? byName.id : null;
};

/**
 * Existing customer_fixed products for duplicate detection (scoped to customer).
 * Unassigned (ownerCustomerId null) included when customerId is not set yet (new hotel form).
 */
const loadExistingCustomerProducts = async (customerId) => {
  const where = { productSource: PRODUCT_SOURCE.CUSTOMER_FIXED };
  if (customerId != null && Number(customerId) > 0) {
    where.ownerCustomerId = { $in: [Number(customerId), null] };
  } else {
    where.ownerCustomerId = null;
  }
  const rows = await Product.find(where).select('id name ownerCustomerId').lean();
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

const validateBulkItem = (item, categoryMaps) => {
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
  if (subcategory) {
    subcategory = resolveSubcategoryId(categoryId, subcategory, categoryMaps.byId);
    const category = categoryMaps.byId.get(categoryId);
    const subs = category?.subcategories || [];
    if (subs.length > 0 && !subcategory) {
      throw new Error(`subcategory "${item.subcategory}" not found`);
    }
  }

  return { name, categoryId, subcategory, price, unit, stock };
};

/**
 * Bulk-create Customer Fixed Rate products in ONE request.
 * No Mongo transaction (works on standalone Atlas / local without replica set).
 * Returns created + matched (duplicate) + errors for partial failure reporting.
 */
const bulkCreateCustomerFixedProducts = async ({
  customerId,
  items,
  createdById,
}) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('products array is required');
  }
  if (items.length > MAX_BULK_ITEMS) {
    throw new Error(
      `Maximum ${MAX_BULK_ITEMS} products allowed per upload. Split the Excel and try again.`
    );
  }

  const numericCustomerId =
    customerId != null && Number(customerId) > 0 ? Number(customerId) : null;

  if (numericCustomerId) {
    const customer = await User.findByPk(numericCustomerId);
    if (!customer || customer.role !== ROLES.HOTEL) {
      throw new Error('Customer not found');
    }
  }

  const categoryMaps = await loadCategoryMaps();
  const existingByName = await loadExistingCustomerProducts(numericCustomerId);

  const created = [];
  const matched = [];
  const errors = [];
  const batchNames = new Set();

  for (let i = 0; i < items.length; i++) {
    const item = items[i] || {};
    const rowNumber = item.rowNumber != null ? Number(item.rowNumber) : i + 1;

    try {
      const validated = validateBulkItem(item, categoryMaps);
      const normName = normalizeProductName(validated.name);

      if (batchNames.has(normName)) {
        throw new Error('duplicate product name in this upload');
      }
      batchNames.add(normName);

      const existing = existingByName.get(normName);
      if (existing) {
        if (
          existing.ownerCustomerId != null &&
          numericCustomerId != null &&
          Number(existing.ownerCustomerId) !== numericCustomerId
        ) {
          throw new Error('product name belongs to another customer');
        }
        matched.push({
          id: Number(existing.id),
          name: existing.name,
          categoryId: validated.categoryId,
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
        productSource: PRODUCT_SOURCE.CUSTOMER_FIXED,
        ownerCustomerId: numericCustomerId,
        unit: validated.unit,
        stock: validated.stock,
        minStockLevel: 0,
        status: 'active',
        isActive: true,
        isContractOnly: true,
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
      logger.warn(`Row ${rowNumber} bulk customer-fixed create failed: ${rowError.message}`);
    }
  }

  return { created, matched, errors };
};

/** Assign ownership when a new hotel saves pricing (Excel upload before hotel existed) */
const assignCustomerOwnership = async (customerId, productIds) => {
  const ids = [...new Set(productIds.map((id) => Number(id)).filter((id) => id > 0))];
  if (ids.length === 0) return 0;

  const products = await Product.find({ id: { $in: ids } }).select(
    'id productSource ownerCustomerId'
  );

  const blocked = products.filter(
    (p) =>
      p.productSource === PRODUCT_SOURCE.CUSTOMER_FIXED &&
      p.ownerCustomerId != null &&
      Number(p.ownerCustomerId) !== Number(customerId)
  );
  if (blocked.length > 0) {
    throw new Error(
      `${blocked.length} product(s) belong to another customer and cannot be assigned`
    );
  }

  const result = await Product.updateMany(
    {
      id: { $in: ids },
      productSource: PRODUCT_SOURCE.CUSTOMER_FIXED,
      $or: [{ ownerCustomerId: null }, { ownerCustomerId: Number(customerId) }],
    },
    {
      $set: {
        ownerCustomerId: Number(customerId),
        productSource: PRODUCT_SOURCE.CUSTOMER_FIXED,
        isContractOnly: true,
      },
    }
  );

  return result?.modifiedCount || 0;
};

module.exports = {
  MAX_BULK_ITEMS,
  normalizeProductName,
  loadCategoryMaps,
  resolveCategoryId,
  resolveSubcategoryId,
  bulkCreateCustomerFixedProducts,
  assignCustomerOwnership,
};
