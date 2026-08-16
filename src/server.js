require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");
const cookieParser = require("cookie-parser");
const registerRoutes = require("./routes/index");
const socketAuth = require("./middleware/socketAuth");
const registerChatSocket = require("./socket/chatSocket");

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

app.use(errorHandler);

// HTTP SERVER
const server = http.createServer(app);


// SOCKET.IO
const io = new Server(server, {
    cors: {
        origin: true,
        credentials: true
    }
});

io.use(socketAuth);

// Socket connection
io.on("connection", (socket) => {

    console.log(
        `Socket connected: ${socket.id}, User: ${socket.userId}`
    );

    registerChatSocket(io, socket);

})



// START SERVER
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

