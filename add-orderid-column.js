const { sequelize } = require('./src/config/db');
const { DataTypes } = require('sequelize');

async function addOrderIdColumn() {
  try {
    console.log('Adding orderId column to coupons table...');
    
    // Direct SQL query to add the column
    await sequelize.query('ALTER TABLE coupons ADD COLUMN IF NOT EXISTS "orderId" INTEGER REFERENCES orders(id);');
    
    console.log('orderId column added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error adding orderId column:', error);
    process.exit(1);
  }
}

addOrderIdColumn();