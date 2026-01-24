// Script to fix broken image links in products
const path = require('path');
const { sequelize } = require('../src/config/db');
const Product = require('../src/models/product.model');
const cloudinary = require('cloudinary').v2;
const logger = require('../src/utils/logger');

// Load environment variables
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: process.env.CLOUDINARY_SECURE_DELIVERY === 'true'
});

/**
 * Check if a Cloudinary resource exists
 */
async function checkCloudinaryResource(publicId) {
  try {
    const result = await cloudinary.api.resource(publicId);
    return { exists: true, info: result };
  } catch (error) {
    if (error?.message?.includes('Resource not found') || error?.error?.message?.includes('Resource not found')) {
      return { exists: false };
    }
    logger.error(`Error checking Cloudinary resource ${publicId}:`, error);
    return { exists: false, error: error.message || error.error?.message };
  }
}

/**
 * Find products with broken image links
 */
async function findBrokenImageLinks() {
  try {
    console.log('🔍 Searching for products with broken image links...');
    
    // Get all products with images
    const products = await Product.findAll();
    
    console.log(`📦 Found ${products.length} products`);
    
    let brokenImages = [];
    let totalImages = 0;
    
    for (const product of products) {
      const productImages = product.images || [];
      
      if (!Array.isArray(productImages) || productImages.length === 0) {
        continue;
      }
      
      for (let i = 0; i < productImages.length; i++) {
        const imageUrl = productImages[i];
        
        if (typeof imageUrl === 'string' && imageUrl.startsWith('https://res.cloudinary.com/')) {
          totalImages++;
          
          // Extract public ID from Cloudinary URL
          // URL format: https://res.cloudinary.com/<cloud_name>/image/upload/<folder>/<public_id>.<extension>
          const urlParts = imageUrl.split('/');
          const folderIndex = urlParts.indexOf('upload');
          if (folderIndex !== -1) {
            // Reconstruct the public ID by joining everything after 'upload'
            const publicIdParts = urlParts.slice(folderIndex + 1); // Skip 'upload'
            // Remove the extension from the last part
            const lastPart = publicIdParts[publicIdParts.length - 1];
            const partsWithoutExtension = lastPart.split('.');
            partsWithoutExtension.pop(); // Remove extension
            const fileNameWithoutExt = partsWithoutExtension.join('.');
            
            // Rebuild public ID without extension
            publicIdParts[publicIdParts.length - 1] = fileNameWithoutExt;
            const publicId = publicIdParts.join('/');
            
            console.log(`Checking Cloudinary resource: ${publicId}`);
            
            const checkResult = await checkCloudinaryResource(publicId);
            
            if (!checkResult.exists) {
              console.log(`❌ Broken image detected for product ${product.id}: ${imageUrl}`);
              brokenImages.push({
                productId: product.id,
                productName: product.name,
                imageUrl: imageUrl,
                publicId: publicId,
                index: i
              });
            } else {
              console.log(`✅ Valid image for product ${product.id}: ${publicId}`);
            }
          }
        }
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`Total images checked: ${totalImages}`);
    console.log(`Broken images found: ${brokenImages.length}`);
    
    return brokenImages;
  } catch (error) {
    console.error('❌ Error finding broken image links:', error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting broken image link checker...\n');
    
    // Find broken image links
    const brokenImages = await findBrokenImageLinks();
    
    if (brokenImages.length > 0) {
      console.log('\n📝 Broken images found:');
      brokenImages.forEach(broken => {
        console.log(`  - Product ${broken.productId} (${broken.productName}): ${broken.imageUrl}`);
        console.log(`    Public ID: ${broken.publicId}`);
      });
      
      console.log('\n💡 Next steps:');
      console.log('   - These images exist in your database but not in Cloudinary');
      console.log('   - You may need to re-upload these images or fix the URLs');
      console.log('   - Check your Cloudinary dashboard to see what images are actually stored');
    } else {
      console.log('\n✅ No broken image links found!');
    }
    
    console.log('\n🎉 Process completed!');
  } catch (error) {
    console.error('❌ Process failed:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { findBrokenImageLinks, checkCloudinaryResource };