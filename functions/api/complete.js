// functions/api/complete.js

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function base64urlFromBytes(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlFromString(str) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacSha256Base64url(secret, payload) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return base64urlFromBytes(new Uint8Array(sigBuf));
}

async function verifyTurnstile(env, turnstileToken, ip) {
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: false, reason: "Server misconfigured" };
  if (!turnstileToken) return { ok: false, reason: "Missing turnstile token" };

  const form = new FormData();
  form.append("secret", secret);
  form.append("response", turnstileToken);
  if (ip) form.append("remoteip", ip);

  const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form
  });

  const data = await resp.json().catch(() => null);
  if (!data || !data.success) return { ok: false, reason: "Turnstile failed" };

  return { ok: true };
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));
    const name = String(body.discord || "").trim();
    const turnstile = String(body.turnstile || "").trim();

    if (!name || name.length > 64) {
      return json(400, { error: "Invalid username" });
    }

    const secret = env.COMPLETION_SECRET;
    if (!secret) {
      return json(500, { error: "Server misconfigured" });
    }

    const ip = request.headers.get("CF-Connecting-IP") || "";
    const ts = await verifyTurnstile(env, turnstile, ip);
    if (!ts.ok) {
      return json(403, { error: ts.reason || "Verification failed" });
    }

    const timestamp = new Date().toISOString();
    const payload = `${name}|${timestamp}`;
    const sig = await hmacSha256Base64url(secret, payload);

    const token = base64urlFromString(`${payload}|${sig}`);
    return json(200, { token });
  } catch {
    return json(400, { error: "Bad request" });
  }
}
