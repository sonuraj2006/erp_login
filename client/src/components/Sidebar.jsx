import React from "react";
import { useAuth } from "../context/AuthContext";

export default function Sidebar({ activePage, setActivePage, mobileOpen, setMobileOpen }) {
  const { user, logout } = useAuth();
  if (!user) return null;

  const role = user.role;

  // Role permissions check for navigation
  const canSee = (allowedRoles) => allowedRoles.includes(role) || role === "admin";

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "bi-grid-1x2-fill", roles: ["admin", "principal", "hod", "faculty", "student"] },
    
    // Academic & People Setup
    { header: "Academic & People" },
    { id: "students", label: "Student Directory", icon: "bi-people-fill", roles: ["admin", "principal", "hod", "faculty"] },
    { id: "faculty", label: "Faculty Directory", icon: "bi-person-badge-fill", roles: ["admin", "principal", "hod"] },
    { id: "academics", label: "Departments & Subjects", icon: "bi-book-half", roles: ["admin", "principal", "hod"] },
    { id: "timetable", label: "Class Timetable", icon: "bi-calendar3", roles: ["admin", "principal", "hod", "faculty", "student"] },

    // Attendance Management
    { header: "Attendance System" },
    { id: "mark-attendance", label: "Take Attendance", icon: "bi-check2-square", roles: ["faculty", "hod", "admin"] },
    { id: "attendance-substitution", label: "Attendance Copy / Sub", icon: "bi-arrow-left-right", roles: ["faculty", "hod", "admin"] },
    { id: "attendance-reports", label: "Attendance Reports", icon: "bi-bar-chart-line-fill", roles: ["admin", "principal", "hod", "faculty", "student"] },

    // Workflows & Approvals
    { header: "Approvals & Feedback" },
    { id: "leave-management", label: "Leave Approvals", icon: "bi-calendar-check", roles: ["admin", "principal", "hod", "faculty"] },
    { id: "class-adjustment", label: "Class Adjustments", icon: "bi-shuffle", roles: ["faculty", "hod", "admin", "principal"] },
    { id: "feedback", label: "Student Feedback", icon: "bi-star-fill", roles: ["student", "faculty", "hod", "principal", "admin"] },

    // Financial & Administration
    { header: "Finance & Control" },
    { id: "payroll", label: "Payroll & Payslips", icon: "bi-cash-coin", roles: ["admin", "principal", "faculty"] },
    { id: "users", label: "User Accounts", icon: "bi-shield-lock-fill", roles: ["admin"] },
    { id: "audit-logs", label: "System Audit Logs", icon: "bi-journal-text", roles: ["admin", "principal"] },
  ];

  return (
    <aside className={`erp-sidebar ${mobileOpen ? "mobile-open" : ""}`}>
      {/* Brand Header */}
      <div className="erp-brand">
        <div className="erp-brand-logo">
          <i className="bi-mortarboard-fill"></i>
        </div>
        <div className="erp-brand-text">
          <h5>Apex ERP</h5>
          <span>Campus Management</span>
        </div>
      </div>

      {/* Navigation list */}
      <div className="py-2 flex-grow-1" style={{ overflowY: "auto" }}>
        <ul className="erp-nav-list">
          {navItems.map((item, index) => {
            if (item.header) {
              return (
                <li key={`header-${index}`} className="erp-nav-section-title">
                  {item.header}
                </li>
              );
            }

            if (!canSee(item.roles)) return null;

            const isActive = activePage === item.id;

            return (
              <li key={item.id} className="erp-nav-item">
                <button
                  className={`erp-nav-link ${isActive ? "active" : ""}`}
                  onClick={() => {
                    setActivePage(item.id);
                    if (setMobileOpen) setMobileOpen(false);
                  }}
                >
                  <i className={`bi ${item.icon}`}></i>
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* User footer & logout */}
      <div className="erp-sidebar-user">
        <div className="erp-avatar">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="erp-user-info">
          <div className="erp-user-name" title={user.name}>{user.name}</div>
          <div className="erp-user-role">{user.role} {user.department ? `(${user.department})` : ""}</div>
        </div>
        <button
          className="btn btn-sm btn-outline-danger border-0 p-1 text-light"
          onClick={logout}
          title="Sign Out"
        >
          <i className="bi-box-arrow-right fs-5"></i>
        </button>
      </div>
    </aside>
  );
}
