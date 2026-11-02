import React, { useState, useEffect } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { useAppData } from "../context/AppDataContext";

export default function AttendanceTrackerPage() {
  const { user } = useAuth();

  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);

  // Form selections
  const [selectedDept, setSelectedDept] = useState("CSE");
  const [selectedSemester, setSelectedSemester] = useState(5);
  const [selectedSection, setSelectedSection] = useState("A");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Attendance markings: { [studentId]: "Present" | "Absent" | "On Duty" }
  const [markings, setMarkings] = useState({});
  const [remarks, setRemarks] = useState({});

  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);

  // Use global departments list (auto-updates when new dept is added in Academic Setup)
  const { departments } = useAppData();

  // Set default selectedDept once departments are loaded
  useEffect(() => {
    if (departments.length > 0 && !departments.some((d) => d.code === selectedDept)) {
      setSelectedDept(departments[0].code);
    }
  }, [departments]);

  // Load sessions on mount
  useEffect(() => {
    fetchSessions();
  }, []);

  // When dept or semester changes, load subjects
  useEffect(() => {
    if (selectedDept && selectedSemester) {
      api.get(`/api/academics/subjects?department=${selectedDept}&semester=${selectedSemester}`)
        .then((res) => {
          setSubjects(res.subjects || []);
          if (res.subjects && res.subjects.length > 0) {
            setSelectedSubject(res.subjects[0]._id);
          } else {
            setSelectedSubject("");
          }
        })
        .catch((err) => console.error(err));
    }
  }, [selectedDept, selectedSemester]);

  // When class filter changes, fetch enrolled students
  const fetchStudents = () => {
    setLoadingStudents(true);
    setAlert(null);
    api.get(`/api/students?department=${selectedDept}&semester=${selectedSemester}&section=${selectedSection}`)
      .then((res) => {
        const list = res.students || [];
        setStudents(list);
        // Default mark all present
        const initMarkings = {};
        list.forEach((s) => {
          initMarkings[s._id] = "Present";
        });
        setMarkings(initMarkings);
      })
      .catch((err) => {
        setAlert({ type: "danger", message: err.message });
      })
      .finally(() => setLoadingStudents(false));
  };

  useEffect(() => {
    fetchStudents();
  }, [selectedDept, selectedSemester, selectedSection]);

  const fetchSessions = () => {
    api.get("/api/attendance/sessions")
      .then((res) => setSessions(res.sessions || []))
      .catch((err) => console.error(err));
  };

  const handleStatusToggle = (studentId, status) => {
    setMarkings((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const markAll = (status) => {
    const updated = {};
    students.forEach((s) => {
      updated[s._id] = status;
    });
    setMarkings(updated);
  };

  const handleSubmitAttendance = async (e) => {
    e.preventDefault();
    if (!selectedSubject) {
      setAlert({ type: "warning", message: "Please select an assigned subject." });
      return;
    }

    if (students.length === 0) {
      setAlert({ type: "warning", message: "No enrolled students found for this class section." });
      return;
    }

    setSubmitting(true);
    setAlert(null);

    const records = students.map((s) => ({
      studentId: s._id,
      status: markings[s._id] || "Present",
      remarks: remarks[s._id] || "",
    }));

    try {
      const res = await api.post("/api/attendance/session", {
        department: selectedDept,
        semester: Number(selectedSemester),
        section: selectedSection,
        subjectId: selectedSubject,
        date: selectedDate,
        period: Number(selectedPeriod),
        records,
      });

      setAlert({ type: "success", message: res.message });
      fetchSessions();
    } catch (err) {
      setAlert({ type: "danger", message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const presentCount = Object.values(markings).filter((v) => v === "Present").length;
  const absentCount = Object.values(markings).filter((v) => v === "Absent").length;
  const odCount = Object.values(markings).filter((v) => v === "On Duty").length;

  return (
    <div className="erp-content">
      <div className="erp-page-header">
        <div>
          <h2 className="erp-page-title">Attendance Tracker</h2>
          <p className="erp-page-subtitle">
            Record daily student attendance per period with duplicate prevention and absence alerts.
          </p>
        </div>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type} alert-dismissible fade show`} role="alert">
          {alert.message}
          <button type="button" className="btn-close" onClick={() => setAlert(null)}></button>
        </div>
      )}

      {/* Class & Period Selection Bar */}
      <div className="erp-card mb-4">
        <div className="erp-card-body p-3">
          <div className="row g-2 align-items-end">
            <div className="col-md-2 col-6">
              <label className="form-label small fw-bold text-muted mb-1">Department</label>
              <select
                className="form-select form-select-sm"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
              >
                {departments.map((d) => (
                  <option key={d._id} value={d.code}>{d.code} - {d.name}</option>
                ))}
              </select>
            </div>

            <div className="col-md-2 col-6">
              <label className="form-label small fw-bold text-muted mb-1">Semester</label>
              <select
                className="form-select form-select-sm"
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>

            <div className="col-md-1 col-6">
              <label className="form-label small fw-bold text-muted mb-1">Section</label>
              <select
                className="form-select form-select-sm"
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
              >
                {["A", "B", "C", "D"].map((sec) => (
                  <option key={sec} value={sec}>Sec {sec}</option>
                ))}
              </select>
            </div>

            <div className="col-md-3 col-6">
              <label className="form-label small fw-bold text-muted mb-1">Subject</label>
              <select
                className="form-select form-select-sm"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                {subjects.length === 0 && <option value="">No subjects found</option>}
                {subjects.map((sub) => (
                  <option key={sub._id} value={sub._id}>{sub.code} - {sub.name}</option>
                ))}
              </select>
            </div>

            <div className="col-md-2 col-6">
              <label className="form-label small fw-bold text-muted mb-1">Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <div className="col-md-2 col-6">
              <label className="form-label small fw-bold text-muted mb-1">Period</label>
              <select
                className="form-select form-select-sm"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                  <option key={p} value={p}>Period {p}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        {/* Student Attendance Marking Grid */}
        <div className="col-lg-8">
          <div className="erp-card">
            <div className="erp-card-header flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2">
                <h5 className="erp-card-title mb-0">
                  <i className="bi-people-fill text-primary"></i> Class Roster ({students.length} Students)
                </h5>
                <span className="badge bg-light text-dark border">
                  {selectedDept} Sem {selectedSemester} Sec {selectedSection} | Period {selectedPeriod}
                </span>
              </div>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-success"
                  onClick={() => markAll("Present")}
                >
                  Mark All Present
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => markAll("Absent")}
                >
                  Mark All Absent
                </button>
              </div>
            </div>

            <div className="erp-card-body p-0">
              {loadingStudents ? (
                <div className="text-center py-5">
                  <div className="spinner-border spinner-border-sm text-primary mb-2"></div>
                  <div className="text-muted">Loading students...</div>
                </div>
              ) : students.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="bi-people fs-2 mb-2 d-block"></i>
                  No students found in {selectedDept} Sem {selectedSemester} Sec {selectedSection}.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>Roll No</th>
                        <th>Student Name</th>
                        <th>Status</th>
                        <th>Remarks / Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((st) => {
                        const currentStatus = markings[st._id] || "Present";

                        return (
                          <tr key={st._id}>
                            <td className="fw-bold">{st.rollNumber}</td>
                            <td>
                              <div>{st.name}</div>
                              <small className="text-muted">{st.email || st.parentPhone}</small>
                            </td>
                            <td>
                              <div className="btn-group btn-group-sm" role="group">
                                <button
                                  type="button"
                                  className={`btn ${
                                    currentStatus === "Present"
                                      ? "btn-success"
                                      : "btn-outline-secondary"
                                  }`}
                                  onClick={() => handleStatusToggle(st._id, "Present")}
                                >
                                  Present
                                </button>
                                <button
                                  type="button"
                                  className={`btn ${
                                    currentStatus === "Absent"
                                      ? "btn-danger"
                                      : "btn-outline-secondary"
                                  }`}
                                  onClick={() => handleStatusToggle(st._id, "Absent")}
                                >
                                  Absent
                                </button>
                                <button
                                  type="button"
                                  className={`btn ${
                                    currentStatus === "On Duty"
                                      ? "btn-warning"
                                      : "btn-outline-secondary"
                                  }`}
                                  onClick={() => handleStatusToggle(st._id, "On Duty")}
                                >
                                  On Duty
                                </button>
                              </div>
                            </td>
                            <td>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Optional note"
                                value={remarks[st._id] || ""}
                                onChange={(e) =>
                                  setRemarks({ ...remarks, [st._id]: e.target.value })
                                }
                                style={{ maxWidth: 150 }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="erp-card-header border-top d-flex justify-content-between align-items-center">
              <div className="d-flex gap-3 small fw-bold">
                <span className="text-success"><i className="bi-check-circle-fill"></i> {presentCount} Present</span>
                <span className="text-danger"><i className="bi-x-circle-fill"></i> {absentCount} Absent</span>
                <span className="text-warning"><i className="bi-shield-check"></i> {odCount} On Duty</span>
              </div>
              <button
                type="button"
                className="btn btn-erp-primary"
                disabled={submitting || students.length === 0}
                onClick={handleSubmitAttendance}
              >
                {submitting ? "Saving..." : "Submit Attendance Session"}
              </button>
            </div>
          </div>
        </div>

        {/* History / Sessions Panel */}
        <div className="col-lg-4">
          <div className="erp-card">
            <div className="erp-card-header">
              <h5 className="erp-card-title">
                <i className="bi-clock-history text-secondary"></i> Recent Attendance Sessions
              </h5>
            </div>
            <div className="erp-card-body p-0">
              {sessions.length === 0 ? (
                <div className="text-center py-4 text-muted">No attendance sessions recorded yet.</div>
              ) : (
                <div className="list-group list-group-flush" style={{ maxHeight: 520, overflowY: "auto" }}>
                  {sessions.slice(0, 10).map((sess) => (
                    <div key={sess._id} className="list-group-item p-3">
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <span className="fw-bold text-primary" style={{ fontSize: "0.88rem" }}>
                          {sess.subjectId?.name || "Subject"}
                        </span>
                        <span className="badge bg-primary">Period {sess.period}</span>
                      </div>
                      <div className="text-muted" style={{ fontSize: "0.78rem" }}>
                        {sess.department} Sem {sess.semester} Sec {sess.section} • {sess.date}
                      </div>
                      <div className="d-flex gap-2 mt-2" style={{ fontSize: "0.75rem" }}>
                        <span className="badge bg-success-subtle text-success border border-success-subtle">
                          {sess.presentCount} Present
                        </span>
                        <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                          {sess.absentCount} Absent
                        </span>
                        {sess.odCount > 0 && (
                          <span className="badge bg-warning-subtle text-warning border border-warning-subtle">
                            {sess.odCount} OD
                          </span>
                        )}
                        {sess.isSubstituted && (
                          <span className="badge bg-info-subtle text-info border border-info-subtle">
                            Substituted
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-muted" style={{ fontSize: "0.72rem" }}>
                        Marked by: {sess.markedByFacultyId?.name || "Faculty"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
