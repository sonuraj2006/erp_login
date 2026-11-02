import React, { useState, useEffect } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

export default function ClassAdjustmentPage() {
  const { user } = useAuth();
  const role = user?.role;

  const [adjustments, setAdjustments] = useState([]);
  const [pendingHodAdjustments, setPendingHodAdjustments] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // Request form state
  const [substituteFacultyId, setSubstituteFacultyId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [period, setPeriod] = useState(1);
  const [department, setDepartment] = useState("CSE");
  const [semester, setSemester] = useState(5);
  const [section, setSection] = useState("A");
  const [subjectId, setSubjectId] = useState("");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const [departments, setDepartments] = useState([]);

  const loadData = () => {
    // Departments
    api.get("/api/academics/departments")
      .then((res) => {
        const depts = res.departments || [];
        setDepartments(depts);
        if (depts.length > 0 && !depts.some((d) => d.code === department)) {
          setDepartment(depts[0].code);
        }
      })
      .catch((err) => console.error(err));

    // My adjustments
    api.get("/api/adjustments/my")
      .then((res) => setAdjustments(res.adjustments || []))
      .catch((err) => console.error(err));

    // If HOD or Admin, get pending
    if (["hod", "admin", "principal"].includes(role)) {
      api.get("/api/adjustments/pending")
        .then((res) => setPendingHodAdjustments(res.adjustments || []))
        .catch((err) => console.error(err));
    }

    // Faculty
    api.get("/api/faculty")
      .then((res) => {
        const facs = res.faculty || [];
        setFacultyList(facs);
        if (facs.length > 0 && !substituteFacultyId) {
          setSubstituteFacultyId(facs[0]._id);
        }
      })
      .catch((err) => console.error(err));

    // Subjects
    api.get("/api/academics/subjects")
      .then((res) => {
        const subs = res.allSubjects || res.subjects || [];
        setSubjects(subs);
        if (subs.length > 0 && !subjectId) {
          setSubjectId(subs[0]._id);
        }
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    loadData();
  }, [role]);

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlert(null);

    try {
      const res = await api.post("/api/adjustments/request", {
        substituteFacultyId,
        date,
        period: Number(period),
        department,
        semester: Number(semester),
        section,
        subjectId,
        reason,
      });

      setAlert({ type: "success", message: res.message });
      setReason("");
      loadData();
    } catch (err) {
      setAlert({ type: "danger", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleHodAction = async (id, action) => {
    try {
      const res = await api.post(`/api/adjustments/${id}/action`, {
        action,
        remarks: "Approved by HOD and timetable updated.",
      });
      setAlert({ type: "success", message: res.message });
      loadData();
    } catch (err) {
      setAlert({ type: "danger", message: err.message });
    }
  };

  return (
    <div className="erp-content">
      <div className="erp-page-header">
        <div>
          <h2 className="erp-page-title">Class Adjustment Management</h2>
          <p className="erp-page-subtitle">
            Request substitute teaching arrangements and route for Head of Department approval.
          </p>
        </div>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type} alert-dismissible fade show`} role="alert">
          {alert.message}
          <button type="button" className="btn-close" onClick={() => setAlert(null)}></button>
        </div>
      )}

      {/* HOD Review Card (if role allows) */}
      {["hod", "admin"].includes(role) && pendingHodAdjustments.length > 0 && (
        <div className="erp-card mb-4 border-primary">
          <div className="erp-card-header bg-primary-subtle">
            <h5 className="erp-card-title text-primary mb-0">
              <i className="bi-hourglass-split"></i> Department Adjustment Requests Awaiting Your Approval ({pendingHodAdjustments.length})
            </h5>
          </div>
          <div className="erp-card-body p-0">
            <div className="table-responsive">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Original Faculty</th>
                    <th>Designated Substitute</th>
                    <th>Class & Subject</th>
                    <th>Date & Period</th>
                    <th>Reason</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingHodAdjustments.map((item) => (
                    <tr key={item._id}>
                      <td className="fw-bold">{item.originalFacultyId?.name}</td>
                      <td className="fw-bold text-success">{item.substituteFacultyId?.name}</td>
                      <td>
                        {item.department} Sem {item.semester} Sec {item.section} • {item.subjectId?.name}
                      </td>
                      <td>
                        {item.date} <span className="badge bg-primary">Period {item.period}</span>
                      </td>
                      <td className="text-truncate" style={{ maxWidth: 200 }}>{item.reason}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleHodAction(item._id, "Approve")}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleHodAction(item._id, "Reject")}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="row g-4">
        {/* Request Form */}
        <div className="col-lg-5">
          <div className="erp-card">
            <div className="erp-card-header">
              <h5 className="erp-card-title"><i className="bi-shuffle text-primary"></i> Request Substitution</h5>
            </div>
            <div className="erp-card-body">
              <form onSubmit={handleSubmitRequest}>
                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted">Substitute Colleague</label>
                  <select
                    className="form-select"
                    value={substituteFacultyId}
                    onChange={(e) => setSubstituteFacultyId(e.target.value)}
                    required
                  >
                    {facultyList.map((f) => (
                      <option key={f._id} value={f._id}>
                        {f.name} ({f.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-bold text-muted">Adjustment Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-bold text-muted">Period</label>
                    <select
                      className="form-select"
                      value={period}
                      onChange={(e) => setPeriod(Number(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                        <option key={p} value={p}>Period {p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-4">
                    <label className="form-label small fw-bold text-muted">Dept</label>
                    <select
                      className="form-select"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    >
                      {(departments.length > 0 ? departments.map((d) => d.code) : ["CSE", "ECE", "IT", "MECH", "CIVIL"]).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-4">
                    <label className="form-label small fw-bold text-muted">Semester</label>
                    <select
                      className="form-select"
                      value={semester}
                      onChange={(e) => setSemester(Number(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                        <option key={s} value={s}>Sem {s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-4">
                    <label className="form-label small fw-bold text-muted">Section</label>
                    <select
                      className="form-select"
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                    >
                      {["A", "B", "C", "D"].map((sec) => (
                        <option key={sec} value={sec}>Sec {sec}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted">Subject</label>
                  <select
                    className="form-select"
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    required
                  >
                    <option value="">-- Select Subject --</option>
                    {subjects.filter(s => s.department?.toUpperCase() === department?.toUpperCase() && Number(s.semester) === Number(semester)).length > 0 && (
                      <optgroup label={`${department} Sem ${semester} Subjects`}>
                        {subjects
                          .filter(s => s.department?.toUpperCase() === department?.toUpperCase() && Number(s.semester) === Number(semester))
                          .map((sub) => (
                            <option key={sub._id} value={sub._id}>
                              {sub.code} - {sub.name}
                            </option>
                          ))}
                      </optgroup>
                    )}
                    <optgroup label="Other Available Subjects">
                      {subjects
                        .filter(s => !(s.department?.toUpperCase() === department?.toUpperCase() && Number(s.semester) === Number(semester)))
                        .map((sub) => (
                          <option key={sub._id} value={sub._id}>
                            {sub.code} - {sub.name} ({sub.department} Sem {sub.semester})
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="form-label small fw-bold text-muted">Reason for Class Adjustment</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="e.g. Attending parent-teacher meeting or university committee."
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
                  <i className="bi-send-fill"></i> {loading ? "Checking Availability..." : "Send Adjustment Request to HOD"}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* History List */}
        <div className="col-lg-7">
          <div className="erp-card">
            <div className="erp-card-header">
              <h5 className="erp-card-title"><i className="bi-clock-history text-secondary"></i> Adjustment Requests History</h5>
            </div>
            <div className="erp-card-body p-0">
              {adjustments.length === 0 ? (
                <div className="text-center py-5 text-muted">No class adjustment records found.</div>
              ) : (
                <div className="table-responsive">
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>Date & Period</th>
                        <th>Original</th>
                        <th>Substitute</th>
                        <th>Class & Subject</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adjustments.map((a) => (
                        <tr key={a._id}>
                          <td>
                            <strong>{a.date}</strong>
                            <span className="badge bg-primary ms-1">P{a.period}</span>
                          </td>
                          <td>{a.originalFacultyId?.name}</td>
                          <td className="fw-bold text-primary">{a.substituteFacultyId?.name}</td>
                          <td>
                            {a.department} Sem {a.semester} Sec {a.section} • {a.subjectId?.name}
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                a.status === "Approved"
                                  ? "bg-success"
                                  : a.status === "Rejected"
                                  ? "bg-danger"
                                  : "bg-warning text-dark"
                              }`}
                            >
                              {a.status}
                            </span>
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
      </div>
    </div>
  );
}
