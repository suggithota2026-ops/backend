// Category model (Sequelize)
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  createdById: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  subcategories: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [], // Array of objects: { id: string, name: string }
  },
}, {
  tableName: 'categories',
  timestamps: true,
});

module.exports = Category;
