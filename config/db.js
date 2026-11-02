const mongoose = require("mongoose");

async function connectDB() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from .env");
    }

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log("MongoDB Atlas connected successfully!");
    console.log("Database:", mongoose.connection.name);

    // Drop legacy unique index on notifications if present in MongoDB Atlas
    try {
      await mongoose.connection.collection("notifications").dropIndex("attendanceId_1");
      console.log("Removed obsolete attendanceId_1 unique index from notifications");
    } catch (_) {
      // Index not found or already dropped - safe to proceed
    }
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
}

module.exports = connectDB;
