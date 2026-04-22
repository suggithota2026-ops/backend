function buildSort(order) {
  if (!order) return undefined;
  // Sequelize order: [['createdAt','DESC'], ['displayOrder','ASC']]
  const sort = {};
  for (const item of order) {
    if (!Array.isArray(item) || item.length < 2) continue;
    const [field, dir] = item;
    sort[field] = String(dir).toLowerCase() === 'desc' ? -1 : 1;
  }
  return sort;
}

function applyAttributes(query, attributes) {
  if (!attributes) return;

  // Sequelize: attributes: ['id','name'] OR { exclude: ['password'], include: [...] }
  if (Array.isArray(attributes)) {
    query.select(attributes.join(' '));
    return;
  }

  if (attributes && typeof attributes === 'object') {
    const selects = [];
    if (Array.isArray(attributes.include)) {
      // include can contain strings or [literal, alias] in Sequelize; we only support string fields
      for (const inc of attributes.include) {
        if (typeof inc === 'string') selects.push(inc);
      }
    }
    if (Array.isArray(attributes.exclude)) {
      for (const exc of attributes.exclude) {
        if (typeof exc === 'string') selects.push(`-${exc}`);
      }
    }
    if (selects.length > 0) query.select(selects.join(' '));
  }
}

function toMongoRegexFromILike(pattern) {
  // pattern like: %text% or text% or %text
  const raw = String(pattern);
  const escaped = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = '^' + escaped.replace(/%/g, '.*') + '$';
  return new RegExp(re, 'i');
}

function normalizeWhere(where) {
  if (!where || typeof where !== 'object') return where;

  // Clone shallowly so we can mutate safely
  const out = { ...where };

  // Handle Sequelize Op symbols
  const symbols = Object.getOwnPropertySymbols(out);
  for (const sym of symbols) {
    const key = sym.toString(); // e.g. 'Symbol(or)'
    const val = out[sym];
    delete out[sym];

    if (key === 'Symbol(or)' && Array.isArray(val)) {
      out.$or = val.map(normalizeWhere);
    } else if (key === 'Symbol(and)' && Array.isArray(val)) {
      out.$and = val.map(normalizeWhere);
    }
  }

  // Handle field-level operators
  for (const [k, v] of Object.entries(out)) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) continue;

    const fieldSymbols = Object.getOwnPropertySymbols(v);
    for (const sym of fieldSymbols) {
      const opKey = sym.toString();
      const opVal = v[sym];
      delete v[sym];

      if (opKey === 'Symbol(iLike)') {
        out[k] = toMongoRegexFromILike(opVal);
      } else if (opKey === 'Symbol(like)') {
        // Sequelize like is usually case-sensitive; keep it simple (case-insensitive is fine for UI search)
        out[k] = toMongoRegexFromILike(opVal);
      } else if (opKey === 'Symbol(in)' && Array.isArray(opVal)) {
        out[k] = { $in: opVal };
      } else if (opKey === 'Symbol(notIn)' && Array.isArray(opVal)) {
        out[k] = { $nin: opVal };
      } else if (opKey === 'Symbol(or)' && Array.isArray(opVal)) {
        out[k] = { $in: opVal };
      } else if (opKey === 'Symbol(ne)') {
        out[k] = { $ne: opVal };
      } else if (opKey === 'Symbol(gt)') {
        out[k] = { $gt: opVal };
      } else if (opKey === 'Symbol(gte)') {
        out[k] = { $gte: opVal };
      } else if (opKey === 'Symbol(lt)') {
        out[k] = { $lt: opVal };
      } else if (opKey === 'Symbol(lte)') {
        out[k] = { $lte: opVal };
      } else if (opKey === 'Symbol(contains)' && Array.isArray(opVal)) {
        // JSONB contains for arrays of objects: [{id: '...'}]
        const first = opVal[0];
        if (first && typeof first === 'object' && 'id' in first) {
          out['subcategories.id'] = first.id;
          delete out[k];
        }
      }
    }
  }

  return out;
}

function applySequelizeCompat(schema) {
  // Capture original Mongoose Model methods before wrapping
  // (schema.statics may not include built-ins at this point)
  // eslint-disable-next-line global-require
  const mongooseFindOne = require('mongoose').Model.findOne;

  // ---- Static helpers ----
  schema.statics.findByPk = function findByPk(id, options = {}) {
    const numericId = typeof id === 'string' ? Number(id) : id;
    const query = mongooseFindOne.call(this, { id: numericId });
    applyAttributes(query, options.attributes);
    return query.exec();
  };

  schema.statics.count = function countCompat({ where } = {}) {
    return this.countDocuments(normalizeWhere(where || {})).exec();
  };

  schema.statics.findAll = function findAllCompat(options = {}) {
    const {
      where = {},
      order,
      offset = 0,
      limit,
      attributes,
    } = options;

    const query = this.find(normalizeWhere(where));
    applyAttributes(query, attributes);
    const sort = buildSort(order);
    if (sort) query.sort(sort);
    if (offset) query.skip(offset);
    if (limit !== undefined) query.limit(limit);
    return query.exec();
  };

  schema.statics.findAndCountAll = async function findAndCountAllCompat(options = {}) {
    const { where = {}, ...rest } = options;
    const [rows, count] = await Promise.all([
      this.findAll({ where, ...rest }),
      this.count({ where }),
    ]);
    return { rows, count };
  };

  schema.statics.update = async function updateManyCompat(values, options = {}) {
    const isSequelizeOptions =
      options &&
      typeof options === 'object' &&
      !Array.isArray(options) &&
      Object.prototype.hasOwnProperty.call(options, 'where');

    const where = normalizeWhere(isSequelizeOptions ? options.where || {} : options);
    const result = await this.updateMany(where, { $set: values }).exec();
    return [result.modifiedCount];
  };

  // Support Sequelize-style: Model.findOne({ where: {...}, attributes: [...] })
  // and Mongoose-style: Model.findOne({ field: value })
  schema.statics.findOne = function findOneCompat(options = {}) {
    const isSequelizeOptions =
      options &&
      typeof options === 'object' &&
      !Array.isArray(options) &&
      Object.prototype.hasOwnProperty.call(options, 'where');

    const where = isSequelizeOptions ? options.where || {} : options;
    const attributes = isSequelizeOptions ? options.attributes : undefined;

    const query = mongooseFindOne.call(this, normalizeWhere(where));
    applyAttributes(query, attributes);
    return query.exec();
  };

  // ---- Instance helpers ----
  schema.methods.update = async function updateCompat(updateData) {
    Object.assign(this, updateData);
    return this.save();
  };

  schema.methods.destroy = function destroyCompat() {
    return this.deleteOne();
  };

  schema.methods.reload = async function reloadCompat() {
    const fresh = await this.constructor.findOne({ _id: this._id });
    if (!fresh) return null;
    Object.assign(this, fresh.toObject());
    return this;
  };

  schema.methods.increment = async function incrementCompat(field, by = 1) {
    const inc = typeof by === 'number' ? by : 1;
    this[field] = (Number(this[field]) || 0) + inc;
    return this.save();
  };
}

module.exports = { applySequelizeCompat };

