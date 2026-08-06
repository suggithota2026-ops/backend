/**
 * Shared visibility rules for Products.
 * Admin Products sidebar and Daily/Weekly app must use the same catalog filter.
 */
const { Op } = require('sequelize');

/** Same condition as admin Products sidebar (exclude Fixed Excel / contract SKUs). */
const catalogOnlyWhere = () => ({ isContractOnly: false });

const applyAdminProductsCatalogFilter = (where = {}) => {
  Object.assign(where, catalogOnlyWhere());
  return where;
};

module.exports = {
  catalogOnlyWhere,
  applyAdminProductsCatalogFilter,
  Op,
};
