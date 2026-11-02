const mongoose = require("mongoose");

const attendanceRecordSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AttendanceSession",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Present", "Absent", "On Duty"],
      default: "Present",
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      default: null,
    },
  },
  { timestamps: true }
);

// Prevent duplicate marking for same student in the same session
attendanceRecordSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });
attendanceRecordSchema.index({ studentId: 1, date: 1 });

module.exports = mongoose.model("AttendanceRecord", attendanceRecordSchema);
