const { sequelize } = require('../config/db');
const logger = require('../utils/logger');

async function addBusinessFieldsToAdmin() {
    try {
        logger.info('Starting to add business fields to admins table...');

        // Add address column
        try {
            await sequelize.query(`
                ALTER TABLE admins ADD COLUMN IF NOT EXISTS "address" TEXT
            `);
            logger.info('Added address column to admins table');
        } catch (error) {
            logger.warn('address column may already exist:', error.message);
        }

        // Add gstNumber column
        try {
            await sequelize.query(`
                ALTER TABLE admins ADD COLUMN IF NOT EXISTS "gstNumber" VARCHAR(50)
            `);
            logger.info('Added gstNumber column to admins table');
        } catch (error) {
            logger.warn('gstNumber column may already exist:', error.message);
        }

        logger.info('Business fields migration completed successfully');
        process.exit(0);
    } catch (error) {
        logger.error('Error adding business fields:', error);
        process.exit(1);
    }
}

// Run the migration
if (require.main === module) {
    addBusinessFieldsToAdmin();
}

module.exports = addBusinessFieldsToAdmin;