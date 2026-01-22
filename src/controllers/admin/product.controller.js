// Admin product controller
const { Op } = require('sequelize');
const Product = require('../../models/product.model');
const Category = require('../../models/category.model');
const { sendSuccess, sendError, sendValidationError } = require('../../utils/response');
const { updateProductSchema } = require('../../validations/product.validation');
const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { UPLOAD_DIR, MAX_FILE_SIZE } = require('../../config/env');

// Inline file upload functions (workaround for file service issues)
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

const ensureUploadDir = (subDir = '') => {
  const uploadPath = path.join(__dirname, '../../../', UPLOAD_DIR, subDir);
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }
  return uploadPath;
};

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
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { isValid: false, error: `Invalid file extension. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}` };
  }
  return { isValid: true };
};

const generateUniqueFileName = (originalFilename) => {
  const ext = path.extname(originalFilename);
  const baseName = path.basename(originalFilename, ext);
  const randomHash = crypto.randomBytes(8).toString('hex');
  const timestamp = Date.now();
  const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${timestamp}_${randomHash}_${sanitizedBaseName}${ext}`;
};

const saveFile = async (part, subDir = '') => {
  try {
    const validation = validateImageFile(part);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
    const uploadPath = ensureUploadDir(subDir);
    const originalFilename = part.filename || 'image';
    const fileName = generateUniqueFileName(originalFilename);
    const filePath = path.join(uploadPath, fileName);

    if (fs.existsSync(filePath)) {
      const randomHash = crypto.randomBytes(8).toString('hex');
      const ext = path.extname(fileName);
      const baseName = path.basename(fileName, ext);
      const newFileName = `${baseName}_${randomHash}${ext}`;
      const newFilePath = path.join(uploadPath, newFileName);
      if (fs.existsSync(newFilePath)) {
        throw new Error('Unable to generate unique filename. Please try again.');
      }
      const relativePath = path.join(subDir, newFileName).replace(/\\/g, '/');
      const buffer = await part.toBuffer();
      if (buffer.length > MAX_FILE_SIZE) {
        throw new Error(`File size (${(buffer.length / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size of ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(2)}MB`);
      }
      fs.writeFileSync(newFilePath, buffer);
      logger.info(`File saved: ${relativePath} (${(buffer.length / 1024).toFixed(2)}KB)`);
      return relativePath;
    }

    const buffer = await part.toBuffer();
    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error(`File size (${(buffer.length / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size of ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(2)}MB`);
    }
    fs.writeFileSync(filePath, buffer);
    const relativePath = path.join(subDir, fileName).replace(/\\/g, '/');
    logger.info(`File saved: ${relativePath} (${(buffer.length / 1024).toFixed(2)}KB)`);
    return relativePath;
  } catch (error) {
    logger.error('Error saving file:', error);
    throw error;
  }
};

const deleteFile = (filePath) => {
  try {
    const fullPath = path.join(__dirname, '../../../', UPLOAD_DIR, filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      logger.info(`File deleted: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error('Error deleting file:', error);
    return false;
  }
};

const getFileUrl = (filePath) => {
  if (!filePath) return null;
  return `/uploads/${filePath.replace(/\\/g, '/')}`;
};

const transformProductImages = (product, request) => {
  const p = product.toJSON();

  // Transform image paths to full URLs
  if (p.images && Array.isArray(p.images)) {
    p.images = p.images.map(img => {
      if (typeof img === 'string' && img) {
        // If it's already a full URL, return as is
        if (img.startsWith('http://') || img.startsWith('https://')) {
          return img;
        }
        // The frontend's getImageUrl function expects paths like 'products/filename.jpg'
        // which it will convert to '/uploads/products/filename.jpg'
        // So we just need to return the path as stored in DB: 'products/filename.jpg'
        return img;
      }
      return img;
    });
  }

  return p;
};

const createProduct = async (request, reply) => {
  try {
    const userId = request.user?.id || 1;
    const productData = {};
    const imagePaths = [];

    // Parse multipart data
    const parts = request.parts();
    for await (const part of parts) {
      if (part.file) {
        // Handle file upload with validation
        try {
          const imagePath = await saveFile(part, 'products');
          imagePaths.push(imagePath);
        } catch (error) {
          logger.error('Error uploading image:', error);
          return sendError(reply, error.message || 'Failed to upload image', 400);
        }
      } else {
        // Handle form fields
        if (part.fieldname === 'subcategory') {
          productData.subcategory = part.value;
        } else {
          productData[part.fieldname] = part.value;
        }
      }
    }

    // Verify category exists - ensure categoryId is a valid integer
    const categoryId = parseInt(productData.category);
    if (isNaN(categoryId)) {
      return sendError(reply, 'Invalid category ID. Must be a number.', 400);
    }

    const category = await Category.findByPk(categoryId);
    if (!category) {
      return sendError(reply, 'Category not found', 404);
    }

    // Validate subcategory if provided
    if (productData.subcategory && productData.subcategory.trim()) {
      const subcategoryValue = productData.subcategory.trim();
      const categorySubcategories = category.subcategories || [];

      // Check if subcategory exists by ID (new way) or by Name (legacy migration)
      let subcategory = categorySubcategories.find(s => s.id === subcategoryValue || s.name === subcategoryValue);

      if (categorySubcategories.length > 0 && !subcategory) {
        return sendError(reply, `Subcategory "${subcategoryValue}" does not exist in category "${category.name}"`, 400);
      }

      // Store the ID if found, otherwise store as is (should be ID)
      productData.subcategory = subcategory ? subcategory.id : subcategoryValue;
    } else {
      // Set to null if empty string
      productData.subcategory = null;
    }

    // Handle pricingType - default to 'fixed' if not provided
    if (!productData.pricingType) {
      productData.pricingType = 'fixed';
    } else if (typeof productData.pricingType === 'string') {
      productData.pricingType = productData.pricingType.toLowerCase();
      // Validate pricing type
      if (!['fixed', 'daily', 'weekly'].includes(productData.pricingType)) {
        return sendError(reply, 'Invalid pricing type. Must be: fixed, daily, or weekly', 400);
      }
    }

    // Convert price and stock to numbers
    if (productData.price) productData.price = parseFloat(productData.price);
    if (productData.stock) productData.stock = parseFloat(productData.stock);
    if (productData.minStockLevel) productData.minStockLevel = parseFloat(productData.minStockLevel);
    if (productData.displayOrder) productData.displayOrder = parseInt(productData.displayOrder);
    if (productData.isActive !== undefined) productData.isActive = productData.isActive === 'true' || productData.isActive === true;

    const product = await Product.create({
      ...productData,
      categoryId: categoryId, // Use parsed integer
      images: imagePaths,
      createdById: parseInt(userId), // Ensure userId is integer
    });

    // Get category name for response
    const productWithCategory = {
      ...product.toJSON(),
      category: { name: category.name },
    };

    return sendSuccess(reply, productWithCategory, 'Product created successfully', 201);
  } catch (error) {
    logger.error('Error creating product:', error);
    return sendError(reply, 'Failed to create product', 500);
  }
};

const getProducts = async (request, reply) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      subcategory,
      status,
      isActive,
      search,
    } = request.query;

    const where = {};
    if (category) {
      const categoryId = parseInt(category);
      if (!isNaN(categoryId)) {
        where.categoryId = categoryId;
      }
    }

    if (subcategory) {
      // Find the subcategory name if a UUID is provided
      const parentCategory = await Category.findOne({
        where: {
          subcategories: { [Op.contains]: [{ id: subcategory }] }
        }
      });

      if (parentCategory) {
        const subObj = parentCategory.subcategories.find(s => s.id === subcategory);
        if (subObj) {
          where.subcategory = { [Op.or]: [subcategory, subObj.name] };
        } else {
          where.subcategory = subcategory;
        }
      } else {
        where.subcategory = subcategory;
      }
    }
    if (status) where.status = status;
    if (isActive !== undefined) where.isActive = isActive === true || isActive === 'true';
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [products, total] = await Promise.all([
      Product.findAll({
        where,
        order: [['displayOrder', 'ASC'], ['createdAt', 'DESC']],
        offset,
        limit: parseInt(limit),
      }),
      Product.count({ where }),
    ]);

    // Get category names for products
    const categoryIds = [...new Set(products.map(p => p.categoryId))].filter(id => id != null);
    let categoryMap = new Map();

    if (categoryIds.length > 0) {
      const categories = await Category.findAll({
        where: { id: { [Op.in]: categoryIds } },
        attributes: ['id', 'name'],
      });
      categoryMap = new Map(categories.map(c => [c.id, c.name]));
    }

    const productsWithCategory = products.map(product => {
      const p = transformProductImages(product, request);

      return {
        ...p,
        minQuantity: p.stock,
        category: {
          id: p.categoryId,
          name: categoryMap.get(p.categoryId) || null
        },
      };
    });

    return sendSuccess(reply, {
      products: productsWithCategory,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    }, 'Products retrieved successfully');
  } catch (error) {
    logger.error('Error fetching products:', error);
    return sendError(reply, 'Failed to fetch products', 500);
  }
};

