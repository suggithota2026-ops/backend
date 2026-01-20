// Migration script to change imageUrl column from VARCHAR to TEXT
const { sequelize } = require('../src/config/db');

async function migrateImageUrlColumn() {
  try {
    console.log('🔍 Checking current imageUrl column type...');
    
    // Check current column definition
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'brands' AND column_name = 'image_url'
    `);
    
    if (results.length > 0) {
      const column = results[0];
      console.log(`Current column definition: ${column.column_name} ${column.data_type}(${column.character_maximum_length || 'unlimited'})`);
      
      if (column.data_type === 'character varying') {
        console.log('🔄 Changing imageUrl column from VARCHAR to TEXT...');
        
        // Alter the column type
        await sequelize.query(`
          ALTER TABLE brands 
          ALTER COLUMN image_url TYPE TEXT
        `);
        
        console.log('✅ Successfully changed imageUrl column to TEXT');
        
        // Verify the change
        const [newResults] = await sequelize.query(`
          SELECT column_name, data_type, character_maximum_length 
          FROM information_schema.columns 
          WHERE table_name = 'brands' AND column_name = 'image_url'
        `);
        
        const newColumn = newResults[0];
        console.log(`New column definition: ${newColumn.column_name} ${newColumn.data_type}(${newColumn.character_maximum_length || 'unlimited'})`);
      } else {
        console.log('✅ Column is already TEXT type');
      }
    } else {
      console.log('❌ Could not find imageUrl column');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
if (require.main === module) {
  migrateImageUrlColumn()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateImageUrlColumn;