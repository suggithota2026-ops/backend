const Brand = require('../src/models/brand.model');

async function checkBrands() {
  try {
    const brands = await Brand.findAll();
    console.log('All brands in database:');
    console.log('========================');
    brands.forEach(brand => {
      console.log(`ID: ${brand.id}`);
      console.log(`Name: ${brand.name}`);
      console.log(`Image URL: ${brand.imageUrl}`);
      console.log(`Created: ${brand.createdAt}`);
      console.log('---');
    });
    
    // Check specifically for any problematic URLs
    const problematicBrands = brands.filter(brand => 
      brand.imageUrl.includes('default-brand.png') || 
      brand.imageUrl.includes('blob:') ||
      !brand.imageUrl
    );
    
    if (problematicBrands.length > 0) {
      console.log('\n⚠️  Problematic brands found:');
      problematicBrands.forEach(brand => {
        console.log(`- ID ${brand.id}: ${brand.name} (${brand.imageUrl})`);
      });
    } else {
      console.log('\n✅ No problematic brands found');
    }
    
  } catch (error) {
    console.error('Error checking brands:', error);
  }
}

checkBrands().then(() => process.exit(0)).catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});