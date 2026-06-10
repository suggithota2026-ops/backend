const Counter = require('../models/_counter.model');
const Product = require('../models/product.model');
const logger = require('./logger');

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

async function syncCounters() {
  await syncSequence(Product, 'products');
}

module.exports = { syncCounters };
