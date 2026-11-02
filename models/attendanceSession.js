const mongoose = require("mongoose");

const attendanceSessionSchema = new mongoose.Schema(
  {
    department: {
      type: String,
      required: true,
      trim: true,
    },
    semester: {
      type: Number,
      required: true,
    },
    section: {
      type: String,
      required: true,
      trim: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    date: {
      type: String,
      required: true, // Format: YYYY-MM-DD
      trim: true,
    },
    period: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
    },
    originalFacultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
    },
    markedByFacultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
    },
    isSubstituted: {
      type: Boolean,
      default: false,
    },
    substituteReason: {
      type: String,
      default: "",
      trim: true,
    },
    totalStudents: {
      type: Number,
      default: 0,
    },
    presentCount: {
      type: Number,
      default: 0,
    },
    absentCount: {
      type: Number,
      default: 0,
    },
    odCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["Submitted", "Copied", "Modified"],
      default: "Submitted",
    },
    copiedFromSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AttendanceSession",
      default: null,
    },
    copiedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    copiedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Prevent duplicate attendance entries for the same class, date, and period
attendanceSessionSchema.index(
  { department: 1, semester: 1, section: 1, date: 1, period: 1 },
  { unique: true }
);

module.exports = mongoose.model("AttendanceSession", attendanceSessionSchema);
