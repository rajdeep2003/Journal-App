const express = require("express");

const {
    getMessages
} = require("../controllers/messageController");

const { isprotected } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/:friendRequestId", isprotected, getMessages);

module.exports = router;