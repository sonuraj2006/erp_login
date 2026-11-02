const express = require("express");
const AuditLog = require("../models/auditLog");
const { authMiddleware, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(authMiddleware);

// Admin view audit logs
router.get("/", requireRole("admin", "principal"), async (req, res) => {
  try {
    const { action, entity, search, limit = 100 } = req.query;
    const filter = {};

    if (action && action !== "all") filter.action = action;
    if (entity && entity !== "all") filter.entity = entity;
    if (search) {
      filter.$or = [
        { actorName: { $regex: search, $options: "i" } },
        { actorEmail: { $regex: search, $options: "i" } },
        { action: { $regex: search, $options: "i" } },
        { entity: { $regex: search, $options: "i" } },
      ];
    }

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    const total = await AuditLog.countDocuments(filter);

    return res.json({ total, logs });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch audit logs." });
  }
});

module.exports = router;
