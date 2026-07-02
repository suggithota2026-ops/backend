const Counter = require('./_counter.model');

async function allocateNextId(Model, sequenceName) {
  const [maxDoc] = await Model.find().sort({ id: -1 }).limit(1).select('id').lean();
  const maxId = maxDoc?.id || 0;

  const counter = await Counter.findById(sequenceName).lean();
  if (!counter || counter.seq < maxId) {
    await Counter.findByIdAndUpdate(sequenceName, { seq: maxId }, { upsert: true });
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const ret = await Counter.findByIdAndUpdate(
      sequenceName,
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    ).lean();

    const candidateId = ret.seq;
    // Use findByPk (compat layer) — Model.findOne().select() is not chainable there
    const exists = await Model.findByPk(candidateId);
    if (!exists) return candidateId;

    const [latest] = await Model.find().sort({ id: -1 }).limit(1).select('id').lean();
    const latestId = latest?.id || 0;
    if (latestId >= candidateId) {
      await Counter.findByIdAndUpdate(sequenceName, { seq: latestId }, { upsert: true });
    }
  }

  throw new Error(`Failed to allocate unique id for ${sequenceName}`);
}

function parseOrderNumberSeq(orderNumber) {
  const match = String(orderNumber || '').match(/ORD(\d+)/i);
  return match ? parseInt(match[1], 10) : 0;
}

async function allocateNextOrderNumber(Model, sequenceName = 'order_numbers') {
  const [latest] = await Model.find({ orderNumber: { $exists: true, $ne: null } })
    .sort({ orderNumber: -1 })
    .limit(1)
    .select('orderNumber')
    .lean();

  const maxFromOrders = parseOrderNumberSeq(latest?.orderNumber);

  const counter = await Counter.findById(sequenceName).lean();
  if (!counter || counter.seq < maxFromOrders) {
    await Counter.findByIdAndUpdate(sequenceName, { seq: maxFromOrders }, { upsert: true });
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const ret = await Counter.findByIdAndUpdate(
      sequenceName,
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    ).lean();

    const orderNumber = `ORD${String(ret.seq).padStart(6, '0')}`;
    const exists = await Model.findOne({ orderNumber });
    if (!exists) return orderNumber;

    const [latestAgain] = await Model.find({ orderNumber: { $exists: true, $ne: null } })
      .sort({ orderNumber: -1 })
      .limit(1)
      .select('orderNumber')
      .lean();

    const latestSeq = parseOrderNumberSeq(latestAgain?.orderNumber);
    if (latestSeq >= ret.seq) {
      await Counter.findByIdAndUpdate(sequenceName, { seq: latestSeq }, { upsert: true });
    }
  }

  throw new Error('Failed to allocate unique order number');
}

function applyAutoIncrement(schema, { sequenceName }) {
  schema.add({
    id: { type: Number, unique: true, index: true },
  });

  schema.pre('save', async function preSave(next) {
    try {
      if (this.isNew && (this.id === undefined || this.id === null)) {
        this.id = await allocateNextId(this.constructor, sequenceName);
      }
      next();
    } catch (err) {
      next(err);
    }
  });
}

module.exports = { applyAutoIncrement, allocateNextOrderNumber };

