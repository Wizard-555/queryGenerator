require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const dataRoutes = require("./routes/DataRoutes");
const data_routes = require("./routes/data_routes");
const mongoose = require("mongoose");

// Create MySQL connection from URL
const app = express();
app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/data", dataRoutes);
app.use("/data",data_routes);
const PORT = process.env.PORT || 5000;
const connectDB = async () => {
  try {
    console.log(process.env)
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error);
    process.exit(1); // Stop the app if DB connection fails
  }
};
connectDB();
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
