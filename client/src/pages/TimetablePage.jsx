import React, { useState, useEffect } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { useAppData } from "../context/AppDataContext";

const PERIOD_TIMINGS = {
  1: { start: "09:30 AM", end: "10:30 AM" },
  2: { start: "10:30 AM", end: "11:30 AM" },
  3: { start: "11:30 AM", end: "12:30 PM" },
  4: { start: "01:15 PM", end: "02:15 PM" },
  5: { start: "02:15 PM", end: "03:15 PM" },
  6: { start: "03:15 PM", end: "04:15 PM" },
};

export default function TimetablePage() {
  const { user } = useAuth();
  const canEdit = ["admin", "hod"].includes(user?.role);

  // --- Global shared data (departments & subjects auto-update when added elsewhere) ---
  const {
    departments,
    allSubjects: globalAllSubjects,
    refreshSubjects: globalRefreshSubjects,
    deptCodes,
  } = useAppData();

  // Active filter states
  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState(5);
  const [section, setSection] = useState("A");

  const [slots, setSlots] = useState([]);
  const [facultyList, setFacultyList] = useState([]);

  // Modal form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalDept, setModalDept] = useState("");
  const [modalSemester, setModalSemester] = useState(5);
  const [modalSection, setModalSection] = useState("A");
  const [dayOfWeek, setDayOfWeek] = useState("Monday");
  const [period, setPeriod] = useState(1);
  const [startTime, setStartTime] = useState("09:30 AM");
  const [endTime, setEndTime] = useState("10:30 AM");
  const [room, setRoom] = useState("LH-201");
  const [subjectId, setSubjectId] = useState("");
  const [facultyId, setFacultyId] = useState("");

  // Quick add subject inline form
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickCode, setQuickCode] = useState("");
  const [quickName, setQuickName] = useState("");
  const [quickType, setQuickType] = useState("Theory");
  const [quickCredits, setQuickCredits] = useState(3);
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState("");

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // Set default department from global list once loaded
  useEffect(() => {
    if (departments.length > 0 && !department) {
      setDepartment(departments[0].code);
      setModalDept(departments[0].code);
    }
  }, [departments]);

  // Load faculty once
  useEffect(() => {
    api.get("/api/faculty")
      .then((res) => {
        const facs = res.faculty || [];
        setFacultyList(facs);
        if (facs.length > 0) setFacultyId(facs[0]._id);
      })
      .catch((err) => console.error("Error fetching faculty:", err));
  }, []);

  // Use global allSubjects — auto-updates when added in Academic Setup
  const allSubjects = globalAllSubjects;
  const subjects = allSubjects.filter(
    (s) =>
      s.department?.toUpperCase() === department?.toUpperCase() &&
      Number(s.semester) === Number(semester)
  );

  // Convenience wrapper to also refresh global
  const refreshSubjects = () => globalRefreshSubjects();

  // 3. Load timetable slots
  const loadTimetable = () => {
    setLoading(true);
    api.get(`/api/academics/timetable?department=${encodeURIComponent(department)}&semester=${semester}&section=${section}`)
      .then((res) => setSlots(res.slots || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTimetable();
  }, [department, semester, section]);

  // Synchronize modal fields when modal is opened
  const handleOpenAddModal = (defaultDay = "Monday", defaultPeriod = 1) => {
    setModalDept(department);
    setModalSemester(semester);
    setModalSection(section);
    setDayOfWeek(defaultDay);
    setPeriod(defaultPeriod);
    const timings = PERIOD_TIMINGS[defaultPeriod] || { start: "09:30 AM", end: "10:30 AM" };
    setStartTime(timings.start);
    setEndTime(timings.end);
    setRoom("LH-201");
    setShowQuickAdd(false);
    setQuickError("");

    // Determine default subject
    const matching = allSubjects.filter(
      (s) =>
        s.department?.toUpperCase() === department?.toUpperCase() &&
        Number(s.semester) === Number(semester)
    );
    if (matching.length > 0) {
      setSubjectId(matching[0]._id);
    } else if (allSubjects.length > 0) {
      setSubjectId(allSubjects[0]._id);
    } else {
      setSubjectId("");
    }

    // Determine default faculty (prefer department faculty)
    const deptFac = facultyList.filter(
      (f) => f.department?.toUpperCase() === department?.toUpperCase()
    );
    if (deptFac.length > 0) {
      setFacultyId(deptFac[0]._id);
    } else if (facultyList.length > 0) {
      setFacultyId(facultyList[0]._id);
    }

    setShowAddModal(true);
  };

  // When modalDept or modalSemester changes inside modal, auto-update subjectId
  useEffect(() => {
    if (!showAddModal) return;
    const matching = allSubjects.filter(
      (s) =>
        s.department?.toUpperCase() === modalDept?.toUpperCase() &&
        Number(s.semester) === Number(modalSemester)
    );
    if (matching.length > 0) {
      // If current subjectId is not in matching, switch to the first matching subject
      if (!matching.some((m) => m._id === subjectId)) {
        setSubjectId(matching[0]._id);
      }
    } else if (allSubjects.length > 0) {
      // If current subjectId is invalid, fallback to any available subject
      if (!allSubjects.some((s) => s._id === subjectId)) {
        setSubjectId(allSubjects[0]._id);
      }
    }

    // Auto update faculty if none matches
    const deptFac = facultyList.filter(
      (f) => f.department?.toUpperCase() === modalDept?.toUpperCase()
    );
    if (deptFac.length > 0 && !deptFac.some((f) => f._id === facultyId)) {
      setFacultyId(deptFac[0]._id);
    }
  }, [modalDept, modalSemester, allSubjects]);

  // When period changes in modal, auto-set default timings
  const handlePeriodChange = (newPeriod) => {
    const p = Number(newPeriod);
    setPeriod(p);
    if (PERIOD_TIMINGS[p]) {
      setStartTime(PERIOD_TIMINGS[p].start);
      setEndTime(PERIOD_TIMINGS[p].end);
    }
  };

  // Quick add subject handler
  const handleQuickAddSubject = async (e) => {
    e.preventDefault();
    if (!quickCode.trim() || !quickName.trim()) {
      setQuickError("Subject code and name are required.");
      return;
    }

    setQuickLoading(true);
    setQuickError("");
    try {
      const res = await api.post("/api/academics/subjects", {
        code: quickCode.trim(),
        name: quickName.trim(),
        department: modalDept,
        semester: Number(modalSemester),
        credits: Number(quickCredits),
        type: quickType,
      });

      const newSub = res.subject;
      setAllSubjects((prev) => [...prev, newSub]);
      setSubjectId(newSub._id);
      setShowQuickAdd(false);
      setQuickCode("");
      setQuickName("");
      setAlert({ type: "success", message: `Subject "${newSub.code} - ${newSub.name}" added and selected!` });
    } catch (err) {
      setQuickError(err.message || "Failed to create subject.");
    } finally {
      setQuickLoading(false);
    }
  };

  // Submit slot
  const handleAddSlot = async (e) => {
    e.preventDefault();
    if (!subjectId) {
      setAlert({ type: "danger", message: "Please select a subject for this period slot." });
      return;
    }
    if (!facultyId) {
      setAlert({ type: "danger", message: "Please select an instructor faculty." });
      return;
    }

    setLoading(true);
    setAlert(null);

    try {
      const res = await api.post("/api/academics/timetable", {
        dayOfWeek,
        period: Number(period),
        startTime,
        endTime,
        room: room || "LH-101",
        department: modalDept,
        semester: Number(modalSemester),
        section: modalSection,
        subjectId,
        facultyId,
      });

      setAlert({ type: "success", message: res.message });
      setShowAddModal(false);

      // If the scheduled slot was for a different dept/sem/sec, switch page filter so it displays
      if (modalDept !== department || modalSemester !== semester || modalSection !== section) {
        setDepartment(modalDept);
        setSemester(modalSemester);
        setSection(modalSection);
      } else {
        loadTimetable();
      }
    } catch (err) {
      setAlert({ type: "danger", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const periods = [1, 2, 3, 4, 5, 6];

  const getSlot = (d, p) => slots.find((s) => s.dayOfWeek === d && s.period === p);

  // Filter available subjects for the modal
  const modalMatchingSubjects = allSubjects.filter(
    (s) =>
      s.department?.toUpperCase() === modalDept?.toUpperCase() &&
      Number(s.semester) === Number(modalSemester)
  );
  const modalOtherSubjects = allSubjects.filter(
    (s) =>
      !(
        s.department?.toUpperCase() === modalDept?.toUpperCase() &&
        Number(s.semester) === Number(modalSemester)
      )
  );

  // Group faculty: current modal department vs others
  const deptFaculty = facultyList.filter(
    (f) => f.department?.toUpperCase() === modalDept?.toUpperCase()
  );
  const otherFaculty = facultyList.filter(
    (f) => f.department?.toUpperCase() !== modalDept?.toUpperCase()
  );

  // Available department list options (always live from global context)
  const deptOptions = deptCodes.length > 0 ? deptCodes : ["CSE", "ECE", "IT", "MECH", "CIVIL"];

  return (
    <div className="erp-content">
      <div className="erp-page-header">
        <div>
          <h2 className="erp-page-title">Class Schedule & Timetable</h2>
          <p className="erp-page-subtitle">
            Weekly lecture schedules, period allocations, and classroom room numbers.
          </p>
        </div>
        {canEdit && (
          <button className="btn btn-erp-primary" onClick={() => handleOpenAddModal()}>
            <i className="bi-plus-lg me-1"></i> Schedule Period Slot
          </button>
        )}
      </div>

      {alert && (
        <div className={`alert alert-${alert.type} alert-dismissible fade show`} role="alert">
          <i className={`bi ${alert.type === "success" ? "bi-check-circle" : "bi-exclamation-triangle"} me-2`}></i>
          {alert.message}
          <button type="button" className="btn-close" onClick={() => setAlert(null)}></button>
        </div>
      )}

      {/* Filter toolbar */}
      <div className="erp-card mb-4 p-3 bg-white shadow-sm border">
        <div className="row g-2 align-items-center">
          <div className="col-md-3 col-6">
            <label className="form-label small fw-bold text-muted mb-1">
              <i className="bi-building me-1"></i> Department
            </label>
            <select
              className="form-select form-select-sm"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              {deptOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="col-md-3 col-6">
            <label className="form-label small fw-bold text-muted mb-1">
              <i className="bi-layers me-1"></i> Semester
            </label>
            <select
              className="form-select form-select-sm"
              value={semester}
              onChange={(e) => setSemester(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>

          <div className="col-md-3 col-6">
            <label className="form-label small fw-bold text-muted mb-1">
              <i className="bi-grid me-1"></i> Section
            </label>
            <select
              className="form-select form-select-sm"
              value={section}
              onChange={(e) => setSection(e.target.value)}
            >
              {["A", "B", "C", "D"].map((sec) => (
                <option key={sec} value={sec}>Section {sec}</option>
              ))}
            </select>
          </div>

          <div className="col-md-3 text-md-end text-muted small">
            Displaying timetable for: <br />
            <strong className="text-primary">{department} • Sem {semester} • Sec {section}</strong>
          </div>
        </div>
      </div>

      {/* Timetable Grid Table */}
      <div className="erp-card shadow-sm">
        <div className="erp-card-body p-0">
          <div className="table-responsive">
            <table className="erp-table table-bordered text-center mb-0">
              <thead>
                <tr>
                  <th style={{ width: 120 }}>Day</th>
                  {periods.map((p) => (
                    <th key={p}>
                      Period {p}
                      <small className="d-block text-muted" style={{ fontWeight: 400 }}>
                        {PERIOD_TIMINGS[p]?.start} - {PERIOD_TIMINGS[p]?.end}
                      </small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day}>
                    <td className="fw-bold bg-light text-start align-middle">{day}</td>
                    {periods.map((p) => {
                      const slot = getSlot(day, p);
                      return (
                        <td key={p} className="p-2" style={{ minWidth: 150 }}>
                          {slot ? (
                            <div className="p-2 rounded bg-primary-subtle border border-primary-subtle text-start shadow-sm">
                              <span className="fw-bold text-primary d-block" style={{ fontSize: "0.85rem" }}>
                                {slot.subjectId?.code || "Subject"}
                              </span>
                              <span className="d-block text-truncate text-dark fw-semibold" style={{ fontSize: "0.8rem", maxWidth: 140 }}>
                                {slot.subjectId?.name}
                              </span>
                              <small className="text-muted d-block mt-1">
                                <i className="bi-person"></i> {slot.facultyId?.name}
                              </small>
                              <span className="badge bg-white text-secondary border mt-1" style={{ fontSize: "0.68rem" }}>
                                <i className="bi-geo-alt me-1"></i>{slot.room || "Room"}
                              </span>
                            </div>
                          ) : canEdit ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-light border text-muted w-100 py-3"
                              style={{ borderStyle: "dashed" }}
                              onClick={() => handleOpenAddModal(day, p)}
                              title={`Schedule ${day} Period ${p}`}
                            >
                              <i className="bi-plus-circle me-1"></i> Add
                            </button>
                          ) : (
                            <span className="text-muted small">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Slot Modal */}
      {showAddModal && (
        <div className="erp-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="erp-modal-content" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <div className="erp-card-header bg-light">
              <h5 className="erp-card-title mb-0">
                <i className="bi-calendar-plus text-primary me-2"></i> Schedule Timetable Period
              </h5>
              <button className="btn btn-sm btn-light rounded-circle" onClick={() => setShowAddModal(false)}>
                <i className="bi-x-lg"></i>
              </button>
            </div>
            <div className="erp-card-body p-4">
              <form onSubmit={handleAddSlot}>
                {/* Department, Semester, Section in Modal */}
                <div className="row g-2 mb-3">
                  <div className="col-5">
                    <label className="form-label small fw-bold text-muted">Department</label>
                    <select
                      className="form-select form-select-sm"
                      value={modalDept}
                      onChange={(e) => setModalDept(e.target.value)}
                    >
                      {deptOptions.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-4">
                    <label className="form-label small fw-bold text-muted">Semester</label>
                    <select
                      className="form-select form-select-sm"
                      value={modalSemester}
                      onChange={(e) => setModalSemester(Number(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                        <option key={s} value={s}>Semester {s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-3">
                    <label className="form-label small fw-bold text-muted">Section</label>
                    <select
                      className="form-select form-select-sm"
                      value={modalSection}
                      onChange={(e) => setModalSection(e.target.value)}
                    >
                      {["A", "B", "C", "D"].map((sec) => (
                        <option key={sec} value={sec}>Sec {sec}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-bold text-muted">Day of Week</label>
                    <select
                      className="form-select"
                      value={dayOfWeek}
                      onChange={(e) => setDayOfWeek(e.target.value)}
                    >
                      {days.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-bold text-muted">Period (1 to 6)</label>
                    <select
                      className="form-select"
                      value={period}
                      onChange={(e) => handlePeriodChange(e.target.value)}
                    >
                      {periods.map((p) => (
                        <option key={p} value={p}>Period {p} ({PERIOD_TIMINGS[p]?.start})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Subject Selector */}
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="form-label small fw-bold text-muted mb-0">
                      Subject <span className="text-danger">*</span>
                    </label>
                    <button
                      type="button"
                      className="btn btn-sm btn-link p-0 text-decoration-none small"
                      onClick={() => setShowQuickAdd(!showQuickAdd)}
                    >
                      <i className={`bi ${showQuickAdd ? "bi-dash-circle" : "bi-plus-circle"} me-1`}></i>
                      {showQuickAdd ? "Cancel Quick Add" : "+ Quick Add Subject"}
                    </button>
                  </div>

                  <select
                    className="form-select"
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    required
                  >
                    <option value="">-- Select Subject --</option>
                    {modalMatchingSubjects.length > 0 && (
                      <optgroup label={`${modalDept} Sem ${modalSemester} Subjects (${modalMatchingSubjects.length})`}>
                        {modalMatchingSubjects.map((s) => (
                          <option key={s._id} value={s._id}>
                            {s.code} - {s.name} ({s.type || "Theory"})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {modalOtherSubjects.length > 0 && (
                      <optgroup label={modalMatchingSubjects.length > 0 ? "Other Subjects (All Departments)" : "All College Subjects"}>
                        {modalOtherSubjects.map((s) => (
                          <option key={s._id} value={s._id}>
                            {s.code} - {s.name} ({s.department} Sem {s.semester})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>

                  {modalMatchingSubjects.length === 0 && (
                    <div className="alert alert-warning py-1 px-2 mt-2 mb-0 small d-flex align-items-center justify-content-between">
                      <span>
                        <i className="bi-info-circle me-1"></i>
                        No subjects specifically registered for <strong>{modalDept} Sem {modalSemester}</strong>.
                      </span>
                      {!showQuickAdd && (
                        <button
                          type="button"
                          className="btn btn-xs btn-outline-warning text-dark py-0 px-2 fw-semibold"
                          onClick={() => setShowQuickAdd(true)}
                        >
                          + Quick Add
                        </button>
                      )}
                    </div>
                  )}

                  {/* Inline Quick Add Subject Form */}
                  {showQuickAdd && (
                    <div className="p-3 mt-2 rounded border bg-light">
                      <div className="fw-semibold text-primary small mb-2">
                        <i className="bi-plus-circle me-1"></i> Quick Add Subject for {modalDept} Sem {modalSemester}
                      </div>
                      {quickError && (
                        <div className="alert alert-danger py-1 px-2 small mb-2">{quickError}</div>
                      )}
                      <div className="row g-2 mb-2">
                        <div className="col-4">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Code (e.g. CS506)"
                            value={quickCode}
                            onChange={(e) => setQuickCode(e.target.value)}
                          />
                        </div>
                        <div className="col-8">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Subject Title (e.g. AI & ML)"
                            value={quickName}
                            onChange={(e) => setQuickName(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="row g-2 mb-2">
                        <div className="col-6">
                          <select
                            className="form-select form-select-sm"
                            value={quickType}
                            onChange={(e) => setQuickType(e.target.value)}
                          >
                            <option value="Theory">Theory</option>
                            <option value="Practical">Practical / Lab</option>
                            <option value="Seminar">Seminar</option>
                          </select>
                        </div>
                        <div className="col-6">
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            placeholder="Credits (e.g. 3)"
                            value={quickCredits}
                            min="1"
                            max="6"
                            onChange={(e) => setQuickCredits(Number(e.target.value))}
                          />
                        </div>
                      </div>
                      <div className="d-flex justify-content-end gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-light border"
                          onClick={() => setShowQuickAdd(false)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          disabled={quickLoading}
                          onClick={handleQuickAddSubject}
                        >
                          {quickLoading ? "Saving..." : "Save & Select"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Faculty Selector */}
                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted">
                    Instructor Faculty <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={facultyId}
                    onChange={(e) => setFacultyId(e.target.value)}
                    required
                  >
                    <option value="">-- Select Instructor Faculty --</option>
                    {deptFaculty.length > 0 && (
                      <optgroup label={`${modalDept} Department Faculty (${deptFaculty.length})`}>
                        {deptFaculty.map((f) => (
                          <option key={f._id} value={f._id}>
                            {f.name} ({f.department} - {f.employeeId})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {otherFaculty.length > 0 && (
                      <optgroup label="Other Department Faculty">
                        {otherFaculty.map((f) => (
                          <option key={f._id} value={f._id}>
                            {f.name} ({f.department})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                {/* Room and Timing */}
                <div className="row g-2 mb-4">
                  <div className="col-4">
                    <label className="form-label small fw-bold text-muted">Room / Hall</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. LH-201"
                      value={room}
                      onChange={(e) => setRoom(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-4">
                    <label className="form-label small fw-bold text-muted">Start Time</label>
                    <input
                      type="text"
                      className="form-control"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      placeholder="09:30 AM"
                      required
                    />
                  </div>
                  <div className="col-4">
                    <label className="form-label small fw-bold text-muted">End Time</label>
                    <input
                      type="text"
                      className="form-control"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      placeholder="10:30 AM"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-erp-primary w-100 justify-content-center py-2"
                  disabled={loading || !subjectId || !facultyId}
                >
                  <i className="bi-check2-circle me-1"></i> Confirm & Schedule Period
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
