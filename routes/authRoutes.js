const express = require("express");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const {
    register,
    login
} = require("../controllers/authController");

const auth = require("../middleware/authMiddleware");
const User = require("../models/User");

const router = express.Router();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/* ================= EMAIL AUTH ================= */

router.post("/register", register);
router.post("/login", login);

/* ================= GOOGLE AUTH (MODERN) ================= */

router.post("/google", async (req, res) => {
    try {
        const { credential } = req.body;

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();

        const email = payload.email;
        const name = payload.name;
        const googleId = payload.sub;

        let user = await User.findOne({
            $or: [{ googleId }, { email }]
        });

        if (!user) {
            user = await User.create({
                email,
                googleId,
                name
            });
        }

        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({ token, user });

    } catch (err) {
        console.error("Google auth failed:", err);
        res.status(401).json({ error: "Google login failed" });
    }
});

/* ================= PROFILE ================= */

router.get("/profile", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select("-password");

        res.json(user);
    } catch (err) {
        console.error("PROFILE FETCH ERROR:", err);
        res.status(500).json({ error: "Failed to load profile" });
    }
});

router.put("/profile", auth, async (req, res) => {
    try {
        const updatedUser = await User.findOneAndUpdate(
            { _id: req.user.id },
            { $set: req.body },
            {
                returnDocument: "after",
                runValidators: true
            }
        ).lean();

        res.json(updatedUser);

    } catch (err) {
        console.error("PROFILE UPDATE ERROR:", err);
        res.status(500).json({ error: "Failed to update profile" });
    }
});

module.exports = router;
