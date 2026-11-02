import React, { useState, useEffect } from "react";
import { api } from "../api";

export default function NotificationModal({ show, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = () => {
    setLoading(true);
    api.get("/api/notifications/my")
      .then((res) => {
        setNotifications(res.notifications || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (show) loadNotifications();
  }, [show]);

  const markAllAsRead = async () => {
    try {
      await api.post("/api/notifications/mark-all-read");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  if (!show) return null;

  return (
    <div className="erp-modal-backdrop" onClick={onClose}>
      <div className="erp-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="erp-card-header d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <i className="bi-bell-fill text-primary fs-5"></i>
            <h5 className="mb-0 fw-bold">Notifications Center</h5>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button className="btn btn-sm btn-outline-secondary" onClick={markAllAsRead}>
              Mark all read
            </button>
            <button className="btn btn-sm btn-light rounded-circle" onClick={onClose}>
              <i className="bi-x-lg"></i>
            </button>
          </div>
        </div>

        <div className="p-3">
          {loading ? (
            <div className="text-center py-4 text-muted">
              <div className="spinner-border spinner-border-sm text-primary mb-2"></div>
              <div>Loading alerts...</div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi-check2-circle fs-1 text-success mb-2 d-block"></i>
              <p className="mb-0">No new notifications. You are all caught up!</p>
            </div>
          ) : (
            <div className="list-group list-group-flush">
              {notifications.map((item) => (
                <div
                  key={item._id}
                  className={`list-group-item list-group-item-action border-0 rounded-3 mb-2 p-3 ${
                    item.isRead ? "bg-light opacity-75" : "bg-white border shadow-sm"
                  }`}
                >
                  <div className="d-flex justify-content-between align-items-start mb-1">
                    <span className="fw-bold text-dark" style={{ fontSize: "0.9rem" }}>
                      {item.title}
                    </span>
                    <span className="text-muted" style={{ fontSize: "0.72rem" }}>
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="mb-0 text-secondary" style={{ fontSize: "0.82rem", whiteSpace: "pre-line" }}>
                    {item.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
