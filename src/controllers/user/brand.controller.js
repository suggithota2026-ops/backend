const { Op } = require('sequelize');
const Brand = require('../../models/brand.model');
const { sendSuccess, sendError } = require('../../utils/response');

const getAllBrands = async (request, reply) => {
  try {
    const brands = await Brand.findAll({
      where: { 
        isActive: true 
      },
      attributes: ['id', 'name', 'imageUrl', 'description'],
      order: [['createdAt', 'DESC']]
    });

    return sendSuccess(reply, brands, 'Brands retrieved successfully');
  } catch (error) {
    return sendError(reply, 'Failed to fetch brands', 500);
  }
};

const getBrandById = async (request, reply) => {
  try {
    const { id } = request.params;
    
    const brand = await Brand.findOne({
      where: { 
        id,
        isActive: true 
      },
      attributes: ['id', 'name', 'imageUrl', 'description']
    });

    if (!brand) {
      return sendError(reply, 'Brand not found', 404);
    }

    return sendSuccess(reply, brand, 'Brand retrieved successfully');
  } catch (error) {
    return sendError(reply, 'Failed to fetch brand', 500);
  }
};

module.exports = {
  getAllBrands,
  getBrandById
};