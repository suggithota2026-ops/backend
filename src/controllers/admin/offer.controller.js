// Admin offer controller
const { Op } = require('sequelize');
const { sequelize } = require('../../config/db');
const Coupon = require('../../models/coupon.model');
const { sendSuccess, sendError } = require('../../utils/response');
const logger = require('../../utils/logger');

// Get all offers
const getAllOffers = async (request, reply) => {
  try {
    const { page = 1, limit = 20, searchTerm, isActive } = request.query;

    const where = {};
    
    if (searchTerm) {
      where[Op.or] = [
        { code: { [Op.iLike]: `%${searchTerm}%` } },
        { '$metadata.offerTitle$': { [Op.iLike]: `%${searchTerm}%` } },
        { '$metadata.offerDescription$': { [Op.iLike]: `%${searchTerm}%` } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows: offers, count: total } = await Coupon.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      offset,
      limit: parseInt(limit),
    });

    // Enhance offers with additional information from metadata
    const enhancedOffers = offers.map(offer => {
      const enhancedOffer = offer.toJSON();
      
      // Extract offer details from metadata
      const metadata = enhancedOffer.metadata || {};
      
      return {
        ...enhancedOffer,
        title: metadata.offerTitle || enhancedOffer.code,
        description: metadata.offerDescription || '',
        categoryIds: metadata.categoryIds || [],
        subcategoryNames: metadata.subcategoryNames || [],
        originalValidUntil: metadata.originalValidUntil || null,
      };
    });

    return sendSuccess(reply, {
      offers: enhancedOffers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    }, 'Offers retrieved successfully');
  } catch (error) {
    logger.error('Error fetching offers:', error);
    return sendError(reply, 'Failed to fetch offers', 500);
  }
};

// Get offer by ID
const getOfferById = async (request, reply) => {
  try {
    const { id } = request.params;
    
    const offer = await Coupon.findByPk(id);
    
    if (!offer) {
      return sendError(reply, 'Offer not found', 400);
    }

    const enhancedOffer = offer.toJSON();
    const metadata = enhancedOffer.metadata || {};
    
    const enhancedOfferWithDetails = {
      ...enhancedOffer,
      title: metadata.offerTitle || enhancedOffer.code,
      description: metadata.offerDescription || '',
      categoryIds: metadata.categoryIds || [],
      subcategoryNames: metadata.subcategoryNames || [],
      originalValidUntil: metadata.originalValidUntil || null,
    };

    return sendSuccess(reply, { offer: enhancedOfferWithDetails }, 'Offer retrieved successfully');
  } catch (error) {
    logger.error('Error fetching offer:', error);
    return sendError(reply, 'Failed to fetch offer', 500);
  }
};

// Update offer
const updateOffer = async (request, reply) => {
  try {
    const { id } = request.params;
    const { 
      code, 
      discountType, 
      discountValue, 
      validFrom, 
      validUntil, 
      minOrderAmount, 
      maxDiscountAmount, 
      usageLimit, 
      isActive, 
      metadata 
    } = request.body;

    const offer = await Coupon.findByPk(id);
    
    if (!offer) {
      return sendError(reply, 'Offer not found', 404);
    }

    // Update the offer
    await offer.update({
      code,
      discountType,
      discountValue,
      validFrom,
      validUntil,
      minOrderAmount,
      maxDiscountAmount,
      usageLimit,
      isActive,
      metadata: metadata || offer.metadata
    });

    return sendSuccess(reply, { offer }, 'Offer updated successfully');
  } catch (error) {
    logger.error('Error updating offer:', error);
    return sendError(reply, 'Failed to update offer', 500);
  }
};

// Delete offer
const deleteOffer = async (request, reply) => {
  try {
    const { id } = request.params;

    const offer = await Coupon.findByPk(id);
    
    if (!offer) {
      return sendError(reply, 'Offer not found', 404);
    }

    await offer.destroy();

    return sendSuccess(reply, null, 'Offer deleted successfully');
  } catch (error) {
    logger.error('Error deleting offer:', error);
    return sendError(reply, 'Failed to delete offer', 500);
  }
};

