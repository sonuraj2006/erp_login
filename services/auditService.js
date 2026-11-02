const AuditLog = require("../models/auditLog");

async function logAudit(req, action, entity, entityId = "", details = {}) {
  try {
    const actorId = req && req.user ? req.user.sub : null;
    const actorEmail = req && req.user ? req.user.email : "system@college.edu";
    const actorName = req && req.user ? req.user.name : "System";
    const actorRole = req && req.user ? req.user.role : "system";
    const ipAddress = req
      ? (req.ip || (req.headers && req.headers["x-forwarded-for"]) || "")
      : "";

    await AuditLog.create({
      actorId,
      actorName,
      actorEmail,
      actorRole,
      action,
      entity,
      entityId: String(entityId || ""),
      details,
      ipAddress,
    });
  } catch (err) {
    console.error("Failed to write audit log:", err.message);
  }
}

module.exports = {
  logAudit,
};
