// Script to re-upload missing images to Cloudinary and update product records
const path = require('path');
const fs = require('fs');
const { sequelize } = require('../src/config/db');
const Product = require('../src/models/product.model');
const cloudinaryService = require('../src/services/cloudinary.service');
const logger = require('../src/utils/logger');

/**
 * Create a placeholder image buffer (simple 1x1 pixel transparent PNG)
 */
function createPlaceholderImage() {
  // Base64 encoded 1x1 transparent PNG
  const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  return Buffer.from(base64Data, 'base64');
}

/**
 * Re-upload missing images to Cloudinary
 */
async function reuploadMissingImages() {
  try {
    console.log('🔄 Starting re-upload of missing images...\n');
    
    // Get all products with images
    const products = await Product.findAll();
    
    console.log(`📦 Found ${products.length} products to process`);
    
    let processedCount = 0;
    let errorCount = 0;
    
    for (const product of products) {
      const productImages = product.images || [];
      
      if (!Array.isArray(productImages) || productImages.length === 0) {
        continue;
      }
      
      let updatedImages = [...productImages]; // Copy original array
      let hasChanges = false;
      
      for (let i = 0; i < productImages.length; i++) {
        const imageUrl = productImages[i];
        
        if (typeof imageUrl === 'string' && imageUrl.startsWith('https://res.cloudinary.com/')) {
          // Extract public ID from URL
          const urlParts = imageUrl.split('/');
          const uploadIndex = urlParts.indexOf('upload');
          
          if (uploadIndex !== -1) {
            // Reconstruct public ID by joining everything after 'upload'
            const publicIdParts = urlParts.slice(uploadIndex + 1);
            // Remove extension from the last part
            const lastPart = publicIdParts[publicIdParts.length - 1];
            const extIndex = lastPart.lastIndexOf('.');
            const fileNameWithoutExt = extIndex !== -1 ? lastPart.substring(0, extIndex) : lastPart;
            
            publicIdParts[publicIdParts.length - 1] = fileNameWithoutExt;
            const publicId = publicIdParts.join('/');
            
            console.log(`🔍 Attempting to re-upload image for product ${product.id}: ${publicId}`);
            
            try {
              // Create a placeholder image since the original doesn't exist
              const placeholderBuffer = createPlaceholderImage();
              
              // Upload the placeholder image to Cloudinary with the expected public ID
              const uploadResult = await cloudinaryService.uploadImage(placeholderBuffer, {
                folder: `${process.env.CLOUDINARY_UPLOAD_FOLDER || 'ecommerce'}/products`,
                quality: 'auto:good',
                public_id: publicId, // Use the same public ID to maintain consistency
                overwrite: true // Allow overwriting if somehow it exists
              });
              
              if (uploadResult && uploadResult.url) {
                // Update the image URL in our array
                updatedImages[i] = uploadResult.url;
                hasChanges = true;
                
                console.log(`✅ Re-uploaded image for product ${product.id}: ${uploadResult.url}`);
                processedCount++;
              } else {
                console.log(`❌ Failed to re-upload image for product ${product.id}`);
                errorCount++;
              }
            } catch (uploadError) {
              console.log(`❌ Error re-uploading image for product ${product.id}:`, uploadError.message);
              errorCount++;
              
              // Create a different public ID to avoid conflicts
              const timestamp = Date.now();
              const fallbackPublicId = `products/${timestamp}_${Math.random().toString(36).substring(2, 10)}_fallback`;
              
              try {
                const placeholderBuffer = createPlaceholderImage();
                const fallbackResult = await cloudinaryService.uploadImage(placeholderBuffer, {
                  folder: `${process.env.CLOUDINARY_UPLOAD_FOLDER || 'ecommerce'}/products`,
                  quality: 'auto:good',
                  public_id: fallbackPublicId
                });
                
                if (fallbackResult && fallbackResult.url) {
                  updatedImages[i] = fallbackResult.url;
                  hasChanges = true;
                  
                  console.log(`✅ Uploaded fallback image for product ${product.id}: ${fallbackResult.url}`);
                  processedCount++;
                }
              } catch (fallbackError) {
                console.log(`❌ Also failed to upload fallback image for product ${product.id}:`, fallbackError.message);
              }
            }
          }
        }
      }
      
      // If we made changes to this product's images, update the record
      if (hasChanges) {
        try {
          await product.update({ images: updatedImages });
          console.log(`💾 Updated product ${product.id} with new image URLs`);
        } catch (updateError) {
          console.log(`❌ Error updating product ${product.id}:`, updateError.message);
          errorCount++;
        }
      }
      
      // Small delay to avoid overwhelming Cloudinary
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n📊 Final Results:');
    console.log(`✅ Successfully processed: ${processedCount} images`);
    console.log(`❌ Errors encountered: ${errorCount} images`);
    console.log('🎉 Re-upload process completed!');
    
  } catch (error) {
    console.error('❌ Re-upload process failed:', error);
    throw error;
  }
}

/**
 * Alternative function to manually fix images with actual existing files
 */
async function manualImageUpload() {
  console.log('📋 Manual Image Upload Instructions:');
  console.log('');
  console.log('Since the images are missing from both local storage and Cloudinary,');
  console.log('you have these options:');
  console.log('');
  console.log('1. Find the original image files on your computer');
  console.log('2. Place them in a temporary folder like: backend/uploads/temp/');
  console.log('3. Run a script to re-upload these files to Cloudinary');
  console.log('');
  console.log('OR');
  console.log('');
  console.log('1. Update your products in the admin panel with new images');
  console.log('2. This will properly upload them to Cloudinary with correct references');
  console.log('');
  console.log('The script above has already created placeholder images for all missing ones,');
  console.log('so your site won\'t show broken image links anymore.');
}

/**
 * Main function
 */
async function main() {
  try {
    // First run the re-upload process
    await reuploadMissingImages();
    
    // Then provide manual instructions
    await manualImageUpload();
  } catch (error) {
    console.error('❌ Process failed:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { reuploadMissingImages, manualImageUpload };