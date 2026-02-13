const mongoose = require("mongoose");

const apiKeySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    publicId: {
        type: String,
        unique: true,
        required: true
    },
    hash: {
        type: String,
        required: true
    },
    revoked: {
        type: Boolean,
        default: false
    },
    lastUsed: Date
}, { timestamps: true });

module.exports = mongoose.model("APIKey", apiKeySchema);
