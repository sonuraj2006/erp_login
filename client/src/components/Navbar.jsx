import React, { useState, useEffect } from "react";
import { useAuth, DEMO_CREDENTIALS } from "../context/AuthContext";
import { api } from "../api";

export default function Navbar({ activePage, setMobileOpen, onOpenNotifications }) {
  const { user, quickSwitchRole, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotificationCount = () => {
    api.get("/api/notifications/my")
      .then((res) => {
        if (typeof res.unreadCount === "number") setUnreadCount(res.unreadCount);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchNotificationCount();
    const interval = setInterval(fetchNotificationCount, 20000);
    return () => clearInterval(interval);
  }, []);

  const getRoleBadgeClass = (r) => {
    switch (r) {
      case "admin": return "badge-admin";
      case "principal": return "badge-principal";
      case "hod": return "badge-hod";
      case "faculty": return "badge-faculty";
      case "student": return "badge-student";
      default: return "badge-secondary";
    }
  };

  return (
    <>
      {/* 1-Click Role Switcher Bar */}
      <div className="erp-demo-switch-bar d-none d-md-flex">
        <div className="d-flex align-items-center gap-2">
          <i className="bi-lightning-charge-fill text-warning"></i>
          <span className="fw-semibold">Role Switcher:</span>
          <span className="text-white-50">Switch perspective instantly:</span>
        </div>
        <div className="d-flex align-items-center">
          {Object.entries(DEMO_CREDENTIALS).map(([key, val]) => (
            <button
              key={key}
              className={`erp-demo-pill ${user?.role === key ? "active" : ""}`}
              onClick={() => quickSwitchRole(key)}
            >
              {val.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Top Header */}
      <header className="erp-navbar">
        <div className="d-flex align-items-center gap-3">
          <button
            className="btn btn-sm btn-light d-lg-none"
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            <i className="bi-list fs-5"></i>
          </button>
          <div>
            <div className="d-flex align-items-center gap-2">
              <span className={`erp-role-badge ${getRoleBadgeClass(user?.role)}`}>
                <i className="bi-shield-check"></i>
                {user?.role} Portal
              </span>
              <span className="text-muted d-none d-sm-inline" style={{ fontSize: "0.8rem" }}>
                | Academic Year 2026–2027
              </span>
            </div>
          </div>
        </div>

        {/* Right side controls */}
        <div className="d-flex align-items-center gap-3">
          {/* Notifications button */}
          <button
            className="btn btn-light position-relative rounded-circle p-2"
            onClick={onOpenNotifications}
            title="Notifications"
          >
            <i className="bi-bell fs-5 text-secondary"></i>
            {unreadCount > 0 && (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: "0.65rem" }}>
                {unreadCount}
              </span>
            )}
          </button>

          {/* User profile dropdown pill */}
          <div className="d-flex align-items-center gap-2 border-start ps-3">
            <div className="erp-avatar" style={{ width: 34, height: 34, fontSize: "0.8rem" }}>
              {user?.name?.charAt(0)}
            </div>
            <div className="d-none d-md-block text-start">
              <div className="fw-bold" style={{ fontSize: "0.85rem", lineHeight: 1.2 }}>
                {user?.name}
              </div>
              <div className="text-muted" style={{ fontSize: "0.72rem" }}>
                {user?.email}
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
