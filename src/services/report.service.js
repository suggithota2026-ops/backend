// Report service (MongoDB)
const Order = require('../models/order.model');
const Invoice = require('../models/invoice.model');
const User = require('../models/user.model');
const {
  getStartOfDay,
  getEndOfDay,
  getStartOfWeek,
  getEndOfWeek,
  getStartOfMonth,
  getEndOfMonth,
} = require('../utils/date');
const { ORDER_STATUS } = require('../config/constants');

const BILLABLE_STATUSES = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.DISPATCHED,
  ORDER_STATUS.DELIVERED,
];

const getStartOfYear = (date = new Date()) => new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0);
const getEndOfYear = (date = new Date()) => new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);

const normalizeWeekStart = (date = new Date()) => getStartOfDay(getStartOfWeek(date));
const normalizeWeekEnd = (date = new Date()) => getEndOfDay(getEndOfWeek(date));
const normalizeMonthStart = (date = new Date()) => getStartOfDay(getStartOfMonth(date));
const normalizeMonthEnd = (date = new Date()) => getEndOfDay(getEndOfMonth(date));

const getDashboardStats = async () => {
  const todayStart = getStartOfDay();
  const todayEnd = getEndOfDay();

  const [
    totalOrders,
    pendingOrders,
    completedOrders,
    todaySalesResult,
    topHotelsAgg,
    recentOrders,
  ] = await Promise.all([
    Order.count(),
    Order.count({ where: { status: ORDER_STATUS.PENDING } }),
    Order.count({ where: { status: ORDER_STATUS.DELIVERED } }),
    Invoice.aggregate([
      { $match: { createdAt: { $gte: todayStart, $lte: todayEnd }, status: 'generated' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]).then((rows) => ({ total: rows?.[0]?.total || 0 })),
    Order.aggregate([
      { $match: { status: ORDER_STATUS.DELIVERED } },
      { $group: { _id: '$hotelId', orderCount: { $sum: 1 }, totalAmount: { $sum: '$totalAmount' } } },
      { $sort: { orderCount: -1 } },
      { $limit: 10 },
    ]),
    Order.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']],
    }),
  ]);

  // Prefer today's order sales when invoices are missing
  const todayOrderSales = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: todayStart, $lte: todayEnd },
        status: { $in: BILLABLE_STATUSES },
      },
    },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } },
  ]);

  const topHotelIds = (topHotelsAgg || []).map((h) => h._id);
  const topHotelsUsers = topHotelIds.length
    ? await User.findAll({ where: { id: { $in: topHotelIds } }, attributes: ['id', 'hotelName'] })
    : [];
  const topHotelMap = new Map(topHotelsUsers.map((u) => [u.id, u.hotelName]));

  const recentHotelIds = [...new Set((recentOrders || []).map((o) => o.hotelId))];
  const recentHotels = recentHotelIds.length
    ? await User.findAll({ where: { id: { $in: recentHotelIds } }, attributes: ['id', 'hotelName'] })
    : [];
  const recentHotelMap = new Map(recentHotels.map((u) => [u.id, u.hotelName]));

  const invoiceTodaySales = parseFloat(todaySalesResult.total || 0);
  const orderTodaySales = parseFloat(todayOrderSales?.[0]?.total || 0);

  return {
    totalOrders,
    pendingOrders,
    completedOrders,
    todaySales: invoiceTodaySales > 0 ? invoiceTodaySales : orderTodaySales,
    topHotels: (topHotelsAgg || []).map((h) => ({
      hotelName: topHotelMap.get(h._id) || `Hotel #${h._id}`,
      orderCount: parseInt(h.orderCount),
      totalAmount: parseFloat(h.totalAmount || 0),
    })),
    recentOrders: (recentOrders || []).map((o) => ({
      id: o.id,
      customer: recentHotelMap.get(o.hotelId) || `Hotel #${o.hotelId}`,
      amount: `₹${parseFloat(o.totalAmount).toLocaleString()}`,
      status: o.status,
      date: new Date(o.createdAt).toLocaleDateString(),
      product: 'View order items',
    })),
  };
};

