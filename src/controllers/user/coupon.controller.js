// User coupon controller
const { Op } = require('sequelize');
const { col } = require('sequelize');
const { sequelize } = require('../../config/db');
const Coupon = require('../../models/coupon.model');
const { sendSuccess, sendError } = require('../../utils/response');
const logger = require('../../utils/logger');

const validateCoupon = async (request, reply) => {
    try {
        const { code } = request.body;
        
        if (!code) {
            return sendError(reply, 'Coupon code is required', 400);
        }
        
        // Find active coupon with the given code
        const coupon = await Coupon.findOne({
            where: {
                code: code.toUpperCase(),
                isActive: true,
                validFrom: { [Op.lte]: new Date() },
                validUntil: { [Op.gte]: new Date() },
                [Op.or]: [
                    { usageLimit: null }, // Unlimited usage
                    sequelize.where(sequelize.col('usedCount'), Op.lt, sequelize.col('usageLimit')) // Within usage limit
                ]
            }
        });
        
        if (!coupon) {
            return sendError(reply, 'Invalid or expired coupon code', 404);
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
        
        // Find active coupon with the given code
        const coupon = await Coupon.findOne({
            where: {
                code: code.toUpperCase(),
                isActive: true,
                validFrom: { [Op.lte]: new Date() },
                validUntil: { [Op.gte]: new Date() },
                [Op.or]: [
                    { usageLimit: null }, // Unlimited usage
                    sequelize.where(sequelize.col('usedCount'), Op.lt, sequelize.col('usageLimit')) // Within usage limit
                ]
            }
        });
        
        if (!coupon) {
            return sendError(reply, 'Invalid or expired coupon code', 404);
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