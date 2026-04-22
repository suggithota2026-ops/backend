// Report service (MongoDB)
const Order = require('../models/order.model');
const Invoice = require('../models/invoice.model');
const User = require('../models/user.model');
const { getStartOfDay, getEndOfDay, getStartOfWeek, getEndOfWeek, getStartOfMonth, getEndOfMonth } = require('../utils/date');
const { ORDER_STATUS } = require('../config/constants');

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
    })
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

  return {
    totalOrders,
    pendingOrders,
    completedOrders,
    todaySales: parseFloat(todaySalesResult.total || 0),
    topHotels: (topHotelsAgg || []).map(h => ({
      hotelName: topHotelMap.get(h._id) || `Hotel #${h._id}`,
      orderCount: parseInt(h.orderCount),
      totalAmount: parseFloat(h.totalAmount || 0),
    })),
    recentOrders: (recentOrders || []).map(o => ({
      id: o.id,
      customer: recentHotelMap.get(o.hotelId) || `Hotel #${o.hotelId}`,
      amount: `₹${parseFloat(o.totalAmount).toLocaleString()}`,
      status: o.status,
      date: new Date(o.createdAt).toLocaleDateString(),
      product: 'View order items' // Placeholder or we could list items
    }))
  };
};

const getDailyReport = async (date = new Date()) => {
  const start = getStartOfDay(date);
  const end = getEndOfDay(date);

  const orders = await Order.findAll({
    where: {
      createdAt: { $gte: start, $lte: end },
    },
    order: [['createdAt', 'DESC']],
  });

  // Get hotel names for orders
  const hotelIds = [...new Set(orders.map(o => o.hotelId))];
  const hotels = await User.findAll({
    where: { id: { $in: hotelIds } },
    attributes: ['id', 'hotelName'],
  });
  const hotelMap = new Map(hotels.map(h => [h.id, h.hotelName]));

  const ordersWithHotel = orders.map(order => ({
    ...order.toJSON(),
    hotel: { hotelName: hotelMap.get(order.hotelId) || null },
  }));

  const invoices = await Invoice.findAll({
    where: {
      createdAt: { $gte: start, $lte: end },
    },
  });

  const totalSales = invoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);
  const totalOrdersCount = orders.length;

  return {
    date,
    totalOrders: totalOrdersCount,
    totalSales,
    orders: ordersWithHotel,
    invoices,
  };
};

const getWeeklyReport = async (date = new Date()) => {
  const start = getStartOfWeek(date);
  const end = getEndOfWeek(date);

  const orders = await Order.findAll({
    where: {
      createdAt: { $gte: start, $lte: end },
    },
    order: [['createdAt', 'DESC']],
  });

  // Get hotel names for orders
  const hotelIds = [...new Set(orders.map(o => o.hotelId))];
  const hotels = await User.findAll({
    where: { id: { $in: hotelIds } },
    attributes: ['id', 'hotelName'],
  });
  const hotelMap = new Map(hotels.map(h => [h.id, h.hotelName]));

  const ordersWithHotel = orders.map(order => ({
    ...order.toJSON(),
    hotel: { hotelName: hotelMap.get(order.hotelId) || null },
  }));

  const invoices = await Invoice.findAll({
    where: {
      createdAt: { $gte: start, $lte: end },
    },
  });

  const totalSales = invoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);

  return {
    startDate: start,
    endDate: end,
    totalOrders: orders.length,
    totalSales,
    orders: ordersWithHotel,
    invoices,
  };
};

const getMonthlyReport = async (date = new Date()) => {
  const start = getStartOfMonth(date);
  const end = getEndOfMonth(date);

  const orders = await Order.findAll({
    where: {
      createdAt: { $gte: start, $lte: end },
    },
    order: [['createdAt', 'DESC']],
  });

  // Get hotel names for orders
  const hotelIds = [...new Set(orders.map(o => o.hotelId))];
  const hotels = await User.findAll({
    where: { id: { $in: hotelIds } },
    attributes: ['id', 'hotelName'],
  });
  const hotelMap = new Map(hotels.map(h => [h.id, h.hotelName]));

  const ordersWithHotel = orders.map(order => ({
    ...order.toJSON(),
    hotel: { hotelName: hotelMap.get(order.hotelId) || null },
  }));

  const invoices = await Invoice.findAll({
    where: {
      createdAt: { $gte: start, $lte: end },
    },
  });

  const totalSales = invoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);

  const hotelStatsAgg = await Order.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    { $group: { _id: '$hotelId', orderCount: { $sum: 1 }, totalAmount: { $sum: '$totalAmount' } } },
    { $sort: { orderCount: -1 } },
  ]);

  const hotelIdsStats = hotelStatsAgg.map((h) => h._id);
  const hotelsStats = hotelIdsStats.length
    ? await User.findAll({ where: { id: { $in: hotelIdsStats } }, attributes: ['id', 'hotelName'] })
    : [];
  const hotelsStatsMap = new Map(hotelsStats.map((u) => [u.id, u.hotelName]));

  return {
    startDate: start,
    endDate: end,
    totalOrders: orders.length,
    totalSales,
    orders: ordersWithHotel,
    invoices,
    hotelStats: hotelStatsAgg.map(h => ({
      hotelName: hotelsStatsMap.get(h._id) || `Hotel #${h._id}`,
      orderCount: parseInt(h.orderCount),
      totalAmount: parseFloat(h.totalAmount || 0),
    })),
  };
};

const getGSTReport = async (startDate, endDate) => {
  const invoices = await Invoice.findAll({
    where: {
      createdAt: { $gte: startDate, $lte: endDate },
      gstAmount: { $gt: 0 },
    },
  });

  // Get hotel and order data
  const hotelIds = [...new Set(invoices.map(i => i.hotelId))];
  const orderIds = [...new Set(invoices.map(i => i.orderId))];

  const [hotels, orders] = await Promise.all([
    User.findAll({
      where: { id: { $in: hotelIds } },
      attributes: ['id', 'hotelName', 'gstNumber'],
    }),
    Order.findAll({
      where: { id: { $in: orderIds } },
      attributes: ['id', 'orderNumber'],
    }),
  ]);

  const hotelMap = new Map(hotels.map(h => [h.id, { hotelName: h.hotelName, gstNumber: h.gstNumber }]));
  const orderMap = new Map(orders.map(o => [o.id, { orderNumber: o.orderNumber }]));

  const invoicesWithRelations = invoices.map(inv => ({
    ...inv.toJSON(),
    hotel: hotelMap.get(inv.hotelId) || null,
    order: orderMap.get(inv.orderId) || null,
  }));

  const totalGST = invoices.reduce((sum, inv) => sum + parseFloat(inv.gstAmount), 0);
  const totalTaxableAmount = invoices.reduce((sum, inv) => sum + parseFloat(inv.subtotal), 0);

  return {
    startDate,
    endDate,
    totalInvoices: invoices.length,
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
  getGSTReport,
};
