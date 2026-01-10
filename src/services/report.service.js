// Report service
const { Op, fn, col, literal } = require('sequelize');
const Order = require('../models/order.model');
const Invoice = require('../models/invoice.model');
const User = require('../models/user.model');
const { sequelize } = require('../config/db');
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
    topHotels,
    recentOrders,
  ] = await Promise.all([
    Order.count(),
    Order.count({ where: { status: ORDER_STATUS.PENDING } }),
    Order.count({ where: { status: ORDER_STATUS.DELIVERED } }),
    sequelize.query(`
      SELECT COALESCE(SUM("totalAmount"), 0)::numeric as total
      FROM invoices
      WHERE "createdAt" >= :start AND "createdAt" <= :end
        AND status = 'generated'
    `, {
      replacements: { start: todayStart, end: todayEnd },
      type: sequelize.QueryTypes.SELECT,
    }).then(result => {
      const row = result[0] || { total: 0 };
      return { total: parseFloat(row.total || 0) };
    }),
    sequelize.query(`
      SELECT 
        u."hotelName",
        COUNT(o.id) as "orderCount",
        SUM(o."totalAmount")::numeric as "totalAmount"
      FROM orders o
      INNER JOIN users u ON o."hotelId" = u.id
      WHERE o.status = :status
      GROUP BY u.id, u."hotelName"
      ORDER BY "orderCount" DESC
      LIMIT 10
    `, {
      replacements: { status: ORDER_STATUS.DELIVERED },
      type: sequelize.QueryTypes.SELECT,
    }),
    Order.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']],
      include: [{
        model: User,
        as: 'hotel',
        attributes: ['hotelName']
      }]
    })
  ]);

  return {
    totalOrders,
    pendingOrders,
    completedOrders,
    todaySales: parseFloat(todaySalesResult.total || 0),
    topHotels: topHotels.map(h => ({
      hotelName: h.hotelName,
      orderCount: parseInt(h.orderCount),
      totalAmount: parseFloat(h.totalAmount),
    })),
    recentOrders: recentOrders.map(o => ({
      id: o.id,
      customer: o.hotel?.hotelName || `Hotel #${o.hotelId}`,
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
      createdAt: { [Op.gte]: start, [Op.lte]: end },
    },
    order: [['createdAt', 'DESC']],
  });

  // Get hotel names for orders
  const hotelIds = [...new Set(orders.map(o => o.hotelId))];
  const hotels = await User.findAll({
    where: { id: { [Op.in]: hotelIds } },
    attributes: ['id', 'hotelName'],
  });
  const hotelMap = new Map(hotels.map(h => [h.id, h.hotelName]));

  const ordersWithHotel = orders.map(order => ({
    ...order.toJSON(),
    hotel: { hotelName: hotelMap.get(order.hotelId) || null },
  }));

  const invoices = await Invoice.findAll({
    where: {
      createdAt: { [Op.gte]: start, [Op.lte]: end },
    },
    include: [{
      model: User,
      as: 'hotel',
      attributes: ['hotelName']
    }]
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
      createdAt: { [Op.gte]: start, [Op.lte]: end },
    },
    order: [['createdAt', 'DESC']],
  });

  // Get hotel names for orders
  const hotelIds = [...new Set(orders.map(o => o.hotelId))];
  const hotels = await User.findAll({
    where: { id: { [Op.in]: hotelIds } },
    attributes: ['id', 'hotelName'],
  });
  const hotelMap = new Map(hotels.map(h => [h.id, h.hotelName]));

  const ordersWithHotel = orders.map(order => ({
    ...order.toJSON(),
    hotel: { hotelName: hotelMap.get(order.hotelId) || null },
  }));

  const invoices = await Invoice.findAll({
    where: {
      createdAt: { [Op.gte]: start, [Op.lte]: end },
    },
    include: [{
      model: User,
      as: 'hotel',
      attributes: ['hotelName']
    }]
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
      createdAt: { [Op.gte]: start, [Op.lte]: end },
    },
    order: [['createdAt', 'DESC']],
  });

  // Get hotel names for orders
  const hotelIds = [...new Set(orders.map(o => o.hotelId))];
  const hotels = await User.findAll({
    where: { id: { [Op.in]: hotelIds } },
    attributes: ['id', 'hotelName'],
  });
  const hotelMap = new Map(hotels.map(h => [h.id, h.hotelName]));

  const ordersWithHotel = orders.map(order => ({
    ...order.toJSON(),
    hotel: { hotelName: hotelMap.get(order.hotelId) || null },
  }));

  const invoices = await Invoice.findAll({
    where: {
      createdAt: { [Op.gte]: start, [Op.lte]: end },
    },
    include: [{
      model: User,
      as: 'hotel',
      attributes: ['hotelName']
    }]
  });

  const totalSales = invoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);

  // Group by hotel
  const hotelStats = await sequelize.query(`
    SELECT 
      u."hotelName",
      COUNT(o.id) as "orderCount",
      SUM(o."totalAmount")::numeric as "totalAmount"
    FROM orders o
    INNER JOIN users u ON o."hotelId" = u.id
    WHERE o."createdAt" >= :start AND o."createdAt" <= :end
    GROUP BY u.id, u."hotelName"
    ORDER BY "orderCount" DESC
  `, {
    replacements: { start, end },
    type: sequelize.QueryTypes.SELECT,
  });

  return {
    startDate: start,
    endDate: end,
    totalOrders: orders.length,
    totalSales,
    orders: ordersWithHotel,
    invoices,
    hotelStats: hotelStats.map(h => ({
      hotelName: h.hotelName,
      orderCount: parseInt(h.orderCount),
      totalAmount: parseFloat(h.totalAmount),
    })),
  };
};

const getGSTReport = async (startDate, endDate) => {
  const invoices = await Invoice.findAll({
    where: {
      createdAt: { [Op.gte]: startDate, [Op.lte]: endDate },
      gstAmount: { [Op.gt]: 0 },
    },
  });

  // Get hotel and order data
  const hotelIds = [...new Set(invoices.map(i => i.hotelId))];
  const orderIds = [...new Set(invoices.map(i => i.orderId))];

  const [hotels, orders] = await Promise.all([
    User.findAll({
      where: { id: { [Op.in]: hotelIds } },
      attributes: ['id', 'hotelName', 'gstNumber'],
    }),
    Order.findAll({
      where: { id: { [Op.in]: orderIds } },
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
