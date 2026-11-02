require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Ensure uploads folder exists
const uploadsPath = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use("/uploads", express.static(uploadsPath));

// API Routes for Full College ERP System
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/academics", require("./routes/academics"));
app.use("/api/faculty", require("./routes/faculty"));
app.use("/api/students", require("./routes/students"));
app.use("/api/attendance", require("./routes/attendance"));
app.use("/api/leave", require("./routes/leave"));
app.use("/api/adjustments", require("./routes/classAdjustment"));
app.use("/api/feedback", require("./routes/feedback"));
app.use("/api/payroll", require("./routes/payroll"));
app.use("/api/audit-logs", require("./routes/auditLogs"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/reports", require("./routes/reports"));

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    message: "College ERP System API is running smoothly",
    timestamp: new Date().toISOString(),
  });
});

// Serve frontend: Prefer Vite production build in client/dist if present, else fallback to public
const clientDistPath = path.join(__dirname, "client", "dist");
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  // Express 5 SPA catch-all
  app.use((req, res, next) => {
    if (req.method !== "GET") return next();
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) return next();
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
} else {
  app.use(express.static(path.join(__dirname, "public")));
  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  });
}

async function startServer() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be set to at least 32 characters.");
  }

  await connectDB();

  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` College ERP System Server running at http://localhost:${PORT}`);
    console.log(` API Endpoint: http://localhost:${PORT}/api/health`);
    console.log(`=======================================================`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  });
}

module.exports = { app, startServer };
