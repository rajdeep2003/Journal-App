const authRoutes = require("./authRoutes")
const journalRoutes = require("./journalRoutes");
const friendRoutes = require("./friendRoutes"); 

const registerRoutes = (app)=>{
    app.use("/api/auth", authRoutes)
    app.use("/api/journals", journalRoutes);
    app.use("/api/friends", friendRoutes);
}


module.exports = registerRoutes
