const express = require("express");
const mongoose = require("mongoose");

const Student = require("../models/student");
const Attendance = require("../models/attendance");
const AttendanceSession = require("../models/attendanceSession");
const AttendanceRecord = require("../models/attendanceRecord");
const Subject = require("../models/subject");
const Faculty = require("../models/faculty");
const Notification = require("../models/notification");
const { authMiddleware, requireRole } = require("../middleware/authMiddleware");
const { logAudit } = require("../services/auditService");
const { sendAbsenceEmail, formatAbsenceMessage } = require("../services/emailService");

const router = express.Router();
router.use(authMiddleware);

function todayLocalDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

// ==================== MARK ATTENDANCE SESSION ====================
// Module 5: Attendance Tracker (Select subject, class, date, period; mark Present, Absent, OD; prevent duplicates)
router.post("/session", async (req, res) => {
  try {
    const {
      department,
      semester,
      section,
      subjectId,
      date = todayLocalDate(),
      period,
      records, // array of { studentId, status: "Present"|"Absent"|"On Duty", remarks }
      isSubstituted = false,
      substituteReason = "",
      originalFacultyId,
    } = req.body;

    if (!department || !semester || !section || !subjectId || !period || !Array.isArray(records)) {
      return res.status(400).json({
        message: "Department, semester, section, subjectId, period, and records array are required.",
      });
    }

    // 1. Prevent duplicate attendance entries for the same class and period
    const existing = await AttendanceSession.findOne({
      department: department.trim().toUpperCase(),
      semester: Number(semester),
      section: section.trim().toUpperCase(),
      date,
      period: Number(period),
    });

    if (existing) {
      return res.status(409).json({
        message: `Attendance already submitted for ${department} Sem ${semester} Sec ${section} on ${date} (Period ${period}). Duplicate entries are prevented.`,
      });
    }

    // Determine faculty ID from user token or profileRef
    let faculty = null;
    if (req.user.role === "faculty" || req.user.role === "hod" || req.user.role === "principal") {
      faculty = await Faculty.findOne({
        $or: [{ userId: req.user.sub }, { email: req.user.email }],
      });
    }

    const markedByFacultyId = faculty ? faculty._id : (originalFacultyId || null);
    const origFacultyId = originalFacultyId || markedByFacultyId;

    let presentCount = 0;
    let absentCount = 0;
    let odCount = 0;

    records.forEach((r) => {
      if (r.status === "Present") presentCount++;
      else if (r.status === "Absent") absentCount++;
      else if (r.status === "On Duty") odCount++;
      else presentCount++; // default
    });

    const session = await AttendanceSession.create({
      department: department.trim().toUpperCase(),
      semester: Number(semester),
      section: section.trim().toUpperCase(),
      subjectId,
      date,
      period: Number(period),
      originalFacultyId: origFacultyId || markedByFacultyId,
      markedByFacultyId: markedByFacultyId || origFacultyId,
      isSubstituted: Boolean(isSubstituted),
      substituteReason: substituteReason || "",
      totalStudents: records.length,
      presentCount,
      absentCount,
      odCount,
      status: "Submitted",
    });

    // Bulk create attendance records
    const recordDocs = records.map((r) => ({
      sessionId: session._id,
      studentId: r.studentId,
      date,
      status: ["Present", "Absent", "On Duty"].includes(r.status) ? r.status : "Present",
      remarks: r.remarks || "",
      markedBy: markedByFacultyId,
    }));

    if (recordDocs.length > 0) {
      await AttendanceRecord.insertMany(recordDocs);
    }

    // Send notifications for absent students if applicable
    const absentStudentIds = records.filter((r) => r.status === "Absent").map((r) => r.studentId);
    if (absentStudentIds.length > 0) {
      const absentStudents = await Student.find({ _id: { $in: absentStudentIds } });
      for (const st of absentStudents) {
        try {
          await Notification.create({
            studentId: st._id,
            parentContact: st.parentEmail,
            title: "Absence Alert",
            message: `Dear Parent, ${st.name} (Roll: ${st.rollNumber}) was marked Absent on ${date} for Period ${period}.`,
            type: "attendance",
            deliveryStatus: "Sent",
          });
        } catch (notifErr) {
          // ignore background notification error
        }
      }
    }

    await logAudit(req, "MARK_ATTENDANCE", "AttendanceSession", session._id, {
      class: `${department}-${semester}-${section}`,
      period,
      date,
      presentCount,
      absentCount,
      odCount,
    });

    return res.status(201).json({
      message: `Attendance recorded successfully for Period ${period} (${presentCount} Present, ${absentCount} Absent, ${odCount} OD).`,
      session,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Attendance entry collision: an entry for this class and period already exists.",
      });
    }
    console.error("Attendance session submission error:", error);
    return res.status(500).json({ message: error.message || "Failed to record attendance session." });
  }
});

