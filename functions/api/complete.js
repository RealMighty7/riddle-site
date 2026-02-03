// functions/api/complete.js
// Cloudflare Pages Function: POST /api/complete
//
// Expects JSON:
// { discord: "name", answer: "string", turnstile?: "token" }
//
// Env required:
// - TURNSTILE_SECRET  (Cloudflare Turnstile secret key)
// Optional:
// - ESCAPE_SALT (any random string; improves code uniqueness)

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

// Simple, stable code generator (not “security”, just a reward code)
async function makeCode(discord, answer, env) {
  const salt = (env.ESCAPE_SALT || "salt").toString();
  const input = `${discord}::${answer}::${salt}`;

  const enc = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  const bytes = new Uint8Array(digest);

  // base32-ish alphabet without confusing chars
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  // Format: AAAA-BBBB-CCCC
  return `${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}`;
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));

    const discord = (body.discord || "").toString().trim();
    const answer = (body.answer || "").toString().trim();
    const token = (body.turnstile || "").toString().trim();

    if (!discord || discord.length > 64) return json({ error: "Invalid username" }, 400);
    if (!answer || answer.length > 256) return json({ error: "Invalid answer" }, 400);
    // Turnstile is optional for this project flow (escaped.html auto-sends).
    // If token + secret are present, we verify; otherwise we proceed.
    if (token && env.TURNSTILE_SECRET) {
      const tsSecret = env.TURNSTILE_SECRET;
      const ip = request.headers.get("CF-Connecting-IP") || "";

      const form = new FormData();
      form.append("secret", tsSecret);
      form.append("response", token);
      if (ip) form.append("remoteip", ip);

      const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: form,
      });

      const verify = await verifyRes.json().catch(() => null);
      if (!verify || verify.success !== true) return json({ error: "Verification failed" }, 403);
    }

    // Generate reward code
    const code = await makeCode(discord, answer, env);

    // Optional email notify (MailChannels). Configure in Cloudflare Pages env:
    // MAIL_TO (your email), MAIL_FROM (verified sender-like address), MAIL_FROM_NAME (optional)
    const MAIL_TO = (env.MAIL_TO || "").toString().trim();
    const MAIL_FROM = (env.MAIL_FROM || "").toString().trim();
    const MAIL_FROM_NAME = (env.MAIL_FROM_NAME || "there is no riddle").toString().trim();
    if (MAIL_TO && MAIL_FROM) {
      try {
        await fetch("https://api.mailchannels.net/tx/v1/send", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: MAIL_TO }] }],
            from: { email: MAIL_FROM, name: MAIL_FROM_NAME },
            subject: "TNR completion",
            content: [
              {
                type: "text/plain",
                value: `discord: ${discord}\nanswer: ${answer}\ncode: ${code}\n`,
              },
            ],
          }),
        });
      } catch {}
    }

    return json({ ok: true, code }, 200);
  } catch (err) {
    return json({ error: "Server error" }, 500);
  }
}
