const { sequelize } = require('./src/config/db');
const { QueryTypes } = require('sequelize');

async function checkColumns() {
  try {
    const results = await sequelize.query(
      'SELECT column_name FROM information_schema.columns WHERE table_name = \'coupons\'',
      { type: QueryTypes.SELECT }
    );
    console.log('Columns in coupons table:', results);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkColumns();