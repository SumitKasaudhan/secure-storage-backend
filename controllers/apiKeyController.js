const crypto = require("crypto");
const APIKey = require("../models/APIKey");

function sha256(input) {
    return crypto.createHash("sha256").update(input).digest("hex");
}

exports.createKey = async (req, res) => {
    try {
        const publicId = crypto.randomBytes(6).toString("hex");
        const secret = crypto.randomBytes(32).toString("hex");
        const fullKey = `sk_live_${publicId}.${secret}`;

        const key = await APIKey.create({
            userId: req.user.id, // from auth middleware
            publicId,
            hash: sha256(secret)
        });

        res.json({ fullKey });

    } catch (err) {
        console.error("CREATE KEY ERROR:", err);
        res.status(500).json({ error: "Failed to generate key" });
    }
};

exports.listKeys = async (req, res) => {
    try {
        const keys = await APIKey.find({ userId: req.user.id })
            .select("-hash");

        res.json(keys);

    } catch (err) {
        console.error("LIST KEY ERROR:", err);
        res.status(500).json({ error: "Failed to fetch keys" });
    }
};

exports.revokeKey = async (req, res) => {
    try {
        await APIKey.updateOne(
            { _id: req.params.id, userId: req.user.id },
            { revoked: true }
        );

        res.json({ success: true });

    } catch (err) {
        console.error("REVOKE KEY ERROR:", err);
        res.status(500).json({ error: "Failed to revoke key" });
    }
};
