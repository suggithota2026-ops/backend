const Admin = require('../../models/admin.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendSuccess, sendError } = require('../../utils/response');
const otpService = require('../../services/otp.service');
const logger = require('../../utils/logger');
const { adminMobileWhere } = require('../../utils/adminMobile');

// Admin Send OTP
exports.sendOtp = async (req, reply) => {
    try {
        const { mobileNumber } = req.body;

        const admin = await Admin.findOne({ where: adminMobileWhere(mobileNumber) });
        if (!admin) {
            return sendError(reply, `Admin not found with mobile number: ${mobileNumber}`, 404);
        }

        if (admin.isActive === false) {
            return sendError(reply, 'Account is disabled', 403);
        }

        const { code, expiresAt } = otpService.generateOTPWithExpiry();

        await admin.update({
            otpCode: code,
            otpExpiresAt: expiresAt
        });

        try {
            await otpService.sendOTP(admin.mobileNumber, code);
        } catch (err) {
            logger.error('admin sendOtp: SMS failed', { message: err?.message });
            await admin.update({ otpCode: null, otpExpiresAt: null });
            return sendError(reply, err?.message || 'Failed to send OTP. Check SMS configuration.', 502);
        }

        return sendSuccess(reply, { mobileNumber: admin.mobileNumber }, 'OTP sent successfully');
    } catch (error) {
        return sendError(reply, error.message, 500);
    }
};

// Admin Verify OTP
exports.verifyOtp = async (req, reply) => {
    try {
        const { mobileNumber, otp } = req.body;

        const admin = await Admin.findOne({ where: adminMobileWhere(mobileNumber) });
        if (!admin) {
            return sendError(reply, 'Admin not found', 404);
        }

        if (admin.isActive === false) {
            return sendError(reply, 'Account is disabled', 403);
        }

        const isValid = otpService.verifyOTP(admin.otpCode, otp, admin.otpExpiresAt);
        if (!isValid) {
            return sendError(reply, 'Invalid or expired OTP', 400);
        }

        await admin.update({
            otpCode: null,
            otpExpiresAt: null
        });

        const token = jwt.sign(
            { id: admin.id, role: admin.role, type: 'admin' },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        return sendSuccess(reply, {
            token,
            user: {
                id: admin.id,
                username: admin.username,
                mobileNumber: admin.mobileNumber,
                name: admin.name,
                role: admin.role,
                permissions: Array.isArray(admin.permissions) ? admin.permissions : []
            }
        }, 'Login successful');
    } catch (error) {
        return sendError(reply, error.message, 500);
    }
};

// Admin Resend OTP
exports.resendOtp = async (req, reply) => {
    try {
        const { mobileNumber } = req.body;

        const admin = await Admin.findOne({ where: adminMobileWhere(mobileNumber) });
        if (!admin) {
            return sendError(reply, `Admin not found with mobile number: ${mobileNumber}`, 404);
        }

        if (admin.isActive === false) {
            return sendError(reply, 'Account is disabled', 403);
        }

        const { code, expiresAt } = otpService.generateOTPWithExpiry();

        await admin.update({
            otpCode: code,
            otpExpiresAt: expiresAt
        });

        try {
            await otpService.sendOTP(admin.mobileNumber, code);
        } catch (err) {
            logger.error('admin resendOtp: SMS failed', { message: err?.message });
            await admin.update({ otpCode: null, otpExpiresAt: null });
            return sendError(reply, err?.message || 'Failed to send OTP. Check SMS configuration.', 502);
        }

        return sendSuccess(reply, { mobileNumber: admin.mobileNumber }, 'OTP resent successfully');
    } catch (error) {
        return sendError(reply, error.message, 500);
    }
};

// Create initial admin (useful for seeding)
exports.createAdmin = async (req, res) => {
    try {
        const { username, password, name } = req.body;

        const existingAdmin = await Admin.findOne({ where: { username } });
        if (existingAdmin) {
            return res.status(400).send({ message: 'Admin already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 8);

        await Admin.create({
            username,
            password: hashedPassword,
            name,
            role: 'ADMIN',
        });

        res.status(201).send({ message: 'Admin registered successfully' });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

// Admin Login
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        const admin = await Admin.findOne({ where: { username } });

        if (!admin) {
            return res.status(404).send({ message: 'Admin not found.' });
        }

        const passwordIsValid = await bcrypt.compare(password, admin.password);

        if (!passwordIsValid) {
            return res.status(401).send({
                accessToken: null,
                message: 'Invalid Password!'
            });
        }

        const token = jwt.sign({ id: admin.id, role: admin.role, type: 'admin' }, process.env.JWT_SECRET, {
            expiresIn: 86400
        });

        res.status(200).send({
            id: admin.id,
            username: admin.username,
            name: admin.name,
            role: admin.role,
            accessToken: token
        });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

// Get Current Admin Profile
exports.getProfile = async (req, reply) => {
    try {
        console.log('GetProfile Request User:', req.user);
        if (!req.user || !req.user.id) {
            throw new Error('User not attached to request');
        }

        const adminId = req.user.id;
        console.log('Fetching admin with ID:', adminId);

        const admin = await Admin.findByPk(adminId, {
            attributes: { exclude: ['password', 'otpCode', 'otpExpiresAt'] },
            raw: true
        });

        if (!admin) {
            console.log('Admin not found for ID:', adminId);
            return sendError(reply, 'Admin not found', 404);
        }

        return sendSuccess(reply, admin, 'Profile retrieved successfully');
    } catch (error) {
        console.error('GetProfile Error:', error);
        return sendError(reply, error.message, 500);
    }
};

// Update Current Admin Profile
exports.updateProfile = async (req, reply) => {
    try {
        const adminId = req.user.id;
        const updateData = req.body;

        delete updateData.password;
        delete updateData.username;
        delete updateData.role;
        delete updateData.otpCode;
        delete updateData.otpExpiresAt;

        const admin = await Admin.findByPk(adminId);

        if (!admin) {
            return sendError(reply, 'Admin not found', 404);
        }

        await admin.update(updateData);

        const updatedAdmin = await Admin.findByPk(adminId, {
            attributes: { exclude: ['password', 'otpCode', 'otpExpiresAt'] }
        });

        return sendSuccess(reply, updatedAdmin, 'Profile updated successfully');
    } catch (error) {
        return sendError(reply, error.message, 500);
    }
};
