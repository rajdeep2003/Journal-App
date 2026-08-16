const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        friendRequestId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "FriendRequest",
            required: true
        },

        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        message: {
            type: String,
            required: true,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

messageSchema.index({
    friendRequestId: 1,
    createdAt: 1
});

module.exports = mongoose.model("Message", messageSchema);