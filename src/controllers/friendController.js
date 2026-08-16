const FriendRequest = require("../models/FriendRequest");
const User = require("../models/User");

const sendFriendRequest = async (req, res) => {
    try {
        const senderId = req.user.userId;
        const { receiverId } = req.body;

        if (!receiverId) {
            return res.status(400).json({
                message: "receiverId is required"
            });
        }

        // Receiver exists?
        const receiver = await User.findById(receiverId);

        if (!receiver) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // Can't send request to yourself
        if (senderId.toString() === receiverId.toString()) {
            return res.status(400).json({
                message: "You cannot send a friend request to yourself"
            });
        }

        // Check if already friends
        const alreadyFriends = await FriendRequest.findOne({
            $or: [
                {
                    senderId,
                    receiverId,
                    status: "accepted"
                },
                {
                    senderId: receiverId,
                    receiverId: senderId,
                    status: "accepted"
                }
            ]
        });

        if (alreadyFriends) {
            return res.status(409).json({
                message: "You are already friends"
            });
        }

        // Check if request already exists in either direction
        const existingRequest = await FriendRequest.findOne({
            $or: [
                {
                    senderId,
                    receiverId,
                    status: "pending"
                },
                {
                    senderId: receiverId,
                    receiverId: senderId,
                    status: "pending"
                }
            ]
        });

        if (existingRequest) {
            return res.status(409).json({
                message: "Friend request already exists"
            });
        }

        const friendRequest = await FriendRequest.create({
            senderId,
            receiverId
        });

        return res.status(201).json({
            message: "Friend request sent",
            friendRequest
        });

    } catch (err) {
        return res.status(500).json({
            message: "Failed to send friend request",
            error: err.message
        });
    }
};

const getFriendRequests = async (req, res) => {
    try {
        const userId = req.user.userId;

        const requests = await FriendRequest.find({
            $or: [
                { receiverId: userId },
                { senderId: userId }
            ],
            status: "pending"
        })
        .populate("senderId", "username")
        .populate("receiverId", "username");

        return res.status(200).json({
            count: requests.length,
            requests
        });

    } catch (err) {
        return res.status(500).json({
            message: "Failed to fetch friend requests",
            error: err.message
        });
    }
};

const acceptFriendRequest = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { requestId } = req.params;

        const request = await FriendRequest.findOne({
            _id: requestId,
            receiverId: userId,
            status: "pending"
        });

        if (!request) {
            return res.status(404).json({
                message: "Friend request not found"
            });
        }

        request.status = "accepted";

        await request.save();

        return res.status(200).json({
            message: "Friend request accepted",
            friendRequest: request
        });

    } catch (err) {
        return res.status(500).json({
            message: "Failed to accept friend request",
            error: err.message
        });
    }
};

const rejectFriendRequest = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { requestId } = req.params;

        const request = await FriendRequest.findOne({
            _id: requestId,
            receiverId: userId,
            status: "pending"
        });

        if (!request) {
            return res.status(404).json({
                message: "Friend request not found"
            });
        }

        await FriendRequest.deleteOne({
            _id: requestId
        });

        return res.status(200).json({
            message: "Friend request rejected"
        });

    } catch (err) {
        return res.status(500).json({
            message: "Failed to reject friend request",
            error: err.message
        });
    }
};

const getFriends = async (req, res) => {
    try {
        const userId = req.user.userId;

        const friendships = await FriendRequest.find({
            status: "accepted",
            $or: [
                { senderId: userId },
                { receiverId: userId }
            ]
        })
        .populate("senderId", "username")
        .populate("receiverId", "username");

        const friends = friendships.map(friendship => {

            if (friendship.senderId._id.toString() === userId.toString()) {
                return friendship.receiverId;
            }

            return friendship.senderId;
        });

        return res.status(200).json({
            count: friends.length,
            friends
        });

    } catch (err) {
        return res.status(500).json({
            message: "Failed to fetch friends",
            error: err.message
        });
    }
};

module.exports = {sendFriendRequest, getFriendRequests, acceptFriendRequest, rejectFriendRequest, getFriends};