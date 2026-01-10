try {
    console.log('Checking sequelize...');
    require('../config/db');
    console.log('Checking admin model...');
    require('../models/admin.model');
    console.log('Checking bcryptjs...');
    require('bcryptjs');
    console.log('All modules loaded successfully');
} catch (e) {
    console.error('Error loading module:', e);
}
