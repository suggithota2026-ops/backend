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

        // 4. Update stock and minStockLevel column types to DECIMAL
        try {
            // Check current column type
            const stockTypeQuery = `
                SELECT data_type, column_default
                FROM information_schema.columns
                WHERE table_name = 'products' AND column_name = 'stock'
            `;
            const [stockColumn] = await sequelize.query(stockTypeQuery, { type: QueryTypes.SELECT });
            
            if (stockColumn && stockColumn.data_type !== 'numeric') {  // numeric is the underlying type for DECIMAL
                logger.info('Altering stock column to DECIMAL type...');
                await sequelize.query(`
                    ALTER TABLE "products" 
                    ALTER COLUMN "stock" TYPE DECIMAL(10,2) 
                    USING CASE 
                        WHEN "stock" IS NULL THEN 0 
                        ELSE "stock"::NUMERIC 
                    END
                `);
                logger.info('Stock column altered to DECIMAL successfully.');
            }
            
            const minStockTypeQuery = `
                SELECT data_type, column_default
                FROM information_schema.columns
                WHERE table_name = 'products' AND column_name = 'minStockLevel'
            `;
            const [minStockColumn] = await sequelize.query(minStockTypeQuery, { type: QueryTypes.SELECT });
            
            if (minStockColumn && minStockColumn.data_type !== 'numeric') {  // numeric is the underlying type for DECIMAL
                logger.info('Altering minStockLevel column to DECIMAL type...');
                await sequelize.query(`
                    ALTER TABLE "products" 
                    ALTER COLUMN "minStockLevel" TYPE DECIMAL(10,2) 
                    USING CASE 
                        WHEN "minStockLevel" IS NULL THEN 0 
                        ELSE "minStockLevel"::NUMERIC 
                    END
                `);
                logger.info('minStockLevel column altered to DECIMAL successfully.');
            }
        } catch (err) {
            logger.error('Failed to alter stock/minStockLevel columns to DECIMAL:', err.message);
        }

        // 5. Check Orders and Invoices for deliveryCharge
        await addColumnIfNotExists('orders', 'deliveryCharge', 'DECIMAL(12, 2) DEFAULT 0');
        await addColumnIfNotExists('invoices', 'deliveryCharge', 'DECIMAL(12, 2) DEFAULT 0');

        // 6. Update paymentMethod enum values
        try {
            const enumTypeName = 'enum_orders_paymentMethod';
            const enumQuery = `
                SELECT e.enumlabel
                FROM pg_enum e
                JOIN pg_type t ON e.enumtypid = t.oid
                WHERE t.typname = '${enumTypeName}'
            `;
            const enumLabels = await sequelize.query(enumQuery, { type: QueryTypes.SELECT });
            if (!enumLabels || enumLabels.length === 0) {
                logger.info(`Enum ${enumTypeName} not found, skipping paymentMethod migration.`);
            } else {
                const labels = enumLabels.map(l => l.enumlabel);

                for (const value of ['cod', 'credit', 'offline']) {
                    if (!labels.includes(value)) {
                        logger.info(`Adding '${value}' to ${enumTypeName}...`);
                        try {
                            await sequelize.query(`ALTER TYPE "${enumTypeName}" ADD VALUE IF NOT EXISTS '${value}'`);
                        } catch (addErr) {
                            const msg = (addErr && addErr.message) ? addErr.message : String(addErr);
                            logger.warn(`Could not add '${value}' to enum (may already exist): ${msg}`);
                        }
                    }
                }

                // Re-fetch enum so we see newly added values (ALTER TYPE ADD VALUE commits in PG)
                const enumLabelsAfter = await sequelize.query(enumQuery, { type: QueryTypes.SELECT });
                const labelsAfter = (enumLabelsAfter || []).map(l => l.enumlabel);

                // Update existing 'cash' to 'cod' only if enum has both (legacy migration)
                if (labelsAfter.includes('cash') && labelsAfter.includes('cod')) {
                    try {
                        await sequelize.query(`UPDATE orders SET "paymentMethod" = 'cod' WHERE "paymentMethod" = 'cash'`);
                        logger.info("Updated legacy 'cash' paymentMethod to 'cod'.");
                    } catch (updateErr) {
                        const msg = (updateErr && updateErr.message) ? updateErr.message : String(updateErr);
                        logger.warn('PaymentMethod cash->cod update skipped or failed: ' + msg);
                    }
                }
            }
        } catch (err) {
            const msg = (err && err.message) ? err.message : String(err);
            logger.error('Failed to update paymentMethod enum: ' + msg);
        }

        logger.info('Schema migration check completed.');
    } catch (error) {
        logger.error('Schema migration failed:', error);
        // Don't exit - let the server continue starting
    }
};

module.exports = { runSchemaMigration };
