const User = require('./user.model');
const Order = require('./order.model');
const Product = require('./product.model');
const Category = require('./category.model');
const Invoice = require('./invoice.model');
const Notification = require('./notification.model');
const Admin = require('./admin.model');

const defineAssociations = () => {
    // User & Order (Already defined in order.model.js but good to centralize or ensure)
    // Order.belongsTo(User, { foreignKey: 'hotelId', as: 'hotel' }); 
    User.hasMany(Order, { foreignKey: 'hotelId', as: 'orders' });

    // Order & Invoice
    Order.hasOne(Invoice, { foreignKey: 'orderId', as: 'invoice' });
    Invoice.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

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
};

module.exports = defineAssociations;