const loadHotelMap = async (hotelIds) => {
  const uniqueIds = [...new Set((hotelIds || []).filter((id) => id != null))];
  if (uniqueIds.length === 0) return new Map();
  const hotels = await User.findAll({
    where: { id: { $in: uniqueIds } },
    attributes: ['id', 'hotelName', 'gstNumber'],
  });
  return new Map(
    hotels.map((h) => [h.id, { hotelName: h.hotelName, gstNumber: h.gstNumber || null }])
  );
};

const buildPeriodReport = async (start, end, extra = {}) => {
  const [orders, invoices] = await Promise.all([
    Order.findAll({
      where: {
        createdAt: { $gte: start, $lte: end },
      },
      order: [['createdAt', 'DESC']],
    }),
    Invoice.findAll({
      where: {
        createdAt: { $gte: start, $lte: end },
      },
      order: [['createdAt', 'DESC']],
    }),
  ]);

  const hotelMap = await loadHotelMap([
    ...orders.map((o) => o.hotelId),
    ...invoices.map((i) => i.hotelId),
  ]);

  const ordersWithHotel = orders.map((order) => {
    const json = order.toJSON ? order.toJSON() : order;
    return {
      ...json,
      hotel: { hotelName: hotelMap.get(order.hotelId)?.hotelName || null },
    };
  });

  const invoicesWithHotel = invoices.map((inv) => {
    const json = inv.toJSON ? inv.toJSON() : inv;
    const hotel = hotelMap.get(inv.hotelId) || null;
    return {
      ...json,
      hotel: hotel ? { hotelName: hotel.hotelName, gstNumber: hotel.gstNumber } : null,
    };
  });

  const billableOrders = ordersWithHotel.filter((o) =>
    BILLABLE_STATUSES.includes(o.status)
  );
  const pendingOrders = ordersWithHotel.filter((o) => o.status === ORDER_STATUS.PENDING);

  const invoiceSales = invoicesWithHotel.reduce(
    (sum, inv) => sum + parseFloat(inv.totalAmount || 0),
    0
  );
  const orderSales = billableOrders.reduce(
    (sum, order) => sum + parseFloat(order.totalAmount || 0),
    0
  );
  const invoiceGst = invoicesWithHotel.reduce(
    (sum, inv) => sum + parseFloat(inv.gstAmount || 0),
    0
  );
  const orderGst = billableOrders.reduce(
    (sum, order) => sum + parseFloat(order.gstAmount || 0),
    0
  );
  const pendingPayments = pendingOrders.reduce(
    (sum, order) => sum + parseFloat(order.totalAmount || 0),
    0
  );

  // Prefer real invoices; otherwise expose order rows so Billing is not empty
  const billingRows =
    invoicesWithHotel.length > 0
      ? invoicesWithHotel.map((inv) => ({
          invoiceNumber: inv.invoiceNumber,
          createdAt: inv.createdAt,
          hotelId: inv.hotelId,
          hotel: inv.hotel,
          totalAmount: inv.totalAmount,
          gstAmount: inv.gstAmount || 0,
          status: inv.status,
          source: 'invoice',
          orderId: inv.orderId,
        }))
      : billableOrders.map((order) => ({
          invoiceNumber: order.orderNumber || `ORD-${order.id}`,
          createdAt: order.createdAt,
          hotelId: order.hotelId,
          hotel: order.hotel,
          totalAmount: order.totalAmount,
          gstAmount: order.gstAmount || 0,
          status: order.status,
          source: 'order',
          orderId: order.id,
        }));

  const hotelStatsAgg = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: start, $lte: end },
        status: { $in: BILLABLE_STATUSES },
      },
    },
    {
      $group: {
        _id: '$hotelId',
        orderCount: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
      },
    },
    { $sort: { orderCount: -1 } },
  ]);

  return {
    startDate: start,
    endDate: end,
    totalOrders: orders.length,
    totalSales: invoiceSales > 0 ? invoiceSales : orderSales,
    totalGst: invoiceGst > 0 ? invoiceGst : orderGst,
    pendingPayments,
    pendingInvoicesCount: pendingOrders.length,
    orders: ordersWithHotel,
    invoices: invoicesWithHotel,
    billingRows,
    hotelStats: hotelStatsAgg.map((h) => ({
      hotelName: hotelMap.get(h._id)?.hotelName || `Hotel #${h._id}`,
      orderCount: parseInt(h.orderCount, 10),
      totalAmount: parseFloat(h.totalAmount || 0),
    })),
    ...extra,
  };
};

