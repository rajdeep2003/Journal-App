const Journal = require("../models/Journal");
const { getFriendIds, areFriends, hasWrittenToday } = require("../utils/friendHelper");
const { getStartOfISTDay } = require("../utils/dateHelper");




const createJournal = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { content, isPublic, journalDate } = req.body;

        if (!content) {
            return res.status(400).json({
                message: "Journal content is required"
            });
        }

        // Convert supplied date/current date to IST start-of-day
        const baseDate = journalDate
            ? new Date(journalDate)
            : new Date();

        if (isNaN(baseDate.getTime())) {
            return res.status(400).json({
                message: "Invalid journal date"
            });
        }

        const normalizedJournalDate = getStartOfISTDay(baseDate);

        // Check manually:
        // Same userId + same normalized journalDate
        const existingJournal = await Journal.findOne({
            userId: userId,
            journalDate: normalizedJournalDate
        });

        if (existingJournal) {
            return res.status(409).json({
                message: "You already have a journal for this day"
            });
        }

        // No journal exists for this user on this day
        const journal = await Journal.create({
            userId,
            content,
            isPublic: isPublic ?? true,
            journalDate: normalizedJournalDate
        });

        return res.status(201).json({
            message: "Journal created successfully",
            journal
        });

    } catch (err) {
        return res.status(500).json({
            message: "Failed to create journal",
            error: err.message
        });
    }
};

const editTodayJournal = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { content, isPublic } = req.body;

        if (content !== undefined && !content.trim()) {
    return res.status(400).json({
        message: "Journal content cannot be empty"
    });
}

        const todayIST = getStartOfISTDay();

        const journal = await Journal.findOneAndUpdate(
            {
                userId: userId,
                journalDate: todayIST // exact match now, since it's normalized at creation
            },
            {
                ...(content !== undefined && { content }),
                ...(isPublic !== undefined && { isPublic })
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!journal) {
            return res.status(404).json({
                message: "You don't have a journal for today"
            });
        }

        return res.status(200).json({
            message: "Today's journal updated successfully",
            journal
        });
    } catch (err) {
        return res.status(500).json({
            message: "Failed to update journal",
            error: err.message
        });
    }
};


// GET /journals/mine — all of the logged-in user's own journals
const getMyJournals = async (req, res) => {
    try {
        const userId = req.user.userId;

        const journals = await Journal.find({ userId }).sort({ journalDate: -1 });

        return res.status(200).json({
            message: "Journals fetched successfully",
            journals
        });
    } catch (err) {
        return res.status(500).json({
            message: "Failed to fetch journals",
            error: err.message
        });
    }
};

// GET /journals/today — logged-in user's own today's journal
const getTodayJournal = async (req, res) => {
    try {
        const userId = req.user.userId;
        const todayIST = getStartOfISTDay();

        const journal = await Journal.findOne({ userId, journalDate: todayIST });

        if (!journal) {
            return res.status(404).json({
                message: "You don't have a journal for today"
            });
        }

        return res.status(200).json({
            message: "Today's journal fetched successfully",
            journal
        });
    } catch (err) {
        return res.status(500).json({
            message: "Failed to fetch today's journal",
            error: err.message
        });
    }
};

// GET /journals/friend/:friendId — a specific friend's public journals (all time)
const getFriendJournals = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { friendId } = req.params;

        const isFriend = await areFriends(userId, friendId);
        if (!isFriend) {
            return res.status(403).json({
                message: "You are not friends with this user"
            });
        }

        const journals = await Journal.find({
            userId: friendId,
            isPublic: true
        }).sort({ journalDate: -1 });

        return res.status(200).json({
            message: "Friend's journals fetched successfully",
            journals
        });
    } catch (err) {
        return res.status(500).json({
            message: "Failed to fetch friend's journals",
            error: err.message
        });
    }
};

// GET /journals/friend/:friendId/today — one friend's today journal
// Gated: you must have written your own journal today to unlock this
const getFriendTodayJournal = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { friendId } = req.params;

        const isFriend = await areFriends(userId, friendId);
        if (!isFriend) {
            return res.status(403).json({
                message: "You are not friends with this user"
            });
        }

        const wroteToday = await hasWrittenToday(userId);
        if (!wroteToday) {
            return res.status(403).json({
                message: "Write today's journal to unlock your friends' entries"
            });
        }

        const todayIST = getStartOfISTDay();

        const journal = await Journal.findOne({
            userId: friendId,
            journalDate: todayIST,
            isPublic: true
        });

        if (!journal) {
            return res.status(404).json({
                message: "This friend hasn't posted a public journal today"
            });
        }

        return res.status(200).json({
            message: "Friend's today journal fetched successfully",
            journal
        });
    } catch (err) {
        return res.status(500).json({
            message: "Failed to fetch friend's today journal",
            error: err.message
        });
    }
};

// GET /journals/friends/today — today's public journals from ALL friends
// Gated: you must have written your own journal today
const getFriendsTodayJournals = async (req, res) => {
    try {
        const userId = req.user.userId;

        const wroteToday = await hasWrittenToday(userId);
        if (!wroteToday) {
            return res.status(403).json({
                message: "Write today's journal to unlock your friends' entries"
            });
        }

        const friendIds = await getFriendIds(userId);
        const todayIST = getStartOfISTDay();

        const journals = await Journal.find({
            userId: { $in: friendIds },
            journalDate: todayIST,
            isPublic: true
        }).populate("userId", "username");

        return res.status(200).json({
            message: "Friends' today journals fetched successfully",
            journals
        });
    } catch (err) {
        return res.status(500).json({
            message: "Failed to fetch friends' today journals",
            error: err.message
        });
    }
};

// GET /journals/friends/written-today — which friends wrote today (no content)
// Gated for the same reciprocity reason
const getFriendsWrittenToday = async (req, res) => {
    try {
        const userId = req.user.userId;

        const wroteToday = await hasWrittenToday(userId);
        if (!wroteToday) {
            return res.status(403).json({
                message: "Write today's journal to unlock this list"
            });
        }

        const friendIds = await getFriendIds(userId);
        const todayIST = getStartOfISTDay();

        const journals = await Journal.find({
            userId: { $in: friendIds },
            journalDate: todayIST
        }).populate("userId", "username");

        const friendsWrittenToday = journals.map((j) => ({
            userId: j.userId._id,
            username: j.userId.username,
            isPublic: j.isPublic
        }));

        return res.status(200).json({
            message: "Friends who wrote today fetched successfully",
            friendsWrittenToday
        });
    } catch (err) {
        return res.status(500).json({
            message: "Failed to fetch friends' written status",
            error: err.message
        });
    }
};


module.exports = {
    createJournal,
    // getStartOfISTDay,
    editTodayJournal,
    getMyJournals,
    getTodayJournal,
    getFriendJournals,
    getFriendTodayJournal,
    getFriendsTodayJournals,
    getFriendsWrittenToday };