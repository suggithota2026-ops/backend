// Brand controller
const { Op } = require('sequelize');
const Brand = require('../../models/brand.model');
const User = require('../../models/user.model');
const Admin = require('../../models/admin.model');
const { sendSuccess, sendError } = require('../../utils/response');
const logger = require('../../utils/logger');

// Helper function to get creator info based on user type
const getCreatorInfo = async (createdBy, userType) => {
  if (!createdBy) return null;
  
  try {
    let creator = null;
    if (userType === 'admin') {
      creator = await Admin.findByPk(createdBy, {
        attributes: ['id', 'name', 'mobileNumber']
      });
      if (creator) {
        return {
          id: creator.id,
          name: creator.name,
          mobile: creator.mobileNumber
        };
      }
    } else {
      creator = await User.findByPk(createdBy, {
        attributes: ['id', 'name', 'mobile']
      });
      return creator ? creator.toJSON() : null;
    }
    return null;
  } catch (error) {
    logger.error('Error fetching creator info:', error);
    return null;
  }
};

const getAllBrands = async (request, reply) => {
  try {
    const { isActive } = request.query;
    
    const whereClause = {};
    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    const brands = await Brand.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });
    
    // Get creator info for each brand
    const brandsWithCreators = [];
    for (const brand of brands) {
      const b = brand.toJSON();
      // Use admin type since brands are created by admins
      const creator = await getCreatorInfo(b.createdBy, 'admin');
      brandsWithCreators.push({
        ...b,
        creator
      });
    }

    return sendSuccess(reply, brandsWithCreators, 'Brands retrieved successfully');
  } catch (error) {
    logger.error('Error fetching brands:', error);
    return sendError(reply, 'Failed to fetch brands', 500);
  }
};

const getBrandById = async (request, reply) => {
  try {
    const { id } = request.params;
    
    const brand = await Brand.findByPk(id);

    if (!brand) {
      return sendError(reply, 'Brand not found', 404);
    }
    
    // Get creator info
    const creator = await getCreatorInfo(brand.createdBy, 'admin');
    
    const brandWithCreator = {
      ...brand.toJSON(),
      creator
    };

    return sendSuccess(reply, brandWithCreator, 'Brand retrieved successfully');
  } catch (error) {
    logger.error('Error fetching brand:', error);
    return sendError(reply, 'Failed to fetch brand', 500);
  }
};

const createBrand = async (request, reply) => {
  try {
    const { name, imageUrl, description } = request.body;
    const userId = request.user?.id;
    const userType = request.user?.type || 'admin'; // Default to admin for admin routes

    // Check if brand name already exists
    const existingBrand = await Brand.findOne({ where: { name } });
    if (existingBrand) {
      return sendError(reply, 'Brand name already exists', 400);
    }

    const brand = await Brand.create({
      name,
      imageUrl,
      description,
      createdBy: userId
    });
    
    // Get creator info
    const creator = await getCreatorInfo(userId, userType);
    
    const brandWithCreator = {
      ...brand.toJSON(),
      creator
    };

    logger.info(`Brand created: ${name} by user ${userId}`);
    return sendSuccess(reply, brandWithCreator, 'Brand created successfully', 201);
  } catch (error) {
    logger.error('Error creating brand:', error);
    return sendError(reply, 'Failed to create brand', 500);
  }
};

const updateBrand = async (request, reply) => {
  try {
    const { id } = request.params;
    const { name, imageUrl, description, isActive } = request.body;

    const brand = await Brand.findByPk(id);
    if (!brand) {
      return sendError(reply, 'Brand not found', 404);
    }

    // Check if new name already exists (excluding current brand)
    if (name && name !== brand.name) {
      const existingBrand = await Brand.findOne({ 
        where: { 
          name,
          id: { [Op.ne]: id }
        } 
      });
      if (existingBrand) {
        return sendError(reply, 'Brand name already exists', 400);
      }
    }

    await brand.update({
      name: name || brand.name,
      imageUrl: imageUrl || brand.imageUrl,
      description: description !== undefined ? description : brand.description,
      isActive: isActive !== undefined ? isActive : brand.isActive
    });
    
    // Get creator info
    const creator = await getCreatorInfo(brand.createdBy, 'admin');
    
    const updatedBrand = {
      ...brand.toJSON(),
      creator
    };

    logger.info(`Brand updated: ${brand.name} by user ${request.user?.id}`);
    return sendSuccess(reply, updatedBrand, 'Brand updated successfully');
  } catch (error) {
    logger.error('Error updating brand:', error);
    return sendError(reply, 'Failed to update brand', 500);
  }
};

const deleteBrand = async (request, reply) => {
  try {
    const { id } = request.params;

    const brand = await Brand.findByPk(id);
    if (!brand) {
      return sendError(reply, 'Brand not found', 404);
    }

    await brand.destroy();

    logger.info(`Brand deleted: ${brand.name} by user ${request.user?.id}`);
    return sendSuccess(reply, null, 'Brand deleted successfully');
  } catch (error) {
    logger.error('Error deleting brand:', error);
    return sendError(reply, 'Failed to delete brand', 500);
  }
};

const toggleBrandStatus = async (request, reply) => {
  try {
    const { id } = request.params;
    
    const brand = await Brand.findByPk(id);
    if (!brand) {
      return sendError(reply, 'Brand not found', 404);
    }

    await brand.update({
      isActive: !brand.isActive
    });
    
    // Get creator info
    const creator = await getCreatorInfo(brand.createdBy, 'admin');
    
    const updatedBrand = {
      ...brand.toJSON(),
      creator
    };

    const statusMessage = brand.isActive ? 'activated' : 'deactivated';
    logger.info(`Brand ${statusMessage}: ${brand.name} by user ${request.user?.id}`);
    return sendSuccess(reply, updatedBrand, `Brand ${statusMessage} successfully`);
  } catch (error) {
    logger.error('Error toggling brand status:', error);
    return sendError(reply, 'Failed to toggle brand status', 500);
  }
};

module.exports = {
  getAllBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
  toggleBrandStatus
};