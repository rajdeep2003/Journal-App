const express = require("express");
const router = express.Router();

const { searchUsers, getAllUsers } = require("../controllers/userController");

router.get("/search", searchUsers);
router.get("/all", getAllUsers);

module.exports = router;