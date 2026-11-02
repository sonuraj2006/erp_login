const express = require("express");
const mongoose = require("mongoose");
const Notification = require("../models/notification");
const Attendance = require("../models/attendance");
const Student = require("../models/student");
const { authMiddleware } = require("../middleware/authMiddleware");
const { sendAbsenceEmail } = require("../services/emailService");

const router = express.Router();
router.use(authMiddleware);

// GET /api/notifications/my - Get user-specific and role notifications
router.get("/my", async (req, res) => {
  try {
    const userId = req.user.sub;
    const role = req.user.role;

    const notifications = await Notification.find({
      $or: [
        { userId },
        { targetRole: role },
        { targetRole: "all" },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return res.json({ notifications, unreadCount });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch notifications." });
  }
});

// Mark single notification as read
router.patch("/:id/read", async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    return res.json({ message: "Notification marked as read." });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update notification." });
  }
});

// Mark all as read
router.post("/mark-all-read", async (req, res) => {
  try {
    const userId = req.user.sub;
    const role = req.user.role;

    await Notification.updateMany(
      {
        $or: [{ userId }, { targetRole: role }, { targetRole: "all" }],
        isRead: false,
      },
      { isRead: true }
    );

    return res.json({ message: "All notifications marked as read." });
  } catch (err) {
    return res.status(500).json({ message: "Failed to mark all as read." });
  }
});

// Legacy parent absence notifications list
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.status && ["Sent", "Failed", "Pending"].includes(req.query.status)) {
      filter.deliveryStatus = req.query.status;
    }

    const notifications = await Notification.find(filter)
      .populate("studentId", "studentId name rollNumber classId parentName parentEmail parentPhone")
      .populate("attendanceId", "date status notificationStatus")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.json({
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to retrieve notifications." });
  }
});

// Retry parent absence email
router.post("/:id/retry", async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate("studentId")
      .populate("attendanceId");

    if (!notification) {
      return res.status(404).json({ message: "Notification not found." });
    }

    const student = notification.studentId;
    const attendance = notification.attendanceId;

    if (!student || !attendance) {
      return res.status(400).json({ message: "Associated student or attendance record not found." });
    }

    notification.attempts = (notification.attempts || 0) + 1;

    try {
      await sendAbsenceEmail({ student, attendanceDate: attendance.date });
      notification.deliveryStatus = "Sent";
      notification.sentAt = new Date();
      await notification.save();

      return res.json({ message: "Email re-sent successfully.", notification });
    } catch (emailError) {
      notification.deliveryStatus = "Failed";
      await notification.save();
      return res.status(500).json({ message: `Retry failed: ${emailError.message}`, notification });
    }
  } catch (error) {
    return res.status(500).json({ message: "Unable to retry notification." });
  }
});

module.exports = router;
