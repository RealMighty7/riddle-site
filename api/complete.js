import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { discord } = req.body || {};
  const name = (discord || "").trim();

  if (!name || name.length > 64) {
    res.status(400).json({ error: "Invalid discord username" });
    return;
  }

  // Signed token (cannot be forged without your SECRET)
  const completedAt = new Date().toISOString();
  const secret = process.env.COMPLETION_SECRET;
  if (!secret) {
    res.status(500).json({ error: "Server not configured" });
    return;
  }

  const payload = `${name}|${completedAt}`;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const token = Buffer.from(`${payload}|${sig}`).toString("base64url");

  // OPTIONAL: email you a notification using Resend
  const resendKey = process.env.RESEND_API_KEY;
  const notifyTo = process.env.NOTIFY_EMAIL;

  if (resendKey && notifyTo) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "Not Riddlers <onboarding@resend.dev>",
          to: notifyTo,
          subject: "ARG completion",
          text: `username: ${name}\ncompletedAt: ${completedAt}\ntoken: ${token}`
        })
      });
    } catch {
      // Don’t block completion if email fails
    }
  }

  res.status(200).json({ token });
}

