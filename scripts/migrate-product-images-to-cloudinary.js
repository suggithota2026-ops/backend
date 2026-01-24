// Migration script to migrate existing product images from local storage to Cloudinary
const path = require('path');
const fs = require('fs');
const { sequelize } = require('../../src/config/db');
const Product = require('../../src/models/product.model');
const cloudinaryService = require('../../src/services/cloudinary.service');
const logger = require('../../src/utils/logger');

/**
 * Migrate a single image file to Cloudinary
 */
async function migrateImageToCloudinary(localImagePath) {
  // Adjust path to account for the correct directory structure
  const relativePath = localImagePath.startsWith('/') ? localImagePath.substring(1) : localImagePath;
  const fullPath = path.join(__dirname, '../..', relativePath);
  
  // Check if file exists locally
  if (!fs.existsSync(fullPath)) {
    logger.warn(`Local image file does not exist: ${fullPath}`);
    return null;
  }

  try {
    // Read the file as buffer
    const fileBuffer = fs.readFileSync(fullPath);
    
    // Upload to Cloudinary
    const uploadResult = await cloudinaryService.uploadImage(fileBuffer, {
      folder: `${process.env.CLOUDINARY_UPLOAD_FOLDER || 'ecommerce'}/products`,
      quality: 'auto:good',
      format: 'auto'
    });
    
    logger.info(`Successfully migrated image to Cloudinary: ${localImagePath} -> ${uploadResult.url}`);
    
    // Optionally delete the local file after successful upload
    try {
      fs.unlinkSync(fullPath);
      logger.info(`Deleted local file: ${fullPath}`);
    } catch (deleteError) {
      logger.warn(`Could not delete local file: ${fullPath}`, deleteError);
    }
    
    return uploadResult.url;
  } catch (error) {
    logger.error(`Failed to migrate image to Cloudinary: ${localImagePath}`, error);
    return null;
  }
}

/**
 * Migrate all product images to Cloudinary
 */
async function migrateProductImagesToCloudinary() {
  try {
    console.log('🔍 Starting product image migration to Cloudinary...');
    
    // Get all products with images
    const products = await Product.findAll();
    
    console.log(`📦 Found ${products.length} products with images to migrate`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const product of products) {
      const productImages = product.images || [];
      
      if (!Array.isArray(productImages) || productImages.length === 0) {
        logger.info(`Skipping product ${product.id} - no images found`);
        skippedCount++;
        continue;
      }
      
      let updatedImages = [];
      let hasChanges = false;
      
      for (const image of productImages) {
        if (typeof image === 'string' && image.startsWith('/uploads/')) {
          // This is a local file path, needs migration
          console.log(`🔄 Migrating image for product ${product.id}: ${image}`);
          
          const cloudinaryUrl = await migrateImageToCloudinary(image);
          
          if (cloudinaryUrl) {
            updatedImages.push(cloudinaryUrl);
            hasChanges = true;
          } else {
            // Keep the old path if migration failed
            updatedImages.push(image);
          }
        } else if (typeof image === 'string' && image.startsWith('products/')) {
          // This is a relative path like 'products/filename.jpg', needs migration
          const relativePath = `../../uploads/${image}`; // Correct path to locate the file
          console.log(`🔄 Migrating image for product ${product.id}: ${relativePath}`);
          
          const cloudinaryUrl = await migrateImageToCloudinary(relativePath);
          
          if (cloudinaryUrl) {
            updatedImages.push(cloudinaryUrl);
            hasChanges = true;
          } else {
            // If file doesn't exist, log and potentially replace with a placeholder or remove
            console.log(`⚠️  Image file not found for product ${product.id}: ${relativePath}. Image reference will be kept but may cause 404.`);
            updatedImages.push(image);
          }
        } else if (typeof image === 'string' && (image.startsWith('http://') || image.startsWith('https://'))) {
          // Already a Cloudinary URL, keep as is
          updatedImages.push(image);
        } else {
          // Unknown format, keep as is
          updatedImages.push(image);
        }
      }
      
      if (hasChanges) {
        // Update the product with new Cloudinary URLs
        await product.update({ images: updatedImages });
        logger.info(`✅ Updated product ${product.id} with Cloudinary image URLs`);
        migratedCount++;
      } else {
        logger.info(`⏭️  No changes needed for product ${product.id}`);
        skippedCount++;
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successfully migrated: ${migratedCount} products`);
    console.log(`⏭️  Skipped/No changes: ${skippedCount} products`);
    console.log(`❌ Errors: ${errorCount} products`);
    
    console.log('🎉 Product image migration to Cloudinary completed!');
    
  } catch (error) {
    console.error('❌ Product image migration failed:', error);
    throw error;
  }
}

// Run the migration
if (require.main === module) {
  migrateProductImagesToCloudinary()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateProductImagesToCloudinary;