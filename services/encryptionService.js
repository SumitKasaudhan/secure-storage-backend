const crypto = require("crypto");

exports.encryptFile = (buffer) => {
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);

    return {
        encrypted,
        key: key.toString("base64"),  // ✅ safe storage
        iv: iv.toString("base64")     // ✅ safe storage
    };
};

exports.decryptFile = (encrypted, key, iv) => {
    const keyBuf = Buffer.from(key, "base64");
    const ivBuf = Buffer.from(iv, "base64");

    const decipher = crypto.createDecipheriv("aes-256-cbc", keyBuf, ivBuf);

    return Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
    ]);
};
