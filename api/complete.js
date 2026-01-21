// api/complete.js
const crypto = require("crypto");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const name = (req.body?.discord || "").trim();
  if (!name || name.length > 64) {
    return res.status(400).json({ error: "Invalid username" });
  }

  const secret = process.env.COMPLETION_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "Server misconfigured" });
  }

  const timestamp = new Date().toISOString();
  const payload = `${name}|${timestamp}`;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const token = Buffer.from(`${payload}|${sig}`).toString("base64url");

  return res.status(200).json({ token });
};
