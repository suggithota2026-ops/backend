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
    const exists = await Model.findOne({ id: candidateId }).select('_id').lean();
    if (!exists) return candidateId;

    const [latest] = await Model.find().sort({ id: -1 }).limit(1).select('id').lean();
    const latestId = latest?.id || 0;
    if (latestId >= candidateId) {
      await Counter.findByIdAndUpdate(sequenceName, { seq: latestId }, { upsert: true });
    }
  }

  throw new Error(`Failed to allocate unique id for ${sequenceName}`);
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

module.exports = { applyAutoIncrement };

