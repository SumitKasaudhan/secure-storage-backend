require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const fileRoutes = require("./routes/fileRoutes");
const apiKeyRoutes = require("./routes/apiKeyRoutes");

const app = express();

connectDB();

/* GLOBAL MIDDLEWARE */
app.use(cors({
    origin: [
        "http://localhost:5173",
        "http://localhost:4173"
    ],
    credentials: true
}));

// ✅ Google popup compatibility (optional cosmetic fix)
app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    next();
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

/* disable caching */
app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    next();
});

/* ROUTES */
app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/keys", apiKeyRoutes);

app.get("/", (req, res) => {
    res.send("API running...");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
