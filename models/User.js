const mongoose = require("mongoose");
const validator = require("validator");

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        validate: {
            validator: (value) => validator.isEmail(value),
            message: "Invalid email format"
        }
    },

    password: {
        type: String,
        required: function () {
            return !this.googleId;
        },
        minlength: 8
    },

    googleId: {
        type: String,
        default: null
    },

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
