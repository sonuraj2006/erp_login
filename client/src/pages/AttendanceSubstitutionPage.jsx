import React, { useState, useEffect } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

export default function AttendanceSubstitutionPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [facultyList, setFacultyList] = useState([]);

  // Form states
  const [selectedSourceSession, setSelectedSourceSession] = useState("");
  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [targetPeriod, setTargetPeriod] = useState(2);
  const [substituteFacultyId, setSubstituteFacultyId] = useState("");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    // Load sessions
    api.get("/api/attendance/sessions")
      .then((res) => {
        setSessions(res.sessions || []);
        if (res.sessions && res.sessions.length > 0) {
          setSelectedSourceSession(res.sessions[0]._id);
        }
      })
      .catch((err) => console.error(err));

    // Load faculty
    api.get("/api/faculty")
      .then((res) => {
        setFacultyList(res.faculty || []);
        if (res.faculty && res.faculty.length > 0) {
          setSubstituteFacultyId(res.faculty[0]._id);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handleCopyAttendance = async (e) => {
    e.preventDefault();
    if (!selectedSourceSession || !reason.trim()) {
      setAlert({ type: "warning", message: "Please select a source session and enter substitution justification." });
      return;
    }

    setLoading(true);
    setAlert(null);

    try {
      const res = await api.post("/api/attendance/copy", {
        sourceSessionId: selectedSourceSession,
        targetDate,
        targetPeriod: Number(targetPeriod),
        substituteFacultyId,
        reason: reason.trim(),
      });

      setAlert({ type: "success", message: res.message });
      // Refresh list
      const refreshed = await api.get("/api/attendance/sessions");
      setSessions(refreshed.sessions || []);
      setReason("");
    } catch (err) {
      setAlert({ type: "danger", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const selectedSourceObj = sessions.find((s) => s._id === selectedSourceSession);

  return (
    <div className="erp-content">
      <div className="erp-page-header">
        <div>
          <h2 className="erp-page-title">Attendance Copy / Faculty Substitution</h2>
          <p className="erp-page-subtitle">
            Authorize a substitute faculty to duplicate or record attendance for another teacher's class with full audit trail.
          </p>
        </div>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type} alert-dismissible fade show`} role="alert">
          {alert.message}
          <button type="button" className="btn-close" onClick={() => setAlert(null)}></button>
        </div>
      )}

      <div className="row g-4">
        {/* Copy / Substitution Form */}
        <div className="col-lg-6">
          <div className="erp-card">
            <div className="erp-card-header">
              <h5 className="erp-card-title">
                <i className="bi-arrow-left-right text-primary"></i> Take Attendance for Substitute Period
              </h5>
            </div>
            <div className="erp-card-body">
              <form onSubmit={handleCopyAttendance}>
                {/* 1. Select Source Session */}
                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted">
                    1. Select Original / Source Session to Copy
                  </label>
                  <select
                    className="form-select"
                    value={selectedSourceSession}
                    onChange={(e) => setSelectedSourceSession(e.target.value)}
                    required
                  >
                    {sessions.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.date} (Period {s.period}) — {s.subjectId?.name} [{s.department} Sec {s.section}]
                      </option>
                    ))}
                  </select>
                </div>

                {selectedSourceObj && (
                  <div className="p-3 bg-light rounded-3 mb-3 border" style={{ fontSize: "0.85rem" }}>
                    <div className="fw-bold text-dark mb-1">Source Session Snapshot:</div>
                    <div className="text-muted">
                      Original Instructor: <strong>{selectedSourceObj.originalFacultyId?.name}</strong>
                    </div>
                    <div className="text-muted">
                      Subject: <strong>{selectedSourceObj.subjectId?.name} ({selectedSourceObj.subjectId?.code})</strong>
                    </div>
                    <div className="text-muted">
                      Class: <strong>{selectedSourceObj.department} Sem {selectedSourceObj.semester} Sec {selectedSourceObj.section}</strong>
                    </div>
                    <div className="text-muted">
                      Roster: {selectedSourceObj.presentCount} Present, {selectedSourceObj.absentCount} Absent
                    </div>
                  </div>
                )}

                {/* 2. Destination Date & Period */}
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold small text-muted">Target Substitute Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-bold small text-muted">Target Period</label>
                    <select
                      className="form-select"
                      value={targetPeriod}
                      onChange={(e) => setTargetPeriod(Number(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                        <option key={p} value={p}>Period {p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3. Substitute Faculty */}
                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted">Authorized Substitute Faculty</label>
                  <select
                    className="form-select"
                    value={substituteFacultyId}
                    onChange={(e) => setSubstituteFacultyId(e.target.value)}
                  >
                    {facultyList.map((f) => (
                      <option key={f._id} value={f._id}>
                        {f.name} ({f.employeeId}) — {f.department}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Reason */}
                <div className="mb-4">
                  <label className="form-label fw-bold small text-muted">
                    Official Justification / Substitution Order No.
                  </label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="e.g., Authorized by HOD due to Prof. Neha's official university conference travel."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="btn btn-erp-primary w-100 justify-content-center"
                  disabled={loading}
                >
                  <i className="bi-clipboard-check-fill"></i>
                  {loading ? "Processing Copy..." : "Authorize & Copy Attendance Record"}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Audit Log / Copy History */}
        <div className="col-lg-6">
          <div className="erp-card">
            <div className="erp-card-header">
              <h5 className="erp-card-title">
                <i className="bi-shield-check text-success"></i> Substitution & Copy Audit History
              </h5>
            </div>
            <div className="erp-card-body p-0">
              <div className="list-group list-group-flush" style={{ maxHeight: 560, overflowY: "auto" }}>
                {sessions
                  .filter((s) => s.isSubstituted || s.copiedFromSessionId)
                  .map((s) => (
                    <div key={s._id} className="list-group-item p-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="badge bg-warning text-dark">
                          <i className="bi-arrow-left-right me-1"></i> Substituted Session
                        </span>
                        <span className="text-muted small">{s.date} (Period {s.period})</span>
                      </div>
                      <div className="fw-bold text-dark mt-1">
                        {s.subjectId?.name} ({s.department} Sec {s.section})
                      </div>
                      <div className="text-muted small mt-1">
                        Original Faculty: <strong>{s.originalFacultyId?.name}</strong>
                      </div>
                      <div className="text-muted small">
                        Substitute Marker: <strong className="text-primary">{s.markedByFacultyId?.name}</strong>
                      </div>
                      <div className="bg-light p-2 rounded mt-2 border text-secondary" style={{ fontSize: "0.8rem" }}>
                        <i className="bi-info-circle me-1"></i>
                        Reason: {s.substituteReason || "Authorized class adjustment"}
                      </div>
                    </div>
                  ))}
                {sessions.filter((s) => s.isSubstituted || s.copiedFromSessionId).length === 0 && (
                  <div className="text-center py-5 text-muted">
                    No substituted or copied attendance records yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
