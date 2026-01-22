const { sequelize } = require('./src/config/db');
const { QueryTypes } = require('sequelize');

async function migrate() {
    try {
        // Add deliveryCharge to orders table
        await sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='deliveryCharge') THEN
          ALTER TABLE orders ADD COLUMN "deliveryCharge" DECIMAL(12, 2) DEFAULT 0;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='deliveryCharge') THEN
          ALTER TABLE invoices ADD COLUMN "deliveryCharge" DECIMAL(12, 2) DEFAULT 0;
        END IF;
      END
      $$;
    `);
        console.log('Migration successful: deliveryCharge column added to orders and invoices tables');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
