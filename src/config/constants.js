// App constants (roles, status, etc.)

module.exports = {
  ROLES: {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'ADMIN',
    HOTEL: 'hotel',
    DRIVER: 'driver',
    STAFF: 'staff',
  },

  ORDER_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    DISPATCHED: 'dispatched',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
  },

  PRODUCT_STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    OUT_OF_STOCK: 'out_of_stock',
  },

  NOTIFICATION_TYPES: {
    NEW_ORDER: 'new_order',
    ORDER_CONFIRMATION: 'order_confirmation',
    ORDER_DISPATCHED: 'order_dispatched',
    ORDER_DELIVERED: 'order_delivered',
    ORDER_CANCELLED: 'order_cancelled',
    ADMIN_MESSAGE: 'admin_message',
    BROADCAST: 'broadcast',
    OFFER: 'offer',
  },

  PAYMENT_METHOD: {
    CASH: 'cash',
    OFFLINE: 'offline',
  },

  INVOICE_STATUS: {
    PENDING: 'pending',
    GENERATED: 'generated',
    PAID: 'paid',
  },
};
