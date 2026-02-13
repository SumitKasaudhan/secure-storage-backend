const mongoose = require("mongoose");

const FileSchema = new mongoose.Schema({
    filename: String,
    data: Buffer,
    owner: mongoose.Schema.Types.ObjectId,

    // encryption
    key: String,   // base64
    iv: String,    // base64

    // ✅ metadata status
    metadataClean: {
        type: Boolean,
        default: false
    },

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("File", FileSchema);
