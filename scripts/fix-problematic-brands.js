const Brand = require('../src/models/brand.model');

async function fixProblematicBrands() {
  try {
    console.log('🔍 Looking for brands with problematic image URLs...');
    
    // Find brands with the specific problematic URLs
    const problematicBrands = await Brand.findAll({
      where: {
        imageUrl: '/uploads/default-brand.png'
      }
    });
    
    console.log(`Found ${problematicBrands.length} brands with problematic URLs`);
    
    if (problematicBrands.length > 0) {
      console.log('\nProblematic brands:');
      problematicBrands.forEach(brand => {
        console.log(`- ID: ${brand.id}, Name: ${brand.name}, URL: ${brand.imageUrl}`);
      });
      
      // Since the model requires non-empty imageUrl, we have a few options:
      // 1. Delete the brands (recommended for test data)
      // 2. Set to a valid data URL placeholder
      // 3. Set to empty string and temporarily disable validation
      
      console.log('\n📋 Options for fixing:');
      console.log('1. Delete these brands (recommended)');
      console.log('2. Set to data URL placeholder');
      console.log('3. Set to empty string (requires model change)');
      
      // For now, let's delete them since they appear to be test data
      console.log('\n🗑️  Deleting problematic brands...');
      
      for (const brand of problematicBrands) {
        await brand.destroy();
        console.log(`✓ Deleted brand ${brand.id} (${brand.name})`);
      }
      
      console.log('\n✅ All problematic brands deleted!');
      
    } else {
      console.log('✅ No problematic brands found');
    }
    
    // Verify the fix
    console.log('\n🔍 Verifying fix...');
    const allBrands = await Brand.findAll();
    const remainingProblematic = allBrands.filter(brand => 
      brand.imageUrl.includes('default-brand.png') || 
      brand.imageUrl.includes('blob:')
    );
    
    if (remainingProblematic.length === 0) {
      console.log('✅ Verification successful - no problematic URLs remain');
    } else {
      console.log('⚠️  Still found problematic URLs:');
      remainingProblematic.forEach(brand => {
        console.log(`- ${brand.name}: ${brand.imageUrl}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error fixing brands:', error);
  }
}

fixProblematicBrands().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});