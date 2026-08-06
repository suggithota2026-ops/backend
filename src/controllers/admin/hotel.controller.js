// Admin hotel controller
const User = require('../../models/user.model');
const Order = require('../../models/order.model');
const Product = require('../../models/product.model');
const CustomerProductPricing = require('../../models/customer.product.pricing.model');
const { Op } = require('sequelize');
const { ROLES, ORDER_STATUS } = require('../../config/constants');
const { sendSuccess, sendError } = require('../../utils/response');
const { sendMessage } = require('../../services/otp.service');
const logger = require('../../utils/logger');
const {
  normalizeMobileNumber,
  userMobileWhere,
} = require('../../utils/userMobile');
const {
  getActiveCustomerPricing,
  toStartOfDay,
  toEndOfDay,
} = require('../../services/customerPricing.service');

const createHotel = async (request, reply) => {
  try {
    const {
      mobileNumber: rawMobile,
      hotelName,
      address,
      gstNumber,
      creditLimit,
      rateType,
      pricePerUnit,
      contractDuration,
      contractStartDate,
      contractEndDate,
      customerProductPricing,
    } = request.body;

    const mobileNumber = String(rawMobile || '').replace(/\D/g, '').slice(-10);
    if (mobileNumber.length !== 10) {
      return sendError(reply, 'Mobile number must be 10 digits', 400);
    }

    // Validate rate type
    if (rateType && !['Dairy Prize', 'Weekly Fixes', 'Fixed Price', 'Daily Price', 'Weekly Price'].includes(rateType)) {
      return sendError(reply, 'Invalid rate type. Must be Dairy Prize, Weekly Fixes, Daily Price, Weekly Price, or Fixed Price', 400);
    }

    // For Fixed Price, validate contract date range
    if (rateType === 'Fixed Price') {
      if (!contractStartDate || !contractEndDate) {
        return sendError(reply, 'Contract start and end dates are mandatory for Fixed Price rate type', 400);
      }
      const start = new Date(contractStartDate);
      const end = new Date(contractEndDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
        return sendError(reply, 'Invalid contract date range', 400);
      }
    }

    // Uniqueness is by mobile number only — same hotelName with a different
    // mobileNumber creates a separate customer account.
    let user = await User.findOne({ where: userMobileWhere(mobileNumber) });
    if (user) {
      return sendError(reply, 'Hotel with this mobile number already exists', 400);
    }

    // Validate Fixed Price payload before creating the user
    if (rateType === 'Fixed Price') {
      if (!customerProductPricing || !Array.isArray(customerProductPricing) || customerProductPricing.length === 0) {
        return sendError(reply, 'At least one product price is required for Fixed Price', 400);
      }
      for (const pricing of customerProductPricing) {
        if (!pricing.productId || !pricing.fixedPrice || pricing.fixedPrice <= 0) {
          return sendError(reply, 'Invalid product pricing data', 400);
        }
      }
    }

    // Create user (hotel) directly as verified
    user = await User.create({
      mobileNumber,
      hotelName,
      address,
      gstNumber: gstNumber?.toUpperCase(),
      creditLimit: creditLimit || 0,
      rateType,
      pricePerUnit: rateType === 'Fixed Price' ? null : pricePerUnit,
      role: ROLES.HOTEL,
      isVerified: true,
    });

    // If rate type is Fixed Price, create customer product pricing records
    if (rateType === 'Fixed Price' && customerProductPricing && Array.isArray(customerProductPricing)) {
      let startDate = toStartOfDay(contractStartDate);
      let endDate = toEndOfDay(contractEndDate);

      // Legacy fallback for old duration values
      if ((!contractStartDate || !contractEndDate) && contractDuration) {
        startDate = toStartOfDay(new Date());
        endDate = toEndOfDay(new Date());
        if (contractDuration === '6 Months') {
          endDate.setUTCMonth(endDate.getUTCMonth() + 6);
          endDate = toEndOfDay(endDate);
        } else if (contractDuration === '1 Year') {
          endDate.setUTCFullYear(endDate.getUTCFullYear() + 1);
          endDate = toEndOfDay(endDate);
        }
      }

      try {
        for (const pricing of customerProductPricing) {
          await CustomerProductPricing.create({
            customerId: user.id,
            productId: pricing.productId,
            fixedPrice: pricing.fixedPrice,
            contractStartDate: startDate,
            contractEndDate: endDate,
            isActive: true,
          });
        }
      } catch (pricingError) {
        logger.error('Error creating customer product pricing:', pricingError);
        await user.destroy().catch(() => {});
        return sendError(reply, 'Failed to save customer product pricing', 500);
      }
    }

    // Welcome SMS should never delay or block create response
    void sendMessage(mobileNumber, 'Congratulations , Now you are a member of prk Smiles').catch(
      (messageError) => {
        logger.warn('Welcome message failed after hotel create:', messageError?.message || messageError);
      }
    );

    return sendSuccess(reply, {
      user: {
        id: user.id,
        mobileNumber: user.mobileNumber,
        hotelName: user.hotelName,
        address: user.address,
        gstNumber: user.gstNumber,
        creditLimit: user.creditLimit,
        rateType: user.rateType,
        isBlocked: user.isBlocked,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    }, 'Hotel created successfully', 201);
  } catch (error) {
    logger.error('Error creating hotel:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return sendError(reply, 'Mobile number already exists', 400);
    }
    return sendError(reply, 'Failed to create hotel', 500);
  }
};

const getHotels = async (request, reply) => {
  try {
    const {
      page = 1,
      limit = 20,
      isBlocked,
      search,
    } = request.query;

    const where = { role: ROLES.HOTEL };
    if (isBlocked !== undefined) {
      where.isBlocked = isBlocked === 'true';
    }
    if (search) {
      const term = String(search).trim();
      const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      where.$or = [
        { hotelName: re },
        { mobileNumber: re },
        { address: re },
        { city: re },
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [hotels, total] = await Promise.all([
      User.findAll({
        where,
        order: [['createdAt', 'DESC']],
        offset,
        limit: parseInt(limit),
      }).then((rows) =>
        rows.map((u) => {
          const obj = u.toJSON();
          delete obj.otpCode;
          delete obj.otpExpiresAt;
          return obj;
        })
      ),
      User.count({ where }),
    ]);

    return sendSuccess(reply, {
      hotels,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    }, 'Hotels retrieved successfully');
  } catch (error) {
    logger.error('Error fetching hotels:', error);
    return sendError(reply, 'Failed to fetch hotels', 500);
  }
};

const getHotel = async (request, reply) => {
  try {
    const { id } = request.params;
    const hotel = await User.findByPk(id, {
      attributes: { exclude: ['otpCode', 'otpExpiresAt'] },
    });

    if (!hotel || hotel.role !== ROLES.HOTEL) {
      return sendError(reply, 'Hotel not found', 404);
    }

    // Get all active customer product pricing (admin edit needs full list)
    const customerProductPricing = await CustomerProductPricing.findAll({
      where: { 
        customerId: Number(id),
        isActive: true,
      },
      attributes: ['id', 'productId', 'fixedPrice', 'contractStartDate', 'contractEndDate', 'isActive'],
    });

    const pricingJson = customerProductPricing.map((pricing) => pricing.toJSON());
    const productIds = [
      ...new Set(pricingJson.map((p) => Number(p.productId)).filter((pid) => !Number.isNaN(pid))),
    ];
    let productNameById = new Map();
    if (productIds.length > 0) {
      const products = await Product.findAll({
        where: { id: { [Op.in]: productIds } },
        attributes: ['id', 'name'],
      });
      productNameById = new Map(products.map((p) => [Number(p.id), p.name]));
    }

    const orderStats = await Order.aggregate([
      { $match: { hotelId: Number(id) } },
      { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$totalAmount' } } },
    ]);

    // Remap for frontend consistency if needed, or send as is
    // The previous aggregation returned [{ _id: status, count: X, totalAmount: Y }]
    // Sequelize returns [{ status: 'pending', count: X, totalAmount: Y }]

    return sendSuccess(reply, {
      hotel: {
        ...hotel.toJSON(),
        customerProductPricing: pricingJson.map((pricing) => ({
          ...pricing,
          productName: productNameById.get(Number(pricing.productId)) || null,
        })),
      },
      orderStats: orderStats.map(stat => ({
        _id: stat._id,
        count: parseInt(stat.count || 0),
        totalAmount: parseFloat(stat.totalAmount || 0),
      })),
    }, 'Hotel retrieved successfully');
  } catch (error) {
    logger.error('Error fetching hotel:', error);
    return sendError(reply, 'Failed to fetch hotel', 500);
  }
};

const updateHotel = async (request, reply) => {
  try {
    const hotelId = Number(request.params.id);
    if (!Number.isFinite(hotelId) || hotelId <= 0) {
      return sendError(reply, 'Invalid hotel ID', 400);
    }

    const body = request.body || {};
    const hotel = await User.findByPk(hotelId);
    if (!hotel || hotel.role !== ROLES.HOTEL) {
      return sendError(reply, 'Hotel not found', 404);
    }

    const nextRateType =
      body.rateType !== undefined && body.rateType !== null && body.rateType !== ''
        ? String(body.rateType).trim()
        : hotel.rateType;

    // Validate rate type
    if (
      body.rateType &&
      !['Dairy Prize', 'Weekly Fixes', 'Fixed Price', 'Daily Price', 'Weekly Price'].includes(nextRateType)
    ) {
      return sendError(reply, 'Invalid rate type. Must be Dairy Prize, Weekly Fixes, Daily Price, Weekly Price, or Fixed Price', 400);
    }

    // For Fixed Price, validate contract date range
    if (nextRateType === 'Fixed Price') {
      if (!body.contractStartDate || !body.contractEndDate) {
        return sendError(reply, 'Contract start and end dates are mandatory for Fixed Price rate type', 400);
      }
      const start = new Date(body.contractStartDate);
      const end = new Date(body.contractEndDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
        return sendError(reply, 'Invalid contract date range', 400);
      }
    }

    // Only persist User model fields (never write pricing/contract payload onto the user doc)
    const userUpdate = {};
    if (body.hotelName !== undefined) userUpdate.hotelName = body.hotelName;
    if (body.address !== undefined) userUpdate.address = body.address;
    if (body.gstNumber !== undefined) {
      userUpdate.gstNumber = body.gstNumber ? String(body.gstNumber).toUpperCase() : null;
    }
    if (body.creditLimit !== undefined) userUpdate.creditLimit = Number(body.creditLimit) || 0;
    if (body.isBlocked !== undefined) userUpdate.isBlocked = body.isBlocked === true;
    if (body.rateType !== undefined) userUpdate.rateType = nextRateType;

    if (nextRateType === 'Fixed Price' && Array.isArray(body.customerProductPricing)) {
      let startDate = toStartOfDay(body.contractStartDate);
      let endDate = toEndOfDay(body.contractEndDate);

      if ((!body.contractStartDate || !body.contractEndDate) && body.contractDuration) {
        startDate = toStartOfDay(new Date());
        endDate = toEndOfDay(new Date());
        if (body.contractDuration === '6 Months') {
          endDate.setUTCMonth(endDate.getUTCMonth() + 6);
          endDate = toEndOfDay(endDate);
        } else if (body.contractDuration === '1 Year') {
          endDate.setUTCFullYear(endDate.getUTCFullYear() + 1);
          endDate = toEndOfDay(endDate);
        }
      }

      await CustomerProductPricing.update(
        { isActive: false },
        { where: { customerId: hotelId } }
      );

      for (const pricing of body.customerProductPricing) {
        if (!pricing.productId || !pricing.fixedPrice || pricing.fixedPrice <= 0) {
          return sendError(reply, 'Invalid product pricing data', 400);
        }
      }

      for (const pricing of body.customerProductPricing) {
        const productId = Number(pricing.productId);
        const existing = await CustomerProductPricing.findOne({
          where: { customerId: hotelId, productId },
        });

        if (existing) {
          await existing.update({
            fixedPrice: pricing.fixedPrice,
            contractStartDate: startDate,
            contractEndDate: endDate,
            isActive: true,
          });
        } else {
          await CustomerProductPricing.create({
            customerId: hotelId,
            productId,
            fixedPrice: pricing.fixedPrice,
            contractStartDate: startDate,
            contractEndDate: endDate,
            isActive: true,
          });
        }
      }

      userUpdate.pricePerUnit = null;
    } else if (nextRateType && nextRateType !== 'Fixed Price') {
      // Leaving Fixed Price → deactivate contract pricing so Daily/Weekly use catalog only
      await CustomerProductPricing.update(
        { isActive: false },
        { where: { customerId: hotelId } }
      );
      userUpdate.pricePerUnit = body.pricePerUnit != null ? Number(body.pricePerUnit) : hotel.pricePerUnit;
    }

    await hotel.update(userUpdate);
    await hotel.reload();

    logger.info(
      `Hotel ${hotelId} updated: rateType=${hotel.rateType}`
    );

    return sendSuccess(
      reply,
      {
        id: hotel.id,
        hotelName: hotel.hotelName,
        mobileNumber: hotel.mobileNumber,
        address: hotel.address,
        gstNumber: hotel.gstNumber,
        creditLimit: hotel.creditLimit,
        rateType: hotel.rateType,
        isBlocked: hotel.isBlocked,
        updatedAt: hotel.updatedAt,
      },
      'Hotel updated successfully'
    );
  } catch (error) {
    logger.error('Error updating hotel:', error);
    return sendError(reply, error.message || 'Failed to update hotel', 500);
  }
};

const blockHotel = async (request, reply) => {
  try {
    const { id } = request.params;
    const { isBlocked } = request.body;

    const hotel = await User.findByPk(id);
    if (!hotel || hotel.role !== ROLES.HOTEL) {
      return sendError(reply, 'Hotel not found', 404);
    }

    hotel.isBlocked = isBlocked;
    await hotel.save();

    return sendSuccess(reply, hotel, `Hotel ${isBlocked ? 'blocked' : 'unblocked'} successfully`);
  } catch (error) {
    logger.error('Error blocking/unblocking hotel:', error);
    return sendError(reply, 'Failed to update hotel status', 500);
  }
};

const deleteHotel = async (request, reply) => {
  try {
    const { id } = request.params;
    const hotel = await User.findByPk(id);

    if (!hotel || hotel.role !== ROLES.HOTEL) {
      return sendError(reply, 'Hotel not found', 404);
    }

    const hotelId = parseInt(id, 10);

    // Block deletion only when there are in-progress orders
    const activeOrders = await Order.count({
      where: {
        hotelId,
        status: {
          $in: [
            ORDER_STATUS.PENDING,
            ORDER_STATUS.CONFIRMED,
            ORDER_STATUS.DISPATCHED,
          ],
        },
      },
    });

    if (activeOrders > 0) {
      return sendError(
        reply,
        'Cannot delete hotel with pending or active orders. Deliver or cancel all orders first.',
        400
      );
    }

    await hotel.destroy();

    logger.info(`Hotel deleted: ${id} - ${hotel.hotelName}`);
    return sendSuccess(reply, null, 'Hotel deleted successfully');
  } catch (error) {
    logger.error('Error deleting hotel:', error);
    return sendError(reply, 'Failed to delete hotel', 500);
  }
};

// Re-export for backward compatibility
module.exports = {
  createHotel,
  getHotels,
  getHotel,
  updateHotel,
  blockHotel,
  deleteHotel,
  getActiveCustomerPricing,
};
