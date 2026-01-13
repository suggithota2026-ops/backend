const User = require('./user.model');
const Order = require('./order.model');
const Product = require('./product.model');
const Category = require('./category.model');
const Invoice = require('./invoice.model');
const Notification = require('./notification.model');
const Admin = require('./admin.model');
const ContactMessage = require('./contact.model');

const defineAssociations = () => {
    // User & Order (Already defined in order.model.js but good to centralize or ensure)
    // Order.belongsTo(User, { foreignKey: 'hotelId', as: 'hotel' }); 
    User.hasMany(Order, { foreignKey: 'hotelId', as: 'orders' });

    // Order & Invoice
    Order.hasOne(Invoice, { foreignKey: 'orderId', as: 'invoice' });
    Invoice.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

    // User (Hotel) & Invoice
    User.hasMany(Invoice, { foreignKey: 'hotelId', as: 'invoices' });
    Invoice.belongsTo(User, { foreignKey: 'hotelId', as: 'hotel' });

    // Order & Notification
    Order.hasMany(Notification, { foreignKey: 'orderId', as: 'notifications' });
    Notification.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

    // User & Notification
    User.hasMany(Notification, { foreignKey: 'recipientId', as: 'notifications' });
    Notification.belongsTo(User, { foreignKey: 'recipientId', as: 'recipient' });

    // Product & Category (Assuming relationship exists)
    Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products' });
    Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'categoryDetails' });

    // Admin & Product (Created By)
    Admin.hasMany(Product, { foreignKey: 'createdById', as: 'createdProducts' });
    Product.belongsTo(Admin, { foreignKey: 'createdById', as: 'createdBy' });

    // ContactMessage has no associations (standalone table)
    // Just ensure it's loaded for table creation
    
    // Load Coupon model for table creation
    const Coupon = require('./coupon.model');
    
    // Order and Coupon association (if coupons are applied to orders)
    Order.hasOne(Coupon, { foreignKey: 'orderId', as: 'appliedCoupon' });
    Coupon.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
};

module.exports = defineAssociations;
