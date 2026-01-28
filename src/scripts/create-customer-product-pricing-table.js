// Script to create customer product pricing table
const { sequelize } = require('../config/db');
const logger = require('../utils/logger');

async function createCustomerProductPricingTable() {
  try {
    logger.info('Starting to create customer_product_pricing table...');

    // Drop table if exists to ensure clean state
    await sequelize.query(`DROP TABLE IF EXISTS customer_product_pricing CASCADE;`);

    // Create the table
    await sequelize.query(`
      CREATE TABLE customer_product_pricing (
        id SERIAL PRIMARY KEY,
        "customerId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
        "productId" INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
        "fixedPrice" DECIMAL(12, 2) NOT NULL,
        "contractStartDate" TIMESTAMP WITH TIME ZONE NOT NULL,
        "contractEndDate" TIMESTAMP WITH TIME ZONE NOT NULL,
        "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for better performance
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_product_pricing_customer_id 
      ON customer_product_pricing("customerId");
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_product_pricing_product_id 
      ON customer_product_pricing("productId");
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_product_pricing_active_dates 
      ON customer_product_pricing("isActive", "contractStartDate", "contractEndDate");
    `);

    logger.info('customer_product_pricing table created successfully');
  } catch (error) {
    logger.error('Error creating customer_product_pricing table:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the script
if (require.main === module) {
  createCustomerProductPricingTable()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = createCustomerProductPricingTable;