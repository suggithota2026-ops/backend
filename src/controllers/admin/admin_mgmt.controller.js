const Admin = require('../../models/admin.model');
const bcrypt = require('bcryptjs');
const { sendSuccess, sendError } = require('../../utils/response');
const logger = require('../../utils/logger');
const { ROLES } = require('../../config/constants');
const { normalizePermissions } = require('../../config/permissions');

const normalizeRole = (role) => {
    const value = String(role || '').trim().toLowerCase();
    if (value === 'admin') return 'ADMIN';
    if (value === 'driver') return 'driver';
    if (value === 'staff') return 'staff';
    return ROLES.ADMIN;
};

// Get all admins by role
const getAdmins = async (request, reply) => {
    try {
        const { role } = request.query;
        const { Op } = require('sequelize');
        const where = {
            [Op.and]: [
                { username: { [Op.ne]: 'admin' } },
                { role: { [Op.ne]: ROLES.SUPER_ADMIN || 'super_admin' } }
            ]
        };

        if (role) {
            where[Op.and].push({ role: role });
        }

        const admins = await Admin.findAll({
            where,
            attributes: { exclude: ['password', 'otpCode', 'otpExpiresAt'] },
            order: [['createdAt', 'DESC']],
        });

        return sendSuccess(reply, admins, 'Admins retrieved successfully');
    } catch (error) {
        logger.error('Error fetching admins:', error);
        return sendError(reply, 'Failed to fetch admins', 500);
    }
};

// Create a new admin/staff/driver
const createAdmin = async (request, reply) => {
    try {
        const { username, password, name, mobileNumber, role, permissions } = request.body;

        // Check if user already exists
        const existingUser = await Admin.findOne({
            where: {
                [require('sequelize').Op.or]: [
                    { username },
                    { mobileNumber: mobileNumber || 'NONE' }
                ]
            }
        });

        if (existingUser) {
            return sendError(reply, 'Username or Mobile Number already exists', 400);
        }

        const passwordToHash = password || '123456'; // Default password if not provided
        const hashedPassword = await bcrypt.hash(passwordToHash, 10);

        const admin = await Admin.create({
            username,
            password: hashedPassword,
            name,
            mobileNumber,
            role: normalizeRole(role || ROLES.ADMIN),
            isActive: true,
            permissions: normalizePermissions(permissions),
        });

        const adminResponse = admin.toJSON();
        delete adminResponse.password;

        return sendSuccess(reply, adminResponse, 'User created successfully', 201);
    } catch (error) {
        logger.error('Error creating admin:', error);
        return sendError(reply, 'Failed to create user', 500);
    }
};

// Update an admin/staff/driver
const updateAdmin = async (request, reply) => {
    try {
        const { id } = request.params;
        const { name, mobileNumber, role, isActive, password, permissions } = request.body;

        const admin = await Admin.findByPk(id);
        if (!admin) {
            return sendError(reply, 'User not found', 404);
        }

        const updateData = { name, mobileNumber, isActive };
        if (role !== undefined) {
            updateData.role = normalizeRole(role);
        }

        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }
        if (permissions !== undefined) {
            updateData.permissions = normalizePermissions(permissions);
        }

        // Filter out undefined values
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        await admin.update(updateData);

        const adminResponse = admin.toJSON();
        delete adminResponse.password;

        return sendSuccess(reply, adminResponse, 'User updated successfully');
    } catch (error) {
        logger.error('Error updating admin:', error);
        return sendError(reply, 'Failed to update user', 500);
    }
};

// Delete an admin/staff/driver
const deleteAdmin = async (request, reply) => {
    try {
        const { id } = request.params;

        const admin = await Admin.findByPk(id);
        if (!admin) {
            return sendError(reply, 'User not found', 404);
        }

        // Prevent deleting Admin accounts (only allow edit)
        if (String(admin.role).toUpperCase() === 'ADMIN') {
            return sendError(reply, 'Admin accounts cannot be deleted', 403);
        }

        await admin.destroy();

        return sendSuccess(reply, null, 'User deleted successfully');
    } catch (error) {
        logger.error('Error deleting admin:', error);
        return sendError(reply, 'Failed to delete user', 500);
    }
};

module.exports = {
    getAdmins,
    createAdmin,
    updateAdmin,
    deleteAdmin,
};
