const User = require("../models/User");

const searchUsers = async (req, res) => {
    try {
        const { username } = req.query;

        if (!username || !username.trim()) {
            return res.status(400).json({
                message: "Username is required"
            });
        }

        const searchTerm = username.trim();

        const users = await User.find({
            username: {
                $regex: searchTerm,
                $options: "i"
            }
        })
        .select("_id username")
        .limit(20);

        return res.status(200).json({
            count: users.length,
            users: users.map(user => ({
                userId: user._id,
                username: user.username
            }))
        });

    } catch (err) {
        return res.status(500).json({
            message: "Failed to search users",
            error: err.message
        });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({})
            .select("_id username")
            .sort({ username: 1 });

        return res.status(200).json({
            count: users.length,
            users
        });

    } catch (err) {
        return res.status(500).json({
            message: "Failed to fetch users",
            error: err.message
        });
    }
};

module.exports = {
    searchUsers,
    getAllUsers 
};