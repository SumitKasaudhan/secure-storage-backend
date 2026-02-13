const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },

    password: {
        type: String,
        required: function () {
            return !this.googleId;
        },
    },

    googleId: String,

    name: {
        type: String,
        default: ""
    },

    avatar: {
        type: String,
        default: ""
    },

    phone: {
        type: String,
        default: ""
    },

    role: {
        type: String,
        default: "user"
    }

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
