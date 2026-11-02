const mongoose = require("mongoose");

const facultySchema = new mongoose.Schema(
  {
    employeeId: {
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
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    designation: {
      type: String,
      enum: [
        "Professor",
        "Associate Professor",
        "Assistant Professor",
        "Head of Department",
        "Principal",
        "Lecturer"
      ],
      default: "Assistant Professor",
    },
    qualification: {
      type: String,
      default: "M.Tech, Ph.D.",
      trim: true,
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    leaveBalance: {
      casual: { type: Number, default: 12 },
      sick: { type: Number, default: 10 },
      earned: { type: Number, default: 15 },
      duty: { type: Number, default: 8 },
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

module.exports = mongoose.model("Faculty", facultySchema);
