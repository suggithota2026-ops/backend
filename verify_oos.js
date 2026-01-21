const Product = require('./src/models/product.model');
const { sequelize } = require('./src/config/db');

async function verifyOutOfStock() {
    try {
        console.log('--- Verifying Out of Stock Mapping Logic ---');

        // 1. Create a test product with status 'inactive'
        const testProduct = await Product.create({
            name: 'Verification Test Product ' + Date.now(),
            categoryId: 4, // Valid category
            price: 100,
            unit: 'kg',
            stock: 5, // MOQ
            status: 'inactive',
            isActive: true,
            pricingType: 'fixed'
        });

        console.log(`Created test product: ${testProduct.name} with DB status: ${testProduct.status}`);

        // 2. Mock a request to User Product Controller logic
        const { getProducts } = require('./src/controllers/user/product.controller');

        // Create a mock request/reply
        const mockRequest = {
            query: { search: testProduct.name },
            headers: { host: 'localhost:3001' },
            protocol: 'http'
        };

        let mappingConfirmed = false;
        const mockReply = {
            status: function (code) { return this; },
            send: (data) => {
                const product = data.data.find(p => p.id === testProduct.id);
                if (product && product.status === 'out_of_stock') {
                    console.log('✅ PASS: Inactive product mapped to "out_of_stock" in response.');
                    mappingConfirmed = true;
                } else {
                    console.log('❌ FAIL: Product status remains:', product ? product.status : 'not found');
                }
            },
        };

        await getProducts(mockRequest, mockReply);

        // 3. Clean up
        await testProduct.destroy();
        console.log('Test product cleaned up.');

        if (mappingConfirmed) {
            process.exit(0);
        } else {
            process.exit(1);
        }
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
}

verifyOutOfStock();