// ==================== ATTENDANCE COPY / FACULTY SUBSTITUTION ====================
// Module 6: Attendance Copy / Faculty Substitution
router.post("/copy", async (req, res) => {
  try {
    const {
      sourceSessionId,
      targetDate = todayLocalDate(),
      targetPeriod,
      substituteFacultyId,
      reason,
    } = req.body;

    if (!sourceSessionId || !targetPeriod || !reason) {
      return res.status(400).json({
        message: "sourceSessionId, targetPeriod, and reason are required.",
      });
    }

    const sourceSession = await AttendanceSession.findById(sourceSessionId);
    if (!sourceSession) {
      return res.status(404).json({ message: "Source attendance session not found." });
    }

    // Check collision for target session
    const existing = await AttendanceSession.findOne({
      department: sourceSession.department,
      semester: sourceSession.semester,
      section: sourceSession.section,
      date: targetDate,
      period: Number(targetPeriod),
    });

    if (existing) {
      return res.status(409).json({
        message: `An attendance record already exists for ${sourceSession.department} Sec ${sourceSession.section} on ${targetDate} (Period ${targetPeriod}).`,
      });
    }

    // Determine substitute faculty
    let subFacultyId = substituteFacultyId;
    if (!subFacultyId) {
      const myFac = await Faculty.findOne({
        $or: [{ userId: req.user.sub }, { email: req.user.email }],
      });
      subFacultyId = myFac ? myFac._id : sourceSession.originalFacultyId;
    }

    // Fetch existing records from source session
    const sourceRecords = await AttendanceRecord.find({ sessionId: sourceSession._id });

    // Create copied session
    const newSession = await AttendanceSession.create({
      department: sourceSession.department,
      semester: sourceSession.semester,
      section: sourceSession.section,
      subjectId: sourceSession.subjectId,
      date: targetDate,
      period: Number(targetPeriod),
      originalFacultyId: sourceSession.originalFacultyId,
      markedByFacultyId: subFacultyId,
      isSubstituted: true,
      substituteReason: reason,
      totalStudents: sourceSession.totalStudents,
      presentCount: sourceSession.presentCount,
      absentCount: sourceSession.absentCount,
      odCount: sourceSession.odCount,
      status: "Copied",
      copiedFromSessionId: sourceSession._id,
      copiedByUserId: req.user.sub,
      copiedAt: new Date(),
    });

    // Copy records
    const copiedRecordDocs = sourceRecords.map((r) => ({
      sessionId: newSession._id,
      studentId: r.studentId,
      date: targetDate,
      status: r.status,
      remarks: `Copied from session on ${sourceSession.date} Period ${sourceSession.period}`,
      markedBy: subFacultyId,
    }));

    if (copiedRecordDocs.length > 0) {
      await AttendanceRecord.insertMany(copiedRecordDocs);
    }

    await logAudit(req, "COPY_ATTENDANCE", "AttendanceSession", newSession._id, {
      copiedFrom: sourceSession._id,
      sourceDate: sourceSession.date,
      targetDate,
      period: targetPeriod,
      reason,
    });

    return res.status(201).json({
      message: `Attendance copied successfully to Period ${targetPeriod} by substitute faculty.`,
      session: newSession,
    });
  } catch (error) {
    console.error("Attendance copy error:", error);
    return res.status(500).json({ message: error.message || "Failed to copy attendance." });
  }
});

