const Admin = require('../../models/admin.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendSuccess, sendError } = require('../../utils/response');
const otpService = require('../../services/otp.service');

// Admin Send OTP
exports.sendOtp = async (req, reply) => {
    try {
        const { mobileNumber } = req.body;

        const admin = await Admin.findOne({ where: { mobileNumber } });
        if (!admin) {
            return sendError(reply, `Admin not found with mobile number: ${mobileNumber}`, 404);
        }

        const { code, expiresAt } = otpService.generateOTPWithExpiry();

        await admin.update({
            otpCode: code,
            otpExpiresAt: expiresAt
        });

        // For development, we'll log it and attempt to send via otpService
        await otpService.sendOTP(mobileNumber, code);

        return sendSuccess(reply, { code }, 'OTP sent successfully');
    } catch (error) {
        return sendError(reply, error.message, 500);
    }
};

// Admin Verify OTP
exports.verifyOtp = async (req, reply) => {
    try {
        const { mobileNumber, otp } = req.body;

        const admin = await Admin.findOne({ where: { mobileNumber } });
        if (!admin) {
            return sendError(reply, 'Admin not found', 404);
        }

        const isValid = otpService.verifyOTP(admin.otpCode, otp, admin.otpExpiresAt);
        if (!isValid) {
            return sendError(reply, 'Invalid or expired OTP', 400);
        }

        // Clear OTP after successful verification
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
                role: admin.role
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

        const admin = await Admin.findOne({ where: { mobileNumber } });
        if (!admin) {
            return sendError(reply, `Admin not found with mobile number: ${mobileNumber}`, 404);
        }

        const { code, expiresAt } = otpService.generateOTPWithExpiry();

        await admin.update({
            otpCode: code,
            otpExpiresAt: expiresAt
        });

        // Send OTP via service
        await otpService.sendOTP(mobileNumber, code);

        return sendSuccess(reply, { code }, 'OTP resent successfully');
    } catch (error) {
        return sendError(reply, error.message, 500);
    }
};

// Create initial admin (useful for seeding)
exports.createAdmin = async (req, res) => {
    try {
        const { username, password, name } = req.body;

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ where: { username } });
        if (existingAdmin) {
            return res.status(400).send({ message: 'Admin already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 8);

        const admin = await Admin.create({
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
            expiresIn: 86400 // 24 hours
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
