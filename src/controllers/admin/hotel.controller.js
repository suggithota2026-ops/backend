// Admin hotel controller
const { Op } = require('sequelize');
const { sequelize } = require('../../config/db');
const User = require('../../models/user.model');
const Order = require('../../models/order.model');
const { ROLES } = require('../../config/constants');
const { sendSuccess, sendError } = require('../../utils/response');
const { sendMessage } = require('../../services/otp.service');
const logger = require('../../utils/logger');

const createHotel = async (request, reply) => {
  try {
    const { mobileNumber, hotelName, address, gstNumber, creditLimit, rateType, pricePerUnit } = request.body;

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
      pricePerUnit,
      role: ROLES.HOTEL,
      isVerified: true, // Auto-verify since we are adding manually
    });

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
      where[Op.or] = [
        { hotelName: { [Op.like]: `%${search}%` } }, // Postgres use iLike if desired
        { mobileNumber: { [Op.like]: `%${search}%` } },
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows: hotels, count: total } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['otpCode', 'otpExpiresAt'] },
      order: [['createdAt', 'DESC']],
      offset,
      limit: parseInt(limit),
    });

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

    // Get order statistics
    // Group by status and sum totalAmount
    const orderStats = await Order.findAll({
      where: { hotelId: id },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalAmount']
      ],
      group: ['status'],
      raw: true,
    });

    // Remap for frontend consistency if needed, or send as is
    // The previous aggregation returned [{ _id: status, count: X, totalAmount: Y }]
    // Sequelize returns [{ status: 'pending', count: X, totalAmount: Y }]

    return sendSuccess(reply, {
      hotel,
      orderStats: orderStats.map(stat => ({
        _id: stat.status, // Preserve frontend expectation if needed
        count: parseInt(stat.count),
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

    if (updateData.gstNumber) {
      updateData.gstNumber = updateData.gstNumber.toUpperCase();
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
          [Op.ne]: 'confirmed' // Not equal to 'confirmed'
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

module.exports = {
  createHotel,
  getHotels,
  getHotel,
  updateHotel,
  blockHotel,
  deleteHotel,
};
