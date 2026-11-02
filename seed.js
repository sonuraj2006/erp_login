require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("./config/db");

const User = require("./models/user");
const Student = require("./models/student");
const Faculty = require("./models/faculty");
const Department = require("./models/department");
const Subject = require("./models/subject");
const SubjectAssignment = require("./models/subjectAssignment");
const Timetable = require("./models/timetable");
const AttendanceSession = require("./models/attendanceSession");
const AttendanceRecord = require("./models/attendanceRecord");
const Attendance = require("./models/attendance");
const LeaveRequest = require("./models/leaveRequest");
const ClassAdjustment = require("./models/classAdjustment");
const SalaryStructure = require("./models/salaryStructure");
const Payslip = require("./models/payslip");
const Feedback = require("./models/feedback");
const Notification = require("./models/notification");
const AuditLog = require("./models/auditLog");

async function seed() {
  console.log("=================================================");
  console.log(" Starting Comprehensive College ERP Database Seed");
  console.log("=================================================");
  await connectDB();

  // Drop obsolete unique index on notifications if it exists in MongoDB Atlas
  try {
    await Notification.collection.dropIndex("attendanceId_1");
    console.log("Dropped legacy unique index attendanceId_1 from notifications collection");
  } catch (_) {
    // index not found or already dropped
  }

  // 1. Password Hashes
  const defaultPasswordHash = await bcrypt.hash("College@123", 12);
  const adminPasswordHash = await bcrypt.hash("Admin@123456", 12);
  const facultyPasswordHash = await bcrypt.hash("Faculty@123456", 12);
  const studentPasswordHash = await bcrypt.hash("Student@123456", 12);

  // 2. Seed Departments
  const deptData = [
    { code: "CSE", name: "Computer Science and Engineering", intake: 180, description: "Computing and software systems" },
    { code: "ECE", name: "Electronics and Communication Engineering", intake: 120, description: "VLSI, embedded, and telecommunication" },
    { code: "IT", name: "Information Technology", intake: 60, description: "Web systems and network engineering" },
    { code: "MECH", name: "Mechanical Engineering", intake: 60, description: "Thermodynamics and manufacturing" },
    { code: "CIVIL", name: "Civil Engineering", intake: 60, description: "Structural and environmental engineering" },
  ];

  const depts = {};
  for (const d of deptData) {
    let dept = await Department.findOne({ code: d.code });
    if (!dept) {
      dept = await Department.create(d);
      console.log(`Created Department: ${d.code} - ${d.name}`);
    }
    depts[d.code] = dept;
  }

  // 3. Seed Faculty and Roles
  // A. Admin User
  let admin = await User.findOne({ email: "admin@college.edu" });
  if (!admin) {
    admin = await User.create({
      name: "System Administrator",
      email: "admin@college.edu",
      passwordHash: adminPasswordHash,
      role: "admin",
      status: "active",
      department: "ADMIN",
      phone: "+91 99000 00001",
    });
    console.log("Created Admin: admin@college.edu / Admin@123456");
  } else {
    admin.passwordHash = adminPasswordHash;
    admin.role = "admin";
    admin.status = "active";
    await admin.save();
  }

  // B. Principal User & Faculty
  let principalUser = await User.findOne({ email: "principal@college.edu" });
  if (!principalUser) {
    principalUser = await User.create({
      name: "Dr. R. K. Sharma",
      email: "principal@college.edu",
      passwordHash: defaultPasswordHash,
      role: "principal",
      status: "active",
      department: "CSE",
      phone: "+91 99000 00002",
    });
    console.log("Created Principal: principal@college.edu / College@123");
  } else {
    principalUser.passwordHash = defaultPasswordHash;
    principalUser.role = "principal";
    principalUser.status = "active";
    await principalUser.save();
  }

  let principalFaculty = await Faculty.findOne({ email: "principal@college.edu" });
  if (!principalFaculty) {
    principalFaculty = await Faculty.create({
      employeeId: "EMP-PRIN-001",
      name: "Dr. R. K. Sharma",
      email: "principal@college.edu",
      phone: "+91 99000 00002",
      department: "CSE",
      designation: "Principal",
      qualification: "Ph.D., Senior Member IEEE",
      userId: principalUser._id,
      leaveBalance: { casual: 15, sick: 12, earned: 20, duty: 10 },
    });
    principalUser.profileRef = principalFaculty._id;
    await principalUser.save();
  }

  // C. HOD User & Faculty (CSE)
  let hodUser = await User.findOne({ email: "hod.cse@college.edu" });
  if (!hodUser) {
    hodUser = await User.create({
      name: "Dr. Suresh Babu",
      email: "hod.cse@college.edu",
      passwordHash: defaultPasswordHash,
      role: "hod",
      status: "active",
      department: "CSE",
      phone: "+91 99000 00003",
    });
    console.log("Created HOD CSE: hod.cse@college.edu / College@123");
  } else {
    hodUser.passwordHash = defaultPasswordHash;
    hodUser.role = "hod";
    hodUser.status = "active";
    await hodUser.save();
  }

  let hodFaculty = await Faculty.findOne({ email: "hod.cse@college.edu" });
  if (!hodFaculty) {
    hodFaculty = await Faculty.create({
      employeeId: "EMP-CSE-HOD",
      name: "Dr. Suresh Babu",
      email: "hod.cse@college.edu",
      phone: "+91 99000 00003",
      department: "CSE",
      designation: "Head of Department",
      qualification: "Ph.D. in Computer Science",
      userId: hodUser._id,
      leaveBalance: { casual: 12, sick: 10, earned: 15, duty: 8 },
    });
    hodUser.profileRef = hodFaculty._id;
    await hodUser.save();

    // Link HOD to Department
    if (depts["CSE"]) {
      depts["CSE"].hodFacultyId = hodFaculty._id;
      await depts["CSE"].save();
    }
  }

  // D. Faculty 1: Prof. Neha Verma
  let fac1User = await User.findOne({ email: "faculty@college.edu" });
  if (!fac1User) {
    fac1User = await User.create({
      name: "Prof. Neha Verma",
      email: "faculty@college.edu",
      passwordHash: facultyPasswordHash,
      role: "faculty",
      status: "active",
      department: "CSE",
      phone: "+91 99000 00004",
    });
    console.log("Created Faculty 1: faculty@college.edu / Faculty@123456");
  } else {
    fac1User.passwordHash = facultyPasswordHash;
    fac1User.role = "faculty";
    fac1User.status = "active";
    await fac1User.save();
  }

  let fac1 = await Faculty.findOne({ email: "faculty@college.edu" });
  if (!fac1) {
    fac1 = await Faculty.create({
      employeeId: "EMP-CSE-101",
      name: "Prof. Neha Verma",
      email: "faculty@college.edu",
      phone: "+91 99000 00004",
      department: "CSE",
      designation: "Associate Professor",
      qualification: "M.Tech, Ph.D. (Pursuing)",
      userId: fac1User._id,
      leaveBalance: { casual: 10, sick: 8, earned: 12, duty: 6 },
    });
    fac1User.profileRef = fac1._id;
    await fac1User.save();
  }

  // E. Faculty 2: Prof. Amit Saxena
  let fac2User = await User.findOne({ email: "faculty2@college.edu" });
  if (!fac2User) {
    fac2User = await User.create({
      name: "Prof. Amit Saxena",
      email: "faculty2@college.edu",
      passwordHash: facultyPasswordHash,
      role: "faculty",
      status: "active",
      department: "CSE",
      phone: "+91 99000 00005",
    });
    console.log("Created Faculty 2: faculty2@college.edu / Faculty@123456");
  } else {
    fac2User.passwordHash = facultyPasswordHash;
    fac2User.role = "faculty";
    fac2User.status = "active";
    await fac2User.save();
  }

  let fac2 = await Faculty.findOne({ email: "faculty2@college.edu" });
  if (!fac2) {
    fac2 = await Faculty.create({
      employeeId: "EMP-CSE-102",
      name: "Prof. Amit Saxena",
      email: "faculty2@college.edu",
      phone: "+91 99000 00005",
      department: "CSE",
      designation: "Assistant Professor",
      qualification: "M.Tech in Software Engineering",
      userId: fac2User._id,
      leaveBalance: { casual: 12, sick: 10, earned: 15, duty: 8 },
    });
    fac2User.profileRef = fac2._id;
    await fac2User.save();
  }

  // 4. Seed Subjects
  const subjectsData = [
    { code: "CS501", name: "Operating Systems", department: "CSE", semester: 5, credits: 4, type: "Theory" },
    { code: "CS502", name: "Database Management Systems", department: "CSE", semester: 5, credits: 4, type: "Theory" },
    { code: "CS503", name: "Web Technologies", department: "CSE", semester: 5, credits: 3, type: "Theory" },
    { code: "CS504", name: "Computer Networks", department: "CSE", semester: 5, credits: 3, type: "Theory" },
    { code: "CS505", name: "Web Technologies Lab", department: "CSE", semester: 5, credits: 2, type: "Practical" },
  ];

  const subjects = {};
  for (const s of subjectsData) {
    let sub = await Subject.findOne({ code: s.code });
    if (!sub) {
      sub = await Subject.create(s);
      console.log(`Created Subject: ${s.code} - ${s.name}`);
    }
    subjects[s.code] = sub;
  }

  // 5. Subject Allocation
  const assignmentsData = [
    { facultyId: fac1._id, subjectId: subjects["CS501"]._id, department: "CSE", semester: 5, section: "A" },
    { facultyId: fac1._id, subjectId: subjects["CS503"]._id, department: "CSE", semester: 5, section: "A" },
    { facultyId: fac2._id, subjectId: subjects["CS502"]._id, department: "CSE", semester: 5, section: "A" },
    { facultyId: fac2._id, subjectId: subjects["CS504"]._id, department: "CSE", semester: 5, section: "A" },
  ];

  for (const a of assignmentsData) {
    let assign = await SubjectAssignment.findOne({
      facultyId: a.facultyId,
      subjectId: a.subjectId,
      section: a.section,
    });
    if (!assign) {
      await SubjectAssignment.create(a);
    }
  }

  // 6. Timetables (Monday through Friday)
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  for (const day of days) {
    // Period 1: CS501 by Prof. Neha Verma
    let t1 = await Timetable.findOne({ department: "CSE", semester: 5, section: "A", dayOfWeek: day, period: 1 });
    if (!t1) {
      await Timetable.create({
        dayOfWeek: day,
        period: 1,
        startTime: "09:30 AM",
        endTime: "10:30 AM",
        room: "LH-201",
        department: "CSE",
        semester: 5,
        section: "A",
        subjectId: subjects["CS501"]._id,
        facultyId: fac1._id,
      });
    }

    // Period 2: CS502 by Prof. Amit Saxena
    let t2 = await Timetable.findOne({ department: "CSE", semester: 5, section: "A", dayOfWeek: day, period: 2 });
    if (!t2) {
      await Timetable.create({
        dayOfWeek: day,
        period: 2,
        startTime: "10:30 AM",
        endTime: "11:30 AM",
        room: "LH-201",
        department: "CSE",
        semester: 5,
        section: "A",
        subjectId: subjects["CS502"]._id,
        facultyId: fac2._id,
      });
    }

    // Period 3: CS503 by Prof. Neha Verma
    let t3 = await Timetable.findOne({ department: "CSE", semester: 5, section: "A", dayOfWeek: day, period: 3 });
    if (!t3) {
      await Timetable.create({
        dayOfWeek: day,
        period: 3,
        startTime: "11:30 AM",
        endTime: "12:30 PM",
        room: "LH-201",
        department: "CSE",
        semester: 5,
        section: "A",
        subjectId: subjects["CS503"]._id,
        facultyId: fac1._id,
      });
    }
  }

  // 7. Seed Students & Student User
  let studentUser = await User.findOne({ email: "student@college.edu" });
  if (!studentUser) {
    studentUser = await User.create({
      name: "Aarav Sharma",
      email: "student@college.edu",
      passwordHash: studentPasswordHash,
      role: "student",
      status: "active",
      department: "CSE",
      phone: "+91 98765 43210",
    });
    console.log("Created Student User: student@college.edu / Student@123456");
  } else {
    studentUser.passwordHash = studentPasswordHash;
    studentUser.role = "student";
    studentUser.status = "active";
    await studentUser.save();
    console.log("Verified Student User credentials: student@college.edu / Student@123456");
  }

  const sampleStudents = [
    { studentId: "SKL/2026/0182", name: "Aarav Sharma", rollNumber: "24R21A6601", email: "student@college.edu", department: "CSE", year: 3, semester: 5, section: "A", classId: "CSE-A", parentName: "Sanjay Sharma", parentEmail: "sanjay.sharma@example.com", parentPhone: "+91 98765 43210", userId: studentUser._id },
    { studentId: "SKL/2026/0094", name: "Diya Verma", rollNumber: "24R21A6602", email: "diya.verma@college.edu", department: "CSE", year: 3, semester: 5, section: "A", classId: "CSE-A", parentName: "Rajesh Verma", parentEmail: "rajesh.verma@example.com", parentPhone: "+91 98765 43211" },
    { studentId: "SKL/2026/0247", name: "Ishaan Patel", rollNumber: "24R21A6603", email: "ishaan.patel@college.edu", department: "CSE", year: 3, semester: 5, section: "A", classId: "CSE-A", parentName: "Manoj Patel", parentEmail: "manoj.patel@example.com", parentPhone: "+91 98765 43212" },
    { studentId: "SKL/2026/0038", name: "Ananya Kapoor", rollNumber: "24R21A6604", email: "ananya.kapoor@college.edu", department: "CSE", year: 3, semester: 5, section: "A", classId: "CSE-A", parentName: "Vikram Kapoor", parentEmail: "vikram.kapoor@example.com", parentPhone: "+91 98765 43213" },
    { studentId: "SKL/2026/0163", name: "Vihaan Rao", rollNumber: "24R21A6605", email: "vihaan.rao@college.edu", department: "CSE", year: 3, semester: 5, section: "A", classId: "CSE-A", parentName: "Kishore Rao", parentEmail: "kishore.rao@example.com", parentPhone: "+91 98765 43214" },
    { studentId: "SKL/2026/0312", name: "Saanvi Mehta", rollNumber: "24R21A6606", email: "saanvi.mehta@college.edu", department: "CSE", year: 3, semester: 5, section: "A", classId: "CSE-A", parentName: "Anil Mehta", parentEmail: "anil.mehta@example.com", parentPhone: "+91 98765 43215" },
    { studentId: "SKL/2026/0021", name: "Rohan Iyer", rollNumber: "24R21A6607", email: "rohan.iyer@college.edu", department: "CSE", year: 3, semester: 5, section: "A", classId: "CSE-A", parentName: "Suresh Iyer", parentEmail: "suresh.iyer@example.com", parentPhone: "+91 98765 43216" },
    { studentId: "SKL/2026/0271", name: "Myra Joshi", rollNumber: "24R21A6608", email: "myra.joshi@college.edu", department: "CSE", year: 3, semester: 5, section: "A", classId: "CSE-A", parentName: "Sunil Joshi", parentEmail: "sunil.joshi@example.com", parentPhone: "+91 98765 43217" },
  ];

  const studentDocs = [];
  for (const s of sampleStudents) {
    let student = await Student.findOne({ rollNumber: s.rollNumber });
    if (!student) {
      student = await Student.create(s);
      console.log(`Created Student: ${s.name} (${s.rollNumber})`);
    } else {
      student.department = s.department;
      student.semester = s.semester;
      student.section = s.section;
      student.year = s.year;
      student.email = s.email;
      if (s.userId) student.userId = s.userId;
      await student.save();
    }
    studentDocs.push(student);
  }

  studentUser.profileRef = studentDocs[0]._id;
  await studentUser.save();

  // 8. Seed Attendance Sessions & Records
  const seedDates = ["2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27"];
  for (const date of seedDates) {
    // Session 1: Period 1 (CS501)
    let s1 = await AttendanceSession.findOne({
      department: "CSE",
      semester: 5,
      section: "A",
      date,
      period: 1,
    });

    if (!s1) {
      const records = studentDocs.map((st, idx) => {
        // student 0 (Aarav) is mostly present (90% attendance)
        const isAbsent = idx === 1 || (idx === 2 && date === "2026-10-25");
        const isOD = idx === 3 && date === "2026-10-26";
        return {
          studentId: st._id,
          status: isOD ? "On Duty" : isAbsent ? "Absent" : "Present",
        };
      });

      const pCount = records.filter((r) => r.status === "Present").length;
      const aCount = records.filter((r) => r.status === "Absent").length;
      const odCount = records.filter((r) => r.status === "On Duty").length;

      s1 = await AttendanceSession.create({
        department: "CSE",
        semester: 5,
        section: "A",
        subjectId: subjects["CS501"]._id,
        date,
        period: 1,
        originalFacultyId: fac1._id,
        markedByFacultyId: fac1._id,
        totalStudents: records.length,
        presentCount: pCount,
        absentCount: aCount,
        odCount,
        status: "Submitted",
      });

      for (const r of records) {
        await AttendanceRecord.create({
          sessionId: s1._id,
          studentId: r.studentId,
          date,
          status: r.status,
          markedBy: fac1._id,
        });
      }
    }

    // Session 2: Period 2 (CS502)
    let s2 = await AttendanceSession.findOne({
      department: "CSE",
      semester: 5,
      section: "A",
      date,
      period: 2,
    });

    if (!s2) {
      const records = studentDocs.map((st, idx) => {
        const isAbsent = idx === 4 || (idx === 1 && date === "2026-10-26");
        return {
          studentId: st._id,
          status: isAbsent ? "Absent" : "Present",
        };
      });

      const pCount = records.filter((r) => r.status === "Present").length;
      const aCount = records.filter((r) => r.status === "Absent").length;

      s2 = await AttendanceSession.create({
        department: "CSE",
        semester: 5,
        section: "A",
        subjectId: subjects["CS502"]._id,
        date,
        period: 2,
        originalFacultyId: fac2._id,
        markedByFacultyId: fac2._id,
        totalStudents: records.length,
        presentCount: pCount,
        absentCount: aCount,
        odCount: 0,
        status: "Submitted",
      });

      for (const r of records) {
        await AttendanceRecord.create({
          sessionId: s2._id,
          studentId: r.studentId,
          date,
          status: r.status,
          markedBy: fac2._id,
        });
      }
    }
  }

  // 9. Seed Faculty Salary Structures & Payslips
  const facSalaries = [
    { faculty: fac1, basic: 85000, hra: 17000, da: 8500, special: 5000, pf: 6000, tax: 7000, other: 1500 },
    { faculty: fac2, basic: 68000, hra: 13600, da: 6800, special: 4000, pf: 5000, tax: 5000, other: 1200 },
    { faculty: hodFaculty, basic: 110000, hra: 22000, da: 11000, special: 8000, pf: 8000, tax: 12000, other: 2000 },
    { faculty: principalFaculty, basic: 140000, hra: 28000, da: 14000, special: 10000, pf: 10000, tax: 18000, other: 2500 },
  ];

  for (const item of facSalaries) {
    const gross = item.basic + item.hra + item.da + item.special;
    const ded = item.pf + item.tax + item.other;
    const net = gross - ded;

    let struct = await SalaryStructure.findOne({ facultyId: item.faculty._id });
    if (!struct) {
      struct = await SalaryStructure.create({
        facultyId: item.faculty._id,
        basicPay: item.basic,
        hra: item.hra,
        da: item.da,
        specialAllowance: item.special,
        pfDeduction: item.pf,
        taxDeduction: item.tax,
        otherDeductions: item.other,
        netSalary: net,
        bankAccount: `HDFC000123${item.faculty.employeeId.slice(-3)}`,
        panNumber: `ABCDE123${item.faculty.employeeId.slice(-2)}F`,
      });
    }

    // Seed Payslip for current month (October 2026) and previous month
    const pastMonths = [
      { name: "September", num: 9, year: 2026 },
      { name: "October", num: 10, year: 2026 },
    ];

    for (const m of pastMonths) {
      let slip = await Payslip.findOne({
        facultyId: item.faculty._id,
        monthNumber: m.num,
        year: m.year,
      });

      if (!slip) {
        await Payslip.create({
          facultyId: item.faculty._id,
          month: m.name,
          monthNumber: m.num,
          year: m.year,
          basicPay: item.basic,
          hra: item.hra,
          da: item.da,
          specialAllowance: item.special,
          grossSalary: gross,
          pfDeduction: item.pf,
          taxDeduction: item.tax,
          otherDeductions: item.other,
          totalDeductions: ded,
          netSalary: net,
          paymentStatus: "Paid",
          paymentDate: `${m.year}-10-01`,
        });
      }
    }
  }

  // 10. Seed Leave Requests
  let existingLeave = await LeaveRequest.findOne({ facultyId: fac1._id });
  if (!existingLeave) {
    await LeaveRequest.create({
      facultyId: fac1._id,
      leaveType: "Casual Leave",
      startDate: "2026-10-30",
      endDate: "2026-10-31",
      totalDays: 2,
      reason: "Attending National Conference on Software Engineering as keynote presenter.",
      status: "Pending_HOD",
      hodStatus: "Pending",
      principalStatus: "Pending",
    });

    await LeaveRequest.create({
      facultyId: fac2._id,
      leaveType: "Sick Leave",
      startDate: "2026-10-18",
      endDate: "2026-10-19",
      totalDays: 2,
      reason: "Viral fever and medical rest prescribed by physician.",
      status: "Approved",
      hodStatus: "Approved",
      principalStatus: "NotRequired",
      hodRemarks: "Approved with medical certificate.",
    });
  }

  // 11. Seed Class Adjustment
  let existingAdj = await ClassAdjustment.findOne({ originalFacultyId: fac1._id });
  if (!existingAdj) {
    await ClassAdjustment.create({
      originalFacultyId: fac1._id,
      substituteFacultyId: fac2._id,
      date: "2026-10-30",
      period: 1,
      department: "CSE",
      semester: 5,
      section: "A",
      subjectId: subjects["CS501"]._id,
      reason: "Attending university conference; requested Prof. Amit to take OS class.",
      status: "Pending_HOD",
    });
  }

  // 12. Seed Student Feedback
  let existingFb = await Feedback.findOne({ facultyId: fac1._id });
  if (!existingFb) {
    await Feedback.create({
      studentId: studentDocs[0]._id,
      isAnonymous: false,
      facultyId: fac1._id,
      subjectId: subjects["CS501"]._id,
      department: "CSE",
      semester: 5,
      ratings: {
        knowledge: 5,
        communication: 5,
        punctuality: 4,
        engagement: 5,
        doubtClarification: 5,
        overall: 5,
      },
      comments: "Excellent teaching! Concepts of concurrency and synchronization were explained with clear real-world examples.",
    });

    await Feedback.create({
      studentId: null,
      isAnonymous: true,
      facultyId: fac2._id,
      subjectId: subjects["CS502"]._id,
      department: "CSE",
      semester: 5,
      ratings: {
        knowledge: 4,
        communication: 4,
        punctuality: 4,
        engagement: 4,
        doubtClarification: 4,
        overall: 4,
      },
      comments: "Good explanations on SQL normalization and transaction ACID properties.",
    });
  }

  // 13. Seed Notifications & Audit
  const existingNotif = await Notification.findOne({ title: "Mid-Term Examinations Schedule" });
  if (!existingNotif) {
    await Notification.create({
      targetRole: "all",
      title: "Mid-Term Examinations Schedule",
      message: "Mid-Term examinations for Semester 5 will commence from 15th November 2026. Detailed schedule posted.",
      type: "general",
    });
  }

  const existingAudit = await AuditLog.findOne({ action: "SYSTEM_INITIALIZED" });
  if (!existingAudit) {
    await AuditLog.create({
      actorName: "System",
      actorEmail: "system@college.edu",
      actorRole: "system",
      action: "SYSTEM_INITIALIZED",
      entity: "System",
      entityId: "1",
      details: { message: "College ERP System initialized with demo departments, courses, students, and staff." },
    });
  }

  console.log("=================================================");
  console.log(" College ERP Database Seed Completed Successfully");
  console.log("=================================================");
  console.log("Login Credentials for all 5 roles:");
  console.log("1. Admin:     admin@college.edu      / Admin@123456");
  console.log("2. Principal: principal@college.edu  / College@123");
  console.log("3. HOD (CSE): hod.cse@college.edu    / College@123");
  console.log("4. Faculty:   faculty@college.edu    / Faculty@123456");
  console.log("5. Student:   student@college.edu    / Student@123456");
  console.log("=================================================");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
