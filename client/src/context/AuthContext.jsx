import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../api";

const AuthContext = createContext(null);

export const DEMO_CREDENTIALS = {
  admin: { email: "admin@college.edu", password: "Admin@123456", label: "Admin" },
  principal: { email: "principal@college.edu", password: "College@123", label: "Principal" },
  hod: { email: "hod.cse@college.edu", password: "College@123", label: "HOD (CSE)" },
  faculty: { email: "faculty@college.edu", password: "Faculty@123456", label: "Faculty (Prof. Neha)" },
  student: { email: "student@college.edu", password: "Student@123456", label: "Student (Aarav)" },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("erp_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("erp_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.get("/api/auth/me")
        .then((res) => {
          if (res.user) {
            setUser(res.user);
            localStorage.setItem("erp_user", JSON.stringify(res.user));
          }
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post("/api/auth/login", { email, password });
    localStorage.setItem("erp_token", res.token);
    localStorage.setItem("erp_user", JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const quickSwitchRole = async (roleKey) => {
    const creds = DEMO_CREDENTIALS[roleKey];
    if (!creds) return;
    return await login(creds.email, creds.password);
  };

  const logout = () => {
    localStorage.removeItem("erp_token");
    localStorage.removeItem("erp_user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        quickSwitchRole,
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
