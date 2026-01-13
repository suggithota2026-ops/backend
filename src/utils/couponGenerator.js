// Coupon code generator utility
const generatePromoCode = (title = '', length = 10) => {
    // Create a prefix from the title (first 3 letters, uppercase, alphanumeric only)
    let prefix = '';
    if (title) {
        prefix = title.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '');
    }
    
    // Generate random alphanumeric characters
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomPart = '';
    for (let i = 0; i < (length - prefix.length); i++) {
        randomPart += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    // Combine prefix and random part, then ensure it's the desired length
    let code = (prefix + randomPart).substring(0, length);
    
    // Make sure we have at least some randomness if prefix is too long
    if (code.length < length) {
        for (let i = code.length; i < length; i++) {
            code += characters.charAt(Math.floor(Math.random() * characters.length));
        }
    }
    
    return code;
};

// Function to generate a unique promo code ensuring it doesn't already exist in the database
const generateUniquePromoCode = async (title = '', CouponModel, attempts = 10) => {
    for (let i = 0; i < attempts; i++) {
        const code = generatePromoCode(title);
        
        // Check if this code already exists
        const existingCoupon = await CouponModel.findOne({
            where: { code: code }
        });
        
        if (!existingCoupon) {
            return code; // Found a unique code
        }
    }
    
    // If we couldn't find a unique code after attempts, add a timestamp
    const timestamp = Date.now().toString().slice(-6);
    return generatePromoCode(title, 10) + timestamp;
};

module.exports = {
    generatePromoCode,
    generateUniquePromoCode
};