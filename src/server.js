require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");
const cookieParser = require("cookie-parser");
const registerRoutes = require("./routes/index");

const app = express();

// Database
connectDB();

// Middleware
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
  console.log(`${req.method}   ${req.url}`);
  next();
});

// Routes
app.get("/", (req, res) => {
    res.json({
        message: "Journal API is running smoothly"
    });
});
app.get("/api/health", (req, res) => {
  res.json({
    message: "health ok!",
    time: new Date(),
  });
});
registerRoutes(app);


// 404 handler
app.use((req, res) => {
    res.status(404).json({
        message: "Route not found"
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);

    res.status(500).json({
        message: "Internal server error"
    });
});

// Server
const PORT = process.env.PORT || 5000;



app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

app.use(errorHandler);