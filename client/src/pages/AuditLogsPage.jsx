import React, { useState, useEffect } from "react";
import { api } from "../api";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [actionFilter, setActionFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  const loadLogs = () => {
    setLoading(true);
    let q = "?limit=100&";
    if (actionFilter !== "all") q += `action=${actionFilter}&`;
    if (searchTerm) q += `search=${encodeURIComponent(searchTerm)}&`;

    api.get(`/api/audit-logs${q}`)
      .then((res) => setLogs(res.logs || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter, searchTerm]);

  return (
    <div className="erp-content">
      <div className="erp-page-header">
        <div>
          <h2 className="erp-page-title">Enterprise System Audit Logs</h2>
          <p className="erp-page-subtitle">
            Immutable tracking of administrative actions, attendance sessions, leave approvals, and role updates.
          </p>
        </div>
        <button className="btn btn-outline-secondary" onClick={loadLogs}>
          <i className="bi-arrow-clockwise me-1"></i> Refresh Logs
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="erp-card mb-4 p-3 bg-white">
        <div className="row g-2 align-items-center">
          <div className="col-md-7">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light"><i className="bi-search"></i></span>
              <input
                type="text"
                className="form-control"
                placeholder="Search logs by actor, action, or entity..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-5 text-end text-muted small">
            Displaying latest <strong>{logs.length}</strong> system events
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="erp-card">
        <div className="erp-card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border spinner-border-sm text-primary mb-2"></div>
              <div className="text-muted">Loading audit entries...</div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-5 text-muted">No audit logs matching search criteria.</div>
          ) : (
            <div className="table-responsive">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>Details & Payload</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id}>
                      <td className="text-nowrap text-muted" style={{ fontSize: "0.78rem" }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <div className="fw-bold text-dark">{log.actorName}</div>
                        <small className="text-muted">{log.actorEmail} ({log.actorRole})</small>
                      </td>
                      <td>
                        <span className="badge bg-dark-subtle text-dark border">
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-light text-secondary border">
                          {log.entity}
                        </span>
                      </td>
                      <td>
                        <pre className="mb-0 bg-light p-2 rounded small text-secondary" style={{ fontSize: "0.75rem", maxHeight: 70, overflowY: "auto" }}>
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
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
  );
}
