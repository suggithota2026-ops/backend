const { mongoose } = require('../config/db');

const CounterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false }
);

module.exports = mongoose.models.Counter || mongoose.model('Counter', CounterSchema);

