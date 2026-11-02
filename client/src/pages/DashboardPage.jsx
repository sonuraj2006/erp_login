import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";

export default function DashboardPage({ setActivePage }) {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = () => {
    setLoading(true);
    api.get("/api/dashboard/stats")
      .then((data) => setStats(data))
      .catch((err) => console.error("Dashboard stats error:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <div className="erp-content text-center py-5">
        <div className="spinner-border text-primary mb-3"></div>
        <div className="text-muted fw-semibold">Loading your personalized dashboard...</div>
      </div>
    );
  }

  const role = user?.role;

  return (
    <div className="erp-content">
      {/* Page Header */}
      <div className="erp-page-header">
        <div>
          <h2 className="erp-page-title">Welcome back, {user?.name}</h2>
          <p className="erp-page-subtitle">
            {role === "student" && "Track your attendance progress, class timetable, and submit subject feedback."}
            {role === "faculty" && "Manage your class attendance, view scheduled periods, and track leave requests."}
            {role === "hod" && `Head of Department Dashboard — ${user?.department || "CSE"} Department Overview.`}
            {role === "principal" && "College Executive Governance Portal — Overall Campus Attendance & Approvals."}
            {role === "admin" && "College ERP Central System Administration & Academic Control."}
          </p>
        </div>
        <div className="d-flex gap-2">
          {role === "student" && (
            <button className="btn btn-erp-primary" onClick={() => setActivePage("feedback")}>
              <i className="bi-star-fill"></i> Submit Faculty Feedback
            </button>
          )}
          {["faculty", "hod", "admin"].includes(role) && (
            <button className="btn btn-erp-primary" onClick={() => setActivePage("mark-attendance")}>
              <i className="bi-check2-square"></i> Take Attendance Now
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          1. STUDENT DASHBOARD
          ========================================================================= */}
      {role === "student" && (
        <>
          {/* Attendance Shortage Alert (< 75%) */}
          {stats?.isShortage && (
            <div className="erp-shortage-alert">
              <i className="bi-exclamation-triangle-fill"></i>
              <div>
                <h6 className="fw-bold mb-1">Attendance Shortage Alert!</h6>
                <p className="mb-0" style={{ fontSize: "0.85rem" }}>
                  Your current aggregate attendance is <strong>{stats?.overallPercentage}%</strong>, which is below the mandatory university threshold of <strong>75%</strong>. Please consult your Head of Department immediately to avoid exam debarment.
                </p>
              </div>
            </div>
          )}

          {/* Metric row */}
          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <div className="erp-gauge-card h-100">
                <span className="text-white-50 text-uppercase fw-bold" style={{ fontSize: "0.75rem" }}>
                  Aggregate Attendance
                </span>
                <div className="gauge-circle">
                  {stats?.overallPercentage}%
                </div>
                <div className="d-flex gap-3 text-white-50" style={{ fontSize: "0.82rem" }}>
                  <span><i className="bi-check-circle-fill text-success"></i> {stats?.presentClasses} Attended</span>
                  <span><i className="bi-x-circle-fill text-danger"></i> {stats?.absentClasses} Absent</span>
                </div>
              </div>
            </div>

            <div className="col-md-8">
              <div className="row g-3 h-100">
                <div className="col-sm-6">
                  <div className="erp-stat-card h-100">
                    <div className="erp-stat-icon stat-emerald">
                      <i className="bi-calendar-check-fill"></i>
                    </div>
                    <div>
                      <div className="erp-stat-value">{stats?.totalClasses}</div>
                      <div className="erp-stat-label">Total Classes Conducted</div>
                    </div>
                  </div>
                </div>

                <div className="col-sm-6">
                  <div className="erp-stat-card h-100">
                    <div className="erp-stat-icon stat-sky">
                      <i className="bi-person-badge"></i>
                    </div>
                    <div>
                      <div className="erp-stat-value">{stats?.student?.rollNumber || "24R21A6601"}</div>
                      <div className="erp-stat-label">Roll Number ({stats?.student?.classId})</div>
                    </div>
                  </div>
                </div>

                <div className="col-sm-6">
                  <div className="erp-stat-card h-100">
                    <div className="erp-stat-icon stat-amber">
                      <i className="bi-briefcase-fill"></i>
                    </div>
                    <div>
                      <div className="erp-stat-value">{stats?.odClasses || 0}</div>
                      <div className="erp-stat-label">On Duty (OD) Approvals</div>
                    </div>
                  </div>
                </div>

                <div className="col-sm-6">
                  <div className="erp-stat-card h-100">
                    <div className="erp-stat-icon stat-indigo">
                      <i className="bi-clock-history"></i>
                    </div>
                    <div>
                      <div className="erp-stat-value">{stats?.todaySchedule?.length || 0}</div>
                      <div className="erp-stat-label">Scheduled Periods Today</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Today's Timetable */}
          <div className="erp-card">
            <div className="erp-card-header">
              <h5 className="erp-card-title">
                <i className="bi-calendar-day text-primary"></i> Today's Class Timetable
              </h5>
              <button className="btn btn-sm btn-outline-primary" onClick={() => setActivePage("timetable")}>
                Full Week Schedule
              </button>
            </div>
            <div className="erp-card-body p-0">
              {stats?.todaySchedule?.length === 0 ? (
                <div className="text-center py-4 text-muted">No scheduled classes for today.</div>
              ) : (
                <div className="table-responsive">
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>Period</th>
                        <th>Time</th>
                        <th>Subject</th>
                        <th>Room</th>
                        <th>Faculty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats?.todaySchedule?.map((s) => (
                        <tr key={s._id}>
                          <td><span className="badge bg-primary">Period {s.period}</span></td>
                          <td>{s.startTime} - {s.endTime}</td>
                          <td className="fw-bold">{s.subjectId?.name} ({s.subjectId?.code})</td>
                          <td><span className="badge bg-light text-dark border">{s.room}</span></td>
                          <td>{s.facultyId?.name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* =========================================================================
          2. FACULTY DASHBOARD
          ========================================================================= */}
      {role === "faculty" && (
        <>
          <div className="row g-3 mb-4">
            <div className="col-md-3 col-sm-6">
              <div className="erp-stat-card">
                <div className="erp-stat-icon stat-indigo">
                  <i className="bi-calendar-check"></i>
                </div>
                <div>
                  <div className="erp-stat-value">{stats?.todayClasses?.length || 0}</div>
                  <div className="erp-stat-label">Classes Scheduled Today</div>
                </div>
              </div>
            </div>

            <div className="col-md-3 col-sm-6">
              <div className="erp-stat-card">
                <div className="erp-stat-icon stat-amber">
                  <i className="bi-star-fill"></i>
                </div>
                <div>
                  <div className="erp-stat-value">{stats?.feedbackScore || "4.8"}/5</div>
                  <div className="erp-stat-label">Student Feedback ({stats?.feedbackCount || 0} reviews)</div>
                </div>
              </div>
            </div>

            <div className="col-md-3 col-sm-6">
              <div className="erp-stat-card">
                <div className="erp-stat-icon stat-emerald">
                  <i className="bi-calendar-heart"></i>
                </div>
                <div>
                  <div className="erp-stat-value">{stats?.leaveBalance?.casual || 10}</div>
                  <div className="erp-stat-label">Casual Leaves Remaining</div>
                </div>
              </div>
            </div>

            <div className="col-md-3 col-sm-6">
              <div className="erp-stat-card">
                <div className="erp-stat-icon stat-sky">
                  <i className="bi-shuffle"></i>
                </div>
                <div>
                  <div className="erp-stat-value">{stats?.todaySubstitutions?.length || 0}</div>
                  <div className="erp-stat-label">Substitute Classes Today</div>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3">
            {/* Scheduled Classes */}
            <div className="col-lg-8">
              <div className="erp-card">
                <div className="erp-card-header">
                  <h5 className="erp-card-title">
                    <i className="bi-clock-fill text-primary"></i> My Classes Today
                  </h5>
                  <button className="btn btn-sm btn-primary" onClick={() => setActivePage("mark-attendance")}>
                    Mark Attendance
                  </button>
                </div>
                <div className="erp-card-body p-0">
                  <div className="table-responsive">
                    <table className="erp-table">
                      <thead>
                        <tr>
                          <th>Period</th>
                          <th>Timing</th>
                          <th>Subject</th>
                          <th>Class</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats?.todayClasses?.map((c) => (
                          <tr key={c._id}>
                            <td><span className="badge bg-indigo-subtle text-primary border">Period {c.period}</span></td>
                            <td>{c.startTime} - {c.endTime}</td>
                            <td className="fw-bold">{c.subjectId?.name} ({c.subjectId?.code})</td>
                            <td>{c.department} Sem {c.semester} Sec {c.section}</td>
                            <td>
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => setActivePage("mark-attendance")}
                              >
                                Take Attendance
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Leave Balance Box */}
            <div className="col-lg-4">
              <div className="erp-card">
                <div className="erp-card-header">
                  <h5 className="erp-card-title">
                    <i className="bi-umbrella text-success"></i> Leave Balances
                  </h5>
                  <button className="btn btn-sm btn-outline-success" onClick={() => setActivePage("leave-management")}>
                    Apply
                  </button>
                </div>
                <div className="erp-card-body">
                  <div className="list-group list-group-flush">
                    <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                      <span>Casual Leave (CL)</span>
                      <span className="badge bg-primary rounded-pill">{stats?.leaveBalance?.casual || 10} days</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                      <span>Sick Leave (SL)</span>
                      <span className="badge bg-warning rounded-pill">{stats?.leaveBalance?.sick || 8} days</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                      <span>Earned Leave (EL)</span>
                      <span className="badge bg-success rounded-pill">{stats?.leaveBalance?.earned || 12} days</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center py-2">
                      <span>On Duty (OD)</span>
                      <span className="badge bg-info rounded-pill">{stats?.leaveBalance?.duty || 6} days</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* =========================================================================
          3. HOD DASHBOARD
          ========================================================================= */}
      {role === "hod" && (
        <>
          <div className="row g-3 mb-4">
            <div className="col-md-3 col-sm-6">
              <div className="erp-stat-card">
                <div className="erp-stat-icon stat-emerald">
                  <i className="bi-graph-up-arrow"></i>
                </div>
                <div>
                  <div className="erp-stat-value">{stats?.deptAttendanceRate}%</div>
                  <div className="erp-stat-label">Department Attendance Rate</div>
                </div>
              </div>
            </div>

            <div className="col-md-3 col-sm-6">
              <div className="erp-stat-card">
                <div className="erp-stat-icon stat-rose">
                  <i className="bi-calendar-x-fill"></i>
                </div>
                <div>
                  <div className="erp-stat-value">{stats?.pendingHodLeaves || 0}</div>
                  <div className="erp-stat-label">Pending Faculty Leaves</div>
                </div>
              </div>
            </div>

            <div className="col-md-3 col-sm-6">
              <div className="erp-stat-card">
                <div className="erp-stat-icon stat-amber">
                  <i className="bi-shuffle"></i>
                </div>
                <div>
                  <div className="erp-stat-value">{stats?.pendingAdjustments || 0}</div>
                  <div className="erp-stat-label">Class Adjustments Pending</div>
                </div>
              </div>
            </div>

            <div className="col-md-3 col-sm-6">
              <div className="erp-stat-card">
                <div className="erp-stat-icon stat-indigo">
                  <i className="bi-people-fill"></i>
                </div>
                <div>
                  <div className="erp-stat-value">{stats?.deptStudents || 0}</div>
                  <div className="erp-stat-label">Enrolled Students ({stats?.deptFaculty || 0} Faculty)</div>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-lg-8">
              <div className="erp-card">
                <div className="erp-card-header">
                  <h5 className="erp-card-title">
                    <i className="bi-bell-fill text-danger"></i> Faculty Leave Requests Awaiting HOD Approval
                  </h5>
                  <button className="btn btn-sm btn-outline-primary" onClick={() => setActivePage("leave-management")}>
                    View All
                  </button>
                </div>
                <div className="erp-card-body p-0">
                  {stats?.pendingLeaveList?.length === 0 ? (
                    <div className="text-center py-4 text-muted">No pending leave requests for review.</div>
                  ) : (
                    <div className="table-responsive">
                      <table className="erp-table">
                        <thead>
                          <tr>
                            <th>Faculty</th>
                            <th>Type</th>
                            <th>Dates</th>
                            <th>Reason</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats?.pendingLeaveList?.map((l) => (
                            <tr key={l._id}>
                              <td className="fw-bold">{l.facultyId?.name}</td>
                              <td><span className="badge bg-secondary">{l.leaveType}</span></td>
                              <td>{l.startDate} to {l.endDate} ({l.totalDays}d)</td>
                              <td className="text-truncate" style={{ maxWidth: 200 }}>{l.reason}</td>
                              <td>
                                <button
                                  className="btn btn-sm btn-primary"
                                  onClick={() => setActivePage("leave-management")}
                                >
                                  Review
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              <div className="erp-card">
                <div className="erp-card-header">
                  <h5 className="erp-card-title">
                    <i className="bi-lightning-charge text-warning"></i> HOD Fast Actions
                  </h5>
                </div>
                <div className="erp-card-body d-flex flex-column gap-2">
                  <button className="btn btn-outline-primary text-start" onClick={() => setActivePage("academics")}>
                    <i className="bi-diagram-3 me-2"></i> Allocate Subjects to Faculty
                  </button>
                  <button className="btn btn-outline-primary text-start" onClick={() => setActivePage("class-adjustment")}>
                    <i className="bi-arrow-left-right me-2"></i> Review Substitution Requests
                  </button>
                  <button className="btn btn-outline-primary text-start" onClick={() => setActivePage("attendance-reports")}>
                    <i className="bi-file-earmark-bar-graph me-2"></i> Department Attendance Reports
                  </button>
                  <button className="btn btn-outline-primary text-start" onClick={() => setActivePage("feedback")}>
                    <i className="bi-star me-2"></i> Student Feedback Analytics
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* =========================================================================
          4. PRINCIPAL DASHBOARD
          ========================================================================= */}
      {role === "principal" && (
        <>
          <div className="row g-3 mb-4">
            <div className="col-md-3 col-sm-6">
              <div className="erp-stat-card">
                <div className="erp-stat-icon stat-indigo">
                  <i className="bi-mortarboard-fill"></i>
                </div>
                <div>
                  <div className="erp-stat-value">{stats?.totalStudents || 0}</div>
                  <div className="erp-stat-label">Total College Students</div>
                </div>
              </div>
            </div>

            <div className="col-md-3 col-sm-6">
              <div className="erp-stat-card">
                <div className="erp-stat-icon stat-sky">
                  <i className="bi-person-badge-fill"></i>
                </div>
                <div>
                  <div className="erp-stat-value">{stats?.totalFaculty || 0}</div>
                  <div className="erp-stat-label">Total Teaching Faculty</div>
                </div>
              </div>
            </div>

            <div className="col-md-3 col-sm-6">
              <div className="erp-stat-card">
                <div className="erp-stat-icon stat-emerald">
                  <i className="bi-building-check"></i>
                </div>
                <div>
                  <div className="erp-stat-value">{stats?.collegeAttendanceRate}%</div>
                  <div className="erp-stat-label">Overall Campus Attendance</div>
                </div>
              </div>
            </div>

            <div className="col-md-3 col-sm-6">
              <div className="erp-stat-card">
                <div className="erp-stat-icon stat-rose">
                  <i className="bi-shield-exclamation"></i>
                </div>
                <div>
                  <div className="erp-stat-value">{stats?.pendingPrincipalLeaves?.length || 0}</div>
                  <div className="erp-stat-label">Leaves Awaiting Final Decision</div>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-lg-8">
              <div className="erp-card">
                <div className="erp-card-header">
                  <h5 className="erp-card-title">
                    <i className="bi-building text-primary"></i> Academic Departments Status
                  </h5>
                </div>
                <div className="erp-card-body p-0">
                  <div className="table-responsive">
                    <table className="erp-table">
                      <thead>
                        <tr>
                          <th>Dept Code</th>
                          <th>Department Name</th>
                          <th>Head of Department</th>
                          <th>Intake</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats?.departments?.map((d) => (
                          <tr key={d._id}>
                            <td className="fw-bold">{d.code}</td>
                            <td>{d.name}</td>
                            <td>{d.hodFacultyId?.name || "Dr. Suresh Babu"}</td>
                            <td>{d.intake} Students</td>
                            <td><span className="badge bg-success">Active</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              <div className="erp-card">
                <div className="erp-card-header">
                  <h5 className="erp-card-title">
                    <i className="bi-award-fill text-warning"></i> Executive Actions
                  </h5>
                </div>
                <div className="erp-card-body d-flex flex-column gap-2">
                  <button className="btn btn-outline-danger text-start" onClick={() => setActivePage("leave-management")}>
                    <i className="bi-calendar-check me-2"></i> Principal Final Leave Approvals ({stats?.pendingPrincipalLeaves?.length || 0})
                  </button>
                  <button className="btn btn-outline-primary text-start" onClick={() => setActivePage("attendance-reports")}>
                    <i className="bi-pie-chart-fill me-2"></i> College-Wide Attendance Monitor
                  </button>
                  <button className="btn btn-outline-primary text-start" onClick={() => setActivePage("feedback")}>
                    <i className="bi-bar-chart-fill me-2"></i> Academic Feedback Reviews
                  </button>
                  <button className="btn btn-outline-primary text-start" onClick={() => setActivePage("payroll")}>
                    <i className="bi-cash-stack me-2"></i> Monthly Payroll Records
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* =========================================================================
          5. ADMIN DASHBOARD
          ========================================================================= */}
      {role === "admin" && (
        <>
          <div className="row g-3 mb-4">
            <div className="col-md-3 col-sm-6">
              <div className="erp-stat-card">
                <div className="erp-stat-icon stat-indigo">
                  <i className="bi-mortarboard"></i>
                </div>
                <div>
                  <div className="erp-stat-value">{stats?.totalStudents || 0}</div>
                  <div className="erp-stat-label">Registered Students</div>
                </div>
              </div>
            </div>

            <div className="col-md-3 col-sm-6">
              <div className="erp-stat-card">
                <div className="erp-stat-icon stat-sky">
                  <i className="bi-people"></i>
                </div>
                <div>
                  <div className="erp-stat-value">{stats?.totalFaculty || 0}</div>
                  <div className="erp-stat-label">Faculty Accounts</div>
                </div>
              </div>
            </div>

            <div className="col-md-3 col-sm-6">
              <div className="erp-stat-card">
                <div className="erp-stat-icon stat-emerald">
                  <i className="bi-building"></i>
                </div>
                <div>
                  <div className="erp-stat-value">{stats?.totalDepartments || 0}</div>
                  <div className="erp-stat-label">Departments Configured</div>
                </div>
              </div>
            </div>

            <div className="col-md-3 col-sm-6">
              <div className="erp-stat-card">
                <div className="erp-stat-icon stat-amber">
                  <i className="bi-calendar-check"></i>
                </div>
                <div>
                  <div className="erp-stat-value">{stats?.todayAttendanceRate}%</div>
                  <div className="erp-stat-label">Today's Attendance Rate</div>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Control Cards */}
          <div className="row g-3">
            <div className="col-md-4">
              <div className="erp-card h-100">
                <div className="erp-card-header">
                  <h5 className="erp-card-title"><i className="bi-person-plus text-primary"></i> Academic Setup</h5>
                </div>
                <div className="erp-card-body d-flex flex-column gap-2">
                  <button className="btn btn-light text-start border" onClick={() => setActivePage("students")}>
                    <i className="bi-mortarboard me-2 text-primary"></i> Register New Students
                  </button>
                  <button className="btn btn-light text-start border" onClick={() => setActivePage("faculty")}>
                    <i className="bi-person-badge me-2 text-success"></i> Add Teaching Staff
                  </button>
                  <button className="btn btn-light text-start border" onClick={() => setActivePage("academics")}>
                    <i className="bi-book me-2 text-warning"></i> Departments & Subjects
                  </button>
                  <button className="btn btn-light text-start border" onClick={() => setActivePage("timetable")}>
                    <i className="bi-calendar3 me-2 text-info"></i> Class Timetable Management
                  </button>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="erp-card h-100">
                <div className="erp-card-header">
                  <h5 className="erp-card-title"><i className="bi-cash-coin text-success"></i> Finance & Payroll</h5>
                </div>
                <div className="erp-card-body d-flex flex-column gap-2">
                  <button className="btn btn-light text-start border" onClick={() => setActivePage("payroll")}>
                    <i className="bi-currency-rupee me-2 text-success"></i> Salary Structures
                  </button>
                  <button className="btn btn-light text-start border" onClick={() => setActivePage("payroll")}>
                    <i className="bi-file-earmark-pdf me-2 text-danger"></i> Monthly Payslip Generation
                  </button>
                  <button className="btn btn-light text-start border" onClick={() => setActivePage("attendance-reports")}>
                    <i className="bi-file-earmark-excel me-2 text-primary"></i> Export Attendance Reports
                  </button>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="erp-card h-100">
                <div className="erp-card-header">
                  <h5 className="erp-card-title"><i className="bi-shield-lock text-danger"></i> Security & Audit</h5>
                </div>
                <div className="erp-card-body d-flex flex-column gap-2">
                  <button className="btn btn-light text-start border" onClick={() => setActivePage("users")}>
                    <i className="bi-people-fill me-2 text-primary"></i> Manage All User Accounts
                  </button>
                  <button className="btn btn-light text-start border" onClick={() => setActivePage("audit-logs")}>
                    <i className="bi-journal-check me-2 text-secondary"></i> Inspect Audit Logs
                  </button>
                  <button className="btn btn-light text-start border" onClick={() => setActivePage("leave-management")}>
                    <i className="bi-calendar-check me-2 text-success"></i> Leave Policy & Workflow
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
