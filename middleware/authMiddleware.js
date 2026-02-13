const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
    const header = req.headers.authorization;

    if (!header) {
        return res.status(401).send("No token provided");
    }

    // Expect format: "Bearer TOKEN"
    const token = header.startsWith("Bearer ")
        ? header.split(" ")[1]
        : header;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        console.error("JWT ERROR:", err.message);
        res.status(401).send("Invalid token");
    }
};
