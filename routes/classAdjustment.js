const express = require("express");
const ClassAdjustment = require("../models/classAdjustment");
const Faculty = require("../models/faculty");
const Timetable = require("../models/timetable");
const Subject = require("../models/subject");
const Notification = require("../models/notification");
const { authMiddleware, requireRole } = require("../middleware/authMiddleware");
const { logAudit } = require("../services/auditService");

const router = express.Router();
router.use(authMiddleware);

// 1. Request class adjustment
router.post("/request", async (req, res) => {
  try {
    const { substituteFacultyId, date, period, department, semester, section, subjectId, reason } = req.body;

    if (!substituteFacultyId || !date || !period || !department || !semester || !section || !subjectId || !reason) {
      return res.status(400).json({ message: "All class adjustment parameters are required." });
    }

    const originalFaculty = await Faculty.findOne({
      $or: [{ userId: req.user.sub }, { email: req.user.email }],
    });

    if (!originalFaculty) {
      return res.status(404).json({ message: "Faculty profile not linked." });
    }

    if (String(originalFaculty._id) === String(substituteFacultyId)) {
      return res.status(400).json({ message: "Substitute faculty must be different from original faculty." });
    }

    // Check substitute availability: verify if substitute already has an adjustment or timetable slot
    const subHasConflict = await ClassAdjustment.findOne({
      substituteFacultyId,
      date,
      period: Number(period),
      status: "Approved",
    });

    if (subHasConflict) {
      return res.status(409).json({
        message: "Substitute faculty is already committed to another approved adjustment during this period.",
      });
    }

    const adjustment = await ClassAdjustment.create({
      originalFacultyId: originalFaculty._id,
      substituteFacultyId,
      date,
      period: Number(period),
      department,
      semester: Number(semester),
      section,
      subjectId,
      reason: reason.trim(),
      status: "Pending_HOD",
    });

    // Notify substitute faculty
    const subFac = await Faculty.findById(substituteFacultyId);
    if (subFac && subFac.userId) {
      await Notification.create({
        userId: subFac.userId,
        title: "Class Substitution Requested",
        message: `${originalFaculty.name} has requested you to take their ${department} Sem ${semester} Sec ${section} class on ${date} (Period ${period}).`,
        type: "adjustment",
      });
    }

    // Notify HOD
    await Notification.create({
      targetRole: "hod",
      title: "Class Adjustment Pending Approval",
      message: `${originalFaculty.name} requested class adjustment with ${subFac?.name || "faculty"} for Period ${period} on ${date}.`,
      type: "adjustment",
    });

    await logAudit(req, "REQUEST_CLASS_ADJUSTMENT", "ClassAdjustment", adjustment._id, {
      from: originalFaculty.name,
      to: subFac?.name,
      date,
      period,
    });

    return res.status(201).json({
      message: "Class adjustment request submitted to HOD.",
      adjustment,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to submit adjustment request." });
  }
});

// 2. View my adjustment requests (both requested by me or assigned to me as substitute)
router.get("/my", async (req, res) => {
  try {
    const faculty = await Faculty.findOne({
      $or: [{ userId: req.user.sub }, { email: req.user.email }],
    });

    if (!faculty) {
      return res.status(404).json({ message: "Faculty profile not found." });
    }

    const adjustments = await ClassAdjustment.find({
      $or: [{ originalFacultyId: faculty._id }, { substituteFacultyId: faculty._id }],
    })
      .populate("originalFacultyId", "name employeeId email")
      .populate("substituteFacultyId", "name employeeId email")
      .populate("subjectId", "code name")
      .sort({ date: -1, period: 1 });

    return res.json({ adjustments });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch adjustment requests." });
  }
});

// 3. Pending adjustments for HOD
router.get("/pending", requireRole("hod", "admin", "principal"), async (req, res) => {
  try {
    const adjustments = await ClassAdjustment.find({ status: "Pending_HOD" })
      .populate("originalFacultyId", "name employeeId email department")
      .populate("substituteFacultyId", "name employeeId email department")
      .populate("subjectId", "code name")
      .sort({ createdAt: -1 });

    return res.json({ adjustments });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch pending adjustments." });
  }
});

// 4. HOD action (Approve or Reject)
router.post("/:id/action", requireRole("hod", "admin"), async (req, res) => {
  try {
    const { action, remarks } = req.body; // action: "Approve" or "Reject"
    const adjustment = await ClassAdjustment.findById(req.params.id)
      .populate("originalFacultyId")
      .populate("substituteFacultyId")
      .populate("subjectId");

    if (!adjustment) return res.status(404).json({ message: "Adjustment not found." });

    adjustment.status = action === "Approve" ? "Approved" : "Rejected";
    adjustment.hodRemarks = remarks || "";
    adjustment.reviewedBy = req.user.sub;
    adjustment.reviewedAt = new Date();
    await adjustment.save();

    // Notify both faculties
    if (adjustment.originalFacultyId && adjustment.originalFacultyId.userId) {
      await Notification.create({
        userId: adjustment.originalFacultyId.userId,
        title: `Class Adjustment ${adjustment.status}`,
        message: `Your adjustment request for ${adjustment.subjectId?.name} on ${adjustment.date} (Period ${adjustment.period}) has been ${adjustment.status}.`,
        type: "adjustment",
      });
    }

    if (adjustment.substituteFacultyId && adjustment.substituteFacultyId.userId) {
      await Notification.create({
        userId: adjustment.substituteFacultyId.userId,
        title: `Class Adjustment ${adjustment.status}`,
        message: `Adjustment for ${adjustment.date} (Period ${adjustment.period}) has been ${adjustment.status}. You are designated substitute instructor.`,
        type: "adjustment",
      });
    }

    await logAudit(req, `HOD_${action.toUpperCase()}_ADJUSTMENT`, "ClassAdjustment", adjustment._id, {
      status: adjustment.status,
    });

    return res.json({ message: `Adjustment request ${adjustment.status}.`, adjustment });
  } catch (err) {
    return res.status(500).json({ message: "Failed to process adjustment action." });
  }
});

module.exports = router;
