const mongoose = require("mongoose");

const leaveApprovalSchema = new mongoose.Schema(
  {
    leaveRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveRequest",
      required: true,
    },
    stage: {
      type: String,
      enum: ["HOD", "Principal"],
      required: true,
    },
    approverUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      enum: ["Approved", "Rejected", "Clarification_Requested", "Recommended"],
      required: true,
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LeaveApproval", leaveApprovalSchema);