const getProduct = async (request, reply) => {
  try {
    const { id } = request.params;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return sendError(reply, 'Invalid product ID', 400);
    }

    const product = await Product.findByPk(id);

    if (!product) {
      return sendError(reply, 'Product not found', 404);
    }

    // Get category name
    const category = await Category.findByPk(product.categoryId, {
      attributes: ['name'],
    });

    const productData = product.toJSON();

    // Transform image paths to full URLs
    if (productData.images && Array.isArray(productData.images)) {
      productData.images = productData.images.map(img => {
        if (typeof img === 'string' && img) {
          // If it's already a full URL, return as is
          if (img.startsWith('http://') || img.startsWith('https://')) {
            return img;
          }
          // Convert relative path to URL path
          const imagePath = img.startsWith('/uploads/') ? img : `/uploads/${img.replace(/\\/g, '/')}`;
          return imagePath;
        }
        return img;
      });
    }

    const productWithCategory = {
      ...productData,
      minQuantity: productData.stock,
      category: category ? { name: category.name } : null,
    };

    return sendSuccess(reply, productWithCategory, 'Product retrieved successfully');
  } catch (error) {
    logger.error('Error fetching product:', error);
    return sendError(reply, 'Failed to fetch product', 500);
  }
};

const updateProduct = async (request, reply) => {
  try {
    const { id } = request.params;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return sendError(reply, 'Invalid product ID', 400);
    }

    const updateData = {};
    const newImagePaths = [];

    const product = await Product.findByPk(id);
    if (!product) {
      return sendError(reply, 'Product not found', 404);
    }

    // Check if request is multipart/form-data or JSON
    const contentType = request.headers['content-type'] || '';
    const isMultipart = contentType.includes('multipart/form-data');

    if (isMultipart) {
      // Parse multipart data
      const parts = request.parts();
      for await (const part of parts) {
        if (part.file) {
          // Handle file upload with validation
          try {
            const imagePath = await saveFile(part, 'products');
            newImagePaths.push(imagePath);
          } catch (error) {
            logger.error('Error uploading image:', error);
            return sendError(reply, error.message || 'Failed to upload image', 400);
          }
        } else {
          // Handle form fields
          if (part.fieldname === 'subcategory') {
            updateData.subcategory = part.value;
          } else {
            updateData[part.fieldname] = part.value;
          }
        }
      }
    } else {
      // Handle JSON request body
      Object.assign(updateData, request.body || {});
    }

    // Log what we received for debugging
    logger.info('Update request received:', {
      contentType,
      isMultipart,
      updateDataKeys: Object.keys(updateData),
      updateData
    });

    // Validate the parsed data (only validate if there's data to validate)
    if (Object.keys(updateData).length > 0) {
      // Pre-process data: Convert string numbers to actual numbers for validation
      if (updateData.price && typeof updateData.price === 'string') {
        updateData.price = parseFloat(updateData.price);
      }
      if (updateData.stock && typeof updateData.stock === 'string') {
        updateData.stock = parseFloat(updateData.stock);
      }
      if (updateData.minStockLevel && typeof updateData.minStockLevel === 'string') {
        updateData.minStockLevel = parseFloat(updateData.minStockLevel);
      }
      if (updateData.displayOrder && typeof updateData.displayOrder === 'string') {
        updateData.displayOrder = parseInt(updateData.displayOrder);
      }
      if (updateData.isActive !== undefined && typeof updateData.isActive === 'string') {
        updateData.isActive = updateData.isActive === 'true' || updateData.isActive === '1';
      }
      // Normalize status to lowercase (validation expects 'active', 'inactive', 'out_of_stock')
      if (updateData.status && typeof updateData.status === 'string') {
        updateData.status = updateData.status.toLowerCase();
      }
      // Normalize pricingType to lowercase
      if (updateData.pricingType && typeof updateData.pricingType === 'string') {
        updateData.pricingType = updateData.pricingType.toLowerCase();
        // Validate pricing type
        if (!['fixed', 'daily', 'weekly'].includes(updateData.pricingType)) {
          return sendError(reply, 'Invalid pricing type. Must be: fixed, daily, or weekly', 400);
        }
      }

      const { error, value } = updateProductSchema.validate(updateData, {
        allowUnknown: true,  // Allow unknown fields (like id, categoryId, etc.)
        stripUnknown: true   // Strip unknown fields
      });
      if (error) {
        logger.error('Validation error:', error.details);
        logger.error('Update data that failed validation:', updateData);
        return sendValidationError(reply, error.details);
      }
      // Use validated value (with unknown fields stripped)
      Object.assign(updateData, value);
    }

    // Handle new image uploads - replace existing images if new ones are uploaded
    if (newImagePaths.length > 0) {
      // Delete old images from filesystem
      const existingImages = product.images || [];
      if (Array.isArray(existingImages) && existingImages.length > 0) {
        existingImages.forEach(oldImagePath => {
          if (oldImagePath && typeof oldImagePath === 'string') {
            deleteFile(oldImagePath);
          }
        });
      }
      // Replace with new images
      updateData.images = newImagePaths;
    }

    // Update category if provided
    let categoryToCheck = null;
    if (updateData.category) {
      const categoryId = parseInt(updateData.category);
      if (isNaN(categoryId)) {
        return sendError(reply, 'Invalid category ID. Must be a number.', 400);
      }
      categoryToCheck = await Category.findByPk(categoryId);
      if (!categoryToCheck) {
        return sendError(reply, 'Category not found', 404);
      }
      updateData.categoryId = categoryId;
      delete updateData.category;
    } else {
      // Use existing category for subcategory validation if category is not being updated
      categoryToCheck = await Category.findByPk(product.categoryId);
    }

    // Validate subcategory if provided
    if (updateData.subcategory !== undefined) {
      if (updateData.subcategory && updateData.subcategory.trim()) {
        const subcategoryValue = updateData.subcategory.trim();

        if (!categoryToCheck) {
          return sendError(reply, 'Category not found for subcategory validation', 404);
        }

        const categorySubcategories = categoryToCheck.subcategories || [];

        // Check if subcategory exists by ID (new way) or by Name (legacy migration)
        let subcategory = categorySubcategories.find(s => s.id === subcategoryValue || s.name === subcategoryValue);

        if (categorySubcategories.length > 0 && !subcategory) {
          return sendError(reply, `Subcategory "${subcategoryValue}" does not exist in category "${categoryToCheck.name}"`, 400);
        }

        // Store the ID if found, otherwise keep as is (should be ID)
        updateData.subcategory = subcategory ? subcategory.id : subcategoryValue;
      } else {
        // Set to null if empty string
        updateData.subcategory = null;
      }
    }

    // Convert numeric fields
    if (updateData.price) updateData.price = parseFloat(updateData.price);
    if (updateData.stock) updateData.stock = parseFloat(updateData.stock);
    if (updateData.minStockLevel) updateData.minStockLevel = parseFloat(updateData.minStockLevel);
    if (updateData.displayOrder) updateData.displayOrder = parseInt(updateData.displayOrder);
    if (updateData.isActive !== undefined) updateData.isActive = updateData.isActive === 'true' || updateData.isActive === true;

    await product.update(updateData);

    // Reload product to get updated data
    await product.reload();

    // Get category name for response
    const category = await Category.findByPk(product.categoryId, {
      attributes: ['name'],
    });

    // Transform image paths using shared function
    const productData = transformProductImages(product, request);

    const productWithCategory = {
      ...productData,
      category: category ? { name: category.name } : null,
    };

    return sendSuccess(reply, productWithCategory, 'Product updated successfully');
  } catch (error) {
    logger.error('Error updating product:', error);
    return sendError(reply, 'Failed to update product', 500);
  }
};

