import React, { useState, useEffect } from "react";
import { api } from "../api";
import { useAppData } from "../context/AppDataContext";

export default function AttendanceReportsPage() {
  const [reportType, setReportType] = useState("daily"); // "daily" | "monthly" | "student"
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7)); // "YYYY-MM"
  const [selectedDept, setSelectedDept] = useState("all");

  const [dailyData, setDailyData] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);
  const [studentRoll, setStudentRoll] = useState("24R21A6601");
  const [studentData, setStudentData] = useState(null);

  const [loading, setLoading] = useState(false);

  // Use global departments list (auto-updates when new dept is added in Academic Setup)
  const { departments } = useAppData();

  const loadDailyReport = () => {
    setLoading(true);
    const deptQuery = selectedDept !== "all" ? `&department=${selectedDept}` : "";
    api.get(`/api/attendance/report/daily?date=${date}${deptQuery}`)
      .then((res) => setDailyData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  const loadMonthlyReport = () => {
    setLoading(true);
    const deptQuery = selectedDept !== "all" ? `&department=${selectedDept}` : "";
    api.get(`/api/attendance/report/monthly?month=${month}${deptQuery}`)
      .then((res) => setMonthlyData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  const loadStudentReport = () => {
    if (!studentRoll.trim()) return;
    setLoading(true);
    api.get(`/api/attendance/student/${studentRoll.trim()}`)
      .then((res) => setStudentData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (reportType === "daily") loadDailyReport();
    else if (reportType === "monthly") loadMonthlyReport();
    else if (reportType === "student") loadStudentReport();
  }, [reportType, date, month, selectedDept]);

  // CSV export helper
  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.join(","),
        ...data.map((row) =>
          headers
            .map((field) => `"${String(row[field] || "").replace(/"/g, '""')}"`)
            .join(",")
        ),
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportMonthly = () => {
    if (!monthlyData?.students) return;
    const flat = monthlyData.students.map((item) => ({
      RollNumber: item.student.rollNumber,
      StudentName: item.student.name,
      Department: item.student.department,
      Section: item.student.section,
      TotalClasses: item.total,
      PresentCount: item.present,
      AbsentCount: item.absent,
      OnDuty: item.od,
      Percentage: `${item.percentage}%`,
      ShortageAlert: item.isShortage ? "DEFICIT (<75%)" : "ELIGIBLE",
    }));
    exportToCSV(flat, `Monthly_Attendance_Report_${month}`);
  };

  return (
    <div className="erp-content">
      <div className="erp-page-header">
        <div>
          <h2 className="erp-page-title">Attendance Analytics & Reports</h2>
          <p className="erp-page-subtitle">
            Generate college, department, and student-wise attendance reports with shortage alerts.
          </p>
        </div>
        <div className="d-flex gap-2">
          {reportType === "monthly" && monthlyData?.students?.length > 0 && (
            <button className="btn btn-outline-success" onClick={handleExportMonthly}>
              <i className="bi-file-earmark-excel me-1"></i> Export to Excel / CSV
            </button>
          )}
          <button className="btn btn-outline-primary" onClick={() => window.print()}>
            <i className="bi-printer-fill me-1"></i> Print Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-pills mb-4 gap-2">
        <li className="nav-item">
          <button
            className={`nav-link ${reportType === "daily" ? "active" : ""}`}
            onClick={() => setReportType("daily")}
          >
            <i className="bi-calendar-date me-1"></i> Daily Attendance Summary
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${reportType === "monthly" ? "active" : ""}`}
            onClick={() => setReportType("monthly")}
          >
            <i className="bi-calendar-month me-1"></i> Monthly Roster & Shortage
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${reportType === "student" ? "active" : ""}`}
            onClick={() => setReportType("student")}
          >
            <i className="bi-person-badge me-1"></i> Individual Student Breakdown
          </button>
        </li>
      </ul>

      {/* Filter Toolbar */}
      <div className="erp-card mb-4 p-3 bg-white">
        <div className="row g-2 align-items-center">
          {reportType === "daily" && (
            <div className="col-md-4 col-sm-6">
              <label className="form-label small fw-bold text-muted mb-1">Select Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          )}

          {reportType === "monthly" && (
            <div className="col-md-4 col-sm-6">
              <label className="form-label small fw-bold text-muted mb-1">Select Month (YYYY-MM)</label>
              <input
                type="month"
                className="form-control form-control-sm"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
          )}

          {reportType === "student" && (
            <div className="col-md-4 col-sm-6">
              <label className="form-label small fw-bold text-muted mb-1">Student Roll Number or ID</label>
              <div className="input-group input-group-sm">
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 24R21A6601"
                  value={studentRoll}
                  onChange={(e) => setStudentRoll(e.target.value)}
                />
                <button className="btn btn-primary" onClick={loadStudentReport}>
                  Search
                </button>
              </div>
            </div>
          )}

          <div className="col-md-3 col-sm-6">
            <label className="form-label small fw-bold text-muted mb-1">Department Filter</label>
            <select
              className="form-select form-select-sm"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d.code}>{d.code} - {d.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary mb-2"></div>
          <div className="text-muted">Compiling attendance statistics...</div>
        </div>
      )}

      {/* 1. Daily Report Display */}
      {!loading && reportType === "daily" && dailyData && (
        <>
          <div className="row g-3 mb-4">
            <div className="col-md-3 col-sm-6">
              <div className="erp-stat-card">
                <div className="erp-stat-icon stat-indigo"><i className="bi-layers-fill"></i></div>
                <div>
                  <div className="erp-stat-value">{dailyData.sessionCount}</div>
                  <div className="erp-stat-label">Class Sessions Conducted</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-sm-6">
              <div className="erp-stat-card">
                <div className="erp-stat-icon stat-emerald"><i className="bi-pie-chart-fill"></i></div>
                <div>
                  <div className="erp-stat-value">{dailyData.overallRate}%</div>
                  <div className="erp-stat-label">Campus Attendance Rate</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-sm-6">
              <div className="erp-stat-card">
                <div className="erp-stat-icon stat-sky"><i className="bi-person-check-fill"></i></div>
                <div>
                  <div className="erp-stat-value">{dailyData.presentCount}</div>
                  <div className="erp-stat-label">Students Present Today</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-sm-6">
              <div className="erp-stat-card">
                <div className="erp-stat-icon stat-rose"><i className="bi-person-x-fill"></i></div>
                <div>
                  <div className="erp-stat-value">{dailyData.absentCount}</div>
                  <div className="erp-stat-label">Absences Noted</div>
                </div>
              </div>
            </div>
          </div>

          <div className="erp-card">
            <div className="erp-card-header">
              <h5 className="erp-card-title">Daily Conducted Periods on {dailyData.date}</h5>
            </div>
            <div className="erp-card-body p-0">
              <div className="table-responsive">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Class</th>
                      <th>Subject</th>
                      <th>Instructor</th>
                      <th>Present</th>
                      <th>Absent</th>
                      <th>OD</th>
                      <th>Turnout %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyData.sessions.map((s) => {
                      const rate = s.totalStudents > 0 ? ((s.presentCount / s.totalStudents) * 100).toFixed(1) : 0;
                      return (
                        <tr key={s._id}>
                          <td><span className="badge bg-primary">Period {s.period}</span></td>
                          <td>{s.department} Sem {s.semester} Sec {s.section}</td>
                          <td className="fw-bold">{s.subjectId?.name} ({s.subjectId?.code})</td>
                          <td>{s.markedByFacultyId?.name}</td>
                          <td className="text-success fw-bold">{s.presentCount}</td>
                          <td className="text-danger fw-bold">{s.absentCount}</td>
                          <td className="text-warning fw-bold">{s.odCount}</td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <span className="fw-bold">{rate}%</span>
                              <div className="progress flex-grow-1" style={{ height: 6, minWidth: 60 }}>
                                <div
                                  className={`progress-bar ${rate >= 75 ? "bg-success" : "bg-danger"}`}
                                  style={{ width: `${rate}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 2. Monthly Report Display with Shortage Flags */}
      {!loading && reportType === "monthly" && monthlyData && (
        <div className="erp-card">
          <div className="erp-card-header flex-wrap gap-2">
            <div>
              <h5 className="erp-card-title mb-0">Monthly Student Roster ({monthlyData.month})</h5>
              <small className="text-muted">
                Highlighted red rows denote students falling below the 75% attendance threshold.
              </small>
            </div>
            <div className="d-flex gap-2">
              <span className="badge bg-success-subtle text-success border border-success-subtle">
                Eligible (&ge; 75%)
              </span>
              <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                Shortage (&lt; 75%)
              </span>
            </div>
          </div>
          <div className="erp-card-body p-0">
            <div className="table-responsive">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Roll Number</th>
                    <th>Student Name</th>
                    <th>Class</th>
                    <th>Total Classes</th>
                    <th>Present</th>
                    <th>Absent</th>
                    <th>On Duty</th>
                    <th>Attendance %</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.students?.map((row) => (
                    <tr
                      key={row.student._id}
                      className={row.isShortage ? "table-danger" : ""}
                    >
                      <td className="fw-bold">{row.student.rollNumber}</td>
                      <td>{row.student.name}</td>
                      <td>{row.student.department} Sem {row.student.semester} Sec {row.student.section}</td>
                      <td>{row.total}</td>
                      <td className="text-success fw-bold">{row.present}</td>
                      <td className="text-danger fw-bold">{row.absent}</td>
                      <td className="text-warning fw-bold">{row.od}</td>
                      <td>
                        <strong>{row.percentage}%</strong>
                      </td>
                      <td>
                        {row.isShortage ? (
                          <span className="badge bg-danger">
                            <i className="bi-exclamation-octagon me-1"></i> Shortage Alert
                          </span>
                        ) : (
                          <span className="badge bg-success">Eligible</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. Individual Student Report */}
      {!loading && reportType === "student" && studentData && (
        <div>
          {studentData.isShortage && (
            <div className="erp-shortage-alert">
              <i className="bi-exclamation-triangle-fill"></i>
              <div>
                <h6 className="fw-bold mb-1">Attendance Shortage Alert!</h6>
                <p className="mb-0">
                  {studentData.student?.name} has only <strong>{studentData.overallPercentage}%</strong> total attendance. Minimum 75% required.
                </p>
              </div>
            </div>
          )}

          {/* Subject-Wise Table */}
          <div className="erp-card mb-4">
            <div className="erp-card-header">
              <h5 className="erp-card-title">Subject-Wise Breakdown for {studentData.student?.name}</h5>
              <span className="badge bg-primary fs-6">{studentData.overallPercentage}% Overall</span>
            </div>
            <div className="erp-card-body p-0">
              <div className="table-responsive">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Subject Code</th>
                      <th>Subject Name</th>
                      <th>Classes Conducted</th>
                      <th>Classes Attended</th>
                      <th>Classes Absent</th>
                      <th>On Duty</th>
                      <th>Subject %</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentData.subjectWise?.map((sub) => (
                      <tr key={sub.code}>
                        <td className="fw-bold">{sub.code}</td>
                        <td>{sub.name}</td>
                        <td>{sub.total}</td>
                        <td className="text-success fw-bold">{sub.present}</td>
                        <td className="text-danger fw-bold">{sub.absent}</td>
                        <td className="text-warning fw-bold">{sub.od}</td>
                        <td><strong>{sub.percentage}%</strong></td>
                        <td>
                          {sub.isShortage ? (
                            <span className="badge bg-danger">Shortage</span>
                          ) : (
                            <span className="badge bg-success">Sufficient</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
