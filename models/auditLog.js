const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    actorName: {
      type: String,
      default: "System",
    },
    actorEmail: {
      type: String,
      default: "system@college.edu",
    },
    actorRole: {
      type: String,
      default: "system",
    },
    action: {
      type: String,
      required: true, // e.g. "MARK_ATTENDANCE", "COPY_ATTENDANCE", "APPROVE_LEAVE", "CREATE_USER"
    },
    entity: {
      type: String,
      required: true, // e.g. "AttendanceSession", "LeaveRequest", "Payroll"
    },
    entityId: {
      type: String,
      default: "",
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
