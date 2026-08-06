require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { connectDB } = require('../src/config/db');
const { backfillContractOnlyProducts } = require('../src/utils/backfillContractOnlyProducts');
const Product = require('../src/models/product.model');

(async () => {
  await connectDB();
  await backfillContractOnlyProducts();
  const catalog = await Product.countDocuments({ isContractOnly: false });
  const contract = await Product.countDocuments({ isContractOnly: true });
  const missing = await Product.countDocuments({ isContractOnly: { $exists: false } });
  console.log(JSON.stringify({ catalog, contract, missing }, null, 2));
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
