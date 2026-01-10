// Admin model (Sequelize)
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Admin = sequelize.define('Admin', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    mobileNumber: {
        type: DataTypes.STRING(15),
        allowNull: true,
        unique: true,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    otpCode: {
        type: DataTypes.STRING(10),
        allowNull: true,
    },
    otpExpiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    role: {
        type: DataTypes.STRING,
        defaultValue: 'ADMIN',
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
}, {
    tableName: 'admins',
    timestamps: true,
});

module.exports = Admin;
