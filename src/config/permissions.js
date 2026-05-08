const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard.view',
  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_MANAGE: 'products.manage',
  CATEGORIES_VIEW: 'categories.view',
  CATEGORIES_MANAGE: 'categories.manage',
  ORDERS_VIEW: 'orders.view',
  ORDERS_MANAGE: 'orders.manage',
  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_MANAGE: 'customers.manage',
  STAFF_VIEW: 'staff.view',
  STAFF_MANAGE: 'staff.manage',
  DRIVERS_VIEW: 'drivers.view',
  DRIVERS_MANAGE: 'drivers.manage',
  BILLING_VIEW: 'billing.view',
  ENQUIRY_VIEW: 'enquiry.view',
  OFFERS_VIEW: 'offers.view',
  OFFERS_MANAGE: 'offers.manage',
  BRANDS_VIEW: 'brands.view',
  BRANDS_MANAGE: 'brands.manage',
  NOTIFICATIONS_VIEW: 'notifications.view',
  NOTIFICATIONS_MANAGE: 'notifications.manage',
  SETTINGS_VIEW: 'settings.view',
  PROFILE_VIEW: 'profile.view',
};

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

function normalizePermissions(input) {
  if (!Array.isArray(input)) return [];
  const unique = new Set(
    input
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .filter((value) => ALL_PERMISSIONS.includes(value))
  );
  return [...unique];
}

module.exports = {
  PERMISSIONS,
  ALL_PERMISSIONS,
  normalizePermissions,
};
