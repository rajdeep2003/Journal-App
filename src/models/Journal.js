const mongoose = require("mongoose");

const journalSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        content: {
            type: String,
            required: true
        },

        isPublic: {
            type: Boolean,
            default: true
        },

        journalDate: {
            type: Date,
            required: true
        }
    },
    {
        timestamps: true
    }
);

// One journal per user per day
journalSchema.index(
    { userId: 1, journalDate: 1 },
    { unique: true }
);

module.exports = mongoose.model("Journal", journalSchema);