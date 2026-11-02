import React, { useState } from "react";
import { useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import NotificationModal from "./components/NotificationModal";

// Pages
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AttendanceTrackerPage from "./pages/AttendanceTrackerPage";
import AttendanceSubstitutionPage from "./pages/AttendanceSubstitutionPage";
import AttendanceReportsPage from "./pages/AttendanceReportsPage";
import StudentDirectoryPage from "./pages/StudentDirectoryPage";
import FacultyDirectoryPage from "./pages/FacultyDirectoryPage";
import AcademicSetupPage from "./pages/AcademicSetupPage";
import TimetablePage from "./pages/TimetablePage";
import LeaveManagementPage from "./pages/LeaveManagementPage";
import ClassAdjustmentPage from "./pages/ClassAdjustmentPage";
import FeedbackPage from "./pages/FeedbackPage";
import PayrollPage from "./pages/PayrollPage";
import UserManagementPage from "./pages/UserManagementPage";
import AuditLogsPage from "./pages/AuditLogsPage";

export default function App() {
  const { isAuthenticated, loading } = useAuth();
  const [activePage, setActivePage] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  if (loading) {
    return (
      <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-dark text-white">
        <div className="spinner-border text-primary mb-3" style={{ width: "3rem", height: "3rem" }}></div>
        <h5 className="fw-bold">Initializing College ERP System...</h5>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderActivePage = () => {
    switch (activePage) {
      case "dashboard":
        return <DashboardPage setActivePage={setActivePage} />;
      case "mark-attendance":
        return <AttendanceTrackerPage />;
      case "attendance-substitution":
        return <AttendanceSubstitutionPage />;
      case "attendance-reports":
        return <AttendanceReportsPage />;
      case "students":
        return <StudentDirectoryPage />;
      case "faculty":
        return <FacultyDirectoryPage />;
      case "academics":
        return <AcademicSetupPage />;
      case "timetable":
        return <TimetablePage />;
      case "leave-management":
        return <LeaveManagementPage />;
      case "class-adjustment":
        return <ClassAdjustmentPage />;
      case "feedback":
        return <FeedbackPage />;
      case "payroll":
        return <PayrollPage />;
      case "users":
        return <UserManagementPage />;
      case "audit-logs":
        return <AuditLogsPage />;
      default:
        return <DashboardPage setActivePage={setActivePage} />;
    }
  };

  return (
    <div className="erp-layout">
      {/* Sidebar Navigation */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Container */}
      <div className="erp-main">
        {/* Top Navbar */}
        <Navbar
          activePage={activePage}
          setMobileOpen={setMobileOpen}
          onOpenNotifications={() => setShowNotifications(true)}
        />

        {/* Dynamic Page View */}
        {renderActivePage()}
      </div>

      {/* Interactive Notifications Modal */}
      <NotificationModal
        show={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </div>
  );
}