// Get all offers for admin panel (with additional analytics)
const getAdminOffers = async (request, reply) => {
  try {
    const { page = 1, limit = 20, searchTerm, isActive, sortBy = 'createdAt', sortOrder = 'DESC' } = request.query;

    const where = {};
    
    if (searchTerm) {
      where[Op.or] = [
        { code: { [Op.iLike]: `%${searchTerm}%` } },
        { '$metadata.offerTitle$': { [Op.iLike]: `%${searchTerm}%` } },
        { '$metadata.offerDescription$': { [Op.iLike]: `%${searchTerm}%` } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Define the sort order based on parameters
    let orderField = sortBy;
    if (sortBy === 'usedCount') {
      orderField = [sequelize.col('usedCount'), sortOrder];
    } else if (sortBy === 'validUntil') {
      orderField = [sequelize.col('validUntil'), sortOrder];
    } else {
      orderField = [[sortBy, sortOrder]];
    }

    const { rows: offers, count: total } = await Coupon.findAndCountAll({
      where,
      order: orderField,
      offset,
      limit: parseInt(limit),
    });

    // Enhance offers with additional information from metadata
    const enhancedOffers = offers.map(offer => {
      const enhancedOffer = offer.toJSON();
      
      // Extract offer details from metadata
      const metadata = enhancedOffer.metadata || {};
      
      return {
        ...enhancedOffer,
        title: metadata.offerTitle || enhancedOffer.code,
        description: metadata.offerDescription || '',
        categoryIds: metadata.categoryIds || [],
        subcategoryNames: metadata.subcategoryNames || [],
        originalValidUntil: metadata.originalValidUntil || null,
        // Calculate usage percentage
        usagePercentage: enhancedOffer.usageLimit && enhancedOffer.usageLimit > 0 
          ? Math.round((enhancedOffer.usedCount / enhancedOffer.usageLimit) * 100) 
          : 0,
        // Determine status based on various factors
        status: calculateOfferStatus(enhancedOffer),
      };
    });

    return sendSuccess(reply, {
      offers: enhancedOffers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    }, 'Admin offers retrieved successfully');
  } catch (error) {
    logger.error('Error fetching admin offers:', error);
    return sendError(reply, 'Failed to fetch admin offers', 500);
  }
};

// Get specific offer for admin panel
const getAdminOfferById = async (request, reply) => {
  try {
    const { id } = request.params;
    
    const offer = await Coupon.findByPk(id);
    
    if (!offer) {
      return sendError(reply, 'Offer not found', 400);
    }

    const enhancedOffer = offer.toJSON();
    const metadata = enhancedOffer.metadata || {};
    
    const enhancedOfferWithDetails = {
      ...enhancedOffer,
      title: metadata.offerTitle || enhancedOffer.code,
      description: metadata.offerDescription || '',
      categoryIds: metadata.categoryIds || [],
      subcategoryNames: metadata.subcategoryNames || [],
      originalValidUntil: metadata.originalValidUntil || null,
      usagePercentage: enhancedOffer.usageLimit && enhancedOffer.usageLimit > 0 
        ? Math.round((enhancedOffer.usedCount / enhancedOffer.usageLimit) * 100) 
        : 0,
      status: calculateOfferStatus(enhancedOffer),
      // Add analytics
      analytics: {
        totalUses: enhancedOffer.usedCount,
        remainingUses: enhancedOffer.usageLimit ? enhancedOffer.usageLimit - enhancedOffer.usedCount : 'Unlimited',
        daysRemaining: calculateDaysRemaining(enhancedOffer.validUntil),
      }
    };

    return sendSuccess(reply, { offer: enhancedOfferWithDetails }, 'Admin offer retrieved successfully');
  } catch (error) {
    logger.error('Error fetching admin offer:', error);
    return sendError(reply, 'Failed to fetch admin offer', 500);
  }
};

// Helper function to calculate offer status
const calculateOfferStatus = (offer) => {
  const now = new Date();
  
  if (!offer.isActive) {
    return 'inactive';
  }
  
  if (new Date(offer.validUntil) < now) {
    return 'expired';
  }
  
  if (offer.usageLimit && offer.usedCount >= offer.usageLimit) {
    return 'exhausted';
  }
  
  return 'active';
};

// Helper function to calculate days remaining
const calculateDaysRemaining = (validUntil) => {
  const now = new Date();
  const endDate = new Date(validUntil);
  const timeDiff = endDate.getTime() - now.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

module.exports = {
  getAllOffers,
  getOfferById,
  updateOffer,
  deleteOffer,
  getAdminOffers,
  getAdminOfferById,
  updateAdminOffer: updateOffer, // Reuse the same update function
  deleteAdminOffer: deleteOffer, // Reuse the same delete function
};