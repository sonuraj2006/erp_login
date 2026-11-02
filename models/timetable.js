const mongoose = require("mongoose");

const timetableSchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: String,
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      required: true,
    },
    period: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
    },
    startTime: {
      type: String,
      default: "09:30 AM",
    },
    endTime: {
      type: String,
      default: "10:30 AM",
    },
    room: {
      type: String,
      default: "LH-201",
      trim: true,
    },
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
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
    },
    academicYear: {
      type: String,
      default: "2026-2027",
    },
  },
  { timestamps: true }
);

timetableSchema.index(
  { department: 1, semester: 1, section: 1, dayOfWeek: 1, period: 1 },
  { unique: true }
);

module.exports = mongoose.model("Timetable", timetableSchema);
