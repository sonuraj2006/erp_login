const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/user");
const Faculty = require("../models/faculty");
const Student = require("../models/student");
const { authMiddleware, requireRole } = require("../middleware/authMiddleware");
const { logAudit } = require("../services/auditService");

const router = express.Router();

// List all users with filtering
router.get("/", authMiddleware, requireRole("admin", "principal"), async (req, res) => {
  try {
    const { role, status, search } = req.query;
    const filter = {};

    if (role && role !== "all") filter.role = role;
    if (status && status !== "all") filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(filter)
      .select("-passwordHash")
      .sort({ createdAt: -1 });

    return res.json({ users });
  } catch (error) {
    console.error("List users error:", error.message);
    return res.status(500).json({ message: "Failed to load users." });
  }
});

// Admin creates user account for any role (Student, Faculty, HOD, Principal, Admin)
router.post("/", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { name, email, password, role, department, phone, profileData } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        message: "Name, email, password, and role are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "A user with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role,
      department: department || "",
      phone: phone || "",
      status: "active",
    });

    // Create linked profile if applicable
    if (role === "student" && profileData) {
      const student = await Student.create({
        studentId: profileData.studentId || `STU-${Date.now().toString().slice(-4)}`,
        name: user.name,
        rollNumber: profileData.rollNumber || `ROLL-${Date.now().toString().slice(-4)}`,
        email: user.email,
        phone: user.phone,
        department: user.department || "CSE",
        year: Number(profileData.year || 3),
        semester: Number(profileData.semester || 5),
        section: profileData.section || "A",
        classId: `${user.department || "CSE"}-${profileData.section || "A"}`,
        parentName: profileData.parentName || "Parent",
        parentEmail: profileData.parentEmail || `parent.${normalizedEmail}`,
        parentPhone: profileData.parentPhone || user.phone,
        userId: user._id,
      });
      user.profileRef = student._id;
      await user.save();
    } else if (["faculty", "hod", "principal"].includes(role) && profileData) {
      const faculty = await Faculty.create({
        employeeId: profileData.employeeId || `EMP-${Date.now().toString().slice(-4)}`,
        name: user.name,
        email: user.email,
        phone: user.phone,
        department: user.department || "CSE",
        designation: profileData.designation || (role === "hod" ? "Head of Department" : role === "principal" ? "Principal" : "Assistant Professor"),
        qualification: profileData.qualification || "M.Tech, Ph.D.",
        userId: user._id,
      });
      user.profileRef = faculty._id;
      await user.save();
    }

    await logAudit(req, "CREATE_USER", "User", user._id, {
      name: user.name,
      email: user.email,
      role: user.role,
    });

    return res.status(201).json({
      message: `${role.toUpperCase()} user created successfully.`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Create user error:", error.message);
    return res.status(500).json({ message: error.message || "Failed to create user." });
  }
});

// Toggle activate/deactivate account
router.patch("/:id/status", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { status } = req.body;
    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.status = status;
    await user.save();

    await logAudit(req, "UPDATE_USER_STATUS", "User", user._id, {
      email: user.email,
      newStatus: status,
    });

    return res.json({ message: `User marked as ${status}.`, user });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update user status." });
  }
});

// Admin reset password
router.post("/:id/reset-password", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    await logAudit(req, "RESET_PASSWORD", "User", user._id, { email: user.email });

    return res.json({ message: "Password reset successfully." });
  } catch (err) {
    return res.status(500).json({ message: "Failed to reset password." });
  }
});

module.exports = router;
