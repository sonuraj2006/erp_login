const mongoose = require("mongoose");

const leaveRequestSchema = new mongoose.Schema(
  {
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
    },
    leaveType: {
      type: String,
      enum: ["Casual Leave", "Sick Leave", "Earned Leave", "On Duty Leave", "Maternity / Paternity Leave"],
      default: "Casual Leave",
    },
    startDate: {
      type: String,
      required: true,
    },
    endDate: {
      type: String,
      required: true,
    },
    totalDays: {
      type: Number,
      required: true,
      min: 0.5,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    evidenceUrl: {
      type: String,
      default: "",
    },
    evidenceOriginalName: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: [
        "Pending_HOD",
        "Pending_Principal",
        "Approved",
        "Rejected",
        "Clarification_Requested"
      ],
      default: "Pending_HOD",
    },
    hodStatus: {
      type: String,
      enum: ["Pending", "Recommended", "Approved", "Rejected", "Clarification_Requested"],
      default: "Pending",
    },
    hodRemarks: {
      type: String,
      default: "",
    },
    hodReviewedAt: {
      type: Date,
      default: null,
    },
    principalStatus: {
      type: String,
      enum: ["NotRequired", "Pending", "Approved", "Rejected", "Clarification_Requested"],
      default: "Pending",
    },
    principalRemarks: {
      type: String,
      default: "",
    },
    principalReviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LeaveRequest", leaveRequestSchema);
