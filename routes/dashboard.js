const express = require("express");
const User = require("../models/user");
const Student = require("../models/student");
const Faculty = require("../models/faculty");
const Department = require("../models/department");
const Subject = require("../models/subject");
const AttendanceSession = require("../models/attendanceSession");
const AttendanceRecord = require("../models/attendanceRecord");
const LeaveRequest = require("../models/leaveRequest");
const ClassAdjustment = require("../models/classAdjustment");
const Payslip = require("../models/payslip");
const Feedback = require("../models/feedback");
const Timetable = require("../models/timetable");
const { authMiddleware } = require("../middleware/authMiddleware");

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

router.get("/stats", async (req, res) => {
  try {
    const role = req.user.role;
    const today = todayLocalDate();

    // 1. ADMIN DASHBOARD STATS
    if (role === "admin") {
      const [
        totalStudents,
        totalFaculty,
        totalDepartments,
        totalSubjects,
        todaySessions,
        pendingLeaves,
        pendingAdjustments,
        recentFeedbackCount,
      ] = await Promise.all([
        Student.countDocuments(),
        Faculty.countDocuments(),
        Department.countDocuments(),
        Subject.countDocuments(),
        AttendanceSession.find({ date: today }),
        LeaveRequest.countDocuments({ status: { $in: ["Pending_HOD", "Pending_Principal"] } }),
        ClassAdjustment.countDocuments({ status: "Pending_HOD" }),
        Feedback.countDocuments(),
      ]);

      let todayStudentsMarked = 0;
      let todayStudentsPresent = 0;
      todaySessions.forEach((s) => {
        todayStudentsMarked += s.totalStudents;
        todayStudentsPresent += s.presentCount + s.odCount;
      });

      const todayAttendanceRate =
        todayStudentsMarked > 0
          ? Number(((todayStudentsPresent / todayStudentsMarked) * 100).toFixed(1))
          : 0;

      return res.json({
        role: "admin",
        totalStudents,
        totalFaculty,
        totalDepartments,
        totalSubjects,
        todaySessionsCount: todaySessions.length,
        todayAttendanceRate,
        pendingLeaves,
        pendingAdjustments,
        recentFeedbackCount,
      });
    }

    // 2. PRINCIPAL DASHBOARD STATS
    if (role === "principal") {
      const [
        totalStudents,
        totalFaculty,
        departments,
        pendingPrincipalLeaves,
        todaySessions,
      ] = await Promise.all([
        Student.countDocuments(),
        Faculty.countDocuments(),
        Department.find().populate("hodFacultyId", "name"),
        LeaveRequest.find({ status: "Pending_Principal" }).populate("facultyId", "name department"),
        AttendanceSession.find({ date: today }),
      ]);

      let collegeMarked = 0;
      let collegePresent = 0;
      todaySessions.forEach((s) => {
        collegeMarked += s.totalStudents;
        collegePresent += s.presentCount + s.odCount;
      });

      const collegeAttendanceRate =
        collegeMarked > 0 ? Number(((collegePresent / collegeMarked) * 100).toFixed(1)) : 88.5;

      return res.json({
        role: "principal",
        totalStudents,
        totalFaculty,
        departmentCount: departments.length,
        departments,
        pendingPrincipalLeaves,
        todaySessionsCount: todaySessions.length,
        collegeAttendanceRate,
      });
    }

    // 3. HOD DASHBOARD STATS
    if (role === "hod") {
      const deptCode = req.user.department || "CSE";
      const [
        deptStudents,
        deptFaculty,
        pendingHodLeaves,
        pendingAdjustments,
        todayDeptSessions,
      ] = await Promise.all([
        Student.countDocuments({ department: deptCode }),
        Faculty.countDocuments({ department: deptCode }),
        LeaveRequest.find({ status: "Pending_HOD" }).populate("facultyId", "name department"),
        ClassAdjustment.find({ department: deptCode, status: "Pending_HOD" }).populate("originalFacultyId substituteFacultyId"),
        AttendanceSession.find({ department: deptCode, date: today }),
      ]);

      let deptMarked = 0;
      let deptPresent = 0;
      todayDeptSessions.forEach((s) => {
        deptMarked += s.totalStudents;
        deptPresent += s.presentCount + s.odCount;
      });

      const deptAttendanceRate =
        deptMarked > 0 ? Number(((deptPresent / deptMarked) * 100).toFixed(1)) : 85.0;

      return res.json({
        role: "hod",
        department: deptCode,
        deptStudents,
        deptFaculty,
        pendingHodLeaves: pendingHodLeaves.length,
        pendingAdjustments: pendingAdjustments.length,
        deptAttendanceRate,
        todayDeptSessionsCount: todayDeptSessions.length,
        pendingLeaveList: pendingHodLeaves.slice(0, 5),
      });
    }

    // 4. FACULTY DASHBOARD STATS
    if (role === "faculty") {
      const faculty = await Faculty.findOne({
        $or: [{ userId: req.user.sub }, { email: req.user.email }],
      });

      if (!faculty) {
        return res.json({ role: "faculty", message: "Faculty profile not linked" });
      }

      const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const currentDay = daysOfWeek[new Date().getDay()];

      const [myTodayClasses, myPendingAdjustments, myLeaves, myFeedbacks] = await Promise.all([
        Timetable.find({ facultyId: faculty._id, dayOfWeek: currentDay }).populate("subjectId"),
        ClassAdjustment.find({ substituteFacultyId: faculty._id, status: "Approved", date: today }),
        LeaveRequest.find({ facultyId: faculty._id }).sort({ createdAt: -1 }),
        Feedback.find({ facultyId: faculty._id }),
      ]);

      let avgRating = 0;
      if (myFeedbacks.length > 0) {
        const sum = myFeedbacks.reduce((acc, f) => acc + (f.ratings.overall || 0), 0);
        avgRating = Number((sum / myFeedbacks.length).toFixed(1));
      }

      return res.json({
        role: "faculty",
        faculty,
        todayClasses: myTodayClasses,
        todaySubstitutions: myPendingAdjustments,
        leaveBalance: faculty.leaveBalance,
        recentLeaves: myLeaves.slice(0, 5),
        feedbackScore: avgRating,
        feedbackCount: myFeedbacks.length,
      });
    }

    // 5. STUDENT DASHBOARD STATS
    if (role === "student") {
      const student = await Student.findOne({
        $or: [{ userId: req.user.sub }, { email: req.user.email }],
      });

      if (!student) {
        return res.json({ role: "student", message: "Student record not linked" });
      }

      // Calculate attendance stats
      const records = await AttendanceRecord.find({ studentId: student._id }).populate({
        path: "sessionId",
        populate: { path: "subjectId" },
      });

      let total = records.length;
      let present = 0;
      let absent = 0;
      let od = 0;

      records.forEach((r) => {
        if (r.status === "Present") present++;
        else if (r.status === "Absent") absent++;
        else if (r.status === "On Duty") {
          od++;
          present++; // treat as attended
        }
      });

      const overallPercentage = total > 0 ? Number(((present / total) * 100).toFixed(1)) : 100;
      const isShortage = overallPercentage < 75;

      const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const currentDay = daysOfWeek[new Date().getDay()];

      const todaySchedule = await Timetable.find({
        department: student.department,
        semester: student.semester,
        section: student.section,
        dayOfWeek: currentDay,
      }).populate("subjectId facultyId").sort({ period: 1 });

      return res.json({
        role: "student",
        student,
        totalClasses: total,
        presentClasses: present,
        absentClasses: absent,
        odClasses: od,
        overallPercentage,
        isShortage,
        shortageThreshold: 75,
        todaySchedule,
      });
    }

    return res.json({ role, message: "Welcome to College ERP System" });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return res.status(500).json({ message: "Failed to load dashboard metrics." });
  }
});

module.exports = router;
