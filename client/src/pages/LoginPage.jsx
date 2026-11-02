import React, { useState } from "react";
import { useAuth, DEMO_CREDENTIALS } from "../context/AuthContext";

export default function LoginPage() {
  const { login, quickSwitchRole } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || "Invalid credentials. Please verify your email and password.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (roleKey) => {
    setLoading(true);
    setError(null);
    try {
      await quickSwitchRole(roleKey);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-vh-100 d-flex flex-column justify-content-center align-items-center py-5 px-3"
      style={{
        background: "radial-gradient(circle at 10% 20%, rgb(15, 23, 42) 0%, rgb(30, 41, 59) 90%)",
      }}
    >
      <div className="text-center mb-4 text-white">
        <div
          className="d-inline-flex align-items-center justify-content-center p-3 rounded-4 mb-3 shadow-lg"
          style={{ background: "linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)", width: 64, height: 64 }}
        >
          <i className="bi-mortarboard-fill fs-2 text-white"></i>
        </div>
        <h2 className="fw-extrabold letter-spacing-tight mb-1">APEX COLLEGE ERP</h2>
        <p className="text-white-50 small mb-0">Unified Academic & Enterprise Resource Planning System</p>
      </div>

      <div
        className="card border-0 shadow-lg rounded-4 overflow-hidden w-100"
        style={{ maxWidth: 480, backdropFilter: "blur(10px)", background: "rgba(255, 255, 255, 0.96)" }}
      >
        <div className="card-body p-4 p-sm-5">
          <div className="mb-4">
            <h4 className="fw-bold text-dark mb-1">Sign in to your account</h4>
            <p className="text-muted small mb-0">Enter your official institutional credentials</p>
          </div>

          {error && (
            <div className="alert alert-danger py-2 small d-flex align-items-center gap-2 mb-3" role="alert">
              <i className="bi-exclamation-octagon-fill"></i>
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label small fw-bold text-muted">Institutional Email or Roll Number</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi-person-badge text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 ps-0"
                  placeholder="name@college.edu or 24R21A6601"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label small fw-bold text-muted">Password</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi-lock text-muted"></i>
                </span>
                <input
                  type="password"
                  className="form-control border-start-0 ps-0"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-erp-primary w-100 py-2 justify-content-center shadow-sm"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Authenticating...
                </>
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <i className="bi-arrow-right"></i>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Switcher Section */}
          <div className="mt-4 pt-4 border-top">
            <div className="text-center mb-3">
              <span className="badge bg-light text-secondary border px-3 py-1 fw-semibold" style={{ fontSize: "0.74rem" }}>
                <i className="bi-lightning-charge-fill text-warning me-1"></i> Quick 1-Click Role Login Demo:
              </span>
            </div>

            <div className="d-grid gap-2">
              <div className="row g-2">
                <div className="col-6">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-dark w-100 text-start py-2"
                    onClick={() => handleQuickLogin("admin")}
                    disabled={loading}
                  >
                    <div className="fw-bold small text-danger"><i className="bi-shield-lock-fill me-1"></i> System Admin</div>
                    <div className="text-muted" style={{ fontSize: "0.68rem" }}>admin@college.edu</div>
                  </button>
                </div>

                <div className="col-6">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-dark w-100 text-start py-2"
                    onClick={() => handleQuickLogin("principal")}
                    disabled={loading}
                  >
                    <div className="fw-bold small text-warning"><i className="bi-award-fill me-1"></i> Principal</div>
                    <div className="text-muted" style={{ fontSize: "0.68rem" }}>principal@college.edu</div>
                  </button>
                </div>

                <div className="col-6">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-dark w-100 text-start py-2"
                    onClick={() => handleQuickLogin("hod")}
                    disabled={loading}
                  >
                    <div className="fw-bold small text-primary"><i className="bi-diagram-3-fill me-1"></i> HOD (CSE)</div>
                    <div className="text-muted" style={{ fontSize: "0.68rem" }}>hod.cse@college.edu</div>
                  </button>
                </div>

                <div className="col-6">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-dark w-100 text-start py-2"
                    onClick={() => handleQuickLogin("faculty")}
                    disabled={loading}
                  >
                    <div className="fw-bold small text-success"><i className="bi-person-badge-fill me-1"></i> Faculty (Prof. Neha)</div>
                    <div className="text-muted" style={{ fontSize: "0.68rem" }}>faculty@college.edu</div>
                  </button>
                </div>

                <div className="col-12">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary w-100 text-start py-2"
                    onClick={() => handleQuickLogin("student")}
                    disabled={loading}
                  >
                    <div className="fw-bold small"><i className="bi-mortarboard-fill me-1"></i> Student (Aarav Sharma - Roll 24R21A6601)</div>
                    <div className="text-muted" style={{ fontSize: "0.68rem" }}>student@college.edu</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center mt-4 text-white-50 small">
        &copy; 2026 Apex College ERP System • Powered by MERN Stack
      </div>
    </div>
  );
}