// ==================== LIST ATTENDANCE SESSIONS ====================
router.get("/sessions", async (req, res) => {
  try {
    const { department, semester, section, date, facultyId, subjectId } = req.query;
    const filter = {};

    if (department && department !== "all") filter.department = department;
    if (semester && semester !== "all") filter.semester = Number(semester);
    if (section && section !== "all") filter.section = section;
    if (date) filter.date = date;
    if (facultyId) {
      filter.$or = [{ originalFacultyId: facultyId }, { markedByFacultyId: facultyId }];
    }
    if (subjectId) filter.subjectId = subjectId;

    const sessions = await AttendanceSession.find(filter)
      .populate("subjectId", "code name credits")
      .populate("originalFacultyId", "name employeeId email")
      .populate("markedByFacultyId", "name employeeId email")
      .sort({ date: -1, period: -1 });

    return res.json({ sessions });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch attendance sessions." });
  }
});

// ==================== SESSION DETAILS ====================
router.get("/sessions/:id", async (req, res) => {
  try {
    const session = await AttendanceSession.findById(req.params.id)
      .populate("subjectId", "code name credits")
      .populate("originalFacultyId", "name employeeId")
      .populate("markedByFacultyId", "name employeeId");

    if (!session) return res.status(404).json({ message: "Session not found." });

    const records = await AttendanceRecord.find({ sessionId: session._id })
      .populate("studentId", "rollNumber name studentId parentEmail")
      .sort({ "studentId.rollNumber": 1 });

    return res.json({ session, records });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch session details." });
  }
});

// ==================== STUDENT ATTENDANCE STATS & SHORTAGE ====================
// Module 1 & Module 5: Student view attendance, subject-wise %, shortage alerts (<75%)
router.get("/student/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    let student = null;

    if (mongoose.isValidObjectId(studentId)) {
      student = await Student.findById(studentId);
    } else {
      student = await Student.findOne({
        $or: [{ rollNumber: studentId }, { studentId: studentId }],
      });
    }

    if (!student) {
      return res.status(404).json({ message: "Student record not found." });
    }

    // Fetch all attendance records for this student
    const records = await AttendanceRecord.find({ studentId: student._id })
      .populate({
        path: "sessionId",
        populate: [
          { path: "subjectId", select: "code name credits" },
          { path: "markedByFacultyId", select: "name employeeId" },
        ],
      })
      .sort({ date: -1 });

    // Aggregate statistics
    let totalClasses = records.length;
    let presentCount = 0;
    let absentCount = 0;
    let odCount = 0;

    const subjectMap = {};

    records.forEach((r) => {
      const status = r.status;
      if (status === "Present") presentCount++;
      else if (status === "Absent") absentCount++;
      else if (status === "On Duty") {
        odCount++;
        // College ERP standard: On Duty is treated as attended / permitted
        presentCount++;
      }

      const subject = r.sessionId && r.sessionId.subjectId ? r.sessionId.subjectId : null;
      const subKey = subject ? subject.code : "General";
      const subName = subject ? subject.name : "Core Subject";

      if (!subjectMap[subKey]) {
        subjectMap[subKey] = {
          code: subKey,
          name: subName,
          total: 0,
          present: 0,
          absent: 0,
          od: 0,
        };
      }

      subjectMap[subKey].total++;
      if (status === "Present") subjectMap[subKey].present++;
      else if (status === "Absent") subjectMap[subKey].absent++;
      else if (status === "On Duty") {
        subjectMap[subKey].od++;
        subjectMap[subKey].present++;
      }
    });

    const overallPercentage = totalClasses > 0 ? Number(((presentCount / totalClasses) * 100).toFixed(1)) : 100;
    const isShortage = overallPercentage < 75;

    const subjectWise = Object.values(subjectMap).map((s) => ({
      ...s,
      percentage: s.total > 0 ? Number(((s.present / s.total) * 100).toFixed(1)) : 100,
      isShortage: s.total > 0 ? (s.present / s.total) * 100 < 75 : false,
    }));

    return res.json({
      student,
      totalClasses,
      presentCount,
      absentCount,
      odCount,
      overallPercentage,
      isShortage,
      subjectWise,
      recentRecords: records.slice(0, 30),
    });
  } catch (err) {
    console.error("Student attendance error:", err);
    return res.status(500).json({ message: "Failed to calculate student attendance." });
  }
});

