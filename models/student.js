const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    rollNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    department: {
      type: String,
      trim: true,
      default: "CSE",
    },
    year: {
      type: Number,
      default: 3,
    },
    semester: {
      type: Number,
      default: 5,
    },
    section: {
      type: String,
      trim: true,
      default: "A",
    },
    classId: {
      type: String,
      required: true,
      trim: true,
      default: "CSE-A",
    },
    parentName: {
      type: String,
      required: true,
      trim: true,
    },
    parentEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    parentPhone: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

studentSchema.index({ classId: 1, rollNumber: 1 });
studentSchema.index({ department: 1, semester: 1, section: 1 });

module.exports = mongoose.model("Student", studentSchema);
