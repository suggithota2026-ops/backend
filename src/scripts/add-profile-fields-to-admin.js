const { sequelize } = require('../config/db');
const logger = require('../utils/logger');

async function addProfileFieldsToAdmin() {
    try {
        logger.info('Starting to add profile fields to admins table...');

        // Add columns using raw queries to be safe/explicit
        await sequelize.query(`
      DO $$ 
      BEGIN 
        BEGIN
          ALTER TABLE admins ADD COLUMN "email" VARCHAR(255);
        EXCEPTION
          WHEN duplicate_column THEN RAISE NOTICE 'column "email" already exists in "admins".';
        END;

        BEGIN
          ALTER TABLE admins ADD COLUMN "bio" TEXT;
        EXCEPTION
          WHEN duplicate_column THEN RAISE NOTICE 'column "bio" already exists in "admins".';
        END;

        BEGIN
          ALTER TABLE admins ADD COLUMN "dob" DATE;
        EXCEPTION
          WHEN duplicate_column THEN RAISE NOTICE 'column "dob" already exists in "admins".';
        END;

        BEGIN
          ALTER TABLE admins ADD COLUMN "country" VARCHAR(100);
        EXCEPTION
          WHEN duplicate_column THEN RAISE NOTICE 'column "country" already exists in "admins".';
        END;

        BEGIN
          ALTER TABLE admins ADD COLUMN "city" VARCHAR(100);
        EXCEPTION
          WHEN duplicate_column THEN RAISE NOTICE 'column "city" already exists in "admins".';
        END;

        BEGIN
          ALTER TABLE admins ADD COLUMN "postalCode" VARCHAR(20);
        EXCEPTION
          WHEN duplicate_column THEN RAISE NOTICE 'column "postalCode" already exists in "admins".';
        END;

        BEGIN
          ALTER TABLE admins ADD COLUMN "avatarUrl" TEXT;
        EXCEPTION
          WHEN duplicate_column THEN RAISE NOTICE 'column "avatarUrl" already exists in "admins".';
        END;
      END $$;
    `);

        logger.info('Profile fields added successfully to admins table');
    } catch (error) {
        logger.error('Error adding profile fields:', error);
        throw error;
    } finally {
        await sequelize.close();
    }
}

// Run the script
if (require.main === module) {
    addProfileFieldsToAdmin()
        .then(() => {
            console.log('Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = addProfileFieldsToAdmin;
