const { sequelize } = require('../config/db');
const Admin = require('../models/admin.model');
const bcrypt = require('bcryptjs');

const createAdmin = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Ensure tables exist
        await sequelize.sync();

        const username = process.argv[2] || 'admin';
        const password = process.argv[3] || 'password123';
        const mobileNumber = process.argv[4] || '9876543210';
        const name = 'System Admin';

        // Check if admin exists
        const existingAdmin = await Admin.findOne({ where: { username } });
        if (existingAdmin) {
            console.log(`Admin '${username}' already exists. Updating mobile number...`);
            await existingAdmin.update({ mobileNumber });
            console.log(`Mobile number updated to: ${mobileNumber}`);
            process.exit(0);
        }

        const hashedPassword = await bcrypt.hash(password, 8);

        await Admin.create({
            username,
            password: hashedPassword,
            mobileNumber,
            name,
        });

        console.log('Admin created successfully.');
        console.log(`Username: ${username}`);
        console.log(`Password: ${password}`);
        console.log(`Mobile Number: ${mobileNumber}`);
    } catch (error) {
        console.error('Error creating admin:', error);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
};

createAdmin();
