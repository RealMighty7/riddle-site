// functions/api/complete.js
// Cloudflare Pages Function: POST /api/complete
//
// Expects JSON:
// { discord: "name", answer: "string", turnstile: "token" }
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
    if (!token) return json({ error: "Missing Turnstile token" }, 400);

    const tsSecret = env.TURNSTILE_SECRET;
    if (!tsSecret) return json({ error: "Server misconfigured (missing TURNSTILE_SECRET)" }, 500);

    // Turnstile verify
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
    if (!verify || verify.success !== true) {
      // You can log verify["error-codes"] in Cloudflare logs if you want
      return json({ error: "Verification failed" }, 403);
    }

    // Generate reward code
    const code = await makeCode(discord, answer, env);

    return json({ ok: true, code }, 200);
  } catch (err) {
    return json({ error: "Server error" }, 500);
  }
}
