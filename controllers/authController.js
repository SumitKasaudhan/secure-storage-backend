const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { OAuth2Client } = require("google-auth-library");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/* ================= REGISTER ================= */
exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!email || !password)
            return res.status(400).json({ message: "Email & password required" });

        const exists = await User.findOne({ email });
        if (exists)
            return res.status(400).json({ message: "User exists" });

        const hash = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email,
            password: hash,
            role: "user"
        });

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Register failed" });
    }
};

/* ================= LOGIN ================= */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password)
            return res.status(400).json({ message: "Email & password required" });

        const user = await User.findOne({ email });

        // Google account trying to login with password
        if (!user || !user.password)
            return res.status(400).json({ message: "Use Google login" });

        const match = await bcrypt.compare(password, user.password);
        if (!match)
            return res.status(400).json({ message: "Invalid login" });

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({ token });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Login failed" });
    }
};

/* ================= GOOGLE AUTH ================= */
exports.googleAuth = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token)
            return res.status(400).json({ message: "Google token missing" });

        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const { email_verified, email } = ticket.getPayload();
        if (!email_verified)
            return res.status(400).json({ message: "Google verification failed" });

        let user = await User.findOne({ email });

        if (!user) {
            user = await User.create({
                email,
                role: "user"
            });
        }

        const jwtToken = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({ token: jwtToken });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Google auth failed" });
    }
};
