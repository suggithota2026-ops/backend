const { sequelize } = require('../config/db');
const Brand = require('../models/brand.model');

async function clearBrandsData() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Connected to database successfully.');

        console.log('Fetching all brands...');
        const brands = await Brand.findAll();
        console.log(`Found ${brands.length} brands in the database.`);

        if (brands.length > 0) {
            console.log('Deleting all brands...');
            await Brand.destroy({
                where: {},
                truncate: true
            });
            console.log('All brands have been deleted successfully.');
        } else {
            console.log('No brands found in the database.');
        }

        console.log('Closing database connection...');
        await sequelize.close();
        console.log('Database connection closed.');
    } catch (error) {
        console.error('Error clearing brands data:', error);
        process.exit(1);
    }
}

// Run the function if this script is executed directly
if (require.main === module) {
    clearBrandsData();
}

module.exports = clearBrandsData;