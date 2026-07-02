const mongoose = require("mongoose");

const uri = "mongodb+srv://suggithota2026_db_user:9XUw0EMklP9bpsNA@cluster0.71ghtuf.mongodb.net/suggithota?retryWrites=true&w=majority";

mongoose
  .connect(uri)
  .then(() => {
    console.log("✅ Connected Successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Connection Failed");
    console.error(err);
    process.exit(1);
  });