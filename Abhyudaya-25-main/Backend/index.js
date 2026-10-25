
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const eventRouter = require("./Routers/Events");
const userRouter = require("./Routers/User");
const VerificationRouter = require("./Routers/Verification");
const adminRouter = require("./Routers/Admin");

const { Connection } = require("./Connection");

const {
  attachUserWithTokenVerification,
} = require("./authentication/UserAuth");

dotenv.config();

const app = express();

// Allowed frontend origins
// Make sure the deployed URL is your actual FRONTEND URL.
const allowedOrigins = [
  "http://localhost:5173",
  process.env.DEPLOYED_URL
].map((origin) => origin.trim().replace(/\/+$/, ""));

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.trim().replace(/\/+$/, "");

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      console.error("CORS blocked origin:", origin);

      return callback(new Error("Origin not allowed by CORS"));
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

// Parse cookies and JSON request bodies
app.use(cookieParser());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend server is running",
  });
});

// Attach user information from JWT cookie
app.use(attachUserWithTokenVerification);

// API routes
app.use("/events", eventRouter);
app.use("/users", userRouter);
app.use("/verify", VerificationRouter);
app.use("/admin", adminRouter);

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err.message);

  if (res.headersSent) {
    return next(err);
  }

  const isCorsError =
    err.message === "Origin not allowed by CORS";

  return res.status(isCorsError ? 403 : 500).json({
    success: false,
    message: isCorsError
      ? "Origin not allowed by CORS"
      : "Internal server error",
  });
});

// Start server
if (require.main === module) {
  const PORT = process.env.PORT || 8000;

  Connection();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log("Allowed frontend origins:", allowedOrigins);
  });
}

module.exports = app;
