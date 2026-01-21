const { sequelize } = require('../config/db');

async function addRateTypePriceColumns() {
  try {
    console.log('Adding rateType and pricePerUnit columns to users table...');
    
    // Add rateType column
    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS rateType VARCHAR(50) DEFAULT NULL
    `);
    
    // Add pricePerUnit column
    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS pricePerUnit DECIMAL(10, 2) DEFAULT NULL
    `);
    
    console.log('Successfully added rateType and pricePerUnit columns to users table');
  } catch (error) {
    console.error('Error adding columns:', error);
    throw error;
  }
}

if (require.main === module) {
  addRateTypePriceColumns()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addRateTypePriceColumns;