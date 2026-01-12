const { sequelize } = require('../config/db');
const { QueryTypes } = require('sequelize');

const fixSchema = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        const addColumnIfNotExists = async (tableName, columnName, columnDefinition) => {
            const checkQuery = `
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = '${tableName}' AND column_name = '${columnName}'
            `;
            const [column] = await sequelize.query(checkQuery, { type: QueryTypes.SELECT });

            if (!column) {
                console.log(`Adding column '${columnName}' to table '${tableName}'...`);
                try {
                    await sequelize.query(`ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${columnDefinition}`);
                    console.log(`Column '${columnName}' added successfully.`);
                } catch (err) {
                    console.error(`Failed to add column '${columnName}':`, err.message);
                }
            } else {
                console.log(`Column '${columnName}' already exists in table '${tableName}'.`);
            }
        };

        // 1. Check Admins table
        console.log('\nChecking "admins" table...');
        await addColumnIfNotExists('admins', 'mobileNumber', 'VARCHAR(15) UNIQUE');
        await addColumnIfNotExists('admins', 'otpCode', 'VARCHAR(10)');
        await addColumnIfNotExists('admins', 'otpExpiresAt', 'TIMESTAMP WITH TIME ZONE');

        // 2. Check Categories table
        console.log('\nChecking "categories" table...');
        await addColumnIfNotExists('categories', 'subcategories', 'JSONB DEFAULT \'[]\'');

        // 3. Check Products table
        console.log('\nChecking "products" table...');
        await addColumnIfNotExists('products', 'subcategory', 'VARCHAR(255)');
        await addColumnIfNotExists('products', 'pricingType', "VARCHAR(50) DEFAULT 'fixed'"); // Use VARCHAR first to avoid enum issues
        await addColumnIfNotExists('products', 'createdById', 'INTEGER REFERENCES "admins"("id")');

        console.log('\nSchema check completed.');
        process.exit(0);
    } catch (error) {
        console.error('Schema fix failed:', error);
        process.exit(1);
    }
};

fixSchema();
