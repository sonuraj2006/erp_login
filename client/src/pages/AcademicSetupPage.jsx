import React, { useState, useEffect } from "react";
import { api } from "../api";
import { useAppData } from "../context/AppDataContext";

export default function AcademicSetupPage() {
  const [activeTab, setActiveTab] = useState("subjects"); // "subjects" | "departments" | "allocations"
  const { departments: globalDepts, refreshDepartments, refreshSubjects: refreshGlobalSubjects } = useAppData();
  const [departments, setDepartments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [facultyList, setFacultyList] = useState([]);

  // Form states
  const [deptCode, setDeptCode] = useState("");
  const [deptName, setDeptName] = useState("");
  const [subCode, setSubCode] = useState("");
  const [subName, setSubName] = useState("");
  const [subDept, setSubDept] = useState("CSE");
  const [subSemester, setSubSemester] = useState(5);
  const [subCredits, setSubCredits] = useState(4);
  const [subType, setSubType] = useState("Theory");

  // Allocation state
  const [allocFaculty, setAllocFaculty] = useState("");
  const [allocSubject, setAllocSubject] = useState("");
  const [allocDept, setAllocDept] = useState("CSE");
  const [allocSemester, setAllocSemester] = useState(5);
  const [allocSection, setAllocSection] = useState("A");

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const loadData = () => {
    api.get("/api/academics/departments").then((res) => {
      const depts = res.departments || [];
      setDepartments(depts);
      // Sync form dept defaults to first real department if current default is not in list
      if (depts.length > 0) {
        const codes = depts.map((d) => d.code);
        if (!codes.includes(subDept)) setSubDept(depts[0].code);
        if (!codes.includes(allocDept)) setAllocDept(depts[0].code);
      }
    });
    api.get("/api/academics/subjects").then((res) => {
      // Use allSubjects (all depts) for full list in dropdowns
      setSubjects(res.allSubjects || res.subjects || []);
    });
    api.get("/api/academics/assignments").then((res) => setAssignments(res.assignments || []));
    api.get("/api/faculty").then((res) => {
      setFacultyList(res.faculty || []);
      if (res.faculty?.length > 0 && !allocFaculty) setAllocFaculty(res.faculty[0]._id);
    });
  };

  // Keep local departments in sync with global context
  useEffect(() => {
    setDepartments(globalDepts);
    if (globalDepts.length > 0) {
      const codes = globalDepts.map((d) => d.code);
      if (!codes.includes(subDept)) setSubDept(globalDepts[0].code);
      if (!codes.includes(allocDept)) setAllocDept(globalDepts[0].code);
    }
  }, [globalDepts]);

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlert(null);
    try {
      const res = await api.post("/api/academics/subjects", {
        code: subCode,
        name: subName,
        department: subDept,
        semester: Number(subSemester),
        credits: Number(subCredits),
        type: subType,
      });
      setAlert({ type: "success", message: res.message });
      setSubCode("");
      setSubName("");
      // Refresh both local and global subject lists so Timetable & other pages update
      await Promise.all([loadData(), refreshGlobalSubjects()]);
    } catch (err) {
      setAlert({ type: "danger", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlert(null);
    try {
      const res = await api.post("/api/academics/departments", {
        code: deptCode,
        name: deptName,
      });
      setAlert({ type: "success", message: res.message });
      setDeptCode("");
      setDeptName("");
      // Refresh global departments context → TimetablePage & all pages see new dept instantly
      await Promise.all([loadData(), refreshDepartments()]);
    } catch (err) {
      setAlert({ type: "danger", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAllocateSubject = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlert(null);
    try {
      const res = await api.post("/api/academics/assignments", {
        facultyId: allocFaculty,
        subjectId: allocSubject,
        department: allocDept,
        semester: Number(allocSemester),
        section: allocSection,
      });
      setAlert({ type: "success", message: res.message });
      loadData();
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
          <h2 className="erp-page-title">Departments & Subject Curriculum</h2>
          <p className="erp-page-subtitle">
            Configure academic branches, subject syllabus catalog, and allocate courses to faculty instructors.
          </p>
        </div>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type} alert-dismissible fade show`} role="alert">
          {alert.message}
          <button type="button" className="btn-close" onClick={() => setAlert(null)}></button>
        </div>
      )}

      {/* Tabs */}
      <ul className="nav nav-pills mb-4 gap-2">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "subjects" ? "active" : ""}`}
            onClick={() => setActiveTab("subjects")}
          >
            <i className="bi-book me-1"></i> Course Catalog ({subjects.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "allocations" ? "active" : ""}`}
            onClick={() => setActiveTab("allocations")}
          >
            <i className="bi-diagram-3 me-1"></i> Subject Allocations ({assignments.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "departments" ? "active" : ""}`}
            onClick={() => setActiveTab("departments")}
          >
            <i className="bi-building me-1"></i> Departments ({departments.length})
          </button>
        </li>
      </ul>

      {/* 1. Subjects */}
      {activeTab === "subjects" && (
        <div className="row g-4">
          <div className="col-lg-4">
            <div className="erp-card">
              <div className="erp-card-header">
                <h5 className="erp-card-title"><i className="bi-plus-circle text-primary"></i> Add New Subject</h5>
              </div>
              <div className="erp-card-body">
                <form onSubmit={handleCreateSubject}>
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">Subject Code</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. CS501"
                      value={subCode}
                      onChange={(e) => setSubCode(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">Subject Title</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Operating Systems"
                      value={subName}
                      onChange={(e) => setSubName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-bold text-muted">Department</label>
                      <select
                        className="form-select"
                        value={subDept}
                        onChange={(e) => setSubDept(e.target.value)}
                      >
                        {departments.map((d) => (
                          <option key={d._id} value={d.code}>{d.code}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-bold text-muted">Semester</label>
                      <select
                        className="form-select"
                        value={subSemester}
                        onChange={(e) => setSubSemester(Number(e.target.value))}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                          <option key={s} value={s}>Sem {s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="row g-2 mb-4">
                    <div className="col-6">
                      <label className="form-label small fw-bold text-muted">Credits</label>
                      <input
                        type="number"
                        className="form-control"
                        value={subCredits}
                        onChange={(e) => setSubCredits(Number(e.target.value))}
                        min="1"
                        max="6"
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-bold text-muted">Nature</label>
                      <select
                        className="form-select"
                        value={subType}
                        onChange={(e) => setSubType(e.target.value)}
                      >
                        <option value="Theory">Theory</option>
                        <option value="Practical">Practical / Lab</option>
                        <option value="Seminar">Seminar</option>
                        <option value="Project">Project</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-erp-primary w-100 justify-content-center"
                    disabled={loading}
                  >
                    Add Subject to Catalog
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className="col-lg-8">
            <div className="erp-card">
              <div className="erp-card-header">
                <h5 className="erp-card-title">Subject Catalog</h5>
              </div>
              <div className="erp-card-body p-0">
                <div className="table-responsive">
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Subject Title</th>
                        <th>Dept</th>
                        <th>Semester</th>
                        <th>Credits</th>
                        <th>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.map((sub) => (
                        <tr key={sub._id}>
                          <td className="fw-bold text-primary">{sub.code}</td>
                          <td className="fw-semibold">{sub.name}</td>
                          <td>{sub.department}</td>
                          <td>Semester {sub.semester}</td>
                          <td>{sub.credits} Credits</td>
                          <td>
                            <span className={`badge ${sub.type === "Practical" ? "bg-warning text-dark" : "bg-info"}`}>
                              {sub.type}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Allocations */}
      {activeTab === "allocations" && (
        <div className="row g-4">
          <div className="col-lg-4">
            <div className="erp-card">
              <div className="erp-card-header">
                <h5 className="erp-card-title"><i className="bi-person-check text-success"></i> Allocate Course</h5>
              </div>
              <div className="erp-card-body">
                <form onSubmit={handleAllocateSubject}>
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">Select Faculty</label>
                    <select
                      className="form-select"
                      value={allocFaculty}
                      onChange={(e) => setAllocFaculty(e.target.value)}
                      required
                    >
                      {facultyList.map((f) => (
                        <option key={f._id} value={f._id}>{f.name} ({f.department})</option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">Select Subject</label>
                    <select
                      className="form-select"
                      value={allocSubject}
                      onChange={(e) => setAllocSubject(e.target.value)}
                      required
                    >
                      <option value="">Select a subject...</option>
                      {subjects.map((s) => (
                        <option key={s._id} value={s._id}>{s.code} - {s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="row g-2 mb-4">
                    <div className="col-4">
                      <label className="form-label small fw-bold text-muted">Dept</label>
                      <select
                        className="form-select"
                        value={allocDept}
                        onChange={(e) => setAllocDept(e.target.value)}
                      >
                        {departments.map((d) => (
                          <option key={d._id} value={d.code}>{d.code}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-4">
                      <label className="form-label small fw-bold text-muted">Sem</label>
                      <select
                        className="form-select"
                        value={allocSemester}
                        onChange={(e) => setAllocSemester(Number(e.target.value))}
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
                        value={allocSection}
                        onChange={(e) => setAllocSection(e.target.value)}
                      >
                        {["A", "B", "C"].map((sec) => (
                          <option key={sec} value={sec}>Sec {sec}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-erp-primary w-100 justify-content-center"
                    disabled={loading || !allocSubject}
                  >
                    Assign Course to Faculty
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className="col-lg-8">
            <div className="erp-card">
              <div className="erp-card-header">
                <h5 className="erp-card-title">Current Faculty Allocations</h5>
              </div>
              <div className="erp-card-body p-0">
                <div className="table-responsive">
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>Faculty Instructor</th>
                        <th>Subject Title</th>
                        <th>Class Section</th>
                        <th>Academic Year</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((a) => (
                        <tr key={a._id}>
                          <td className="fw-bold text-dark">{a.facultyId?.name}</td>
                          <td>
                            <strong>{a.subjectId?.name}</strong> ({a.subjectId?.code})
                          </td>
                          <td>
                            <span className="badge bg-light text-dark border">
                              {a.department} Sem {a.semester} Sec {a.section}
                            </span>
                          </td>
                          <td>{a.academicYear || "2026-2027"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Departments */}
      {activeTab === "departments" && (
        <div className="row g-4">
          <div className="col-lg-4">
            <div className="erp-card">
              <div className="erp-card-header">
                <h5 className="erp-card-title">Add Department</h5>
              </div>
              <div className="erp-card-body">
                <form onSubmit={handleCreateDepartment}>
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">Department Code</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. AI-ML"
                      value={deptCode}
                      onChange={(e) => setDeptCode(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="form-label small fw-bold text-muted">Department Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Artificial Intelligence and Machine Learning"
                      value={deptName}
                      onChange={(e) => setDeptName(e.target.value)}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-erp-primary w-100 justify-content-center"
                    disabled={loading}
                  >
                    Add Department
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className="col-lg-8">
            <div className="erp-card">
              <div className="erp-card-header">
                <h5 className="erp-card-title">Academic Departments</h5>
              </div>
              <div className="erp-card-body p-0">
                <div className="table-responsive">
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Department Name</th>
                        <th>Head of Department</th>
                        <th>Intake</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departments.map((d) => (
                        <tr key={d._id}>
                          <td className="fw-bold text-primary">{d.code}</td>
                          <td>{d.name}</td>
                          <td>{d.hodFacultyId?.name || "Dr. Suresh Babu"}</td>
                          <td>{d.intake} seats</td>
                          <td><span className="badge bg-success">Active</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
