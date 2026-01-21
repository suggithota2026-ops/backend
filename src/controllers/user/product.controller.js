// User product controller (Sequelize)
const { Op } = require('sequelize');
const Product = require('../../models/product.model');
const Category = require('../../models/category.model');
const { sendSuccess, sendError } = require('../../utils/response');
const logger = require('../../utils/logger');

// Helper function to get file URL (inline version if service file has issues)
const getFileUrl = (filePath) => {
  if (!filePath) return null;
  // Use relative path for proxy
  return `/uploads/${filePath.replace(/\\/g, '/')}`;
};

// Helper function to convert image paths to full URLs
const transformProductImages = (product, request) => {
  const productData = product.toJSON ? product.toJSON() : product;
  // Get base URL from request - use headers.host if available (includes port)
  let baseUrl;
  if (request.headers?.host) {
    // headers.host already includes port (e.g., "192.168.0.45:3000")
    const protocol = request.protocol || (request.headers?.['x-forwarded-proto'] || 'http');
    baseUrl = `${protocol}://${request.headers.host}`;
  } else {
    // Fallback: construct from hostname and port
    const host = request.hostname || 'localhost';
    const port = request.socket?.localPort || 3000;
    const protocol = request.protocol || 'http';
    baseUrl = `${protocol}://${host}:${port}`;
  }

  if (productData.images && Array.isArray(productData.images)) {
    productData.images = productData.images.map(img => {
      if (!img) return img;

      if (typeof img === 'string') {
        // If it's already a full URL, return as is
        if (img.startsWith('http://') || img.startsWith('https://')) {
          return img;
        }
        // Convert relative path to full URL
        let imagePath = img;
        // If path doesn't start with /uploads/, add it using getFileUrl
        if (!imagePath.startsWith('/uploads/')) {
          imagePath = getFileUrl(imagePath);
        }
        // Ensure it starts with /
        if (!imagePath.startsWith('/')) {
          imagePath = `/${imagePath}`;
        }
        return `${baseUrl}${imagePath}`;
      }
      // If it's an object with a path property
      if (img && typeof img === 'object') {
        const path = img.path || img.url || img;
        if (typeof path === 'string') {
          if (path.startsWith('http://') || path.startsWith('https://')) {
            return path;
          }
          let imagePath = path;
          if (!imagePath.startsWith('/uploads/')) {
            imagePath = getFileUrl(imagePath);
          }
          if (!imagePath.startsWith('/')) {
            imagePath = `/${imagePath}`;
          }
          return `${baseUrl}${imagePath}`;
        }
      }
      return img;
    });
  }

  return productData;
};

const getCategories = async (request, reply) => {
  try {
    const categories = await Category.findAll({
      where: { isActive: true },
      order: [
        ['displayOrder', 'ASC'],
        ['name', 'ASC'],
      ],
    });

    return sendSuccess(reply, categories, 'Categories retrieved successfully');
  } catch (error) {
    logger.error('Error fetching categories:', error);
    return sendError(reply, 'Failed to fetch categories', 500);
  }
};

