import React, { useState, useEffect } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

export default function LeaveManagementPage() {
  const { user } = useAuth();
  const role = user?.role;

  const [activeTab, setActiveTab] = useState("apply"); // "apply" | "hod" | "principal" | "all"
  const [leaves, setLeaves] = useState([]);
  const [hodPending, setHodPending] = useState([]);
  const [principalPending, setPrincipalPending] = useState([]);
  const [allLeaves, setAllLeaves] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState({ casual: 12, sick: 10, earned: 15, duty: 8 });

  // Form inputs
  const [leaveType, setLeaveType] = useState("Casual Leave");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [totalDays, setTotalDays] = useState(1);
  const [reason, setReason] = useState("");
  const [evidenceFile, setEvidenceFile] = useState(null);

  // Review modal
  const [reviewingLeave, setReviewingLeave] = useState(null);
  const [reviewRemarks, setReviewRemarks] = useState("");
  const [reviewAction, setReviewAction] = useState("");

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const fetchMyLeaves = () => {
    api.get("/api/leave/my")
      .then((res) => {
        setLeaves(res.leaves || []);
        if (res.leaveBalance) setLeaveBalance(res.leaveBalance);
      })
      .catch((err) => console.error(err));
  };

  const fetchHodPending = () => {
    if (["hod", "admin", "principal"].includes(role)) {
      api.get("/api/leave/hod-pending")
        .then((res) => setHodPending(res.leaves || []))
        .catch((err) => console.error(err));
    }
  };

  const fetchPrincipalPending = () => {
    if (["principal", "admin"].includes(role)) {
      api.get("/api/leave/principal-pending")
        .then((res) => setPrincipalPending(res.leaves || []))
        .catch((err) => console.error(err));
    }
  };

  const fetchAllLeaves = () => {
    if (["principal", "admin"].includes(role)) {
      api.get("/api/leave/all")
        .then((res) => setAllLeaves(res.leaves || []))
        .catch((err) => console.error(err));
    }
  };

  useEffect(() => {
    fetchMyLeaves();
    fetchHodPending();
    fetchPrincipalPending();
    fetchAllLeaves();
  }, [role]);

  // Handle total days calculation
  useEffect(() => {
    if (startDate && endDate) {
      const d1 = new Date(startDate);
      const d2 = new Date(endDate);
      const diff = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
      setTotalDays(diff > 0 ? diff : 1);
    }
  }, [startDate, endDate]);

  const handleApply = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlert(null);

    const formData = new FormData();
    formData.append("leaveType", leaveType);
    formData.append("startDate", startDate);
    formData.append("endDate", endDate);
    formData.append("totalDays", totalDays);
    formData.append("reason", reason);
    if (evidenceFile) {
      formData.append("evidence", evidenceFile);
    }

    try {
      const res = await api.post("/api/leave/apply", formData);
      setAlert({ type: "success", message: res.message });
      setReason("");
      setEvidenceFile(null);
      fetchMyLeaves();
      fetchHodPending();
    } catch (err) {
      setAlert({ type: "danger", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleHodDecision = async (leaveId, action) => {
    try {
      const res = await api.post(`/api/leave/${leaveId}/hod-action`, {
        action,
        remarks: reviewRemarks || "Reviewed by HOD",
      });
      setAlert({ type: "success", message: res.message });
      setReviewingLeave(null);
      setReviewRemarks("");
      fetchHodPending();
      fetchPrincipalPending();
    } catch (err) {
      setAlert({ type: "danger", message: err.message });
    }
  };

  const handlePrincipalDecision = async (leaveId, action) => {
    try {
      const res = await api.post(`/api/leave/${leaveId}/principal-action`, {
        action,
        remarks: reviewRemarks || "Reviewed by Principal",
      });
      setAlert({ type: "success", message: res.message });
      setReviewingLeave(null);
      setReviewRemarks("");
      fetchPrincipalPending();
      fetchAllLeaves();
    } catch (err) {
      setAlert({ type: "danger", message: err.message });
    }
  };

  return (
    <div className="erp-content">
      <div className="erp-page-header">
        <div>
          <h2 className="erp-page-title">Faculty Leave Management</h2>
          <p className="erp-page-subtitle">
            Two-stage leave approval workflow: Faculty Application &rarr; HOD Recommendation &rarr; Principal Approval.
          </p>
        </div>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type} alert-dismissible fade show`} role="alert">
          {alert.message}
          <button type="button" className="btn-close" onClick={() => setAlert(null)}></button>
        </div>
      )}

      {/* Leave Balance Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3 col-6">
          <div className="erp-stat-card">
            <div className="erp-stat-icon stat-indigo"><i className="bi-cup-hot-fill"></i></div>
            <div>
              <div className="erp-stat-value">{leaveBalance.casual}</div>
              <div className="erp-stat-label">Casual Leaves (CL)</div>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="erp-stat-card">
            <div className="erp-stat-icon stat-amber"><i className="bi-heart-pulse-fill"></i></div>
            <div>
              <div className="erp-stat-value">{leaveBalance.sick}</div>
              <div className="erp-stat-label">Sick Leaves (SL)</div>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="erp-stat-card">
            <div className="erp-stat-icon stat-emerald"><i className="bi-award-fill"></i></div>
            <div>
              <div className="erp-stat-value">{leaveBalance.earned}</div>
              <div className="erp-stat-label">Earned Leaves (EL)</div>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="erp-stat-card">
            <div className="erp-stat-icon stat-sky"><i className="bi-briefcase-fill"></i></div>
            <div>
              <div className="erp-stat-value">{leaveBalance.duty}</div>
              <div className="erp-stat-label">On Duty Leaves (OD)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Nav */}
      <ul className="nav nav-pills mb-4 gap-2">
        {["faculty", "hod", "principal", "admin"].includes(role) && (
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "apply" ? "active" : ""}`}
              onClick={() => setActiveTab("apply")}
            >
              <i className="bi-send-fill me-1"></i> Apply for Leave
            </button>
          </li>
        )}

        {["hod", "admin"].includes(role) && (
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "hod" ? "active" : ""}`}
              onClick={() => setActiveTab("hod")}
            >
              <i className="bi-check2-circle me-1"></i> HOD Review ({hodPending.length})
            </button>
          </li>
        )}

        {["principal", "admin"].includes(role) && (
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "principal" ? "active" : ""}`}
              onClick={() => setActiveTab("principal")}
            >
              <i className="bi-shield-check me-1"></i> Principal Final Approval ({principalPending.length})
            </button>
          </li>
        )}

        {["principal", "admin"].includes(role) && (
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              <i className="bi-journals me-1"></i> College Leave Registry
            </button>
          </li>
        )}
      </ul>

      {/* Tab 1: Apply for Leave */}
      {activeTab === "apply" && (
        <div className="row g-4">
          <div className="col-lg-5">
            <div className="erp-card">
              <div className="erp-card-header">
                <h5 className="erp-card-title"><i className="bi-pencil-square text-primary"></i> Leave Application Form</h5>
              </div>
              <div className="erp-card-body">
                <form onSubmit={handleApply}>
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">Leave Nature / Type</label>
                    <select
                      className="form-select"
                      value={leaveType}
                      onChange={(e) => setLeaveType(e.target.value)}
                    >
                      <option value="Casual Leave">Casual Leave (CL)</option>
                      <option value="Sick Leave">Sick Leave (SL)</option>
                      <option value="Earned Leave">Earned Leave (EL)</option>
                      <option value="On Duty Leave">On Duty Leave (OD)</option>
                      <option value="Maternity / Paternity Leave">Maternity / Paternity Leave</option>
                    </select>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-bold text-muted">Start Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-bold text-muted">End Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">Total Calendar Days</label>
                    <input
                      type="number"
                      className="form-control"
                      value={totalDays}
                      onChange={(e) => setTotalDays(Number(e.target.value))}
                      min="0.5"
                      step="0.5"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">Reason for Leave</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="Specify the reason clearly..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      required
                    ></textarea>
                  </div>

                  <div className="mb-4">
                    <label className="form-label small fw-bold text-muted">
                      Optional Supporting Evidence (Doctor Slip, Conference Invite, etc.)
                    </label>
                    <input
                      type="file"
                      className="form-control form-control-sm"
                      onChange={(e) => setEvidenceFile(e.target.files[0])}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-erp-primary w-100 justify-content-center"
                    disabled={loading}
                  >
                    <i className="bi-send"></i> {loading ? "Submitting..." : "Submit Leave Application"}
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className="col-lg-7">
            <div className="erp-card">
              <div className="erp-card-header">
                <h5 className="erp-card-title"><i className="bi-clock-history text-secondary"></i> My Leave Request History</h5>
              </div>
              <div className="erp-card-body p-0">
                {leaves.length === 0 ? (
                  <div className="text-center py-5 text-muted">No leave applications submitted yet.</div>
                ) : (
                  <div className="table-responsive">
                    <table className="erp-table">
                      <thead>
                        <tr>
                          <th>Leave Type</th>
                          <th>Duration</th>
                          <th>Reason</th>
                          <th>Status</th>
                          <th>Approvals</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaves.map((l) => (
                          <tr key={l._id}>
                            <td className="fw-bold">{l.leaveType}</td>
                            <td>{l.startDate} to {l.endDate} ({l.totalDays}d)</td>
                            <td className="text-truncate" style={{ maxWidth: 180 }}>{l.reason}</td>
                            <td>
                              <span
                                className={`badge ${
                                  l.status === "Approved"
                                    ? "bg-success"
                                    : l.status === "Rejected"
                                    ? "bg-danger"
                                    : "bg-warning text-dark"
                                }`}
                              >
                                {l.status.replace("_", " ")}
                              </span>
                            </td>
                            <td>
                              <small className="d-block text-muted">
                                HOD: <strong>{l.hodStatus}</strong>
                              </small>
                              <small className="d-block text-muted">
                                Principal: <strong>{l.principalStatus}</strong>
                              </small>
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
      )}

      {/* Tab 2: HOD Review */}
      {activeTab === "hod" && (
        <div className="erp-card">
          <div className="erp-card-header">
            <h5 className="erp-card-title"><i className="bi-hourglass-split text-warning"></i> Faculty Leave Applications Awaiting HOD Action</h5>
          </div>
          <div className="erp-card-body p-0">
            {hodPending.length === 0 ? (
              <div className="text-center py-5 text-muted">No pending faculty leave requests in your department.</div>
            ) : (
              <div className="table-responsive">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Faculty Member</th>
                      <th>Leave Type</th>
                      <th>Period</th>
                      <th>Reason</th>
                      <th>Available CL/SL</th>
                      <th>Evidence</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hodPending.map((item) => (
                      <tr key={item._id}>
                        <td>
                          <div className="fw-bold">{item.facultyId?.name}</div>
                          <small className="text-muted">{item.facultyId?.employeeId} • {item.facultyId?.department}</small>
                        </td>
                        <td><span className="badge bg-secondary">{item.leaveType}</span></td>
                        <td>{item.startDate} to {item.endDate} ({item.totalDays} days)</td>
                        <td className="text-truncate" style={{ maxWidth: 220 }}>{item.reason}</td>
                        <td>
                          <small className="d-block text-success">CL: {item.facultyId?.leaveBalance?.casual}</small>
                          <small className="d-block text-warning">SL: {item.facultyId?.leaveBalance?.sick}</small>
                        </td>
                        <td>
                          {item.evidenceUrl ? (
                            <a href={item.evidenceUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-info">
                              <i className="bi-paperclip"></i> View
                            </a>
                          ) : (
                            <span className="text-muted small">None</span>
                          )}
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => handleHodDecision(item._id, "Approve")}
                              title="Direct Approve"
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => handleHodDecision(item._id, "Forward_Principal")}
                              title="Forward to Principal"
                            >
                              Forward
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleHodDecision(item._id, "Reject")}
                              title="Reject"
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
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Principal Review */}
      {activeTab === "principal" && (
        <div className="erp-card">
          <div className="erp-card-header">
            <h5 className="erp-card-title"><i className="bi-shield-check text-primary"></i> Leaves Awaiting Principal Final Decision</h5>
          </div>
          <div className="erp-card-body p-0">
            {principalPending.length === 0 ? (
              <div className="text-center py-5 text-muted">No escalated leave requests pending Principal approval.</div>
            ) : (
              <div className="table-responsive">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Faculty Member</th>
                      <th>Dept</th>
                      <th>Leave Type</th>
                      <th>Dates</th>
                      <th>HOD Recommendation</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {principalPending.map((item) => (
                      <tr key={item._id}>
                        <td>
                          <div className="fw-bold">{item.facultyId?.name}</div>
                          <small className="text-muted">{item.facultyId?.employeeId}</small>
                        </td>
                        <td>{item.facultyId?.department}</td>
                        <td><span className="badge bg-secondary">{item.leaveType}</span></td>
                        <td>{item.startDate} to {item.endDate} ({item.totalDays}d)</td>
                        <td>
                          <div className="text-success fw-semibold small">
                            <i className="bi-check-all"></i> {item.hodStatus}
                          </div>
                          <div className="text-muted small">{item.hodRemarks || "Recommended for approval"}</div>
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => handlePrincipalDecision(item._id, "Approved")}
                            >
                              Final Approve
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handlePrincipalDecision(item._id, "Rejected")}
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
            )}
          </div>
        </div>
      )}

      {/* Tab 4: All College Leaves */}
      {activeTab === "all" && (
        <div className="erp-card">
          <div className="erp-card-header">
            <h5 className="erp-card-title">College-Wide Leave History</h5>
          </div>
          <div className="erp-card-body p-0">
            <div className="table-responsive">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Faculty</th>
                    <th>Dept</th>
                    <th>Type</th>
                    <th>Duration</th>
                    <th>Reason</th>
                    <th>Final Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allLeaves.map((l) => (
                    <tr key={l._id}>
                      <td className="fw-bold">{l.facultyId?.name}</td>
                      <td>{l.facultyId?.department}</td>
                      <td>{l.leaveType}</td>
                      <td>{l.startDate} to {l.endDate} ({l.totalDays}d)</td>
                      <td className="text-truncate" style={{ maxWidth: 200 }}>{l.reason}</td>
                      <td>
                        <span
                          className={`badge ${
                            l.status === "Approved" ? "bg-success" : l.status === "Rejected" ? "bg-danger" : "bg-warning"
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
