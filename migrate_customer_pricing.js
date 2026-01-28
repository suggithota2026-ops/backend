// Simple migration script to create customer product pricing table
const { Client } = require('pg');

async function createTable() {
  // Use the environment variable or default connection string
  const connectionString = process.env.DATABASE_URL || 'postgresql://prk_smiles_user:svThLnyqmKeVZ91URXK1H2Vppts9CTpS@dpg-d5h3o14hg0os73fnftu0-a.virginia-postgres.render.com/prk_smiles';
  
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    // Create the customer product pricing table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS customer_product_pricing (
        id SERIAL PRIMARY KEY,
        customerId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
        productId INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
        fixedPrice DECIMAL(12, 2) NOT NULL,
        contractStartDate TIMESTAMP WITH TIME ZONE NOT NULL,
        contractEndDate TIMESTAMP WITH TIME ZONE NOT NULL,
        isActive BOOLEAN DEFAULT true,
        createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await client.query(createTableQuery);
    console.log('Table created successfully');
    
    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_product_pricing_customer_id 
      ON customer_product_pricing(customerId);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_product_pricing_product_id 
      ON customer_product_pricing(productId);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_product_pricing_active_dates 
      ON customer_product_pricing(isActive, contractStartDate, contractEndDate);
    `);
    
    console.log('Indexes created successfully');
    console.log('Migration completed successfully');
    
  } catch (err) {
    console.error('Error during migration:', err);
  } finally {
    await client.end();
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  createTable()
    .then(() => {
      console.log('Migration process completed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = createTable;