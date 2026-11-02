import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "../api";

const AppDataContext = createContext(null);

/**
 * Global shared context for departments and subjects.
 * Any page that adds/edits a department or subject calls refreshDepartments()
 * or refreshSubjects() so every other page immediately sees the updated list.
 */
export function AppDataProvider({ children }) {
  const [departments, setDepartments] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [deptLoading, setDeptLoading] = useState(true);

  const refreshDepartments = useCallback(() => {
    setDeptLoading(true);
    return api
      .get("/api/academics/departments")
      .then((res) => {
        setDepartments(res.departments || []);
        return res.departments || [];
      })
      .catch((err) => {
        console.error("Failed to load departments:", err);
        return [];
      })
      .finally(() => setDeptLoading(false));
  }, []);

  const refreshSubjects = useCallback(() => {
    return api
      .get("/api/academics/subjects")
      .then((res) => {
        const subs = res.allSubjects || res.subjects || [];
        setAllSubjects(subs);
        return subs;
      })
      .catch((err) => {
        console.error("Failed to load subjects:", err);
        return [];
      });
  }, []);

  // Load on mount
  useEffect(() => {
    refreshDepartments();
    refreshSubjects();
  }, []);

  // Helper: get subjects filtered by dept + semester
  const getSubjectsFor = (dept, semester) => {
    if (!dept && !semester) return allSubjects;
    return allSubjects.filter((s) => {
      const deptMatch = !dept || s.department?.toUpperCase() === dept?.toUpperCase();
      const semMatch = !semester || Number(s.semester) === Number(semester);
      return deptMatch && semMatch;
    });
  };

  return (
    <AppDataContext.Provider
      value={{
        departments,
        allSubjects,
        deptLoading,
        refreshDepartments,
        refreshSubjects,
        getSubjectsFor,
        // Convenience: dept codes array
        deptCodes: departments.map((d) => d.code),
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within an AppDataProvider");
  }
  return context;
}
