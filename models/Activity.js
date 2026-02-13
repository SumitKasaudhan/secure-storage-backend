const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema({
    userId: String,
    action: String,
    filename: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Activity", activitySchema);
