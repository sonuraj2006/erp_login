const express = require("express");
const Faculty = require("../models/faculty");
const SubjectAssignment = require("../models/subjectAssignment");
const Timetable = require("../models/timetable");
const User = require("../models/user");
const { authMiddleware, requireRole } = require("../middleware/authMiddleware");
const { logAudit } = require("../services/auditService");

const router = express.Router();

// List all faculty
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { department, search } = req.query;
    const filter = {};
    if (department && department !== "all") filter.department = department;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { employeeId: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const faculty = await Faculty.find(filter).sort({ name: 1 });
    return res.json({ faculty });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch faculty list." });
  }
});

// Get single faculty
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) return res.status(404).json({ message: "Faculty not found." });

    // Fetch assignments
    const assignments = await SubjectAssignment.find({ facultyId: faculty._id })
      .populate("subjectId", "code name credits type semester");

    return res.json({ faculty, assignments });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch faculty profile." });
  }
});

// Update faculty details
router.put("/:id", authMiddleware, requireRole("admin", "principal"), async (req, res) => {
  try {
    const { name, phone, department, designation, qualification, leaveBalance, status } = req.body;
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) return res.status(404).json({ message: "Faculty not found." });

    if (name) faculty.name = name.trim();
    if (phone !== undefined) faculty.phone = phone.trim();
    if (department) faculty.department = department.trim();
    if (designation) faculty.designation = designation;
    if (qualification) faculty.qualification = qualification;
    if (leaveBalance) faculty.leaveBalance = { ...faculty.leaveBalance, ...leaveBalance };
    if (status) faculty.status = status;

    await faculty.save();
    await logAudit(req, "UPDATE_FACULTY", "Faculty", faculty._id, { employeeId: faculty.employeeId });

    return res.json({ message: "Faculty updated successfully.", faculty });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update faculty." });
  }
});

// Get current logged-in faculty's schedule and assignments
router.get("/my/schedule", authMiddleware, async (req, res) => {
  try {
    const faculty = await Faculty.findOne({
      $or: [{ userId: req.user.sub }, { email: req.user.email }],
    });

    if (!faculty) {
      return res.status(404).json({ message: "Faculty profile not linked." });
    }

    const assignments = await SubjectAssignment.find({ facultyId: faculty._id })
      .populate("subjectId", "code name credits type semester");

    const timetable = await Timetable.find({ facultyId: faculty._id })
      .populate("subjectId", "code name")
      .sort({ dayOfWeek: 1, period: 1 });

    return res.json({ faculty, assignments, timetable });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch faculty schedule." });
  }
});

module.exports = router;
