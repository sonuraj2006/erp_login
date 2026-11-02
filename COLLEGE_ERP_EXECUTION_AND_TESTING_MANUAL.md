# Complete College ERP System – Execution & Comprehensive Testing Manual

This document provides complete instructions to run and verify every feature and test case across all 5 roles and 9 ERP modules.

---

## 1. Project Execution Guide

### Step 1: Open Terminal in the Project Directory
```powershell
cd "c:\Users\bmukn\OneDrive\Documents\sonu file\3-1 sem\webplab\student-attendance-system - Copy"
```

### Step 2: Seed the Database with Demo Data
To initialize all accounts, departments, courses, schedules, and past records:
```powershell
node seed.js
```
*Output confirmed:*
```text
=================================================
 College ERP Database Seed Completed Successfully
=================================================
Login Credentials for all 5 roles:
1. Admin:     admin@college.edu      / Admin@123456
2. Principal: principal@college.edu  / College@123
3. HOD (CSE): hod.cse@college.edu    / College@123
4. Faculty:   faculty@college.edu    / Faculty@123456
5. Student:   student@college.edu    / Student@123456
=================================================
```

### Step 3: Start the College ERP Server
```powershell
npm start
# or: node server.js
```
The server will connect to MongoDB Atlas and serve both the backend APIs and the compiled React frontend at:
👉 **http://localhost:5000**

---

## 2. Test Credentials Table

| Role | Email | Password | Pre-Configured Person | Key Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **System Admin** | `admin@college.edu` | `Admin@123456` | Central Admin | User accounts, academic setup, payroll batches, audit logs |
| **Principal** | `principal@college.edu` | `College@123` | Dr. R. K. Sharma | College-wide attendance monitor, final leave approval |
| **HOD (CSE)** | `hod.cse@college.edu` | `College@123` | Dr. Suresh Babu | Dept leave recommendation, class adjustments approval |
| **Faculty** | `faculty@college.edu` | `Faculty@123456` | Prof. Neha Verma | Mark attendance, request substitution, apply for leave, view own payslip |
| **Student** | `student@college.edu` | `Student@123456` | Aarav Sharma (24R21A6601) | View attendance percentage, shortage alert (<75%), submit feedback |

> 💡 **Quick Switching Tip:** On the login screen, click any of the **1-Click Quick Demo Login** buttons. Once signed in, use the top **Role Switcher Bar** to jump between roles instantly.

---

## 3. Step-by-Step Test Cases to Verify All Requirements

---

### Testcase 1: Student Attendance & Shortage Warning (<75%) (Module 1)
- **Role to test:** Student (`student@college.edu`)
- **How to test:**
  1. Click **"Student (Aarav Sharma)"** on the login screen or sign in manually.
  2. Observe the **Circular Attendance Gauge** showing current aggregate percentage.
  3. When attendance is below 75%, a red warning banner appears:
     > *"Attendance Shortage Alert! Your current attendance is below the mandatory university threshold of 75%..."*
  4. View **Today's Class Timetable** card showing scheduled lectures, room numbers, and faculty names.
  5. Click **"Attendance Reports"** &rarr; select **"Individual Student Breakdown"** to view subject-by-subject attendance percentages.
- **Pass criteria:** Circular gauge displays correct percentage, shortage banner appears when < 75%, and subject breakdown loads.

---

### Testcase 2: Marking Attendance with Duplicate Prevention (Module 5)
- **Role to test:** Faculty (`faculty@college.edu`)
- **How to test:**
  1. Switch to **"Faculty (Prof. Neha)"** using the top switcher.
  2. In the sidebar, click **"Take Attendance"**.
  3. Select:
     - Department: `CSE` | Semester: `5` | Section: `A`
     - Subject: `CS501 - Operating Systems`
     - Period: `Period 1` | Date: Today
  4. The class roster appears. Click **"Mark All Present"** &rarr; all rows switch to green.
  5. Change student 2 to **"Absent"** and student 3 to **"On Duty"**.
  6. Click **"Submit Attendance Session"**.
  7. **Verify Duplicate Prevention:** Click **"Submit Attendance Session"** once again with the same period and class.
- **Pass criteria:** The first submission succeeds and displays counts (Present/Absent/OD). The second submission is rejected with a `409 Conflict` duplicate prevention alert.

---

### Testcase 3: Attendance Copy & Faculty Substitution (Module 6)
- **Role to test:** Faculty (`faculty@college.edu`)
- **How to test:**
  1. Click **"Attendance Copy / Sub"** in the sidebar.
  2. Choose a recorded source session from the dropdown &rarr; review the snapshot preview.
  3. Set target date, target period (e.g. Period 4), and select substitute faculty (*Prof. Amit Saxena*).
  4. Type reason: *"Authorized substitution due to faculty attending university meeting."*
  5. Click **"Authorize & Copy Attendance Record"**.
- **Pass criteria:** Copied attendance record is created and appears in the "Substitution & Copy Audit History" on the right.

---

### Testcase 4: Multi-Stage Leave Approval Workflow (Modules 7 & 3)
- **Roles to test:** Faculty &rarr; HOD &rarr; Principal
- **How to test:**
  1. **Faculty Application:**
     - As **Faculty** (`faculty@college.edu`), click **"Leave Approvals"**.
     - Verify leave balance cards (CL, SL, EL, OD).
     - Fill the form: Casual Leave, next 2 days, reason *"Attending national conference"*.
     - Click **"Submit Leave Application"**. Status is set to `Pending HOD`.
  2. **HOD Review:**
     - Switch to **HOD** (`hod.cse@college.edu`) using the top bar.
     - Go to **"Leave Approvals"** &rarr; **"HOD Review"** tab.
     - Click **"Forward"** (recommends to Principal) with remarks. Status updates to `Pending Principal`.
  3. **Principal Final Approval:**
     - Switch to **Principal** (`principal@college.edu`).
     - Go to **"Leave Approvals"** &rarr; **"Principal Final Approval"** tab.
     - Click **"Final Approve"**.
  4. **Balance Verification:**
     - Switch back to **Faculty** (`faculty@college.edu`).
     - Notice status is **Approved** and 2 days have been automatically deducted from the Casual Leave balance!
