const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { OAuth2Client } = require("google-auth-library");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/* ================= REGISTER ================= */
exports.register = async (req, res) => {
    try {
        let { name, email, password } = req.body;

        if (!email || !password)
            return res.status(400).json({
                message: "Email and password required"
            });

        // ✅ minimum 5-character password rule
        if (password.trim().length < 5)
            return res.status(400).json({
                message: "Password must be at least 5 characters long"
            });

        email = email.toLowerCase().trim();

        const existing = await User.findOne({ email });

        if (existing)
            return res.status(409).json({
                message: "User already exists"
            });

        const hash = await bcrypt.hash(password, 10);

        const user = await User.create({
            name: name || "",
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
                email: user.email,
                name: user.name
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Register failed"
        });
    }
};

/* ================= LOGIN ================= */
exports.login = async (req, res) => {
    try {
        let { email, password } = req.body;

        if (!email || !password)
            return res.status(400).json({
                message: "Email and password required"
            });

        email = email.toLowerCase().trim();

        const user = await User.findOne({ email });

        if (!user)
            return res.status(404).json({
                message: "User not found"
            });

        if (!user.password)
            return res.status(400).json({
                message: "Use Google login"
            });

        const match = await bcrypt.compare(password, user.password);

        if (!match)
            return res.status(401).json({
                message: "Wrong password"
            });

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({ token });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Login failed"
        });
    }
};

/* ================= GOOGLE AUTH ================= */
exports.googleAuth = async (req, res) => {
    try {
        const { token } = req.body;

        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();

        if (!payload.email_verified)
            return res.status(400).json({
                message: "Google verification failed"
            });

        const email = payload.email.toLowerCase().trim();

        let user = await User.findOne({ email });

        if (!user) {
            user = await User.create({
                email,
                googleId: payload.sub,
                name: payload.name || "",
                avatar: payload.picture || "",
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
        res.status(500).json({
            message: "Google auth failed"
        });
    }
};
