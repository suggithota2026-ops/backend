const { sequelize } = require('../config/db');
const logger = require('../utils/logger');

const addPricingTypeColumn = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connected.');

    // Check if column already exists
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'pricingType';
    `);

    if (results.length > 0) {
      logger.info('Column "pricingType" already exists in products table.');
      process.exit(0);
    }

    // Add pricingType column with ENUM constraint
    // First, check if enum type exists (Sequelize naming convention)
    const [enumCheck] = await sequelize.query(`
      SELECT typname FROM pg_type WHERE typname = 'enum_products_pricingtype';
    `);

    let enumTypeName = 'enum_products_pricingtype';
    
    // If Sequelize enum doesn't exist, create it
    if (enumCheck.length === 0) {
      await sequelize.query(`
        CREATE TYPE "enum_products_pricingtype" AS ENUM ('fixed', 'daily', 'weekly');
      `);
      logger.info('Created enum type: enum_products_pricingtype');
    }

    // Add the column with default value using Sequelize's enum type name
    await sequelize.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS "pricingType" "enum_products_pricingtype" DEFAULT 'fixed' NOT NULL;
    `);

    // Also check and add subcategory column if it doesn't exist
    const [subcategoryResults] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'subcategory';
    `);

    if (subcategoryResults.length === 0) {
      await sequelize.query(`
        ALTER TABLE products 
        ADD COLUMN "subcategory" VARCHAR(255);
      `);
      logger.info('Column "subcategory" added to products table.');
    }

    logger.info('Column "pricingType" added to products table successfully.');
    logger.info('Migration completed successfully.');
  } catch (error) {
    logger.error('Error adding column:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

addPricingTypeColumn();

