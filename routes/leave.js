const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const LeaveRequest = require("../models/leaveRequest");
const LeaveApproval = require("../models/leaveApproval");
const Faculty = require("../models/faculty");
const Notification = require("../models/notification");
const { authMiddleware, requireRole } = require("../middleware/authMiddleware");
const { logAudit } = require("../services/auditService");

const router = express.Router();
router.use(authMiddleware);

// Set up upload storage for leave evidence
const uploadDir = path.join(__dirname, "..", "uploads", "evidence");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `evidence-${Date.now()}-${Math.round(Math.random() * 1e4)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// 1. Faculty applies for leave
router.post("/apply", upload.single("evidence"), async (req, res) => {
  try {
    const { leaveType, startDate, endDate, totalDays, reason } = req.body;

    if (!leaveType || !startDate || !endDate || !totalDays || !reason) {
      return res.status(400).json({ message: "All leave fields are required." });
    }

    // Identify faculty profile
    const faculty = await Faculty.findOne({
      $or: [{ userId: req.user.sub }, { email: req.user.email }],
    });

    if (!faculty) {
      return res.status(404).json({ message: "Faculty profile not linked to your account." });
    }

    // Check conflicting leave requests
    const conflict = await LeaveRequest.findOne({
      facultyId: faculty._id,
      status: { $in: ["Pending_HOD", "Pending_Principal", "Approved"] },
      $or: [
        { startDate: { $lte: endDate }, endDate: { $gte: startDate } },
      ],
    });

    if (conflict) {
      return res.status(409).json({
        message: `Conflicting leave request already exists between ${conflict.startDate} and ${conflict.endDate} (Status: ${conflict.status}).`,
      });
    }

    const evidenceUrl = req.file ? `/uploads/evidence/${req.file.filename}` : "";
    const evidenceOriginalName = req.file ? req.file.originalname : "";

    const leave = await LeaveRequest.create({
      facultyId: faculty._id,
      leaveType,
      startDate,
      endDate,
      totalDays: Number(totalDays),
      reason: reason.trim(),
      evidenceUrl,
      evidenceOriginalName,
      status: "Pending_HOD",
      hodStatus: "Pending",
      principalStatus: "Pending",
    });

    // Notify HOD
    await Notification.create({
      targetRole: "hod",
      title: "New Leave Application",
      message: `${faculty.name} (${faculty.department}) has applied for ${totalDays} days of ${leaveType} from ${startDate} to ${endDate}.`,
      type: "leave",
    });

    await logAudit(req, "APPLY_LEAVE", "LeaveRequest", leave._id, {
      faculty: faculty.name,
      leaveType,
      days: totalDays,
    });

    return res.status(201).json({
      message: "Leave application submitted and routed to HOD for review.",
      leave,
    });
  } catch (error) {
    console.error("Leave apply error:", error);
    return res.status(500).json({ message: error.message || "Failed to apply for leave." });
  }
});

// 2. Get my leaves (Faculty)
router.get("/my", async (req, res) => {
  try {
    const faculty = await Faculty.findOne({
      $or: [{ userId: req.user.sub }, { email: req.user.email }],
    });

    if (!faculty) {
      return res.status(404).json({ message: "Faculty profile not found." });
    }

    const leaves = await LeaveRequest.find({ facultyId: faculty._id })
      .sort({ createdAt: -1 });

    return res.json({
      leaveBalance: faculty.leaveBalance,
      leaves,
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch leaves." });
  }
});

// 3. HOD pending leaves list
router.get("/hod-pending", requireRole("hod", "admin", "principal"), async (req, res) => {
  try {
    let facultyFilter = {};
    if (req.user.department && req.user.role === "hod") {
      const deptFaculty = await Faculty.find({ department: req.user.department }).select("_id");
      facultyFilter = { facultyId: { $in: deptFaculty.map((f) => f._id) } };
    }

    const leaves = await LeaveRequest.find({
      ...facultyFilter,
      status: { $in: ["Pending_HOD", "Clarification_Requested"] },
    })
      .populate("facultyId", "name employeeId email department designation leaveBalance")
      .sort({ createdAt: -1 });

    return res.json({ leaves });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch HOD pending leaves." });
  }
});

// 4. HOD review action: Approve (or Recommend to Principal), Reject, or Request Clarification
router.post("/:id/hod-action", requireRole("hod", "admin"), async (req, res) => {
  try {
    const { action, remarks } = req.body; // action: "Approve", "Forward_Principal", "Reject", "Clarification"

    const leave = await LeaveRequest.findById(req.params.id).populate("facultyId");
    if (!leave) return res.status(404).json({ message: "Leave request not found." });

    leave.hodRemarks = remarks || "";
    leave.hodReviewedAt = new Date();

    if (action === "Approve") {
      // HOD direct approval for shorter leaves or policy
      leave.status = "Approved";
      leave.hodStatus = "Approved";
      leave.principalStatus = "NotRequired";
      // Deduct balance
      await deductLeaveBalance(leave.facultyId._id, leave.leaveType, leave.totalDays);
    } else if (action === "Forward_Principal") {
      leave.status = "Pending_Principal";
      leave.hodStatus = "Recommended";
      leave.principalStatus = "Pending";
      // Notify Principal
      await Notification.create({
        targetRole: "principal",
        title: "Leave Request Forwarded",
        message: `HOD recommended leave request of ${leave.facultyId.name} (${leave.totalDays} days ${leave.leaveType}) for final review.`,
        type: "leave",
      });
    } else if (action === "Reject") {
      leave.status = "Rejected";
      leave.hodStatus = "Rejected";
    } else if (action === "Clarification") {
      leave.status = "Clarification_Requested";
      leave.hodStatus = "Clarification_Requested";
    }

    await leave.save();

    await LeaveApproval.create({
      leaveRequestId: leave._id,
      stage: "HOD",
      approverUserId: req.user.sub,
      action: leave.status,
      remarks: remarks || "",
    });

    // Notify applicant faculty
    await Notification.create({
      userId: leave.facultyId.userId,
      title: `Leave Request ${leave.status}`,
      message: `Your leave request from ${leave.startDate} to ${leave.endDate} was reviewed by HOD. Status: ${leave.status}. Remarks: ${remarks || "None"}`,
      type: "leave",
    });

    await logAudit(req, `HOD_${action.toUpperCase()}_LEAVE`, "LeaveRequest", leave._id, {
      faculty: leave.facultyId.name,
      status: leave.status,
    });

    return res.json({ message: `Leave request updated to ${leave.status}.`, leave });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to process HOD action." });
  }
});

// 5. Principal pending leaves list
router.get("/principal-pending", requireRole("principal", "admin"), async (req, res) => {
  try {
    const leaves = await LeaveRequest.find({
      status: "Pending_Principal",
    })
      .populate("facultyId", "name employeeId email department designation leaveBalance")
      .sort({ createdAt: -1 });

    return res.json({ leaves });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch principal pending leaves." });
  }
});

// 6. Principal final decision
router.post("/:id/principal-action", requireRole("principal", "admin"), async (req, res) => {
  try {
    const { action, remarks } = req.body; // action: "Approved", "Rejected"

    const leave = await LeaveRequest.findById(req.params.id).populate("facultyId");
    if (!leave) return res.status(404).json({ message: "Leave request not found." });

    leave.principalRemarks = remarks || "";
    leave.principalReviewedAt = new Date();
    leave.principalStatus = action === "Approved" ? "Approved" : "Rejected";
    leave.status = action === "Approved" ? "Approved" : "Rejected";

    if (action === "Approved") {
      await deductLeaveBalance(leave.facultyId._id, leave.leaveType, leave.totalDays);
    }

    await leave.save();

    await LeaveApproval.create({
      leaveRequestId: leave._id,
      stage: "Principal",
      approverUserId: req.user.sub,
      action: leave.status,
      remarks: remarks || "",
    });

    // Notify faculty
    await Notification.create({
      userId: leave.facultyId.userId,
      title: `Principal Decision: Leave ${leave.status}`,
      message: `Principal has ${action.toLowerCase()} your leave request for ${leave.startDate} to ${leave.endDate}. Remarks: ${remarks || "None"}`,
      type: "leave",
    });

    await logAudit(req, `PRINCIPAL_${action.toUpperCase()}_LEAVE`, "LeaveRequest", leave._id, {
      faculty: leave.facultyId.name,
      status: leave.status,
    });

    return res.json({ message: `Leave request finalized as ${leave.status}.`, leave });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to finalize leave request." });
  }
});

// 7. All leaves list (for Admin / Principal overview)
router.get("/all", requireRole("admin", "principal"), async (req, res) => {
  try {
    const { status, department } = req.query;
    const filter = {};
    if (status && status !== "all") filter.status = status;

    const leaves = await LeaveRequest.find(filter)
      .populate("facultyId", "name employeeId email department designation")
      .sort({ createdAt: -1 });

    return res.json({ leaves });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load leave history." });
  }
});

async function deductLeaveBalance(facultyId, leaveType, days) {
  try {
    const fac = await Faculty.findById(facultyId);
    if (!fac || !fac.leaveBalance) return;

    if (leaveType.toLowerCase().includes("casual") && fac.leaveBalance.casual >= days) {
      fac.leaveBalance.casual = Math.max(0, fac.leaveBalance.casual - days);
    } else if (leaveType.toLowerCase().includes("sick") && fac.leaveBalance.sick >= days) {
      fac.leaveBalance.sick = Math.max(0, fac.leaveBalance.sick - days);
    } else if (leaveType.toLowerCase().includes("earned") && fac.leaveBalance.earned >= days) {
      fac.leaveBalance.earned = Math.max(0, fac.leaveBalance.earned - days);
    } else if (leaveType.toLowerCase().includes("duty") && fac.leaveBalance.duty >= days) {
      fac.leaveBalance.duty = Math.max(0, fac.leaveBalance.duty - days);
    }
    await fac.save();
  } catch (e) {
    console.error("Deduct leave balance error:", e.message);
  }
}

module.exports = router;