const getDailyReport = async (date = new Date()) => {
  const start = getStartOfDay(date);
  const end = getEndOfDay(date);
  const report = await buildPeriodReport(start, end);
  return { ...report, date };
};

const getWeeklyReport = async (date = new Date()) => {
  const start = normalizeWeekStart(date);
  const end = normalizeWeekEnd(date);
  return buildPeriodReport(start, end);
};

const getMonthlyReport = async (date = new Date()) => {
  const start = normalizeMonthStart(date);
  const end = normalizeMonthEnd(date);
  return buildPeriodReport(start, end);
};

const getYearlyReport = async (date = new Date()) => {
  const start = getStartOfYear(date);
  const end = getEndOfYear(date);
  return buildPeriodReport(start, end);
};

const getGSTReport = async (startDate, endDate) => {
  const start = getStartOfDay(startDate);
  const end = getEndOfDay(endDate);

  const invoices = await Invoice.findAll({
    where: {
      createdAt: { $gte: start, $lte: end },
      gstAmount: { $gt: 0 },
    },
  });

  const hotelIds = [...new Set(invoices.map((i) => i.hotelId))];
  const orderIds = [...new Set(invoices.map((i) => i.orderId))];

  const [hotelMap, orders] = await Promise.all([
    loadHotelMap(hotelIds),
    Order.findAll({
      where: { id: { $in: orderIds } },
      attributes: ['id', 'orderNumber'],
    }),
  ]);

  const orderMap = new Map(orders.map((o) => [o.id, { orderNumber: o.orderNumber }]));

  let invoicesWithRelations = invoices.map((inv) => ({
    ...(inv.toJSON ? inv.toJSON() : inv),
    hotel: hotelMap.get(inv.hotelId) || null,
    order: orderMap.get(inv.orderId) || null,
  }));

  // Fallback: if no GST invoices, build GST rows from billable orders in range
  if (invoicesWithRelations.length === 0) {
    const ordersInRange = await Order.findAll({
      where: {
        createdAt: { $gte: start, $lte: end },
        status: { $in: BILLABLE_STATUSES },
      },
      order: [['createdAt', 'DESC']],
    });
    const orderHotelMap = await loadHotelMap(ordersInRange.map((o) => o.hotelId));
    invoicesWithRelations = ordersInRange.map((order) => {
      const json = order.toJSON ? order.toJSON() : order;
      const gstAmount = parseFloat(json.gstAmount || 0);
      const totalAmount = parseFloat(json.totalAmount || 0);
      return {
        invoiceNumber: json.orderNumber || `ORD-${json.id}`,
        createdAt: json.createdAt,
        hotelId: json.hotelId,
        subtotal: parseFloat(json.subtotal || totalAmount - gstAmount),
        gstAmount,
        totalAmount,
        status: json.status,
        hotel: orderHotelMap.get(json.hotelId) || null,
        order: { orderNumber: json.orderNumber },
        source: 'order',
      };
    });
  }

  const totalGST = invoicesWithRelations.reduce(
    (sum, inv) => sum + parseFloat(inv.gstAmount || 0),
    0
  );
  const totalTaxableAmount = invoicesWithRelations.reduce((sum, inv) => {
    if (inv.subtotal != null) return sum + parseFloat(inv.subtotal || 0);
    return sum + (parseFloat(inv.totalAmount || 0) - parseFloat(inv.gstAmount || 0));
  }, 0);

  return {
    startDate: start,
    endDate: end,
    totalInvoices: invoicesWithRelations.length,
    totalTaxableAmount,
    totalGST,
    invoices: invoicesWithRelations,
  };
};

module.exports = {
  getDashboardStats,
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getYearlyReport,
  getGSTReport,
};
