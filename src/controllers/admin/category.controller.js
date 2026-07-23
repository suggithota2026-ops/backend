// Admin category controller
const path = require('path');
const Category = require('../../models/category.model');
const { v4: uuidv4 } = require('uuid');
const Product = require('../../models/product.model');
const { sendSuccess, sendError } = require('../../utils/response');
const { MAX_FILE_SIZE } = require('../../config/env');
const cloudinaryService = require('../../services/cloudinary.service');
const logger = require('../../utils/logger');

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

const validateImageFile = (part) => {
  if (!part.file) {
    return { isValid: false, error: 'No file provided' };
  }
  const mimeType = part.mimetype || part.type || '';
  if (!ALLOWED_IMAGE_TYPES.includes(mimeType.toLowerCase())) {
    return { isValid: false, error: `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}` };
  }
  const originalFilename = part.filename || '';
  const ext = path.extname(originalFilename).toLowerCase();
  if (ext && !ALLOWED_EXTENSIONS.includes(ext)) {
    return { isValid: false, error: `Invalid file extension. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}` };
  }
  return { isValid: true };
};

const saveFile = async (part, subDir = 'categories') => {
  const validation = validateImageFile(part);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const buffer = await part.toBuffer();
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(
      `File size (${(buffer.length / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size of ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(2)}MB`
    );
  }

  const uploadResult = await cloudinaryService.uploadImage(buffer, {
    folder: `${process.env.CLOUDINARY_UPLOAD_FOLDER || 'ecommerce'}/${subDir}`,
    quality: 'auto:good',
  });

  logger.info(`Category image uploaded to Cloudinary: ${uploadResult.publicId} (${(buffer.length / 1024).toFixed(2)}KB)`);
  return uploadResult.url;
};

const deleteCloudinaryFile = async (fileUrl) => {
  try {
    if (!fileUrl || typeof fileUrl !== 'string') return false;

    // Cloudinary URL — extract folder + public id
    if (fileUrl.includes('cloudinary.com') || fileUrl.startsWith('http')) {
      const folderMatch = fileUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+(?:\?.*)?$/);
      if (folderMatch) {
        const fullPublicId = folderMatch[1];
        const result = await cloudinaryService.deleteFile(fullPublicId);
        logger.info(`File deleted from Cloudinary: ${fullPublicId}`);
        return result.success;
      }

      const parts = fileUrl.split('/');
      const lastPart = parts[parts.length - 1];
      const publicIdFromUrl = lastPart.split('.')[0];
      const result = await cloudinaryService.deleteFile(publicIdFromUrl);
      logger.info(`File deleted from Cloudinary: ${publicIdFromUrl}`);
      return result.success;
    }

    return false;
  } catch (error) {
    logger.error('Error deleting file from Cloudinary:', error);
    return false;
  }
};

const createCategory = async (request, reply) => {
  try {
    const userId = request.user?.id || 1;
    let name, description, displayOrder, subcategories;
    let imagePath = null;

    // Parse multipart data
    const parts = request.parts();
    for await (const part of parts) {
      if (part.file) {
        imagePath = await saveFile(part, 'categories');
      } else {
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

      subcategoriesArr = names.map(subName => ({
        id: uuidv4(),
        name: subName,
      }));
    }

    const existing = await Category.findOne({ where: { name: name?.trim() } });
    if (existing) {
      return sendError(reply, 'Category with this name already exists', 400);
    }

    if (!name?.trim()) {
      return sendError(reply, 'Category name is required', 400);
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
    return sendError(reply, error.message || 'Failed to create category', 500);
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

    const category = await Category.findByPk(categoryId);

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

    const contentType = request.headers['content-type'] || '';
    const isMultipart = contentType.includes('multipart/form-data');

    if (isMultipart) {
      const parts = request.parts();
      for await (const part of parts) {
        if (part.file) {
          newImagePath = await saveFile(part, 'categories');
        } else {
          updateData[part.fieldname] = part.value;
        }
      }
    } else {
      Object.assign(updateData, request.body || {});
    }

    if (updateData.subcategories !== undefined) {
      let names = [];
      if (typeof updateData.subcategories === 'string') {
        names = updateData.subcategories.split(',').map(s => s.trim()).filter(Boolean);
      } else if (Array.isArray(updateData.subcategories)) {
        names = updateData.subcategories.map(s => typeof s === 'string' ? s.trim() : s.name).filter(Boolean);
      }

      const existingSubcategories = category.subcategories || [];

      updateData.subcategories = names.map(subName => {
        const existing = existingSubcategories.find(s => s.name === subName);
        return {
          id: existing ? existing.id : uuidv4(),
          name: subName,
        };
      });
    }

    if (updateData.name && updateData.name.trim() !== category.name) {
      const existing = await Category.findOne({ where: { name: updateData.name.trim() } });
      if (existing) {
        return sendError(reply, 'Category with this name already exists', 400);
      }
      updateData.name = updateData.name.trim();
    }

    if (newImagePath) {
      if (category.image) {
        await deleteCloudinaryFile(category.image);
      }
      updateData.image = newImagePath;
    }

    await category.update(updateData);

    return sendSuccess(reply, category, 'Category updated successfully');
  } catch (error) {
    logger.error('Error updating category:', error);
    return sendError(reply, error.message || 'Failed to update category', 500);
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

    const products = await Product.findAll({ where: { categoryId: categoryId } });

    if (products.length > 0) {
      logger.info(`Deleting category ${categoryId} with ${products.length} associated product(s) (cascade deletion)`);

      for (const product of products) {
        if (product.images && product.images.length > 0) {
          for (const imagePath of product.images) {
            await deleteCloudinaryFile(imagePath);
          }
        }
        await product.destroy();
      }

      logger.info(`Deleted ${products.length} product(s) associated with category ${categoryId}`);
    }

    if (category.image) {
      await deleteCloudinaryFile(category.image);
    }

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
