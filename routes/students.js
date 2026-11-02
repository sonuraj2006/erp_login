const express = require("express");
const mongoose = require("mongoose");

const Student = require("../models/student");
const Attendance = require("../models/attendance");
const AttendanceRecord = require("../models/attendanceRecord");
const { authMiddleware, requireRole } = require("../middleware/authMiddleware");
const { logAudit } = require("../services/auditService");

const router = express.Router();
router.use(authMiddleware);

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET /api/students
// Support filtering by department, semester, section, classId, and search term
router.get("/", async (req, res) => {
  try {
    const filter = {};

    if (req.query.classId && req.query.classId.trim() && req.query.classId !== "all") {
      filter.classId = req.query.classId.trim();
    }
    if (req.query.department && req.query.department !== "all") {
      filter.department = req.query.department.trim();
    }
    if (req.query.semester && req.query.semester !== "all") {
      filter.semester = Number(req.query.semester);
    }
    if (req.query.section && req.query.section !== "all") {
      filter.section = req.query.section.trim();
    }

    if (typeof req.query.search === "string" && req.query.search.trim()) {
      const search = escapeRegex(req.query.search.trim());
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { rollNumber: { $regex: search, $options: "i" } },
        { studentId: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const students = await Student.find(filter)
      .sort({ department: 1, semester: 1, section: 1, rollNumber: 1 })
      .limit(500)
      .lean();

    return res.json({
      count: students.length,
      students,
    });
  } catch (error) {
    console.error("Student search error:", error);
    return res.status(500).json({ message: "Unable to process student request." });
  }
});

// GET /api/students/classes
router.get("/classes", async (req, res) => {
  try {
    const classes = await Student.distinct("classId");
    const departments = await Student.distinct("department");
    return res.json({
      classes: classes.filter(Boolean).sort(),
      departments: departments.filter(Boolean).sort(),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch classes." });
  }
});

// GET /api/students/:id
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid student ID." });
    }

    const student = await Student.findById(req.params.id).lean();
    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    return res.json({ student });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch student details." });
  }
});

// POST /api/students - Admin only
router.post("/", requireRole("admin"), async (req, res) => {
  try {
    const {
      studentId,
      name,
      rollNumber,
      department = "CSE",
      year = 3,
      semester = 5,
      section = "A",
      classId,
      email = "",
      phone = "",
      parentName,
      parentEmail,
      parentPhone = "",
    } = req.body;

    if (!studentId || !name || !rollNumber || !parentName || !parentEmail) {
      return res.status(400).json({
        message: "studentId, name, rollNumber, parentName, and parentEmail are required.",
      });
    }

    const studentClass = classId || `${department}-${section}`;

    const student = await Student.create({
      studentId: studentId.trim(),
      name: name.trim(),
      rollNumber: rollNumber.trim().toUpperCase(),
      department: department.trim().toUpperCase(),
      year: Number(year),
      semester: Number(semester),
      section: section.trim().toUpperCase(),
      classId: studentClass,
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      parentName: parentName.trim(),
      parentEmail: parentEmail.trim().toLowerCase(),
      parentPhone: parentPhone.trim(),
    });

    await logAudit(req, "CREATE_STUDENT", "Student", student._id, {
      rollNumber: student.rollNumber,
      name: student.name,
    });

    return res.status(201).json({
      message: "Student added successfully.",
      student,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "A student with this student ID or roll number already exists.",
      });
    }
    return res.status(500).json({ message: error.message || "Failed to add student." });
  }
});

// PUT /api/students/:id - Admin only
router.put("/:id", requireRole("admin"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid student ID." });
    }

    const updates = { ...req.body };
    delete updates._id;

    if (updates.rollNumber) updates.rollNumber = updates.rollNumber.trim().toUpperCase();
    if (updates.department) updates.department = updates.department.trim().toUpperCase();
    if (updates.section) updates.section = updates.section.trim().toUpperCase();
    if (updates.department && updates.section && !updates.classId) {
      updates.classId = `${updates.department}-${updates.section}`;
    }

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    await logAudit(req, "UPDATE_STUDENT", "Student", student._id, {
      rollNumber: student.rollNumber,
    });

    return res.json({
      message: "Student updated successfully.",
      student,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to update student." });
  }
});

// DELETE /api/students/:id - Admin only
router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid student ID." });
    }

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    const attExists =
      (await Attendance.exists({ studentId: student._id })) ||
      (await AttendanceRecord.exists({ studentId: student._id }));

    if (attExists) {
      return res.status(409).json({
        message: "Cannot delete student with attendance records. Deactivate account instead.",
      });
    }

    await Student.deleteOne({ _id: student._id });
    await logAudit(req, "DELETE_STUDENT", "Student", req.params.id, {
      rollNumber: student.rollNumber,
    });

    return res.json({ message: "Student deleted successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete student." });
  }
});

module.exports = router;
