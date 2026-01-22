// Migration script to update stock column from INTEGER to DECIMAL
const { sequelize } = require('../config/db');

async function migrateStockColumn() {
  try {
    console.log('Starting stock column migration...');
    
    // Change the stock column type to DECIMAL(10,2)
    await sequelize.query(`
      ALTER TABLE products 
      ALTER COLUMN stock TYPE DECIMAL(10,2) 
      USING CASE 
        WHEN stock IS NULL THEN 0 
        ELSE stock::NUMERIC 
      END
    `);

    // Also update minStockLevel column if it exists
    await sequelize.query(`
      ALTER TABLE products 
      ALTER COLUMN "minStockLevel" TYPE DECIMAL(10,2) 
      USING CASE 
        WHEN "minStockLevel" IS NULL THEN 0 
        ELSE "minStockLevel"::NUMERIC 
      END
    `);

    console.log('Migration completed successfully!');
    
    // Close the connection
    await sequelize.close();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  migrateStockColumn();
}

module.exports = migrateStockColumn;