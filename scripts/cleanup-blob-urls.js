// Script to clean up existing blob URLs in the brands table
// This converts any blob URLs to a placeholder since they're no longer valid

const Brand = require('../src/models/brand.model');

async function cleanupBlobUrls() {
  try {
    console.log('🔍 Checking for blob URLs in brands table...');
    
    // Find all brands with blob URLs
    const brandsWithBlobUrls = await Brand.findAll({
      where: {
        imageUrl: {
          [require('sequelize').Op.like]: 'blob:%'
        }
      }
    });
    
    console.log(`Found ${brandsWithBlobUrls.length} brands with blob URLs`);
    
    if (brandsWithBlobUrls.length > 0) {
      console.log('\nBrands with blob URLs:');
      brandsWithBlobUrls.forEach(brand => {
        console.log(`- ID: ${brand.id}, Name: ${brand.name}, URL: ${brand.imageUrl}`);
      });
      
      // Update them to use a default placeholder or convert to base64
      console.log('\n🔄 Converting blob URLs to placeholders...');
      
      for (const brand of brandsWithBlobUrls) {
        // Use empty string for missing images - let frontend handle fallback
        await brand.update({
          imageUrl: ""
        });
        
        console.log(`✓ Updated brand ${brand.id} (${brand.name}) - set to placeholder: ${placeholderUrl}`);
      }
      
      console.log('\n✅ Cleanup completed!');
    } else {
      console.log('✅ No blob URLs found in brands table');
    }
    
    // Also check for any other problematic URLs
    console.log('\n🔍 Checking for other problematic URLs...');
    const brands = await Brand.findAll();
    
    const problematicBrands = brands.filter(brand => {
      const url = brand.imageUrl;
      return url && (
        url.includes('blob:') || 
        url.includes('undefined') || 
        url.includes('null') ||
        url.includes('default-brand.png') ||
        !url.startsWith('http') && !url.startsWith('data:') && !url.startsWith('/') && !url.startsWith('uploads/')
      );
    });
    
    if (problematicBrands.length > 0) {
      console.log(`Found ${problematicBrands.length} brands with problematic URLs:`);
      problematicBrands.forEach(brand => {
        console.log(`- ID: ${brand.id}, Name: ${brand.name}, URL: ${brand.imageUrl}`);
      });
      
      // Update problematic URLs to empty strings
      console.log('\n🔄 Updating problematic URLs to empty strings...');
      for (const brand of problematicBrands) {
        await brand.update({
          imageUrl: ""
        });
        console.log(`✓ Updated brand ${brand.id} (${brand.name}) - cleared image URL`);
      }
      console.log('✅ All problematic URLs updated!');
    } else {
      console.log('✅ No other problematic URLs found');
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

// Run the cleanup
if (require.main === module) {
  cleanupBlobUrls().then(() => {
    console.log('Script completed');
    process.exit(0);
  }).catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

module.exports = cleanupBlobUrls;