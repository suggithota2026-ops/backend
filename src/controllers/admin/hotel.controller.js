// Admin hotel controller
const User = require('../../models/user.model');
const Order = require('../../models/order.model');
const CustomerProductPricing = require('../../models/customer.product.pricing.model');
const { ROLES } = require('../../config/constants');
const { sendSuccess, sendError } = require('../../utils/response');
const { sendMessage } = require('../../services/otp.service');
const logger = require('../../utils/logger');

const createHotel = async (request, reply) => {
  try {
    const { mobileNumber, hotelName, address, gstNumber, creditLimit, rateType, pricePerUnit, contractDuration, customerProductPricing } = request.body;

    // Validate rate type
    if (rateType && !['Dairy Prize', 'Weekly Fixes', 'Fixed Price', 'Daily Price', 'Weekly Price'].includes(rateType)) {
      return sendError(reply, 'Invalid rate type. Must be Dairy Prize, Weekly Fixes, Daily Price, Weekly Price, or Fixed Price', 400);
    }

    // For Fixed Price, validate contract duration
    if (rateType === 'Fixed Price' && !contractDuration) {
      return sendError(reply, 'Contract duration is mandatory for Fixed Price rate type', 400);
    }

    // Check if user already exists
    let user = await User.findOne({ where: { mobileNumber } });
    if (user) {
      return sendError(reply, 'Hotel with this mobile number already exists', 400);
    }

    // Create user (hotel) directly as verified
    user = await User.create({
      mobileNumber,
      hotelName,
      address,
      gstNumber: gstNumber?.toUpperCase(),
      creditLimit: creditLimit || 0,
      rateType,
      pricePerUnit: rateType === 'Fixed Price' ? null : pricePerUnit, // Remove pricePerUnit for Fixed Price
      role: ROLES.HOTEL,
      isVerified: true, // Auto-verify since we are adding manually
    });

    // If rate type is Fixed Price, create customer product pricing records
    if (rateType === 'Fixed Price' && customerProductPricing && Array.isArray(customerProductPricing)) {
      // Calculate contract dates
      const startDate = new Date();
      let endDate = new Date();
      
      switch (contractDuration) {
        case '6 Months':
          endDate.setMonth(endDate.getMonth() + 6);
          break;
        case '1 Year':
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
        default:
          // For custom duration, expect specific start/end dates in request
          if (request.body.contractStartDate && request.body.contractEndDate) {
            startDate = new Date(request.body.contractStartDate);
            endDate = new Date(request.body.contractEndDate);
          } else {
            return sendError(reply, 'Invalid contract duration', 400);
          }
      }

      // Validate customer product pricing data
      for (const pricing of customerProductPricing) {
        if (!pricing.productId || !pricing.fixedPrice || pricing.fixedPrice <= 0) {
          return sendError(reply, 'Invalid product pricing data', 400);
        }
      }

      // Create customer product pricing records
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
    }

    // Send Welcome Message
    await sendMessage(mobileNumber, 'Congratulations , Now you are a member of prk Smiles');

    return sendSuccess(reply, {
      user: {
        id: user.id,
        mobileNumber: user.mobileNumber,
        hotelName: user.hotelName,
      },
    }, 'Hotel created successfully. Welcome message sent.', 201);
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
      const re = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      where.$or = [{ hotelName: re }, { mobileNumber: re }];
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

    // Get customer product pricing if it exists
    const customerProductPricing = await CustomerProductPricing.findAll({
      where: { 
        customerId: id,
        isActive: true,
        contractEndDate: { [Op.gte]: new Date() } // Only active contracts
      },
      attributes: ['id', 'productId', 'fixedPrice', 'contractStartDate', 'contractEndDate', 'isActive'],
    });

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
        customerProductPricing: customerProductPricing.map(pricing => pricing.toJSON())
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
    const { id } = request.params;
    const updateData = request.body;

    const hotel = await User.findByPk(id);
    if (!hotel || hotel.role !== ROLES.HOTEL) {
      return sendError(reply, 'Hotel not found', 404);
    }

    // Validate rate type
    if (updateData.rateType && !['Dairy Prize', 'Weekly Fixes', 'Fixed Price', 'Daily Price', 'Weekly Price'].includes(updateData.rateType)) {
      return sendError(reply, 'Invalid rate type. Must be Dairy Prize, Weekly Fixes, Daily Price, Weekly Price, or Fixed Price', 400);
    }

    // For Fixed Price, validate contract duration
    if (updateData.rateType === 'Fixed Price' && updateData.contractDuration) {
      // If changing to Fixed Price, ensure contract duration is provided
      if (!updateData.contractDuration) {
        return sendError(reply, 'Contract duration is mandatory for Fixed Price rate type', 400);
      }
    }

    if (updateData.gstNumber) {
      updateData.gstNumber = updateData.gstNumber.toUpperCase();
    }

    // If rate type is Fixed Price and customer product pricing is provided, update the pricing
    if (updateData.rateType === 'Fixed Price' && updateData.customerProductPricing && Array.isArray(updateData.customerProductPricing)) {
      // Calculate contract dates
      const startDate = new Date();
      let endDate = new Date();
      
      switch (updateData.contractDuration) {
        case '6 Months':
          endDate.setMonth(endDate.getMonth() + 6);
          break;
        case '1 Year':
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
        default:
          // For custom duration, expect specific start/end dates in request
          if (updateData.contractStartDate && updateData.contractEndDate) {
            startDate = new Date(updateData.contractStartDate);
            endDate = new Date(updateData.contractEndDate);
          } else {
            return sendError(reply, 'Invalid contract duration', 400);
          }
      }

      // Deactivate existing pricing records
      await CustomerProductPricing.update({
        isActive: false
      }, {
        where: { customerId: id }
      });

      // Validate customer product pricing data
      for (const pricing of updateData.customerProductPricing) {
        if (!pricing.productId || !pricing.fixedPrice || pricing.fixedPrice <= 0) {
          return sendError(reply, 'Invalid product pricing data', 400);
        }
      }

      // Create new customer product pricing records
      for (const pricing of updateData.customerProductPricing) {
        await CustomerProductPricing.create({
          customerId: id,
          productId: pricing.productId,
          fixedPrice: pricing.fixedPrice,
          contractStartDate: startDate,
          contractEndDate: endDate,
          isActive: true,
        });
      }

      // Set pricePerUnit to null for Fixed Price
      updateData.pricePerUnit = null;
    } else if (updateData.rateType && updateData.rateType !== 'Fixed Price') {
      // For non-fixed pricing types, remove customer product pricing
      await CustomerProductPricing.update({
        isActive: false
      }, {
        where: { customerId: id }
      });
    }

    // Sequelize update
    await hotel.update(updateData);

    return sendSuccess(reply, hotel, 'Hotel updated successfully');
  } catch (error) {
    logger.error('Error updating hotel:', error);
    return sendError(reply, 'Failed to update hotel', 500);
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

    // Check if hotel has any pending or active orders
    // Allow deletion only if all orders are 'confirmed' (completed)
    const pendingOrders = await Order.count({
      where: {
        hotelId: id,
        status: {
          $ne: 'confirmed',
        }
      }
    });

    if (pendingOrders > 0) {
      return sendError(reply, 'Cannot delete hotel with pending or active orders. Only hotels with all orders marked as "confirmed" can be deleted.', 400);
    }

    await hotel.destroy();

    logger.info(`Hotel deleted: ${id} - ${hotel.hotelName}`);
    return sendSuccess(reply, null, 'Hotel deleted successfully');
  } catch (error) {
    logger.error('Error deleting hotel:', error);
    return sendError(reply, 'Failed to delete hotel', 500);
  }
};

// Function to get active customer-specific pricing
const getActiveCustomerPricing = async (customerId, productId) => {
  try {
    const pricing = await CustomerProductPricing.findOne({
      where: {
        customerId,
        productId,
        isActive: true,
        contractStartDate: { $lte: new Date() },
        contractEndDate: { $gte: new Date() },
      },
      attributes: ['fixedPrice'],
    });

    return pricing ? pricing.fixedPrice : null;
  } catch (error) {
    logger.error('Error getting active customer pricing:', error);
    return null;
  }
};

module.exports = {
  createHotel,
  getHotels,
  getHotel,
  updateHotel,
  blockHotel,
  deleteHotel,
  getActiveCustomerPricing,
};
