const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const controller = require("../controllers/apiKeyController");

// GET all keys
router.get("/", auth, controller.listKeys);

// CREATE key
router.post("/", auth, controller.createKey);

// REVOKE key
router.delete("/:id", auth, controller.revokeKey);

module.exports = router;