// ==================== DAILY & MONTHLY ATTENDANCE REPORTS ====================
router.get("/report/daily", async (req, res) => {
  try {
    const date = req.query.date || todayLocalDate();
    const { department, semester, section } = req.query;

    const sessionFilter = { date };
    if (department && department !== "all") sessionFilter.department = department;
    if (semester && semester !== "all") sessionFilter.semester = Number(semester);
    if (section && section !== "all") sessionFilter.section = section;

    const sessions = await AttendanceSession.find(sessionFilter)
      .populate("subjectId", "code name")
      .populate("markedByFacultyId", "name employeeId");

    let totalStudents = 0;
    let presentCount = 0;
    let absentCount = 0;
    let odCount = 0;

    sessions.forEach((s) => {
      totalStudents += s.totalStudents;
      presentCount += s.presentCount;
      absentCount += s.absentCount;
      odCount += s.odCount;
    });

    const overallRate = totalStudents > 0 ? Number(((presentCount / totalStudents) * 100).toFixed(1)) : 0;

    return res.json({
      date,
      sessionCount: sessions.length,
      totalStudents,
      presentCount,
      absentCount,
      odCount,
      overallRate,
      sessions,
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to generate daily report." });
  }
});

router.get("/report/monthly", async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const { department, semester, section } = req.query;

    const filter = { date: { $regex: `^${month}` } };
    if (department && department !== "all") filter.department = department;
    if (semester && semester !== "all") filter.semester = Number(semester);
    if (section && section !== "all") filter.section = section;

    const sessions = await AttendanceSession.find(filter);
    const sessionIds = sessions.map((s) => s._id);

    const records = await AttendanceRecord.find({ sessionId: { $in: sessionIds } })
      .populate("studentId", "name rollNumber department semester section studentId");

    const studentAggregation = {};
    records.forEach((r) => {
      if (!r.studentId) return;
      const sId = String(r.studentId._id);
      if (!studentAggregation[sId]) {
        studentAggregation[sId] = {
          student: r.studentId,
          total: 0,
          present: 0,
          absent: 0,
          od: 0,
        };
      }
      studentAggregation[sId].total++;
      if (r.status === "Present") studentAggregation[sId].present++;
      else if (r.status === "Absent") studentAggregation[sId].absent++;
      else if (r.status === "On Duty") {
        studentAggregation[sId].od++;
        studentAggregation[sId].present++;
      }
    });

    const report = Object.values(studentAggregation).map((item) => {
      const percentage = item.total > 0 ? Number(((item.present / item.total) * 100).toFixed(1)) : 100;
      return {
        ...item,
        percentage,
        isShortage: percentage < 75,
      };
    }).sort((a, b) => a.student.rollNumber.localeCompare(b.student.rollNumber));

    return res.json({
      month,
      totalSessions: sessions.length,
      studentCount: report.length,
      students: report,
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to generate monthly report." });
  }
});

// Legacy backward-compatible sheet and batch endpoints for existing web forms
router.get("/sheet", async (req, res) => {
  try {
    const { classId } = req.query;
    const date = req.query.date || todayLocalDate();
    if (!classId) return res.status(400).json({ message: "classId required." });

    const students = await Student.find({ classId: classId.trim() }).sort({ rollNumber: 1 });
    return res.json({ classId, date, count: students.length, students });
  } catch (err) {
    return res.status(500).json({ message: "Error loading sheet." });
  }
});

module.exports = router;
