const mongoose = require("mongoose");
const Message = require("../models/Message");
const FriendRequest = require("../models/FriendRequest");

const getMessages = async (req, res, next) => {
    try {
        const { friendRequestId } = req.params;
       const userId = req.user.userId;

        // Validate MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(friendRequestId)) {
            return res.status(400).json({
                message: "Invalid friendRequestId"
            });
        }

        // Find the friend request
        const friendRequest = await FriendRequest.findById(friendRequestId);

        if (!friendRequest) {
            return res.status(404).json({
                message: "Friend request not found"
            });
        }

        // Chat must be between accepted friends
        if (friendRequest.status !== "accepted") {
            return res.status(403).json({
                message: "Friend request is not accepted"
            });
        }

        // Make sure the logged-in user belongs to this friendship
        if (
            friendRequest.senderId.toString() !== userId.toString() &&
            friendRequest.receiverId.toString() !== userId.toString()
        ) {
            return res.status(403).json({
                message: "You are not authorized to view this chat"
            });
        }

        // Get messages
        const messages = await Message.find({
            friendRequestId
        })
            .sort({ createdAt: 1 })
            .populate("senderId", "username");

        return res.status(200).json({
            message: "Messages fetched successfully",
            count: messages.length,
            messages
        });

    } catch (err) {
        next(err);
    }
};

module.exports = {
    getMessages
};