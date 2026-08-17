const FriendRequest = require("../models/FriendRequest");
const Journal = require("../models/Journal");
const { getStartOfISTDay } = require("../utils/dateHelper");

// Returns array of { friendId, friendRequestId } for accepted friendships
const getFriendIds = async (userId) => {
    const accepted = await FriendRequest.find({
        status: "accepted",
        $or: [{ senderId: userId }, { receiverId: userId }]
    }).select("senderId receiverId _id");

    return accepted.map((req) => ({
        friendId:
            req.senderId.toString() === userId.toString()
                ? req.receiverId.toString()
                : req.senderId.toString(),
        friendRequestId: req._id.toString()
    }));
};

// Checks whether userId and friendId are friends; includes the FriendRequest _id when they are
const areFriends = async (userId, friendId) => {
    const req = await FriendRequest.findOne({
        status: "accepted",
        $or: [
            { senderId: userId, receiverId: friendId },
            { senderId: friendId, receiverId: userId }
        ]
    }).select("_id");

    return {
        isFriend: !!req,
        friendRequestId: req ? req._id.toString() : null
    };
};

// Whether userId has written a journal for today (IST)
const hasWrittenToday = async (userId) => {
    const todayIST = getStartOfISTDay();
    const journal = await Journal.findOne({ userId, journalDate: todayIST });
    return !!journal;
};

module.exports = { getFriendIds, areFriends, hasWrittenToday };