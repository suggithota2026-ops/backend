const { sequelize } = require('./src/config/db');

async function migrate() {
    try {
        // Add 'cod' and 'credit' to enum_orders_paymentMethod
        // We use DO blocks or catch errors because Postgres doesn't allow ALTER TYPE ... ADD VALUE inside a transaction
        await sequelize.query(`ALTER TYPE "enum_orders_paymentMethod" ADD VALUE IF NOT EXISTS 'cod'`);
        await sequelize.query(`ALTER TYPE "enum_orders_paymentMethod" ADD VALUE IF NOT EXISTS 'credit'`);

        // Update existing 'cash' to 'cod' if any
        await sequelize.query(`UPDATE orders SET "paymentMethod" = 'cod' WHERE "paymentMethod" = 'cash'`);

        console.log('Payment method migration successful');
        process.exit(0);
    } catch (error) {
        if (error.message.includes('does not exist')) {
            console.log('Enum type does not exist yet, possibly first run.');
        } else {
            console.error('Migration failed:', error);
        }
        process.exit(0);
    }
}

migrate();
