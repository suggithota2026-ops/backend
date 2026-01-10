/**
 * Example: Using Firebase in Backend
 * 
 * This file demonstrates how to use Firebase services in the backend
 */

const {
  getDocument,
  getDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  uploadFile,
  getFileURL,
  deleteFile,
  createCustomToken,
  verifyIdToken,
} = require('../services/firebase.service');
const logger = require('../utils/logger');

/**
 * Example: Product Operations with Firebase
 */
const productExamples = {
  // Get a single product
  async getProduct(productId) {
    try {
      const product = await getDocument('products', productId);
      if (product) {
        logger.info('Product found:', product);
        return product;
      } else {
        logger.warn('Product not found');
        return null;
      }
    } catch (error) {
      logger.error('Error getting product:', error);
      throw error;
    }
  },

  // Get all active products
  async getAllActiveProducts() {
    try {
      const products = await getDocuments('products', [
        { type: 'where', field: 'isActive', operator: '==', value: true },
        { type: 'orderBy', field: 'createdAt', direction: 'desc' },
        { type: 'limit', value: 20 },
      ]);
      logger.info(`Found ${products.length} active products`);
      return products;
    } catch (error) {
      logger.error('Error getting products:', error);
      throw error;
    }
  },

  // Create a new product
  async createProduct(productData) {
    try {
      const productId = await createDocument('products', {
        name: productData.name,
        description: productData.description,
        price: productData.price,
        category: productData.category,
        isActive: true,
      });
      logger.info('Product created with ID:', productId);
      return productId;
    } catch (error) {
      logger.error('Error creating product:', error);
      throw error;
    }
  },

  // Update product
  async updateProduct(productId, updates) {
    try {
      await updateDocument('products', productId, updates);
      logger.info('Product updated:', productId);
    } catch (error) {
      logger.error('Error updating product:', error);
      throw error;
    }
  },

  // Delete product
  async deleteProduct(productId) {
    try {
      await deleteDocument('products', productId);
      logger.info('Product deleted:', productId);
    } catch (error) {
      logger.error('Error deleting product:', error);
      throw error;
    }
  },
};

/**
 * Example: File Upload Operations
 */
const fileUploadExamples = {
  // Upload product image
  async uploadProductImage(fileBuffer, fileName, contentType) {
    try {
      const filePath = `products/${Date.now()}_${fileName}`;
      const imageUrl = await uploadFile(
        'prk-smiles.firebasestorage.app', // bucket name
        filePath,
        fileBuffer,
        {
          contentType: contentType || 'image/jpeg',
          public: true, // Make publicly accessible
          customMetadata: {
            uploadedBy: 'admin',
            uploadedAt: new Date().toISOString(),
          },
        }
      );
      logger.info('Image uploaded:', imageUrl);
      return imageUrl;
    } catch (error) {
      logger.error('Error uploading image:', error);
      throw error;
    }
  },

  // Get file URL
  async getImageURL(filePath) {
    try {
      const url = await getFileURL('prk-smiles.firebasestorage.app', filePath);
      logger.info('File URL:', url);
      return url;
    } catch (error) {
      logger.error('Error getting file URL:', error);
      throw error;
    }
  },

  // Delete file
  async deleteImage(filePath) {
    try {
      await deleteFile('prk-smiles.firebasestorage.app', filePath);
      logger.info('File deleted:', filePath);
    } catch (error) {
      logger.error('Error deleting file:', error);
      throw error;
    }
  },
};

/**
 * Example: Authentication Operations
 */
const authExamples = {
  // Create custom token for user
  async createUserToken(uid, additionalClaims = {}) {
    try {
      const customToken = await createCustomToken(uid, {
        role: additionalClaims.role || 'user',
        email: additionalClaims.email,
      });
      logger.info('Custom token created for user:', uid);
      return customToken;
    } catch (error) {
      logger.error('Error creating custom token:', error);
      throw error;
    }
  },

  // Verify ID token
  async verifyUserToken(idToken) {
    try {
      const decodedToken = await verifyIdToken(idToken);
      logger.info('Token verified for user:', decodedToken.uid);
      return decodedToken;
    } catch (error) {
      logger.error('Error verifying token:', error);
      throw error;
    }
  },
};

/**
 * Example: Complete Product Creation with Image
 */
async function createProductWithImage(productData, imageFile) {
  try {
    // 1. Upload image to Firebase Storage
    const imageUrl = await fileUploadExamples.uploadProductImage(
      imageFile.buffer,
      imageFile.originalname,
      imageFile.mimetype
    );

    // 2. Create product document with image URL
    const productId = await productExamples.createProduct({
      ...productData,
      imageUrl,
    });

    logger.info('Product created with image:', productId);
    return { productId, imageUrl };
  } catch (error) {
    logger.error('Error creating product with image:', error);
    throw error;
  }
}

module.exports = {
  productExamples,
  fileUploadExamples,
  authExamples,
  createProductWithImage,
};

// Example usage (uncomment to test):
/*
(async () => {
  try {
    // Get all active products
    const products = await productExamples.getAllActiveProducts();
    console.log('Active products:', products);

    // Create a product
    const productId = await productExamples.createProduct({
      name: 'Test Product',
      description: 'Test Description',
      price: 100,
      category: 'electronics',
    });
    console.log('Created product ID:', productId);

    // Update product
    await productExamples.updateProduct(productId, {
      price: 120,
    });

    // Get product
    const product = await productExamples.getProduct(productId);
    console.log('Product:', product);
  } catch (error) {
    console.error('Example error:', error);
  }
})();
*/

