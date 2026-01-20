const { sequelize } = require('../config/db');

const fixBrandForeignKey = async () => {
  try {
    console.log('Starting brand foreign key constraint fix...');
    
    // Drop the existing foreign key constraint
    await sequelize.query(`
      ALTER TABLE brands DROP CONSTRAINT IF EXISTS brands_created_by_fkey;
    `);
    
    console.log('Dropped existing foreign key constraint.');
    
    // Add the new foreign key constraint to reference admins table
    await sequelize.query(`
      ALTER TABLE brands 
      ADD CONSTRAINT brands_created_by_fkey 
      FOREIGN KEY (created_by) REFERENCES admins(id) 
      ON DELETE SET NULL 
      ON UPDATE CASCADE;
    `);
    
    console.log('Added new foreign key constraint referencing admins table.');
    console.log('Brand foreign key constraint fix completed successfully!');
    
  } catch (error) {
    console.error('Error fixing brand foreign key constraint:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

fixBrandForeignKey();