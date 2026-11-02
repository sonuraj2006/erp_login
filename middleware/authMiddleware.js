const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication required.",
    });
  }

  const token = header.slice("Bearer ".length).trim();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.sub || !decoded.role) {
      return res.status(401).json({
        message: "Invalid token payload.",
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token.",
    });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: "Authentication required." });
    }

    // "admin" typically has access to everything
    if (roles.includes(req.user.role) || req.user.role === "admin") {
      return next();
    }

    return res.status(403).json({
      message: `Access denied. Requires one of roles: ${roles.join(", ")}`,
    });
  };
}

authMiddleware.authMiddleware = authMiddleware;
authMiddleware.requireRole = requireRole;

module.exports = authMiddleware;
