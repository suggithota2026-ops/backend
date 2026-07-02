const Counter = require('../models/_counter.model');
const Product = require('../models/product.model');
const Order = require('../models/order.model');
const logger = require('./logger');

function parseOrderNumberSeq(orderNumber) {
  const match = String(orderNumber || '').match(/ORD(\d+)/i);
  return match ? parseInt(match[1], 10) : 0;
}

async function syncSequence(model, sequenceName) {
  const [maxDoc] = await model.find().sort({ id: -1 }).limit(1).select('id').lean();
  const maxId = maxDoc?.id || 0;
  if (!maxId) return;

  const counter = await Counter.findById(sequenceName).lean();
  if (!counter || counter.seq < maxId) {
    await Counter.findByIdAndUpdate(sequenceName, { seq: maxId }, { upsert: true });
    logger.info(`Synced counter "${sequenceName}" to ${maxId}`);
  }
}

async function syncOrderNumberCounter() {
  const [latest] = await Order.find({ orderNumber: { $exists: true, $ne: null } })
    .sort({ orderNumber: -1 })
    .limit(1)
    .select('orderNumber')
    .lean();

  const maxSeq = parseOrderNumberSeq(latest?.orderNumber);
  if (!maxSeq) return;

  const counter = await Counter.findById('order_numbers').lean();
  if (!counter || counter.seq < maxSeq) {
    await Counter.findByIdAndUpdate('order_numbers', { seq: maxSeq }, { upsert: true });
    logger.info(`Synced counter "order_numbers" to ${maxSeq}`);
  }
}

async function syncCounters() {
  await syncSequence(Product, 'products');
  await syncSequence(Order, 'orders');
  await syncOrderNumberCounter();
}

module.exports = { syncCounters };
