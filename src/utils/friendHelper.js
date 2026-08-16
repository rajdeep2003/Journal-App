const FriendRequest = require("../models/FriendRequest");
const Journal = require("../models/Journal");
const { getStartOfISTDay } = require("../utils/dateHelper");

// Returns array of friend userIds (accepted requests, either direction)
const getFriendIds = async (userId) => {
    const accepted = await FriendRequest.find({
        status: "accepted",
        $or: [{ senderId: userId }, { receiverId: userId }]
    }).select("senderId receiverId");

    return accepted.map((req) =>
        req.senderId.toString() === userId.toString()
            ? req.receiverId.toString()
            : req.senderId.toString()
    );
};

// Checks whether userId and friendId are actually friends
const areFriends = async (userId, friendId) => {
    const req = await FriendRequest.findOne({
        status: "accepted",
        $or: [
            { senderId: userId, receiverId: friendId },
            { senderId: friendId, receiverId: userId }
        ]
    });
    return !!req;
};

// Whether userId has written a journal for today (IST)
const hasWrittenToday = async (userId) => {
    const todayIST = getStartOfISTDay();
    const journal = await Journal.findOne({ userId, journalDate: todayIST });
    return !!journal;
};

module.exports = { getFriendIds, areFriends, hasWrittenToday };