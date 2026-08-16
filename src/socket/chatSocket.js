const Message = require("../models/Message");
const { areFriends } = require("../utils/friendHelper");
const FriendRequest = require("../models/FriendRequest");

const registerChatSocket = (io, socket) => {

   
    // JOIN CHAT ROOM
   

    socket.on("join_chat", async ({ friendRequestId }) => {

        try {

            const friendRequest = await FriendRequest.findById(friendRequestId);
            if (!friendRequest) {
                throw new Error("Friend request not found");
            }
            if (friendRequest.status !== "accepted") {
                throw new Error("Friend request not accepted");
            }
            const userId = socket.userId?.toString();
            if (!userId) {
                throw new Error("Unauthenticated user");
            }
            if (
                friendRequest.senderId.toString() !== userId &&
                friendRequest.receiverId.toString() !== userId
            ) {
                throw new Error("User not authorized for this chat");
            }
            socket.join(`chat:${friendRequestId}`);

            console.log(
                `${socket.userId} joined chat:${friendRequestId}`
            );

            socket.emit("chat_joined", {
                friendRequestId
            });

        } catch (err) {

            socket.emit("chat_error", {
                message: err.message
            });

        }

    });


    // =========================
    // SEND MESSAGE
    // =========================

    socket.on("send_message", async ({ friendRequestId, message }) => {

        try {

            if (!message || !message.trim()) {
                return socket.emit("chat_error", {
                    message: "Message cannot be empty"
                });
            }

            // TODO:
            // Verify friendship here

            const newMessage = await Message.create({
                friendRequestId,
                senderId: socket.userId,
                message: message.trim()
            });

            const messageData = {
                _id: newMessage._id,
                friendRequestId: newMessage.friendRequestId,
                senderId: newMessage.senderId,
                message: newMessage.message,
                createdAt: newMessage.createdAt
            };

            // Send to everyone in the room
            io.to(`chat:${friendRequestId}`).emit(
                "receive_message",
                messageData
            );

        } catch (err) {

            console.error(err);

            socket.emit("chat_error", {
                message: "Failed to send message"
            });

        }

    });


    // =========================
    // DISCONNECT
    // =========================

    socket.on("disconnect", () => {

        console.log(
            `User disconnected: ${socket.userId}`
        );

    });

};

module.exports = registerChatSocket;