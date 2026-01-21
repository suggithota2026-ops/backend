// Admin notifications controller
const { Op, col } = require('sequelize');
const { sequelize } = require('../../config/db');
const Notification = require('../../models/notification.model');
const Order = require('../../models/order.model');
const Category = require('../../models/category.model');
const Coupon = require('../../models/coupon.model');
const User = require('../../models/user.model');
const { sendSuccess, sendError } = require('../../utils/response');
const logger = require('../../utils/logger');
const { createNotification } = require('../../services/notification.service');
const { generateUniquePromoCode } = require('../../utils/couponGenerator');

const getNotifications = async (request, reply) => {
    try {
        const { page = 1, limit = 20, isRead } = request.query;
        const { NOTIFICATION_TYPES } = require('../../config/constants');

        const where = {
            type: {
                [Op.in]: [  // Only show notifications that originate from user actions
                    'new_order',        // When a user places a new order
                    'order_cancelled',  // When a user cancels an order
                    'admin_message',    // Admin messages (like contact inquiries)
                    'broadcast'       // General broadcast notifications
                ],
            },
        };

        if (isRead !== undefined) {
            where.isRead = isRead === 'true';
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { rows: notifications, count: total } = await Notification.findAndCountAll({
            where,
            include: [{
                model: Order,
                as: 'order',
                attributes: ['orderNumber', 'totalAmount'],
            }],
            order: [['sentAt', 'DESC']],
            offset,
            limit: parseInt(limit),
        });

        return sendSuccess(reply, {
            notifications,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        }, 'Admin notifications retrieved successfully');
    } catch (error) {
        logger.error('Error fetching admin notifications:', error);
        return sendError(reply, 'Failed to fetch notifications', 500);
    }
};

const pushPromotionalOffer = async (request, reply) => {
    try {
        const {
            title,
            description,
            promoCode,
            discountType,
            discountValue,
            validUntil,
            categoryIds,
            subcategoryNames,
            hotelIds
        } = request.body;

        // Validate required fields
        if (!title || !description || !discountType || !discountValue || !validUntil) {
            return sendError(reply, 'Missing required fields', 400);
        }

        if (!['percentage', 'flat'].includes(discountType)) {
            return sendError(reply, 'Invalid discount type. Must be percentage or flat', 400);
        }

        // Check if categories exist if provided
        if (categoryIds && categoryIds.length > 0) {
            const categories = await Category.findAll({
                where: { id: { [Op.in]: categoryIds } },
                attributes: ['id', 'name', 'subcategories']
            });
            
            if (categories.length !== categoryIds.length) {
                return sendError(reply, 'One or more categories not found', 404);
            }
            
            // Validate subcategory names against the categories' subcategories
            if (subcategoryNames && subcategoryNames.length > 0) {
                for (const category of categories) {
                    // If the category has no subcategories defined but subcategory names are provided
                    if (!category.subcategories || !Array.isArray(category.subcategories) || category.subcategories.length === 0) {
                        if (subcategoryNames.length > 0) {
                            return sendError(reply, `Category '${category.name}' has no subcategories defined. Cannot target specific subcategories.`, 400);
                        }
                    } else {
                        // If the category has subcategories defined, validate that requested ones exist
                        const availableSubcategories = category.subcategories.map(sc => sc.name);
                        
                        // Check if all requested subcategory names exist in this category
                        const invalidSubcategories = subcategoryNames.filter(
                            subcatName => !availableSubcategories.includes(subcatName)
                        );
                        
                        if (invalidSubcategories.length > 0) {
                            return sendError(reply, `Invalid subcategories for category '${category.name}': ${invalidSubcategories.join(', ')}`, 400);
                        }
                    }
                }
            }
        }

        // Generate coupon code if not provided
        let finalPromoCode = promoCode;
        if (!finalPromoCode) {
            // Generate a unique promo code
            finalPromoCode = await generateUniquePromoCode(title, Coupon);
            
            // Create a coupon record
            await Coupon.create({
                code: finalPromoCode,
                discountType,
                discountValue,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expires in 24 hours
                isActive: true,
                createdBy: request.user?.id, // Assuming user ID is available from auth middleware
                metadata: {
                    offerTitle: title,
                    offerDescription: description,
                    categoryIds: categoryIds || [],
                    subcategoryNames: subcategoryNames || [],
                    originalValidUntil: validUntil // Store original validUntil for reference
                }
            });
        } else {
            // If promo code is provided, still create the coupon record
            // Check if the provided promo code already exists
            const existingCoupon = await Coupon.findOne({
                where: { code: finalPromoCode.toUpperCase() }
            });
            
            if (existingCoupon) {
                return sendError(reply, 'Promo code already exists. Please use a unique code.', 400);
            }
            
            await Coupon.create({
                code: finalPromoCode.toUpperCase(),
                discountType,
                discountValue,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expires in 24 hours
                isActive: true,
                createdBy: request.user?.id, // Assuming user ID is available from auth middleware
                metadata: {
                    offerTitle: title,
                    offerDescription: description,
                    categoryIds: categoryIds || [],
                    subcategoryNames: subcategoryNames || [],
                    originalValidUntil: validUntil // Store original validUntil for reference
                }
            });
        }

        // Create promotional offer notification
        const notificationData = {
            type: 'offer',
            title,
            message: description,
            recipient: null, // Will be set to specific users if hotelIds provided
            metadata: {
                promoCode: finalPromoCode,
                discountType,
                discountValue,
                validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24-hour expiry for promo codes
                categoryIds: categoryIds || [],
                subcategoryNames: subcategoryNames || [],
                hotelIds: hotelIds || [], // Store hotel IDs for targeted offers
                offerType: 'promotional'
            }
        };

        let notification;
        
        // If specific hotels are selected, create individual notifications for each
        if (hotelIds && hotelIds.length > 0) {
            // Validate that the specified hotels exist
            const targetHotels = await User.findAll({
                where: { id: { [Op.in]: hotelIds } },
                attributes: ['id', 'role']
            });
            
            if (targetHotels.length !== hotelIds.length) {
                // Some hotels don't exist
                const foundHotelIds = targetHotels.map(hotel => hotel.id);
                const invalidHotelIds = hotelIds.filter(id => !foundHotelIds.includes(id));
                return sendError(reply, `One or more hotels not found: ${invalidHotelIds.join(', ')}`, 404);
            }
            
            // Check if all target users have the 'hotel' role
            const nonHotelUsers = targetHotels.filter(user => user.role !== 'hotel');
            if (nonHotelUsers.length > 0) {
                return sendError(reply, 'Selected users are not hotels/customers', 400);
            }
            
            // Create individual notifications for each target hotel
            const createdNotifications = [];
            for (const hotelId of hotelIds) {
                const individualNotificationData = {
                    ...notificationData,
                    recipientId: hotelId
                };
                const individualNotification = await createNotification(individualNotificationData);
                createdNotifications.push(individualNotification);
            }
            
            notification = createdNotifications[0]; // Return the first one for the response
        } else {
            // Create a broadcast notification for all users
            notification = await createNotification(notificationData);
        }

        return sendSuccess(reply, {
            notification
        }, 'Promotional offer pushed successfully');
    } catch (error) {
        logger.error('Error pushing promotional offer:', error);
        return sendError(reply, 'Failed to push promotional offer', 500);
    }
};

const markAsRead = async (request, reply) => {
    try {
        const { id } = request.params;

        const notification = await Notification.findByPk(id);
        if (!notification) {
            return sendError(reply, 'Notification not found', 404);
        }

        await notification.update({ isRead: true });

        return sendSuccess(reply, notification, 'Notification marked as read');
    } catch (error) {
        logger.error('Error marking notification as read:', error);
        return sendError(reply, 'Failed to update notification', 500);
    }
};

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
                    { [Op.col]: 'usedCount', [Op.lt]: sequelize.col('usageLimit') }, // Within usage limit
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
                    { [Op.col]: 'usedCount', [Op.lt]: sequelize.col('usageLimit') }, // Within usage limit
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
    getNotifications,
    pushPromotionalOffer,
    markAsRead,
};