const getProducts = async (request, reply) => {
  try {
    const { category, subcategory, search } = request.query;

    const where = {
      isActive: true,
      status: 'active',
    };

    if (category) {
      where.categoryId = category;
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

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const products = await Product.findAll({
      where,
      order: [
        ['displayOrder', 'ASC'],
        ['name', 'ASC'],
      ],
    });

    // Get category names for products
    const categoryIds = [...new Set(products.map(p => p.categoryId))];
    const categoryData = await Category.findAll({
      where: { id: { [Op.in]: categoryIds } },
      attributes: ['id', 'name'],
    });
    const categoryMap = new Map(categoryData.map(c => [c.id, c.name]));

    // Transform image paths to full URLs for products
    const productsWithImages = products.map(product => {
      const p = transformProductImages(product, request);
      return {
        ...p,
        minQuantity: p.stock,
        name: p.name,
        category: {
          id: p.categoryId,
          name: categoryMap.get(p.categoryId) || null
        }
      };
    });

    return sendSuccess(reply, productsWithImages, 'Products retrieved successfully');
  } catch (error) {
    logger.error('Error fetching products:', error);
    return sendError(reply, 'Failed to fetch products', 500);
  }
};

const getProduct = async (request, reply) => {
  try {
    const { id } = request.params;
    const categoryId = parseInt(id);

    // Validate category ID
    if (isNaN(categoryId)) {
      return sendError(reply, 'Invalid category ID', 400);
    }

    // Check if category exists and is active
    const category = await Category.findByPk(categoryId, {
      attributes: ['id', 'name', 'description', 'image', 'isActive'],
    });

    if (!category) {
      logger.info(`Category not found: categoryId=${categoryId}`);
      return sendError(reply, 'Category not found', 404);
    }

    if (!category.isActive) {
      logger.info(`Category is not active: categoryId=${categoryId}, isActive=${category.isActive}`);
      return sendError(reply, 'Category is not active', 404);
    }

    // Get all products by category ID
    const products = await Product.findAll({
      where: {
        categoryId: categoryId,
        isActive: true,
        status: 'active',
      },
      order: [
        ['displayOrder', 'ASC'],
        ['name', 'ASC'],
      ],
    });

    // Transform image paths to full URLs for products
    const productsWithImages = products.map(product => transformProductImages(product, request));

    // Transform category image if it exists
    let baseUrl;
    if (request.headers?.host) {
      // headers.host already includes port (e.g., "192.168.0.45:3000")
      const protocol = request.protocol || (request.headers?.['x-forwarded-proto'] || 'http');
      baseUrl = `${protocol}://${request.headers.host}`;
    } else {
      // Fallback: construct from hostname and port
      const host = request.hostname || 'localhost';
      const port = request.socket?.localPort || 3000;
      const protocol = request.protocol || 'http';
      baseUrl = `${protocol}://${host}:${port}`;
    }
    let categoryImage = category.image;
    if (categoryImage && !categoryImage.startsWith('http://') && !categoryImage.startsWith('https://')) {
      const imagePath = categoryImage.startsWith('/uploads/') ? categoryImage : getFileUrl(categoryImage);
      categoryImage = `${baseUrl}${imagePath}`;
    }

    // Return products with category information
    const productsWithCategory = {
      category: {
        id: category.id,
        name: category.name,
        description: category.description,
        image: categoryImage,
      },
      products: productsWithImages.map(p => ({ ...p, minQuantity: p.stock })),
      count: products.length,
    };

    return sendSuccess(reply, productsWithCategory, 'Products retrieved successfully');
  } catch (error) {
    logger.error('Error fetching products by category:', error);
    return sendError(reply, 'Failed to fetch products', 500);
  }
};

const getProductsBySubcategory = async (request, reply) => {
  try {
    const { subcategoryId } = request.params;

    if (!subcategoryId) {
      return sendError(reply, 'Subcategory ID is required', 400);
    }

    // Resolve subcategory name for name-based fallback
    let subcategoryWhere = { subcategory: subcategoryId };
    const parentCategory = await Category.findOne({
      where: {
        subcategories: { [Op.contains]: [{ id: subcategoryId }] }
      }
    });

    if (parentCategory) {
      const subObj = parentCategory.subcategories.find(s => s.id === subcategoryId);
      if (subObj) {
        subcategoryWhere = {
          subcategory: { [Op.or]: [subcategoryId, subObj.name] }
        };
      }
    }

    const products = await Product.findAll({
      where: {
        ...subcategoryWhere,
        isActive: true,
        status: 'active',
      },
      order: [
        ['displayOrder', 'ASC'],
        ['name', 'ASC'],
      ],
    });

    // Get category names for products
    const categoryIds = [...new Set(products.map(p => p.categoryId))];
    const categoryData = await Category.findAll({
      where: { id: { [Op.in]: categoryIds } },
      attributes: ['id', 'name'],
    });
    const categoryMap = new Map(categoryData.map(c => [c.id, c.name]));

    // Transform image paths to full URLs for products
    const productsWithImages = products.map(product => {
      const p = transformProductImages(product, request);
      return {
        ...p,
        minQuantity: p.stock,
        name: p.name,
        category: {
          id: p.categoryId,
          name: categoryMap.get(p.categoryId) || null
        }
      };
    });

    return sendSuccess(reply, productsWithImages, 'Products retrieved successfully');
  } catch (error) {
    logger.error('Error fetching products by subcategory:', error);
    return sendError(reply, 'Failed to fetch products', 500);
  }
};

module.exports = {
  getCategories,
  getProducts,
  getProduct,
  getProductsBySubcategory,
};
