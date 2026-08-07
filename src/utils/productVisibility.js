/**
 * Shared visibility rules for Products.
 * Product Master (catalog) and Customer Fixed Rate products are strictly separated
 * via productSource + ownerCustomerId — not isContractOnly or image heuristics.
 */
const { Op } = require('sequelize');

const PRODUCT_SOURCE = {
  CATALOG: 'catalog',
  CUSTOMER_FIXED: 'customer_fixed',
};

/** Admin Products sidebar + Daily/Weekly mobile catalog — never customer_fixed SKUs */
const catalogOnlyWhere = () => ({
  $and: [
    { productSource: { $ne: PRODUCT_SOURCE.CUSTOMER_FIXED } },
    {
      $or: [
        { isContractOnly: { $ne: true } },
        { isContractOnly: { $exists: false } },
      ],
    },
  ],
});

const applyAdminProductsCatalogFilter = (where = {}) => {
  Object.assign(where, catalogOnlyWhere());
  return where;
};

/** Customer Fixed Rate products owned by one customer */
const customerFixedWhere = (customerId) => ({
  productSource: PRODUCT_SOURCE.CUSTOMER_FIXED,
  ownerCustomerId: Number(customerId),
});

const isCatalogProduct = (product) => {
  if (!product || typeof product !== 'object') return false;
  if (product.productSource === PRODUCT_SOURCE.CATALOG) return true;
  if (product.productSource === PRODUCT_SOURCE.CUSTOMER_FIXED) return false;
  // Legacy rows before backfill
  return product.isContractOnly !== true;
};

const isCustomerFixedProduct = (product) => {
  if (!product || typeof product !== 'object') return false;
  if (product.productSource === PRODUCT_SOURCE.CUSTOMER_FIXED) return true;
  if (product.productSource === PRODUCT_SOURCE.CATALOG) return false;
  return product.isContractOnly === true;
};

const productOwnedByCustomer = (product, customerId) => {
  if (!isCustomerFixedProduct(product)) return false;
  const owner = product.ownerCustomerId;
  if (owner == null || owner === '') return true;
  return Number(owner) === Number(customerId);
};

module.exports = {
  PRODUCT_SOURCE,
  catalogOnlyWhere,
  applyAdminProductsCatalogFilter,
  customerFixedWhere,
  isCatalogProduct,
  isCustomerFixedProduct,
  productOwnedByCustomer,
  Op,
};
