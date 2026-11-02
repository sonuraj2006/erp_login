import React, { useState, useEffect } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

export default function StudentDirectoryPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedSection, setSelectedSection] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal / Form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("CSE");
  const [year, setYear] = useState(3);
  const [semester, setSemester] = useState(5);
  const [section, setSection] = useState("A");
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const loadStudents = () => {
    setLoading(true);
    let query = "?";
    if (selectedDept !== "all") query += `department=${selectedDept}&`;
    if (selectedSection !== "all") query += `section=${selectedSection}&`;
    if (searchTerm) query += `search=${encodeURIComponent(searchTerm)}&`;

    api.get(`/api/students${query}`)
      .then((res) => setStudents(res.students || []))
      .catch((err) => setAlert({ type: "danger", message: err.message }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get("/api/academics/departments")
      .then((res) => setDepartments(res.departments || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadStudents();
  }, [selectedDept, selectedSection, searchTerm]);

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlert(null);

    try {
      const res = await api.post("/api/students", {
        studentId,
        name,
        rollNumber,
        email,
        phone,
        department,
        year: Number(year),
        semester: Number(semester),
        section,
        parentName,
        parentEmail,
        parentPhone,
      });

      setAlert({ type: "success", message: res.message });
      setShowAddModal(false);
      // Reset form
      setName("");
      setRollNumber("");
      setStudentId("");
      setEmail("");
      setParentName("");
      setParentEmail("");
      loadStudents();
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
          <h2 className="erp-page-title">Student Directory & Academic Enrollment</h2>
          <p className="erp-page-subtitle">
            Manage student registrations, academic profile allocations, and parent communication details.
          </p>
        </div>
        {isAdmin && (
          <button className="btn btn-erp-primary" onClick={() => setShowAddModal(true)}>
            <i className="bi-person-plus-fill"></i> Register New Student
          </button>
        )}
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
          <div className="col-md-5">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light"><i className="bi-search"></i></span>
              <input
                type="text"
                className="form-control"
                placeholder="Search by student name, roll number, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="col-md-3 col-6">
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

          <div className="col-md-2 col-6">
            <select
              className="form-select form-select-sm"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
            >
              <option value="all">All Sections</option>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
            </select>
          </div>

          <div className="col-md-2 text-end text-muted small">
            Enrolled: <strong>{students.length}</strong>
          </div>
        </div>
      </div>

      {/* Roster Table */}
      <div className="erp-card">
        <div className="erp-card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border spinner-border-sm text-primary mb-2"></div>
              <div className="text-muted">Loading student directory...</div>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-5 text-muted">No students matching the criteria.</div>
          ) : (
            <div className="table-responsive">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Roll Number</th>
                    <th>Student Name</th>
                    <th>Class / Section</th>
                    <th>Email & Contact</th>
                    <th>Parent Details</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((st) => (
                    <tr key={st._id}>
                      <td className="fw-bold text-primary">{st.rollNumber}</td>
                      <td>
                        <div className="fw-bold text-dark">{st.name}</div>
                        <small className="text-muted">ID: {st.studentId}</small>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">
                          {st.department} Sem {st.semester} - {st.section}
                        </span>
                      </td>
                      <td>
                        <div>{st.email || "—"}</div>
                        <small className="text-muted">{st.phone || "—"}</small>
                      </td>
                      <td>
                        <div>{st.parentName}</div>
                        <small className="text-muted">{st.parentEmail}</small>
                      </td>
                      <td>
                        <span className="badge bg-success-subtle text-success border border-success-subtle">
                          Active
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

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="erp-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="erp-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="erp-card-header">
              <h5 className="erp-card-title"><i className="bi-person-plus text-primary"></i> Register Student</h5>
              <button className="btn btn-sm btn-light rounded-circle" onClick={() => setShowAddModal(false)}>
                <i className="bi-x-lg"></i>
              </button>
            </div>
            <div className="erp-card-body">
              <form onSubmit={handleCreateStudent}>
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-bold text-muted">Full Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Rahul Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-bold text-muted">Roll Number</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 24R21A6615"
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-bold text-muted">Student ID</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. SKL/2026/0450"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-bold text-muted">Email Address</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="student@college.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-4">
                    <label className="form-label small fw-bold text-muted">Department</label>
                    <select
                      className="form-select"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    >
                      {departments.map((d) => (
                        <option key={d._id} value={d.code}>{d.code}</option>
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
                      {["A", "B", "C", "D"].map((s) => (
                        <option key={s} value={s}>Sec {s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <h6 className="fw-bold text-primary border-bottom pb-1 small mt-3">Parent Information:</h6>
                <div className="row g-2 mb-4">
                  <div className="col-6">
                    <label className="form-label small fw-bold text-muted">Parent Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Guardian / Parent Name"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-bold text-muted">Parent Email</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="parent@example.com"
                      value={parentEmail}
                      onChange={(e) => setParentEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-erp-primary w-100 justify-content-center"
                  disabled={loading}
                >
                  Confirm & Register Student
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
