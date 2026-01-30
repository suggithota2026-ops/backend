const { sequelize } = require('../config/db');
const logger = require('../utils/logger');

async function addBusinessNameToAdmin() {
    try {
        logger.info('Starting to add businessName column to admins table...');

        // Add businessName column
        try {
            await sequelize.query(`
                ALTER TABLE admins ADD COLUMN IF NOT EXISTS "businessName" VARCHAR(200)
            `);
            logger.info('Added businessName column to admins table');
        } catch (error) {
            logger.warn('businessName column may already exist:', error.message);
        }

        logger.info('Business name migration completed successfully');
        process.exit(0);
    } catch (error) {
        logger.error('Error adding business name column:', error);
        process.exit(1);
    }
}

// Run the migration
if (require.main === module) {
    addBusinessNameToAdmin();
}

module.exports = addBusinessNameToAdmin;