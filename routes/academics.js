const express = require("express");
const Department = require("../models/department");
const Subject = require("../models/subject");
const SubjectAssignment = require("../models/subjectAssignment");
const Timetable = require("../models/timetable");
const Faculty = require("../models/faculty");
const { authMiddleware, requireRole } = require("../middleware/authMiddleware");
const { logAudit } = require("../services/auditService");

const router = express.Router();

// ==================== DEPARTMENTS ====================
router.get("/departments", authMiddleware, async (req, res) => {
  try {
    const departments = await Department.find()
      .populate("hodFacultyId", "name employeeId email designation")
      .sort({ code: 1 });
    return res.json({ departments });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch departments." });
  }
});

router.post("/departments", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { code, name, description, intake, hodFacultyId } = req.body;
    if (!code || !name) {
      return res.status(400).json({ message: "Department code and name are required." });
    }

    const dept = await Department.create({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      description: description || "",
      intake: intake ? Number(intake) : 120,
      hodFacultyId: hodFacultyId || null,
    });

    await logAudit(req, "CREATE_DEPARTMENT", "Department", dept._id, { code: dept.code });
    return res.status(201).json({ message: "Department created successfully.", department: dept });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to create department." });
  }
});

router.put("/departments/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { name, description, intake, hodFacultyId, status } = req.body;
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ message: "Department not found." });

    if (name) dept.name = name.trim();
    if (description !== undefined) dept.description = description;
    if (intake) dept.intake = Number(intake);
    if (hodFacultyId !== undefined) dept.hodFacultyId = hodFacultyId || null;
    if (status) dept.status = status;

    await dept.save();
    await logAudit(req, "UPDATE_DEPARTMENT", "Department", dept._id, { code: dept.code });
    return res.json({ message: "Department updated successfully.", department: dept });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update department." });
  }
});

// ==================== SUBJECTS ====================
router.get("/subjects", authMiddleware, async (req, res) => {
  try {
    const { department, semester } = req.query;
    const filter = {};
    if (department && department !== "all") {
      const escapedDept = department.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.department = { $regex: new RegExp(`^${escapedDept}$`, "i") };
    }
    if (semester && semester !== "all") filter.semester = Number(semester);

    const subjects = await Subject.find(filter).sort({ semester: 1, code: 1 });
    const allSubjects = await Subject.find().sort({ department: 1, semester: 1, code: 1 });
    return res.json({ subjects, allSubjects });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch subjects." });
  }
});

router.post("/subjects", authMiddleware, requireRole("admin", "hod"), async (req, res) => {
  try {
    const { code, name, department, semester, credits, type } = req.body;
    if (!code || !name || !department || !semester) {
      return res.status(400).json({ message: "Code, name, department, and semester are required." });
    }

    const subject = await Subject.create({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      department: department.trim(),
      semester: Number(semester),
      credits: Number(credits || 3),
      type: type || "Theory",
    });

    await logAudit(req, "CREATE_SUBJECT", "Subject", subject._id, { code: subject.code });
    return res.status(201).json({ message: "Subject added successfully.", subject });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: `Subject code "${req.body.code}" already exists.` });
    }
    return res.status(500).json({ message: err.message || "Failed to create subject." });
  }
});

router.delete("/subjects/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) return res.status(404).json({ message: "Subject not found." });

    await logAudit(req, "DELETE_SUBJECT", "Subject", req.params.id, { code: subject.code });
    return res.json({ message: "Subject removed." });
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete subject." });
  }
});

// ==================== SUBJECT ALLOCATION ====================
router.get("/assignments", authMiddleware, async (req, res) => {
  try {
    const { facultyId, department, section, semester } = req.query;
    const filter = {};
    if (facultyId) filter.facultyId = facultyId;
    if (department && department !== "all") filter.department = department;
    if (section && section !== "all") filter.section = section;
    if (semester && semester !== "all") filter.semester = Number(semester);

    const assignments = await SubjectAssignment.find(filter)
      .populate("facultyId", "name employeeId email designation")
      .populate("subjectId", "code name credits type semester")
      .sort({ department: 1, semester: 1, section: 1 });

    return res.json({ assignments });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch subject assignments." });
  }
});

