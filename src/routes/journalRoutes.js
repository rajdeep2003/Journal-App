const express = require("express");

const router = express.Router();

const { isprotected } = require("../middleware/authMiddleware");
const {
    createJournal,
    editTodayJournal,
    getMyJournals,
    getTodayJournal,
    getFriendJournals,
    getFriendTodayJournal,
    getFriendsTodayJournals,
    getFriendsWrittenToday
} = require("../controllers/journalController");

// Create a journal
router.post(
    "/create",
    isprotected,
    createJournal
);

// Edit today's journal
router.patch(
    "/today/edit",
    isprotected,
    editTodayJournal
);
// View own journals
router.get("/mine", isprotected, getMyJournals);
router.get("/today", isprotected, getTodayJournal);

// View friends' journals — order matters: specific paths before /:friendId
router.get("/friends/today", isprotected, getFriendsTodayJournals);
router.get("/friends/written-today", isprotected, getFriendsWrittenToday);
router.get("/friend/:friendId", isprotected, getFriendJournals);
router.get("/friend/:friendId/today", isprotected, getFriendTodayJournal);

module.exports = router;