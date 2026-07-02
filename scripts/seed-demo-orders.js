const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { connectDB, mongoose } = require('../src/config/db');
const Order = require('../src/models/order.model');
const User = require('../src/models/user.model');
const Product = require('../src/models/product.model');
const { ORDER_STATUS } = require('../src/config/constants');

const DEMO_TAG = 'DEMO_ORDER_SUMMARY_TEST';

const setTime = (base, hours, minutes) => {
  const d = new Date(base);
  d.setHours(hours, minutes, 0, 0);
  return d;
};

const buildItems = (products, picks) => {
  if (products.length === 0) {
    return picks.map((pick, index) => {
      const unitPrice = pick.unitPrice || 50;
      const quantity = pick.quantity;
      return {
        productId: index + 1,
        productName: pick.name,
        quantity,
        unit: 'kg',
        unitPrice,
        totalPrice: unitPrice * quantity,
      };
    });
  }

  return picks.map((pick) => {
    const product = products[pick.productIndex % products.length];
    const unitPrice = parseFloat(product.price) || 50;
    const quantity = pick.quantity;
    return {
      productId: product.id,
      productName: product.name,
      quantity,
      unit: product.unit || 'kg',
      unitPrice,
      totalPrice: unitPrice * quantity,
    };
  });
};

const createDemoOrder = async ({ hotel, items, createdAt, deliveryCharge = 0 }) => {
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const order = await Order.create({
    hotelId: hotel.id,
    items,
    subtotal,
    deliveryCharge,
    totalAmount: subtotal + deliveryCharge,
    status: ORDER_STATUS.CONFIRMED,
    specialInstructions: DEMO_TAG,
    createdAt,
    updatedAt: createdAt,
  });
  return order;
};

async function main() {
  await connectDB();

  const removed = await Order.deleteMany({ specialInstructions: DEMO_TAG });
  console.log(`Removed ${removed.deletedCount} previous demo order(s).`);

  const hotels = await User.find({ hotelName: { $ne: null } }).sort({ id: 1 }).limit(3);
  if (hotels.length === 0) {
    throw new Error('No hotels found. Add at least one customer/hotel first.');
  }

  const products = await Product.find({ status: 'active', isActive: true }).sort({ id: 1 }).limit(6);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const scenarios = [
    {
      label: 'Today 12:00 PM',
      createdAt: setTime(today, 12, 0),
      hotel: hotels[0],
      picks: [{ name: 'Tomato', quantity: 5, productIndex: 0 }, { name: 'Onion', quantity: 3, productIndex: 1 }],
    },
    {
      label: 'Today 6:00 PM',
      createdAt: setTime(today, 18, 0),
      hotel: hotels[1] || hotels[0],
      picks: [{ name: 'Potato', quantity: 10, productIndex: 2 }],
    },
    {
      label: 'Tomorrow 7:00 AM',
      createdAt: setTime(tomorrow, 7, 0),
      hotel: hotels[0],
      picks: [{ name: 'Tomato', quantity: 2, productIndex: 0 }, { name: 'Capsicum', quantity: 4, productIndex: 3 }],
    },
    {
      label: 'Tomorrow 10:30 AM',
      createdAt: setTime(tomorrow, 10, 30),
      hotel: hotels[2] || hotels[0],
      picks: [{ name: 'Carrot', quantity: 6, productIndex: 4 }],
    },
  ];

  console.log('\nCreating demo orders for export summary testing:\n');

  for (const scenario of scenarios) {
    const items = buildItems(products, scenario.picks);
    const order = await createDemoOrder({
      hotel: scenario.hotel,
      items,
      createdAt: scenario.createdAt,
    });

    console.log(
      `  ✓ #${order.id} (${order.orderNumber || 'pending'}) — ${scenario.label} — ${scenario.hotel.hotelName} — ₹${order.totalAmount}`
    );
  }

  const rangeStart = setTime(today, 11, 0);
  const rangeEnd = setTime(tomorrow, 11, 0);

  console.log('\nSuggested test range in Export Orders Summary:');
  console.log(`  Start: ${rangeStart.toLocaleString('en-GB')} (today 11:00 AM)`);
  console.log(`  End:   ${rangeEnd.toLocaleString('en-GB')} (tomorrow 11:00 AM)`);
  console.log('\nDone.');
}

main()
  .catch((error) => {
    console.error('Failed to seed demo orders:', error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
