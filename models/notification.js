const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    targetRole: {
      type: String,
      enum: ["all", "admin", "principal", "hod", "faculty", "student"],
      default: null,
    },
    title: {
      type: String,
      default: "College ERP Notification",
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["attendance", "leave", "adjustment", "payroll", "system", "general"],
      default: "general",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    attendanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Attendance",
      default: null,
    },
    parentContact: {
      type: String,
      default: "",
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    deliveryStatus: {
      type: String,
      enum: ["Pending", "Sent", "Failed", "NotRequired"],
      default: "Sent",
    },
    attempts: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
