// Invoice model (Sequelize)
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { INVOICE_STATUS } = require('../config/constants');

const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  invoiceNumber: {
    type: DataTypes.STRING,
    unique: true,
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
  },
  hotelId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  gstAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  gstRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
  },
  totalAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM(...Object.values(INVOICE_STATUS)),
    defaultValue: INVOICE_STATUS.PENDING,
  },
  pdfPath: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'invoices',
  timestamps: true,
});

// Generate invoice number before create
Invoice.addHook('beforeCreate', async (invoice) => {
  if (!invoice.invoiceNumber) {
    const year = new Date().getFullYear();
    const count = await Invoice.count({
      where: sequelize.where(
        sequelize.fn('EXTRACT', sequelize.literal('YEAR FROM "createdAt"')),
        year
      ),
    });
    invoice.invoiceNumber = `INV${year}${String(count + 1).padStart(5, '0')}`;
  }
});

module.exports = Invoice;