const deleteProduct = async (request, reply) => {
  try {
    const { id } = request.params;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return sendError(reply, 'Invalid product ID', 400);
    }

    const product = await Product.findByPk(id);

    if (!product) {
      return sendError(reply, 'Product not found', 404);
    }

    // Delete associated images
    if (product.images && product.images.length > 0) {
      for (const imagePath of product.images) {
        deleteFile(imagePath);
      }
    }

    await product.destroy();

    return sendSuccess(reply, null, 'Product deleted successfully');
  } catch (error) {
    logger.error('Error deleting product:', error);
    return sendError(reply, 'Failed to delete product', 500);
  }
};

const updateStock = async (request, reply) => {
  try {
    const { id } = request.params;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return sendError(reply, 'Invalid product ID', 400);
    }

    const { stock } = request.body;

    const product = await Product.findByPk(id);
    if (!product) {
      return sendError(reply, 'Product not found', 404);
    }

    const updateData = { stock: parseFloat(stock) };

    // Removed legacy logic that set status to out_of_stock if stock <= minStockLevel
    // Since stock is now Minimum Order Quantity, a low value is valid and shouldn't disable the product.

    await product.update(updateData);

    return sendSuccess(reply, product, 'Stock updated successfully');
  } catch (error) {
    logger.error('Error updating stock:', error);
    return sendError(reply, 'Failed to update stock', 500);
  }
};

