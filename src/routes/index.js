const authRoutes = require("./authRoutes")
const journalRoutes = require("./journalRoutes");
const friendRoutes = require("./friendRoutes"); 
const userRoutes = require("./userRoutes");
const messageRoutes = require("./messageRoutes");

const registerRoutes = (app)=>{
    app.use("/api/auth", authRoutes)
    app.use("/api/journals", journalRoutes);
    app.use("/api/friends", friendRoutes);
    app.use("/api/users", userRoutes);
    app.use("/api/messages", messageRoutes);
}


module.exports = registerRoutes