- **Pass criteria:** End-to-end routing works cleanly across all 3 levels and deducts balance upon final approval.

---

### Testcase 5: Class Adjustment Management (Module 8)
- **Roles to test:** Faculty &rarr; HOD
- **How to test:**
  1. As **Faculty**, go to **"Class Adjustments"**.
  2. Choose substitute (*Prof. Amit Saxena*), date, period, and class.
  3. Click **"Send Adjustment Request to HOD"**.
  4. Switch to **HOD** (`hod.cse@college.edu`) &rarr; open **"Class Adjustments"**.
  5. Click **"Approve"**.
- **Pass criteria:** Adjustment is saved, notifications are sent to both instructors, and status shows Approved.

---

### Testcase 6: Student Feedback & Teaching Evaluation (Module 9)
- **Roles to test:** Student &rarr; Faculty &rarr; HOD/Principal
- **How to test:**
  1. **Student Submission:**
     - As **Student** (`student@college.edu`), click **"Student Feedback"**.
     - Choose instructor (*Prof. Neha Verma*) and course (*CS501 - Operating Systems*).
     - Give star ratings (1 to 5) for Knowledge, Communication, Punctuality, Engagement, Doubts, and Overall.
     - Toggle **"Submit Anonymously"** ON and enter comments.
     - Click **"Submit Course Feedback"**.
  2. **Faculty Evaluation Review:**
     - Switch to **Faculty** &rarr; go to **"Student Feedback"** &rarr; **"My Student Ratings"**.
     - Verify average star rating gauge and comments. Confirm student name is kept anonymous.
  3. **College Performance Summary:**
     - Switch to **HOD** or **Principal** &rarr; **"Department / College Summary"** tab.
     - Verify faculty evaluation leaderboard.
- **Pass criteria:** Feedback submitted anonymously, calculated into faculty averages, and visible in department rankings.

---

### Testcase 7: Payroll Management & Printable Payslips (Module 4)
- **Roles to test:** Admin &rarr; Faculty
- **How to test:**
  1. **Salary Configuration & Monthly Generation:**
     - As **System Admin** (`admin@college.edu`), go to **"Payroll & Payslips"**.
     - Check **"Configure Salary Structures"** (Basic, HRA, DA, Special, PF, Tax, Net).
     - Go to **"Run Monthly Payroll Batch"** &rarr; select Month (*November 2026*) &rarr; click **"Generate & Issue Payslips"**.
  2. **Printable Payslip Modal:**
     - Under **"Generated Payslips"**, click **"View Slip"** on any faculty row.
     - A formatted official salary slip modal opens with college letterhead, earnings, deductions, net salary, and signature blocks.
     - Click **"Print / Save PDF"** to preview or save.
  3. **Faculty Privacy Check:**
     - Switch to **Faculty** (`faculty@college.edu`) &rarr; **"Payroll & Payslips"**.
     - Verify that faculty can **only** see their own payslips and cannot view other teachers' salaries.
- **Pass criteria:** Payroll batch completes without error, PDF/print modal formats accurately, and strict privacy is maintained.

---

### Testcase 8: User Accounts & System Audit Logs
- **Role to test:** System Admin (`admin@college.edu`)
- **How to test:**
  1. Go to **"User Accounts"**:
     - Filter accounts by role (*Student*, *Faculty*, *HOD*, *Principal*, *Admin*).
     - Click **"Deactivate"** / **"Activate"** to toggle an account's active state.
     - Click the Key icon to reset passwords.
  2. Go to **"System Audit Logs"**:
     - Verify real-time audit trail recording every login, attendance marking, substitution copy, leave approval, and payroll run with actor details and payload.
- **Pass criteria:** Account changes take effect immediately, and audit logs update in real time.

---

## 4. Summary Checklist for Evaluation

| ERP Feature | Status | Verified Component |
| :--- | :---: | :--- |
| **Separate Dashboards for 5 Roles** | ✅ Working | Student, Faculty, HOD, Principal, Admin customized views |
| **Student Attendance & Shortage Warning** | ✅ Working | Gauge + `<75%` warning banner + subject breakdown |
| **Attendance Tracker & Duplicate Check** | ✅ Working | Period-wise marking + duplicate block on same period/class |
| **Attendance Copy / Substitution** | ✅ Working | Full audit trail linking original faculty and substitute marker |
| **Leave Approval Workflow** | ✅ Working | Multi-stage: Faculty &rarr; HOD &rarr; Principal approval + auto deduction |
| **Class Adjustment Workflow** | ✅ Working | Availability check, HOD review, timetable link |
| **Student Feedback System** | ✅ Working | 6 rating metrics (1-5 stars) + anonymous toggle + leaderboards |
| **Payroll & Printable Payslips** | ✅ Working | Salary structures + monthly batch generation + PDF print slip |
| **Academic & Timetable Management** | ✅ Working | Departments, courses, weekly schedule collision check |
| **Security, User Accounts & Audit Logs** | ✅ Working | JWT auth + bcrypt + RBAC + immutable system audit trail |
