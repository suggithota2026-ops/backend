// User coupon controller
const Coupon = require('../../models/coupon.model');
const { sendSuccess, sendError } = require('../../utils/response');
const logger = require('../../utils/logger');

const validateCoupon = async (request, reply) => {
    try {
        const { code } = request.body;
        
        if (!code) {
            return sendError(reply, 'Coupon code is required', 400);
        }
        
        const now = new Date();
        const coupon = await Coupon.findOne({
            where: {
                code: code.toUpperCase(),
                isActive: true,
                validFrom: { $lte: now },
                validUntil: { $gte: now },
            },
        });
        
        if (!coupon) {
            return sendError(reply, 'Invalid or expired coupon code', 404);
        }

        if (coupon.usageLimit !== null && coupon.usageLimit !== undefined) {
            if ((coupon.usedCount || 0) >= coupon.usageLimit) {
                return sendError(reply, 'Coupon usage limit exceeded', 400);
            }
        }
        
        // Return coupon details
        return sendSuccess(reply, {
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: parseFloat(coupon.discountValue),
            validUntil: coupon.validUntil,
            minOrderAmount: parseFloat(coupon.minOrderAmount || 0),
            maxDiscountAmount: coupon.maxDiscountAmount ? parseFloat(coupon.maxDiscountAmount) : null,
        }, 'Coupon validated successfully');
        
    } catch (error) {
        logger.error('Error validating coupon:', error);
        return sendError(reply, 'Failed to validate coupon', 500);
    }
};

const redeemCoupon = async (request, reply) => {
    try {
        const { code } = request.body;
        
        if (!code) {
            return sendError(reply, 'Coupon code is required', 400);
        }
        
        const now = new Date();
        const coupon = await Coupon.findOne({
            where: {
                code: code.toUpperCase(),
                isActive: true,
                validFrom: { $lte: now },
                validUntil: { $gte: now },
            },
        });
        
        if (!coupon) {
            return sendError(reply, 'Invalid or expired coupon code', 404);
        }

        if (coupon.usageLimit !== null && coupon.usageLimit !== undefined) {
            if ((coupon.usedCount || 0) >= coupon.usageLimit) {
                return sendError(reply, 'Coupon usage limit exceeded', 400);
            }
        }
        
        // Increment used count
        await coupon.increment('usedCount');
        
        // Return coupon details
        return sendSuccess(reply, {
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: parseFloat(coupon.discountValue),
            validUntil: coupon.validUntil,
            minOrderAmount: parseFloat(coupon.minOrderAmount || 0),
            maxDiscountAmount: coupon.maxDiscountAmount ? parseFloat(coupon.maxDiscountAmount) : null,
        }, 'Coupon redeemed successfully');
        
    } catch (error) {
        logger.error('Error redeeming coupon:', error);
        return sendError(reply, 'Failed to redeem coupon', 500);
    }
};

module.exports = {
    validateCoupon,
    redeemCoupon,
};