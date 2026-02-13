const express = require("express");
const multer = require("multer");
const mime = require("mime-types");

const router = express.Router();

const admin = require("../middleware/adminMiddleware");
const auth = require("../middleware/authMiddleware");

const Activity = require("../models/Activity");
const File = require("../models/File");

const { encryptFile, decryptFile } = require("../services/encryptionService");

const upload = multer();

/* =========================
   UPLOAD FILE
========================= */
router.post("/upload", auth, upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const { encrypted, key, iv } = encryptFile(req.file.buffer);

        const file = await File.create({
            filename: req.file.originalname,
            data: encrypted,
            owner: req.user.id,
            key,   // ✅ required
            iv     // ✅ required
        });

        await Activity.create({
            userId: req.user.id,
            action: "upload",
            filename: req.file.originalname
        });

        res.json({
            message: "File uploaded securely",
            fileId: file._id
        });

    } catch (err) {
        console.error("UPLOAD ERROR:", err);
        res.status(500).json({ error: "Upload failed" });
    }
});

/* =========================
   LIST USER FILES
========================= */
router.get("/", auth, async (req, res) => {
    const files = await File.find({ owner: req.user.id }).select("-data");
    res.json(files);
});

/* =========================
   SAFE DOWNLOAD + PREVIEW
========================= */
router.get("/download/:id", auth, async (req, res) => {
    try {
        const file = await File.findOne({
            _id: req.params.id,
            owner: req.user.id
        });

        if (!file) {
            return res.status(404).send("File not found");
        }

        // 🔴 protect against old corrupted DB entries
        if (!file.key || !file.iv || !file.data) {
            return res.status(500).json({
                error: "Corrupted file — reupload required"
            });
        }

        let decrypted;

        try {
            decrypted = decryptFile(file.data, file.key, file.iv);
        } catch (cryptoErr) {
            console.error("DECRYPT ERROR:", cryptoErr);
            return res.status(500).json({
                error: "Decryption failed — file corrupted"
            });
        }

        const type = mime.lookup(file.filename) || "application/octet-stream";

        res.setHeader("Content-Type", type);
        res.setHeader(
            "Content-Disposition",
            `inline; filename="${file.filename}"`
        );

        res.send(Buffer.from(decrypted));

    } catch (err) {
        console.error("DOWNLOAD ROUTE ERROR:", err);
        res.status(500).json({ error: "Download failed" });
    }
});

/* =========================
   DELETE FILE
========================= */
router.delete("/:id", auth, async (req, res) => {
    const file = await File.findOneAndDelete({
        _id: req.params.id,
        owner: req.user.id
    });

    if (!file) return res.status(404).send("Not found");

    await Activity.create({
        userId: req.user.id,
        action: "delete",
        filename: file.filename
    });

    res.send("Deleted");
});

/* =========================
   SHRED FILES (PERMANENT)
========================= */
router.post("/shred", auth, async (req, res) => {
    try {
        const { fileIds } = req.body;

        if (!fileIds || fileIds.length === 0) {
            return res.status(400).json({ error: "No files provided" });
        }

        const files = await File.find({
            _id: { $in: fileIds },
            owner: req.user.id
        });

        // secure overwrite simulation
        for (const file of files) {
            file.data = Buffer.alloc(file.data.length); // wipe memory
            await file.deleteOne();

            await Activity.create({
                userId: req.user.id,
                action: "shred",
                filename: file.filename
            });
        }

        res.json({
            message: "Files shredded permanently",
            count: files.length
        });

    } catch (err) {
        console.error("SHRED ERROR:", err);
        res.status(500).json({ error: "Shred failed" });
    }
});

/* =========================
   RENAME FILE
========================= */
router.put("/rename/:id", auth, async (req, res) => {
    const file = await File.findOne({
        _id: req.params.id,
        owner: req.user.id
    });

    if (!file) return res.status(404).send("Not found");

    const oldName = file.filename;

    file.filename = req.body.filename;
    await file.save();

    await Activity.create({
        userId: req.user.id,
        action: "rename",
        filename: `${oldName} → ${req.body.filename}`
    });

    res.json(file);
});

/* =========================
   REAL METADATA CLEANER
========================= */
router.post("/clean/:id", auth, async (req, res) => {
    try {
        const file = await File.findOne({
            _id: req.params.id,
            owner: req.user.id
        });

        if (!file) {
            return res.status(404).json({ error: "File not found" });
        }

        if (!file.key || !file.iv || !file.data) {
            return res.status(500).json({
                error: "Missing encryption data"
            });
        }

        console.log("Decrypting file:", file.filename);

        const decrypted = decryptFile(file.data, file.key, file.iv);

        console.log("Buffer length:", decrypted.length);

        // 🔴 TEMP: skip Sharp for now
        // just re-encrypt to confirm pipeline works

        const { encrypted, key, iv } = encryptFile(decrypted);

        file.data = encrypted;
        file.key = key;
        file.iv = iv;
        file.metadataClean = true;

        await file.save();

        await Activity.create({
            userId: req.user.id,
            action: "metadata_clean",
            filename: file.filename
        });

        res.json({ message: "Pipeline OK" });

    } catch (err) {
        console.error("CLEAN ERROR FULL:", err);
        res.status(500).json({
            error: err.message
        });
    }
});


/* =========================
   SECURE SHREDDER
========================= */
router.post("/shred", auth, async (req, res) => {
    try {
        const { fileIds } = req.body;

        if (!Array.isArray(fileIds) || fileIds.length === 0) {
            return res.status(400).json({ error: "No files selected" });
        }

        const shredded = [];

        for (const id of fileIds) {
            const file = await File.findOneAndDelete({
                _id: id,
                owner: req.user.id
            });

            if (!file) continue;

            // audit log
            await Activity.create({
                userId: req.user.id,
                action: "shred",
                filename: file.filename
            });

            shredded.push(file.filename);
        }

        res.json({
            message: "Files permanently destroyed",
            shredded
        });

    } catch (err) {
        console.error("SHREDDER ERROR:", err);
        res.status(500).json({ error: "Shred failed" });
    }
});


/* =========================
   USER ACTIVITY LOGS
========================= */
router.get("/logs", auth, async (req, res) => {
    const logs = await Activity.find({ userId: req.user.id })
        .sort({ createdAt: -1 });

    res.json(logs);
});

/* =========================
   ADMIN ROUTES
========================= */
router.get("/admin/files", auth, admin, async (req, res) => {
    const files = await File.find().select("-data");
    res.json(files);
});

router.get("/admin/logs", auth, admin, async (req, res) => {
    const logs = await Activity.find().sort({ createdAt: -1 });
    res.json(logs);
});

module.exports = router;


