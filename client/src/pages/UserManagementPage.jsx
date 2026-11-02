import React, { useState, useEffect } from "react";
import { api } from "../api";
import { useAppData } from "../context/AppDataContext";

const DEFAULT_DEPTS = ["CSE", "ECE", "IT", "MECH", "CIVIL", "ADMIN"];

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  // Use global departments (live-updates when new dept is added)
  const { departments } = useAppData();
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("faculty");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const loadUsers = () => {
    setLoading(true);
    let q = "?";
    if (roleFilter !== "all") q += `role=${roleFilter}&`;
    if (searchTerm) q += `search=${encodeURIComponent(searchTerm)}&`;

    api.get(`/api/users${q}`)
      .then((res) => setUsers(res.users || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, [roleFilter, searchTerm]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlert(null);

    try {
      const res = await api.post("/api/users", {
        name,
        email,
        password,
        role,
        department,
        phone,
      });

      setAlert({ type: "success", message: res.message });
      setShowCreateModal(false);
      setName("");
      setEmail("");
      setPassword("");
      loadUsers();
    } catch (err) {
      setAlert({ type: "danger", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userObj) => {
    const newStatus = userObj.status === "active" ? "inactive" : "active";
    try {
      await api.patch(`/api/users/${userObj._id}/status`, { status: newStatus });
      setAlert({ type: "success", message: `Account for ${userObj.name} updated to ${newStatus}.` });
      loadUsers();
    } catch (err) {
      setAlert({ type: "danger", message: err.message });
    }
  };

  const handleResetPassword = async (userObj) => {
    const newPass = window.prompt(`Enter new password for ${userObj.name}:`, "College@123");
    if (!newPass) return;

    try {
      await api.post(`/api/users/${userObj._id}/reset-password`, { newPassword: newPass });
      setAlert({ type: "success", message: `Password for ${userObj.name} reset successfully.` });
    } catch (err) {
      setAlert({ type: "danger", message: err.message });
    }
  };

  return (
    <div className="erp-content">
      <div className="erp-page-header">
        <div>
          <h2 className="erp-page-title">User Accounts & Access Control</h2>
          <p className="erp-page-subtitle">
            Manage credentials, permissions, and active status for all 5 roles: Student, Faculty, HOD, Principal, and Admin.
          </p>
        </div>
        <button className="btn btn-erp-primary" onClick={() => setShowCreateModal(true)}>
          <i className="bi-person-plus-fill"></i> Create User Account
        </button>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type} alert-dismissible fade show`} role="alert">
          {alert.message}
          <button type="button" className="btn-close" onClick={() => setAlert(null)}></button>
        </div>
      )}

      {/* Filter toolbar */}
      <div className="erp-card mb-4 p-3 bg-white">
        <div className="row g-2 align-items-center">
          <div className="col-md-6">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light"><i className="bi-search"></i></span>
              <input
                type="text"
                className="form-control"
                placeholder="Search user by name, email, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-4">
            <select
              className="form-select form-select-sm"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="principal">Principal</option>
              <option value="hod">Head of Department (HOD)</option>
              <option value="faculty">Faculty</option>
              <option value="student">Student</option>
            </select>
          </div>
          <div className="col-md-2 text-end text-muted small">
            Total Accounts: <strong>{users.length}</strong>
          </div>
        </div>
      </div>

      {/* Users table */}
      <div className="erp-card">
        <div className="erp-card-body p-0">
          <div className="table-responsive">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Contact</th>
                  <th>Account Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <div className="fw-bold">{u.name}</div>
                      <small className="text-muted">{u.email}</small>
                    </td>
                    <td>
                      <span className={`erp-role-badge badge-${u.role}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>{u.department || "General"}</td>
                    <td>{u.phone || "—"}</td>
                    <td>
                      <span className={`badge ${u.status === "active" ? "bg-success" : "bg-danger"}`}>
                        {u.status}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <button
                          className={`btn btn-sm ${u.status === "active" ? "btn-outline-danger" : "btn-outline-success"}`}
                          onClick={() => handleToggleStatus(u)}
                          title="Toggle active status"
                        >
                          {u.status === "active" ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => handleResetPassword(u)}
                          title="Reset password"
                        >
                          <i className="bi-key"></i>
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

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="erp-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="erp-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="erp-card-header">
              <h5 className="erp-card-title"><i className="bi-person-plus text-primary"></i> Create ERP User</h5>
              <button className="btn btn-sm btn-light rounded-circle" onClick={() => setShowCreateModal(false)}>
                <i className="bi-x-lg"></i>
              </button>
            </div>
            <div className="erp-card-body">
              <form onSubmit={handleCreateUser}>
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-bold text-muted">Full Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Dr. Rajesh Kumar"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-bold text-muted">Email (Login ID)</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="user@college.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-bold text-muted">Initial Password</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-bold text-muted">Role</label>
                    <select
                      className="form-select"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      <option value="student">Student</option>
                      <option value="faculty">Faculty</option>
                      <option value="hod">Head of Department (HOD)</option>
                      <option value="principal">Principal</option>
                      <option value="admin">System Admin</option>
                    </select>
                  </div>
                </div>

                <div className="row g-2 mb-4">
                  <div className="col-6">
                    <label className="form-label small fw-bold text-muted">Department</label>
                    <select
                      className="form-select"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    >
                      {(departments.length > 0 ? departments.map((d) => d.code) : DEFAULT_DEPTS).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-bold text-muted">Phone Number</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="+91 99000 00000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-erp-primary w-100 justify-content-center"
                  disabled={loading}
                >
                  Create User Account
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
