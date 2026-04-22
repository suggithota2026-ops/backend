// Admin category controller
const Category = require('../../models/category.model');
const { v4: uuidv4 } = require('uuid');
const Product = require('../../models/product.model');
const { sendSuccess, sendError } = require('../../utils/response');
const { saveFile, deleteFile } = require('../../services/fileUpload.service');
const logger = require('../../utils/logger');

const createCategory = async (request, reply) => {
  try {
    const userId = request.user?.id || 1;
    let name, description, displayOrder, subcategories;
    let imagePath = null;

    // Parse multipart data
    const parts = request.parts();
    for await (const part of parts) {
      if (part.file) {
        // Handle file upload
        imagePath = await saveFile(part, 'categories');
      } else {
        // Handle form fields
        if (part.fieldname === 'name') name = part.value;
        if (part.fieldname === 'description') description = part.value;
        if (part.fieldname === 'displayOrder') displayOrder = part.value;
        if (part.fieldname === 'subcategories') subcategories = part.value;
      }
    }

    // Parse subcategories if it's a string (from multipart)
    let subcategoriesArr = [];
    if (subcategories) {
      let names = [];
      if (typeof subcategories === 'string') {
        names = subcategories.split(',').map(s => s.trim()).filter(Boolean);
      } else if (Array.isArray(subcategories)) {
        names = subcategories.map(s => typeof s === 'string' ? s.trim() : s.name).filter(Boolean);
      }

      // Transform to object structure with unique IDs
      subcategoriesArr = names.map(name => ({
        id: uuidv4(),
        name
      }));
    }

    // Check if category already exists
    const existing = await Category.findOne({ where: { name: name?.trim() } });
    if (existing) {
      return sendError(reply, 'Category with this name already exists', 400);
    }

    const category = await Category.create({
      name: name.trim(),
      description: description?.trim(),
      image: imagePath,
      displayOrder: displayOrder || 0,
      createdById: userId,
      subcategories: subcategoriesArr,
    });

    return sendSuccess(reply, category, 'Category created successfully', 201);
  } catch (error) {
    logger.error('Error creating category:', error);
    return sendError(reply, 'Failed to create category', 500);
  }
};

const getCategories = async (request, reply) => {
  try {
    const { isActive } = request.query;

    const query = {};
    if (isActive !== undefined) {
      query.isActive = isActive === true || isActive === 'true';
    }

    const categories = await Category.findAll({
      where: query,
      order: [['displayOrder', 'ASC'], ['createdAt', 'DESC']],
    });

    const categoryIds = categories.map(c => c.id);
    const products = categoryIds.length
      ? await Product.aggregate([{ $match: { categoryId: { $in: categoryIds } } }, { $group: { _id: '$categoryId', count: { $sum: 1 } } }])
      : [];
    const countMap = new Map(products.map(p => [p._id, p.count]));

    const enriched = categories.map(c => {
      const obj = c.toJSON();
      obj.products = countMap.get(obj.id) || 0;
      return obj;
    });

    return sendSuccess(reply, enriched, 'Categories retrieved successfully');
  } catch (error) {
    logger.error('Error fetching categories:', error);
    return sendError(reply, 'Failed to fetch categories', 500);
  }
};

const getCategory = async (request, reply) => {
  try {
    const { id } = request.params;
    const categoryId = parseInt(id);

    if (isNaN(categoryId)) {
      return sendError(reply, 'Invalid category ID', 400);
    }

    const category = await Category.findByPk(categoryId, {
    });

    if (!category) {
      return sendError(reply, 'Category not found', 404);
    }

    const productsCount = await Product.count({ where: { categoryId } });
    const obj = category.toJSON();
    obj.products = productsCount;
    return sendSuccess(reply, obj, 'Category retrieved successfully');
  } catch (error) {
    logger.error('Error fetching category:', error);
    return sendError(reply, 'Failed to fetch category', 500);
  }
};

const updateCategory = async (request, reply) => {
  try {
    const { id } = request.params;
    const categoryId = parseInt(id);

    if (isNaN(categoryId)) {
      return sendError(reply, 'Invalid category ID', 400);
    }

    const updateData = {};
    let newImagePath = null;

    const category = await Category.findByPk(categoryId);
    if (!category) {
      return sendError(reply, 'Category not found', 404);
    }

    // Check if request is multipart/form-data or JSON
    const contentType = request.headers['content-type'] || '';
    const isMultipart = contentType.includes('multipart/form-data');

    if (isMultipart) {
      // Parse multipart data
      const parts = request.parts();
      for await (const part of parts) {
        if (part.file) {
          // Handle file upload
          // Delete old image
          if (category.image) {
            deleteFile(category.image);
          }
          newImagePath = await saveFile(part, 'categories');
        } else {
          // Handle form fields
          updateData[part.fieldname] = part.value;
        }
      }
    } else {
      // Handle JSON request body
      Object.assign(updateData, request.body || {});
    }

    // Parse subcategories if present
    if (updateData.subcategories !== undefined) {
      let names = [];
      if (typeof updateData.subcategories === 'string') {
        names = updateData.subcategories.split(',').map(s => s.trim()).filter(Boolean);
      } else if (Array.isArray(updateData.subcategories)) {
        // Handle both string array and object array
        names = updateData.subcategories.map(s => typeof s === 'string' ? s.trim() : s.name).filter(Boolean);
      }

      const existingSubcategories = category.subcategories || [];

      // Map names to existing IDs if they exist, otherwise generate new IDs
      updateData.subcategories = names.map(name => {
        const existing = existingSubcategories.find(s => s.name === name);
        return {
          id: existing ? existing.id : uuidv4(),
          name
        };
      });
    }

    // Check name uniqueness if name is being updated
    if (updateData.name && updateData.name.trim() !== category.name) {
      const existing = await Category.findOne({ where: { name: updateData.name.trim() } });
      if (existing) {
        return sendError(reply, 'Category with this name already exists', 400);
      }
      updateData.name = updateData.name.trim();
    }

    // Handle image upload
    if (newImagePath) {
      updateData.image = newImagePath;
    }

    await category.update(updateData);

    return sendSuccess(reply, category, 'Category updated successfully');
  } catch (error) {
    logger.error('Error updating category:', error);
    return sendError(reply, 'Failed to update category', 500);
  }
};

const deleteCategory = async (request, reply) => {
  try {
    const { id } = request.params;
    const categoryId = parseInt(id);

    if (isNaN(categoryId)) {
      return sendError(reply, 'Invalid category ID', 400);
    }

    const category = await Category.findByPk(categoryId);

    if (!category) {
      return sendError(reply, 'Category not found', 404);
    }

    // Cascade deletion: Delete all associated products first
    const products = await Product.findAll({ where: { categoryId: categoryId } });

    if (products.length > 0) {
      logger.info(`Deleting category ${categoryId} with ${products.length} associated product(s) (cascade deletion)`);

      // Delete all product images and then the products
      for (const product of products) {
        // Delete associated product images
        if (product.images && product.images.length > 0) {
          for (const imagePath of product.images) {
            deleteFile(imagePath);
          }
        }
        // Delete the product
        await product.destroy();
      }

      logger.info(`Deleted ${products.length} product(s) associated with category ${categoryId}`);
    }

    // Delete category image
    if (category.image) {
      deleteFile(category.image);
    }

    // Delete the category
    await category.destroy();

    return sendSuccess(reply, null, 'Category deleted successfully');
  } catch (error) {
    logger.error('Error deleting category:', error);
    return sendError(reply, 'Failed to delete category', 500);
  }
};

module.exports = {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
};
