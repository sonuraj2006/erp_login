import React, { useState, useEffect } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

export default function FeedbackPage() {
  const { user } = useAuth();
  const role = user?.role;

  const [activeTab, setActiveTab] = useState(role === "student" ? "submit" : role === "faculty" ? "my-feedback" : "summary");

  const [facultyList, setFacultyList] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // Form states
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [department, setDepartment] = useState("CSE");
  const [semester, setSemester] = useState(5);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [comments, setComments] = useState("");

  const [ratings, setRatings] = useState({
    knowledge: 5,
    communication: 5,
    punctuality: 5,
    engagement: 4,
    doubtClarification: 5,
    overall: 5,
  });

  // Data states
  const [facultyFeedbackData, setFacultyFeedbackData] = useState(null);
  const [collegeSummary, setCollegeSummary] = useState(null);
  const [studentHistory, setStudentHistory] = useState([]);

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    // Load faculty and subjects
    api.get("/api/faculty")
      .then((res) => {
        setFacultyList(res.faculty || []);
        if (res.faculty && res.faculty.length > 0) setSelectedFaculty(res.faculty[0]._id);
      })
      .catch((err) => console.error(err));

    api.get("/api/academics/subjects")
      .then((res) => {
        const subs = res.allSubjects || res.subjects || [];
        setSubjects(subs);
        if (subs.length > 0) setSelectedSubject(subs[0]._id);
      })
      .catch((err) => console.error(err));

    if (role === "faculty") {
      api.get("/api/feedback/faculty-my")
        .then((res) => setFacultyFeedbackData(res))
        .catch((err) => console.error(err));
    }

    if (["hod", "principal", "admin"].includes(role)) {
      api.get("/api/feedback/summary")
        .then((res) => setCollegeSummary(res))
        .catch((err) => console.error(err));
    }

    if (role === "student") {
      api.get("/api/feedback/student-history")
        .then((res) => setStudentHistory(res.feedbacks || []))
        .catch((err) => console.error(err));
    }
  }, [role]);

  const handleRatingChange = (key, value) => {
    setRatings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlert(null);

    try {
      const res = await api.post("/api/feedback/submit", {
        facultyId: selectedFaculty,
        subjectId: selectedSubject,
        department,
        semester: Number(semester),
        ratings,
        comments,
        isAnonymous,
      });

      setAlert({ type: "success", message: res.message });
      setComments("");
      // Refresh student history
      const hist = await api.get("/api/feedback/student-history");
      setStudentHistory(hist.feedbacks || []);
    } catch (err) {
      setAlert({ type: "danger", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const renderStarSelector = (category, label) => {
    const val = ratings[category];
    return (
      <div className="d-flex justify-content-between align-items-center mb-3 p-2 bg-light rounded border">
        <span className="fw-semibold small text-dark">{label}</span>
        <div className="star-rating">
          {[1, 2, 3, 4, 5].map((star) => (
            <i
              key={star}
              className={`bi ${star <= val ? "bi-star-fill" : "bi-star"}`}
              onClick={() => handleRatingChange(category, star)}
              style={{ cursor: "pointer" }}
            ></i>
          ))}
          <span className="ms-2 badge bg-primary">{val} / 5</span>
        </div>
      </div>
    );
  };

  return (
    <div className="erp-content">
      <div className="erp-page-header">
        <div>
          <h2 className="erp-page-title">Student Feedback & Faculty Evaluation</h2>
          <p className="erp-page-subtitle">
            Continuous teaching quality enhancement through structured, multi-metric student ratings.
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
        {role === "student" && (
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "submit" ? "active" : ""}`}
              onClick={() => setActiveTab("submit")}
            >
              <i className="bi-pencil me-1"></i> Submit Evaluation
            </button>
          </li>
        )}

        {role === "student" && (
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "history" ? "active" : ""}`}
              onClick={() => setActiveTab("history")}
            >
              <i className="bi-clock-history me-1"></i> My Submissions ({studentHistory.length})
            </button>
          </li>
        )}

        {role === "faculty" && (
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "my-feedback" ? "active" : ""}`}
              onClick={() => setActiveTab("my-feedback")}
            >
              <i className="bi-star-half me-1"></i> My Student Ratings
            </button>
          </li>
        )}

        {["hod", "principal", "admin"].includes(role) && (
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "summary" ? "active" : ""}`}
              onClick={() => setActiveTab("summary")}
            >
              <i className="bi-bar-chart-fill me-1"></i> Department / College Summary
            </button>
          </li>
        )}
      </ul>

      {/* 1. Student Submission Form */}
      {activeTab === "submit" && role === "student" && (
        <div className="row g-4 justify-content-center">
          <div className="col-lg-8">
            <div className="erp-card">
              <div className="erp-card-header">
                <h5 className="erp-card-title"><i className="bi-clipboard-check text-primary"></i> Faculty Feedback Form</h5>
              </div>
              <div className="erp-card-body">
                <form onSubmit={handleSubmitFeedback}>
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-muted">Select Instructor</label>
                      <select
                        className="form-select"
                        value={selectedFaculty}
                        onChange={(e) => setSelectedFaculty(e.target.value)}
                        required
                      >
                        {facultyList.map((f) => (
                          <option key={f._id} value={f._id}>
                            {f.name} ({f.department} - {f.designation})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-muted">Select Course / Subject</label>
                      <select
                        className="form-select"
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        required
                      >
                        {subjects.map((sub) => (
                          <option key={sub._id} value={sub._id}>
                            {sub.code} - {sub.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <h6 className="fw-bold text-primary border-bottom pb-2 mt-4 mb-3">
                    Evaluation Criteria (Rate 1 to 5 Stars):
                  </h6>

                  {renderStarSelector("knowledge", "1. Subject Knowledge & Depth of Material")}
                  {renderStarSelector("communication", "2. Communication Skills & Clarity of Explanations")}
                  {renderStarSelector("punctuality", "3. Punctuality & Regularity in Class")}
                  {renderStarSelector("engagement", "4. Classroom Engagement & Encouraging Questions")}
                  {renderStarSelector("doubtClarification", "5. Helpfulness in Clearing Doubts & Support")}
                  {renderStarSelector("overall", "6. Overall Teaching Effectiveness")}

                  <div className="mb-3 mt-4">
                    <label className="form-label small fw-bold text-muted">Constructive Feedback / Comments</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="Share specific suggestions or praise for teaching delivery..."
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                    ></textarea>
                  </div>

                  <div className="form-check form-switch mb-4">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="anonymousCheck"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                    />
                    <label className="form-check-label fw-semibold" htmlFor="anonymousCheck">
                      Submit Anonymously (Hide your name and roll number from the instructor)
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-erp-primary w-100 justify-content-center"
                    disabled={loading}
                  >
                    <i className="bi-send-check"></i> {loading ? "Recording..." : "Submit Course Feedback"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Student Feedback History */}
      {activeTab === "history" && role === "student" && (
        <div className="erp-card">
          <div className="erp-card-header">
            <h5 className="erp-card-title">My Feedback Submissions</h5>
          </div>
          <div className="erp-card-body p-0">
            {studentHistory.length === 0 ? (
              <div className="text-center py-5 text-muted">You have not submitted any feedback yet.</div>
            ) : (
              <div className="table-responsive">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Instructor</th>
                      <th>Overall Score</th>
                      <th>Comments</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentHistory.map((item) => (
                      <tr key={item._id}>
                        <td className="fw-bold">{item.subjectId?.name} ({item.subjectId?.code})</td>
                        <td>{item.facultyId?.name}</td>
                        <td>
                          <span className="badge bg-warning text-dark">
                            <i className="bi-star-fill text-warning me-1"></i>
                            {item.ratings.overall} / 5
                          </span>
                        </td>
                        <td className="text-truncate" style={{ maxWidth: 250 }}>{item.comments || "No comments"}</td>
                        <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Faculty Feedback Analytics */}
      {activeTab === "my-feedback" && role === "faculty" && facultyFeedbackData && (
        <>
          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <div className="erp-stat-card text-center flex-column justify-content-center h-100">
                <div className="display-4 fw-bold text-primary mb-1">
                  {facultyFeedbackData.averageRatings?.overall || "4.8"}
                </div>
                <div className="text-warning fs-4 mb-1">
                  <i className="bi-star-fill"></i>
                  <i className="bi-star-fill"></i>
                  <i className="bi-star-fill"></i>
                  <i className="bi-star-fill"></i>
                  <i className="bi-star-half"></i>
                </div>
                <div className="text-muted small">
                  Based on <strong>{facultyFeedbackData.totalSubmissions}</strong> student submissions
                </div>
              </div>
            </div>

            <div className="col-md-8">
              <div className="erp-card h-100 mb-0">
                <div className="erp-card-header">
                  <h6 className="erp-card-title mb-0">Metric Breakdown (Out of 5 Stars)</h6>
                </div>
                <div className="erp-card-body">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small">Subject Knowledge</span>
                    <span className="fw-bold">{facultyFeedbackData.averageRatings?.knowledge} / 5</span>
                  </div>
                  <div className="progress mb-3" style={{ height: 6 }}>
                    <div className="progress-bar bg-success" style={{ width: `${(facultyFeedbackData.averageRatings?.knowledge / 5) * 100}%` }}></div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small">Communication & Clarity</span>
                    <span className="fw-bold">{facultyFeedbackData.averageRatings?.communication} / 5</span>
                  </div>
                  <div className="progress mb-3" style={{ height: 6 }}>
                    <div className="progress-bar bg-info" style={{ width: `${(facultyFeedbackData.averageRatings?.communication / 5) * 100}%` }}></div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small">Classroom Punctuality</span>
                    <span className="fw-bold">{facultyFeedbackData.averageRatings?.punctuality} / 5</span>
                  </div>
                  <div className="progress mb-3" style={{ height: 6 }}>
                    <div className="progress-bar bg-warning" style={{ width: `${(facultyFeedbackData.averageRatings?.punctuality / 5) * 100}%` }}></div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small">Doubt Clearing & Helpfulness</span>
                    <span className="fw-bold">{facultyFeedbackData.averageRatings?.doubtClarification} / 5</span>
                  </div>
                  <div className="progress" style={{ height: 6 }}>
                    <div className="progress-bar bg-primary" style={{ width: `${(facultyFeedbackData.averageRatings?.doubtClarification / 5) * 100}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="erp-card">
            <div className="erp-card-header">
              <h5 className="erp-card-title">Student Comments & Reviews</h5>
            </div>
            <div className="erp-card-body p-0">
              <div className="list-group list-group-flush">
                {facultyFeedbackData.feedbacks?.map((f) => (
                  <div key={f._id} className="list-group-item p-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="fw-bold text-dark">{f.subject?.name || "Course Subject"}</span>
                      <span className="badge bg-warning text-dark">
                        <i className="bi-star-fill text-warning me-1"></i> {f.ratings?.overall} / 5
                      </span>
                    </div>
                    <p className="mb-1 text-secondary" style={{ fontSize: "0.85rem" }}>
                      "{f.comments || "Teaching was very good."}"
                    </p>
                    <small className="text-muted">
                      Submitted on {new Date(f.createdAt).toLocaleDateString()} • Verified Student
                    </small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 4. HOD and Principal College Feedback Summaries */}
      {activeTab === "summary" && ["hod", "principal", "admin"].includes(role) && collegeSummary && (
        <div className="erp-card">
          <div className="erp-card-header">
            <h5 className="erp-card-title">
              <i className="bi-award-fill text-warning"></i> Faculty Teaching Performance Rankings
            </h5>
            <span className="badge bg-light text-dark border">
              Total Student Evaluations: {collegeSummary.totalResponses}
            </span>
          </div>
          <div className="erp-card-body p-0">
            <div className="table-responsive">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Faculty Name</th>
                    <th>Department</th>
                    <th>Evaluations</th>
                    <th>Average Overall</th>
                    <th>Knowledge</th>
                    <th>Communication</th>
                    <th>Punctuality</th>
                    <th>Doubts</th>
                  </tr>
                </thead>
                <tbody>
                  {collegeSummary.facultySummaries?.map((item) => (
                    <tr key={item.faculty?._id}>
                      <td className="fw-bold">
                        {item.faculty?.name}
                        <small className="d-block text-muted">{item.faculty?.designation}</small>
                      </td>
                      <td>{item.faculty?.department}</td>
                      <td>{item.count} students</td>
                      <td>
                        <span className="badge bg-warning text-dark fs-6">
                          <i className="bi-star-fill me-1"></i> {item.averageOverall} / 5
                        </span>
                      </td>
                      <td>{item.breakdown?.knowledge}</td>
                      <td>{item.breakdown?.communication}</td>
                      <td>{item.breakdown?.punctuality}</td>
                      <td>{item.breakdown?.doubtClarification}</td>
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
