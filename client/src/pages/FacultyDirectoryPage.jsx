import React, { useState, useEffect } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

export default function FacultyDirectoryPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [faculty, setFaculty] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("CSE");
  const [designation, setDesignation] = useState("Assistant Professor");
  const [qualification, setQualification] = useState("M.Tech, Ph.D.");

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const loadFaculty = () => {
    setLoading(true);
    let q = "?";
    if (selectedDept !== "all") q += `department=${selectedDept}&`;
    if (searchTerm) q += `search=${encodeURIComponent(searchTerm)}&`;

    api.get(`/api/faculty${q}`)
      .then((res) => setFaculty(res.faculty || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get("/api/academics/departments")
      .then((res) => setDepartments(res.departments || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadFaculty();
  }, [selectedDept, searchTerm]);

  const handleCreateFaculty = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlert(null);

    try {
      const res = await api.post("/api/users", {
        name,
        email,
        password: "Faculty@123456",
        role: designation.includes("Head") ? "hod" : designation.includes("Principal") ? "principal" : "faculty",
        department,
        phone,
        profileData: {
          employeeId,
          designation,
          qualification,
        },
      });

      setAlert({ type: "success", message: res.message });
      setShowAddModal(false);
      setName("");
      setEmployeeId("");
      setEmail("");
      loadFaculty();
    } catch (err) {
      setAlert({ type: "danger", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="erp-content">
      <div className="erp-page-header">
        <div>
          <h2 className="erp-page-title">Faculty & Staff Directory</h2>
          <p className="erp-page-subtitle">
            Profiles, academic designations, and department allocations for all teaching faculty.
          </p>
        </div>
        {isAdmin && (
          <button className="btn btn-erp-primary" onClick={() => setShowAddModal(true)}>
            <i className="bi-person-plus-fill"></i> Add Faculty Member
          </button>
        )}
      </div>

      {alert && (
        <div className={`alert alert-${alert.type} alert-dismissible fade show`} role="alert">
          {alert.message}
          <button type="button" className="btn-close" onClick={() => setAlert(null)}></button>
        </div>
      )}

      {/* Toolbar */}
      <div className="erp-card mb-4 p-3 bg-white">
        <div className="row g-2 align-items-center">
          <div className="col-md-6">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light"><i className="bi-search"></i></span>
              <input
                type="text"
                className="form-control"
                placeholder="Search faculty by name, employee ID, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-4">
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
          <div className="col-md-2 text-end text-muted small">
            Total Faculty: <strong>{faculty.length}</strong>
          </div>
        </div>
      </div>

      {/* Directory Cards Grid */}
      <div className="row g-3">
        {faculty.map((f) => (
          <div key={f._id} className="col-lg-4 col-md-6">
            <div className="erp-card h-100">
              <div className="erp-card-body p-4">
                <div className="d-flex align-items-start gap-3 mb-3">
                  <div className="erp-avatar" style={{ width: 50, height: 50, fontSize: "1.2rem" }}>
                    {f.name.charAt(0)}
                  </div>
                  <div className="flex-grow-1 overflow-hidden">
                    <h5 className="fw-bold mb-0 text-truncate">{f.name}</h5>
                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle" style={{ fontSize: "0.72rem" }}>
                      {f.designation}
                    </span>
                    <div className="text-muted small mt-1">ID: {f.employeeId}</div>
                  </div>
                </div>

                <div className="border-top pt-3 small" style={{ fontSize: "0.84rem" }}>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Department:</span>
                    <span className="fw-semibold">{f.department}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Qualification:</span>
                    <span>{f.qualification || "Ph.D."}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Email:</span>
                    <span className="text-truncate" style={{ maxWidth: 170 }}>{f.email}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Leave Balance:</span>
                    <span className="text-success fw-bold">{f.leaveBalance?.casual || 10} CL / {f.leaveBalance?.sick || 8} SL</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Faculty Modal */}
      {showAddModal && (
        <div className="erp-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="erp-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="erp-card-header">
              <h5 className="erp-card-title"><i className="bi-person-badge text-primary"></i> Register Faculty Member</h5>
              <button className="btn btn-sm btn-light rounded-circle" onClick={() => setShowAddModal(false)}>
                <i className="bi-x-lg"></i>
              </button>
            </div>
            <div className="erp-card-body">
              <form onSubmit={handleCreateFaculty}>
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
                    <label className="form-label small fw-bold text-muted">Employee ID</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. EMP-CSE-105"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-bold text-muted">Official Email</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="faculty@college.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-bold text-muted">Phone Number</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="+91 98765 00000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-bold text-muted">Department</label>
                    <select
                      className="form-select"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    >
                      {departments.map((d) => (
                        <option key={d._id} value={d.code}>{d.code} - {d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-bold text-muted">Designation</label>
                    <select
                      className="form-select"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                    >
                      <option value="Assistant Professor">Assistant Professor</option>
                      <option value="Associate Professor">Associate Professor</option>
                      <option value="Professor">Professor</option>
                      <option value="Head of Department">Head of Department</option>
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label small fw-bold text-muted">Qualifications</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. M.Tech, Ph.D. in Artificial Intelligence"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-erp-primary w-100 justify-content-center"
                  disabled={loading}
                >
                  Create Faculty Account
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
