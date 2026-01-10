const { sequelize } = require('../config/db');
const logger = require('../utils/logger');

const fixPricingTypeEnum = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connected.');

    // Check if column exists with old enum type
    const [results] = await sequelize.query(`
      SELECT column_name, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'pricingType';
    `);

    if (results.length === 0) {
      logger.info('Column "pricingType" does not exist. Run add-pricing-type-column.js first.');
      process.exit(0);
    }

    const currentEnumType = results[0].udt_name;
    logger.info(`Current enum type: ${currentEnumType}`);

    // If it's already using Sequelize's enum type, we're good
    if (currentEnumType === 'enum_products_pricingtype') {
      logger.info('Column already uses correct enum type: enum_products_pricingtype');
      process.exit(0);
    }

    // Create Sequelize's enum type if it doesn't exist
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_products_pricingtype" AS ENUM ('fixed', 'daily', 'weekly');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Drop the old column
    await sequelize.query(`
      ALTER TABLE products DROP COLUMN IF EXISTS "pricingType";
    `);

    // Add the column back with the correct enum type
    await sequelize.query(`
      ALTER TABLE products 
      ADD COLUMN "pricingType" "enum_products_pricingtype" DEFAULT 'fixed' NOT NULL;
    `);

    logger.info('Column "pricingType" updated to use correct enum type: enum_products_pricingtype');
    logger.info('Migration completed successfully.');
  } catch (error) {
    logger.error('Error fixing enum type:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

fixPricingTypeEnum();

