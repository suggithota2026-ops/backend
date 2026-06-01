// Admin offer controller
const Coupon = require('../../models/coupon.model');
const { sendSuccess, sendError } = require('../../utils/response');
const logger = require('../../utils/logger');

// Get all offers
const getAllOffers = async (request, reply) => {
  try {
    const { page = 1, limit = 20, searchTerm, isActive } = request.query;

    const where = {};
    
    if (searchTerm) {
      const re = new RegExp(String(searchTerm).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      where.$or = [
        { code: re },
        { 'metadata.offerTitle': re },
        { 'metadata.offerDescription': re },
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

const normalizeDiscountType = (discountType) => {
  if (discountType === 'fixed') return 'flat';
  return discountType;
};

const enhanceOfferResponse = (offerDoc) => {
  const enhancedOffer = offerDoc.toJSON ? offerDoc.toJSON() : offerDoc;
  const metadata = enhancedOffer.metadata || {};

  return {
    ...enhancedOffer,
    discountType: enhancedOffer.discountType === 'flat' ? 'fixed' : enhancedOffer.discountType,
    title: metadata.offerTitle || enhancedOffer.code,
    description: metadata.offerDescription || '',
    categoryIds: metadata.categoryIds || [],
    subcategoryNames: metadata.subcategoryNames || [],
    originalValidUntil: metadata.originalValidUntil || null,
  };
};

// Create offer
const createOffer = async (request, reply) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      validFrom,
      validUntil,
      minOrderAmount,
      maxDiscountAmount,
      usageLimit,
      isActive = true,
      metadata,
      hotelIds,
      title,
      description,
    } = request.body;

    if (!code || !discountType || discountValue === undefined || !validUntil) {
      return sendError(reply, 'Code, discount type, discount value, and valid until are required', 400);
    }

    const normalizedDiscountType = normalizeDiscountType(discountType);
    if (!['percentage', 'flat'].includes(normalizedDiscountType)) {
      return sendError(reply, 'Invalid discount type', 400);
    }

    const normalizedCode = String(code).trim().toUpperCase();
    const existingOffer = await Coupon.findOne({ where: { code: normalizedCode } });
    if (existingOffer) {
      return sendError(reply, 'Offer code already exists', 400);
    }

    const offerMetadata = {
      ...(metadata || {}),
      offerTitle: metadata?.offerTitle || title || normalizedCode,
      offerDescription: metadata?.offerDescription || description || '',
      hotelIds: hotelIds || metadata?.hotelIds || [],
    };

    const offer = await Coupon.create({
      code: normalizedCode,
      discountType: normalizedDiscountType,
      discountValue,
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validUntil: new Date(validUntil),
      minOrderAmount: minOrderAmount || 0,
      maxDiscountAmount: maxDiscountAmount ?? null,
      usageLimit: usageLimit ?? null,
      isActive,
      usedCount: 0,
      createdBy: request.user?.id || null,
      metadata: offerMetadata,
    });

    return sendSuccess(reply, { offer: enhanceOfferResponse(offer) }, 'Offer created successfully', 201);
  } catch (error) {
    logger.error('Error creating offer:', error);
    return sendError(reply, 'Failed to create offer', 500);
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
      metadata,
      hotelIds,
    } = request.body;

    const offer = await Coupon.findByPk(id);

    if (!offer) {
      return sendError(reply, 'Offer not found', 404);
    }

    const normalizedCode = code ? String(code).trim().toUpperCase() : offer.code;
    if (normalizedCode !== offer.code) {
      const existingOffer = await Coupon.findOne({ where: { code: normalizedCode } });
      if (existingOffer) {
        return sendError(reply, 'Offer code already exists', 400);
      }
    }

    await offer.update({
      code: normalizedCode,
      discountType: discountType ? normalizeDiscountType(discountType) : offer.discountType,
      discountValue,
      validFrom,
      validUntil,
      minOrderAmount,
      maxDiscountAmount,
      usageLimit,
      isActive,
      metadata: {
        ...(metadata || offer.metadata || {}),
        hotelIds: hotelIds || metadata?.hotelIds || offer.metadata?.hotelIds || [],
      },
    });

    return sendSuccess(reply, { offer: enhanceOfferResponse(offer) }, 'Offer updated successfully');
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
      const re = new RegExp(String(searchTerm).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      where.$or = [
        { code: re },
        { 'metadata.offerTitle': re },
        { 'metadata.offerDescription': re },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const orderField = [[sortBy, String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC']];

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
  createOffer,
  updateOffer,
  deleteOffer,
  getAdminOffers,
  getAdminOfferById,
  updateAdminOffer: updateOffer,
  deleteAdminOffer: deleteOffer,
  createAdminOffer: createOffer,
};