router.post("/assignments", authMiddleware, requireRole("admin", "hod"), async (req, res) => {
  try {
    const { facultyId, subjectId, department, semester, section, academicYear } = req.body;
    if (!facultyId || !subjectId || !department || !semester || !section) {
      return res.status(400).json({ message: "All allocation fields are required." });
    }

    const assignment = await SubjectAssignment.create({
      facultyId,
      subjectId,
      department,
      semester: Number(semester),
      section: section.trim().toUpperCase(),
      academicYear: academicYear || "2026-2027",
    });

    const populated = await SubjectAssignment.findById(assignment._id)
      .populate("facultyId", "name employeeId")
      .populate("subjectId", "code name");

    await logAudit(req, "ALLOCATE_SUBJECT", "SubjectAssignment", assignment._id, {
      faculty: populated.facultyId?.name,
      subject: populated.subjectId?.name,
      section,
    });

    return res.status(201).json({ message: "Subject assigned successfully.", assignment: populated });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "This subject is already assigned to this faculty for this section." });
    }
    return res.status(500).json({ message: err.message || "Failed to allocate subject." });
  }
});

router.delete("/assignments/:id", authMiddleware, requireRole("admin", "hod"), async (req, res) => {
  try {
    const item = await SubjectAssignment.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: "Assignment not found." });
    return res.json({ message: "Subject assignment revoked." });
  } catch (err) {
    return res.status(500).json({ message: "Failed to revoke assignment." });
  }
});

// ==================== TIMETABLES ====================
router.get("/timetable", authMiddleware, async (req, res) => {
  try {
    const { department, semester, section, facultyId, dayOfWeek } = req.query;
    const filter = {};
    if (department && department !== "all") filter.department = department;
    if (semester && semester !== "all") filter.semester = Number(semester);
    if (section && section !== "all") filter.section = section;
    if (facultyId) filter.facultyId = facultyId;
    if (dayOfWeek && dayOfWeek !== "all") filter.dayOfWeek = dayOfWeek;

    const slots = await Timetable.find(filter)
      .populate("facultyId", "name employeeId")
      .populate("subjectId", "code name")
      .sort({ dayOfWeek: 1, period: 1 });

    return res.json({ slots });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch timetable." });
  }
});

router.post("/timetable", authMiddleware, requireRole("admin", "hod"), async (req, res) => {
  try {
    const { dayOfWeek, period, startTime, endTime, room, department, semester, section, subjectId, facultyId } = req.body;
    if (!dayOfWeek || !period || !department || !semester || !section || !subjectId || !facultyId) {
      return res.status(400).json({ message: "Missing required timetable parameters." });
    }

    // Check collision for class section
    const classCollision = await Timetable.findOne({
      department,
      semester: Number(semester),
      section,
      dayOfWeek,
      period: Number(period),
    });
    if (classCollision) {
      return res.status(409).json({
        message: `Collision: Period ${period} on ${dayOfWeek} is already occupied for ${department} Sem ${semester} Sec ${section}.`,
      });
    }

    // Check faculty availability collision
    const facultyCollision = await Timetable.findOne({
      facultyId,
      dayOfWeek,
      period: Number(period),
    });
    if (facultyCollision) {
      return res.status(409).json({
        message: `Faculty Collision: This faculty is already assigned to another class during Period ${period} on ${dayOfWeek}.`,
      });
    }

    const slot = await Timetable.create({
      dayOfWeek,
      period: Number(period),
      startTime: startTime || (period === 1 ? "09:30 AM" : period === 2 ? "10:30 AM" : period === 3 ? "11:30 AM" : period === 4 ? "01:15 PM" : "02:15 PM"),
      endTime: endTime || (period === 1 ? "10:30 AM" : period === 2 ? "11:30 AM" : period === 3 ? "12:30 PM" : period === 4 ? "02:15 PM" : "03:15 PM"),
      room: room || "LH-101",
      department,
      semester: Number(semester),
      section,
      subjectId,
      facultyId,
    });

    const populated = await Timetable.findById(slot._id)
      .populate("facultyId", "name employeeId")
      .populate("subjectId", "code name");

    await logAudit(req, "CREATE_TIMETABLE_SLOT", "Timetable", slot._id, {
      day: dayOfWeek,
      period,
      class: `${department}-${semester}-${section}`,
    });

    return res.status(201).json({ message: "Timetable period scheduled.", slot: populated });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to schedule timetable slot." });
  }
});

router.delete("/timetable/:id", authMiddleware, requireRole("admin", "hod"), async (req, res) => {
  try {
    const slot = await Timetable.findByIdAndDelete(req.params.id);
    if (!slot) return res.status(404).json({ message: "Timetable entry not found." });
    return res.json({ message: "Timetable slot deleted." });
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete slot." });
  }
});

module.exports = router;
