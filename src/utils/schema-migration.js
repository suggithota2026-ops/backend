// Schema migration utility - runs on server startup
const { sequelize } = require('../config/db');
const { QueryTypes } = require('sequelize');
const logger = require('../utils/logger');

const runSchemaMigration = async () => {
    try {
        logger.info('Running schema migration check...');

        const addColumnIfNotExists = async (tableName, columnName, columnDefinition) => {
            const checkQuery = `
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = '${tableName}' AND column_name = '${columnName}'
            `;
            const [column] = await sequelize.query(checkQuery, { type: QueryTypes.SELECT });

            if (!column) {
                logger.info(`Adding column '${columnName}' to table '${tableName}'...`);
                try {
                    await sequelize.query(`ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${columnDefinition}`);
                    logger.info(`Column '${columnName}' added successfully.`);
                } catch (err) {
                    logger.error(`Failed to add column '${columnName}':`, err.message);
                }
            }
        };

        // 1. Check Admins table
        await addColumnIfNotExists('admins', 'mobileNumber', 'VARCHAR(15) UNIQUE');
        await addColumnIfNotExists('admins', 'otpCode', 'VARCHAR(10)');
        await addColumnIfNotExists('admins', 'otpExpiresAt', 'TIMESTAMP WITH TIME ZONE');

        // 2. Check Categories table
        await addColumnIfNotExists('categories', 'subcategories', 'JSONB DEFAULT \'[]\'');

        // 3. Check Products table
        await addColumnIfNotExists('products', 'subcategory', 'VARCHAR(255)');
        await addColumnIfNotExists('products', 'pricingType', "VARCHAR(50) DEFAULT 'fixed'");
        await addColumnIfNotExists('products', 'createdById', 'INTEGER REFERENCES "admins"("id")');

        logger.info('Schema migration check completed.');
    } catch (error) {
        logger.error('Schema migration failed:', error);
        // Don't exit - let the server continue starting
    }
};

module.exports = { runSchemaMigration };
