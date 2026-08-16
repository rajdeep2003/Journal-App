const { verifyToken } = require("../utils/jwt");

const socketAuth = (socket, next) => {
    try {

        const token =
            socket.handshake.auth?.token ||
            socket.handshake.headers?.authorization?.replace("Bearer ", "");

        if (!token) {
            return next(new Error("Authentication token required"));
        }

        const verifiedToken = verifyToken(token);

        socket.userId = verifiedToken.userId;

        next();

    } catch (err) {

        next(new Error("Invalid authentication token"));

    }
};

module.exports = socketAuth;