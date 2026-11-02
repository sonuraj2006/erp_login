const express = require("express");
const Feedback = require("../models/feedback");
const Student = require("../models/student");
const Faculty = require("../models/faculty");
const Subject = require("../models/subject");
const { authMiddleware, requireRole } = require("../middleware/authMiddleware");
const { logAudit } = require("../services/auditService");

const router = express.Router();
router.use(authMiddleware);

// 1. Student submits feedback
router.post("/submit", async (req, res) => {
  try {
    const { facultyId, subjectId, department, semester, ratings, comments, isAnonymous = false } = req.body;

    if (!facultyId || !subjectId || !ratings || typeof ratings.overall !== "number") {
      return res.status(400).json({ message: "Faculty, subject, and valid rating metrics are required." });
    }

    let studentId = null;
    if (!isAnonymous) {
      const student = await Student.findOne({
        $or: [{ userId: req.user.sub }, { email: req.user.email }],
      });
      studentId = student ? student._id : null;
    }

    const feedback = await Feedback.create({
      studentId,
      isAnonymous: Boolean(isAnonymous),
      facultyId,
      subjectId,
      department: department || "CSE",
      semester: Number(semester || 5),
      ratings: {
        knowledge: Math.min(5, Math.max(1, Number(ratings.knowledge || 4))),
        communication: Math.min(5, Math.max(1, Number(ratings.communication || 4))),
        punctuality: Math.min(5, Math.max(1, Number(ratings.punctuality || 4))),
        engagement: Math.min(5, Math.max(1, Number(ratings.engagement || 4))),
        doubtClarification: Math.min(5, Math.max(1, Number(ratings.doubtClarification || 4))),
        overall: Math.min(5, Math.max(1, Number(ratings.overall || 4))),
      },
      comments: (comments || "").trim(),
    });

    await logAudit(req, "SUBMIT_FEEDBACK", "Feedback", feedback._id, {
      facultyId,
      subjectId,
      isAnonymous,
    });

    return res.status(201).json({
      message: "Thank you! Your feedback has been submitted successfully.",
      feedbackId: feedback._id,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to submit feedback." });
  }
});

// 2. Student view my submitted feedback history
router.get("/student-history", async (req, res) => {
  try {
    const student = await Student.findOne({
      $or: [{ userId: req.user.sub }, { email: req.user.email }],
    });

    if (!student) {
      return res.status(404).json({ message: "Student profile not found." });
    }

    const feedbacks = await Feedback.find({ studentId: student._id })
      .populate("facultyId", "name employeeId designation")
      .populate("subjectId", "code name")
      .sort({ createdAt: -1 });

    return res.json({ feedbacks });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch student feedback history." });
  }
});

// 3. Faculty view their own feedback (Aggregated analytics & comments)
router.get("/faculty-my", async (req, res) => {
  try {
    const faculty = await Faculty.findOne({
      $or: [{ userId: req.user.sub }, { email: req.user.email }],
    });

    if (!faculty) {
      return res.status(404).json({ message: "Faculty profile not found." });
    }

    const feedbacks = await Feedback.find({ facultyId: faculty._id })
      .populate("subjectId", "code name")
      .sort({ createdAt: -1 });

    if (feedbacks.length === 0) {
      return res.json({
        totalSubmissions: 0,
        averageRatings: {
          knowledge: 0,
          communication: 0,
          punctuality: 0,
          engagement: 0,
          doubtClarification: 0,
          overall: 0,
        },
        feedbacks: [],
      });
    }

    // Calculate averages
    const sums = { knowledge: 0, communication: 0, punctuality: 0, engagement: 0, doubtClarification: 0, overall: 0 };
    feedbacks.forEach((f) => {
      sums.knowledge += f.ratings.knowledge || 0;
      sums.communication += f.ratings.communication || 0;
      sums.punctuality += f.ratings.punctuality || 0;
      sums.engagement += f.ratings.engagement || 0;
      sums.doubtClarification += f.ratings.doubtClarification || 0;
      sums.overall += f.ratings.overall || 0;
    });

    const count = feedbacks.length;
    const averageRatings = {
      knowledge: Number((sums.knowledge / count).toFixed(2)),
      communication: Number((sums.communication / count).toFixed(2)),
      punctuality: Number((sums.punctuality / count).toFixed(2)),
      engagement: Number((sums.engagement / count).toFixed(2)),
      doubtClarification: Number((sums.doubtClarification / count).toFixed(2)),
      overall: Number((sums.overall / count).toFixed(2)),
    };

    // Anonymize individual student info before sending to faculty
    const sanitizedFeedbacks = feedbacks.map((f) => ({
      _id: f._id,
      subject: f.subjectId,
      department: f.department,
      semester: f.semester,
      ratings: f.ratings,
      comments: f.comments,
      createdAt: f.createdAt,
    }));

    return res.json({
      totalSubmissions: count,
      averageRatings,
      feedbacks: sanitizedFeedbacks,
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load faculty feedback." });
  }
});

// 4. HOD and Principal college or department summary
router.get("/summary", requireRole("hod", "principal", "admin"), async (req, res) => {
  try {
    const { department, facultyId } = req.query;
    const filter = {};
    if (department && department !== "all") filter.department = department;
    if (facultyId) filter.facultyId = facultyId;

    const feedbacks = await Feedback.find(filter)
      .populate("facultyId", "name employeeId department designation")
      .populate("subjectId", "code name");

    // Group by faculty
    const facultyMap = {};
    feedbacks.forEach((f) => {
      if (!f.facultyId) return;
      const fId = String(f.facultyId._id);
      if (!facultyMap[fId]) {
        facultyMap[fId] = {
          faculty: f.facultyId,
          count: 0,
          totalScore: 0,
          ratingsSum: { knowledge: 0, communication: 0, punctuality: 0, engagement: 0, doubtClarification: 0 },
        };
      }
      facultyMap[fId].count++;
      facultyMap[fId].totalScore += f.ratings.overall || 0;
      facultyMap[fId].ratingsSum.knowledge += f.ratings.knowledge || 0;
      facultyMap[fId].ratingsSum.communication += f.ratings.communication || 0;
      facultyMap[fId].ratingsSum.punctuality += f.ratings.punctuality || 0;
      facultyMap[fId].ratingsSum.engagement += f.ratings.engagement || 0;
      facultyMap[fId].ratingsSum.doubtClarification += f.ratings.doubtClarification || 0;
    });

    const summary = Object.values(facultyMap).map((item) => ({
      faculty: item.faculty,
      count: item.count,
      averageOverall: Number((item.totalScore / item.count).toFixed(2)),
      breakdown: {
        knowledge: Number((item.ratingsSum.knowledge / item.count).toFixed(2)),
        communication: Number((item.ratingsSum.communication / item.count).toFixed(2)),
        punctuality: Number((item.ratingsSum.punctuality / item.count).toFixed(2)),
        engagement: Number((item.ratingsSum.engagement / item.count).toFixed(2)),
        doubtClarification: Number((item.ratingsSum.doubtClarification / item.count).toFixed(2)),
      },
    })).sort((a, b) => b.averageOverall - a.averageOverall);

    return res.json({
      totalResponses: feedbacks.length,
      facultySummaries: summary,
      recentFeedbacks: feedbacks.slice(0, 50),
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to generate feedback summary." });
  }
});

module.exports = router;
