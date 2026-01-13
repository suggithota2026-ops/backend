// Migration script to create the coupons table
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const logger = require('../utils/logger');

async function createCouponsTable() {
    try {
        // Define the Coupon model (same as the one in models/coupon.model.js)
        const Coupon = sequelize.define('Coupon', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            code: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
            },
            discountType: {
                type: DataTypes.ENUM('percentage', 'flat'),
                allowNull: false,
            },
            discountValue: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: false,
            },
            validFrom: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
            },
            validUntil: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            minOrderAmount: {
                type: DataTypes.DECIMAL(10, 2),
                defaultValue: 0,
            },
            maxDiscountAmount: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: true,
            },
            usageLimit: {
                type: DataTypes.INTEGER,
                defaultValue: null, // null means unlimited
            },
            usedCount: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
            },
            isActive: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
            },
            createdBy: {
                type: DataTypes.INTEGER, // Admin ID
                allowNull: true,
            },
            metadata: {
                type: DataTypes.JSONB,
                defaultValue: {},
            },
        }, {
            tableName: 'coupons',
            timestamps: true,
        });

        // Sync the model to create the table
        await sequelize.sync({ alter: true }); // Use alter to update existing table if needed
        
        logger.info('Coupons table created successfully!');
        console.log('Coupons table created successfully!');
        
        process.exit(0);
    } catch (error) {
        logger.error('Error creating coupons table:', error);
        console.error('Error creating coupons table:', error);
        
        process.exit(1);
    }
}

// Run the migration if this file is executed directly
if (require.main === module) {
    createCouponsTable();
}

module.exports = createCouponsTable;