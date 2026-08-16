const express = require("express");

const {
    sendFriendRequest,
    getFriendRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    getFriends
} = require("../controllers/friendController");

const {isprotected} = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/request", isprotected, sendFriendRequest);

router.get("/requests", isprotected, getFriendRequests);

router.patch("/request/:requestId/accept", isprotected, acceptFriendRequest);

router.delete("/request/:requestId/reject", isprotected, rejectFriendRequest);

router.get("/viewFriends", isprotected, getFriends);

module.exports = router;