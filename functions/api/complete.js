// functions/api/complete.js
// Cloudflare Pages Function: POST /api/complete
//
// Expects JSON:
// { discord: "name", answer: "string", turnstile?: "token" }
//
// Optional Env:
// - TURNSTILE_SECRET  (Cloudflare Turnstile secret key)  (verification only if token provided)
// - ESCAPE_SALT       (any random string; improves code uniqueness)
// - RESEND_API_KEY    (to email you)
// - EMAIL_FROM        (sender, e.g. not.a.riddlers.email@gmail.com)
// - EMAIL_TO          (recipient, e.g. 2nlindauer@gmail.com)

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

// Simple reward-code generator
async function makeCode(discord, answer, env) {
  const salt = (env.ESCAPE_SALT || "salt").toString();
  const input = `${discord}::${answer}::${salt}`;

  const enc = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  const bytes = new Uint8Array(digest);

  // readable 8-char code
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

async function verifyTurnstile(secret, token, ip) {
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  return res.json();
}

async function sendResendEmail(env, subject, text) {
  const key = (env.RESEND_API_KEY || "").toString().trim();
  const from = (env.EMAIL_FROM || "").toString().trim();
  const to = (env.EMAIL_TO || "").toString().trim();
  if (!key || !from || !to) return { skipped: true };

  const payload = {
    from,
    to: [to],
    subject,
    text,
  };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j?.message || "Resend failed");
  return { ok: true, id: j?.id };
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));

    const discord = (body.discord || "").toString().trim();
    const answer = (body.answer || "").toString().trim();
    const token = (body.turnstile || "").toString().trim();

    if (!discord || discord.length > 64) return json({ error: "Invalid username" }, 400);
    if (!answer || answer.length > 128) return json({ error: "Invalid code" }, 400);

    // Turnstile is optional: verify only if token is provided and secret exists.
    const tsSecret = (env.TURNSTILE_SECRET || "").toString().trim();
    if (token && tsSecret) {
      const ip = request.headers.get("CF-Connecting-IP") || "";
      const verify = await verifyTurnstile(tsSecret, token, ip);
      if (!verify?.success) return json({ error: "Turnstile failed" }, 403);
    }

    const code = await makeCode(discord, answer, env);

    // Email you immediately (best effort)
    try {
      await sendResendEmail(
        env,
        "there is no riddle — escape code",
        `user: ${discord}
submitted: ${answer}
`
      );
    } catch (e) {
      // still return ok; email can fail silently during testing
      return json({ ok: true, code, email: "failed" }, 200);
    }

    return json({ ok: true, code, email: "sent" }, 200);
  } catch (e) {
    return json({ error: "Server error" }, 500);
  }
}