const getProductsBySubcategory = async (request, reply) => {
  try {
    const { subcategoryId } = request.params;
    const { page = 1, limit = 20 } = request.query;

    if (!subcategoryId) {
      return sendError(reply, 'Subcategory ID is required', 400);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Resolve subcategory name for name-based fallback
    let subcategoryCondition = { subcategory: subcategoryId };
    const parentCategory = await Category.findOne({
      where: {
        subcategories: { [Op.contains]: [{ id: subcategoryId }] }
      }
    });

    if (parentCategory) {
      const subObj = parentCategory.subcategories.find(s => s.id === subcategoryId);
      if (subObj) {
        subcategoryCondition = {
          subcategory: { [Op.or]: [subcategoryId, subObj.name] }
        };
      }
    }

    const [products, total] = await Promise.all([
      Product.findAll({
        where: subcategoryCondition,
        order: [['displayOrder', 'ASC'], ['createdAt', 'DESC']],
        offset,
        limit: parseInt(limit),
      }),
      Product.count({ where: subcategoryCondition }),
    ]);

    // Get category names for products
    const categoryIds = [...new Set(products.map(p => p.categoryId))].filter(id => id != null);
    let categoryMap = new Map();

    if (categoryIds.length > 0) {
      const categories = await Category.findAll({
        where: { id: { [Op.in]: categoryIds } },
        attributes: ['id', 'name'],
      });
      categoryMap = new Map(categories.map(c => [c.id, c.name]));
    }

    const productsWithCategory = products.map(product => {
      const p = transformProductImages(product, request);

      return {
        ...p,
        category: {
          id: p.categoryId,
          name: categoryMap.get(p.categoryId) || null
        },
      };
    });

    return sendSuccess(reply, {
      products: productsWithCategory,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    }, 'Products retrieved successfully');
  } catch (error) {
    logger.error('Error fetching products by subcategory:', error);
    return sendError(reply, 'Failed to fetch products', 500);
  }
};

const updatePrice = async (request, reply) => {
  try {
    const { id } = request.params;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return sendError(reply, 'Invalid product ID', 400);
    }

    const { price } = request.body;

    const product = await Product.findByPk(id);
    if (!product) {
      return sendError(reply, 'Product not found', 404);
    }

    const updateData = { price: parseFloat(price) };

    await product.update(updateData);

    return sendSuccess(reply, product, 'Price updated successfully');
  } catch (error) {
    logger.error('Error updating price:', error);
    return sendError(reply, 'Failed to update price', 500);
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  getProductsBySubcategory,
  updatePrice,
};
