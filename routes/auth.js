const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");

const User = require("../models/user");
const Student = require("../models/student");
const Faculty = require("../models/faculty");
const { authMiddleware } = require("../middleware/authMiddleware");
const { logAudit } = require("../services/auditService");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many login attempts. Please try again after a few minutes.",
  },
});

// Universal ERP Login for Student, Faculty, HOD, Principal, Admin
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const inputIdentifier = email.trim();
    let user = await User.findOne({ email: inputIdentifier.toLowerCase() });

    // Allow students to log in using their Roll Number as well
    if (!user) {
      const studentDoc = await Student.findOne({
        rollNumber: { $regex: new RegExp(`^${inputIdentifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      });
      if (studentDoc) {
        if (studentDoc.userId) {
          user = await User.findById(studentDoc.userId);
        } else if (studentDoc.email) {
          user = await User.findOne({ email: studentDoc.email.toLowerCase() });
        }
      }
    }

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({
        message: "Invalid email/roll number or password.",
      });
    }

    if (user.status === "inactive") {
      return res.status(403).json({
        message: "Your account is deactivated. Please contact the administrator.",
      });
    }

    // Attach student or faculty profile info
    let profileData = null;
    if (user.role === "student") {
      profileData = await Student.findOne({
        $or: [{ userId: user._id }, { email: user.email }],
      });
    } else if (["faculty", "hod", "principal"].includes(user.role)) {
      profileData = await Faculty.findOne({
        $or: [{ userId: user._id }, { email: user.email }],
      });
    }

    const token = jwt.sign(
      {
        sub: user._id.toString(),
        role: user.role,
        email: user.email,
        name: user.name,
        department: user.department || (profileData ? profileData.department : ""),
        profileRef: profileData ? profileData._id.toString() : null,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    // Audit log login
    await logAudit(
      { user: { sub: user._id, name: user.name, email: user.email, role: user.role } },
      "LOGIN",
      "User",
      user._id,
      { role: user.role, email: user.email }
    );

    return res.json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department || (profileData ? profileData.department : ""),
        profile: profileData,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({
      message: "Unable to process login. Please try again later.",
    });
  }
});

// Get current user details and associated profile
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub).select("-passwordHash");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    let profile = null;
    if (user.role === "student") {
      profile = await Student.findOne({
        $or: [{ userId: user._id }, { email: user.email }],
      });
    } else if (["faculty", "hod", "principal"].includes(user.role)) {
      profile = await Faculty.findOne({
        $or: [{ userId: user._id }, { email: user.email }],
      });
    }

    return res.json({
      user: {
        ...user.toObject(),
        profile,
      },
    });
  } catch (error) {
    console.error("Profile error:", error.message);
    return res.status(500).json({ message: "Unable to retrieve profile." });
  }
});

// Change Password
router.post("/change-password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({
        message: "Current password and a new password (min 6 chars) are required.",
      });
    }

    const user = await User.findById(req.user.sub);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password." });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    await logAudit(req, "CHANGE_PASSWORD", "User", user._id, { email: user.email });

    return res.json({ message: "Password updated successfully." });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update password." });
  }
});

module.exports = router;
