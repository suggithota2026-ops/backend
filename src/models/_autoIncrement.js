const Counter = require('./_counter.model');

async function getNextSequence(sequenceName) {
  const ret = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  ).lean();
  return ret.seq;
}

function applyAutoIncrement(schema, { sequenceName }) {
  schema.add({
    id: { type: Number, unique: true, index: true },
  });

  schema.pre('save', async function preSave(next) {
    try {
      if (this.isNew && (this.id === undefined || this.id === null)) {
        this.id = await getNextSequence(sequenceName);
      }
      next();
    } catch (err) {
      next(err);
    }
  });
}

module.exports = { applyAutoIncrement };

