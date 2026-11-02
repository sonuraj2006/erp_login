const mongoose = require("mongoose");

const subjectAssignmentSchema = new mongoose.Schema(
  {
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
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
    academicYear: {
      type: String,
      default: "2026-2027",
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

subjectAssignmentSchema.index(
  { facultyId: 1, subjectId: 1, department: 1, semester: 1, section: 1, academicYear: 1 },
  { unique: true }
);

module.exports = mongoose.model("SubjectAssignment", subjectAssignmentSchema);
