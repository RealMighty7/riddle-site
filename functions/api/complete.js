// functions/api/complete.js

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();

    const discord = (body.discord || "").trim();
    const answer = String(body.answer || "").trim();
    const token = (body.turnstile || "").trim();

    if (!discord || discord.length > 64) {
      return json({ error: "Invalid username" }, 400);
    }
    if (!token) {
      return json({ error: "Missing Turnstile token" }, 400);
    }

    // ---- Turnstile verify ----
    const tsSecret = env.TURNSTILE_SECRET;
    if (!tsSecret) return json({ error: "Server misconfigured" }, 500);

    const ip = request.headers.get("CF-Connecting-IP") || "";
    const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: tsSecret,
        response: token,
        ...(ip ? { remoteip: ip } : {}),
      }),
    });

    const verify = await verifyRes.json();
    if (!verify.success) {
      return json(
        { error: "Turnstile failed", details: verify["error-codes"] || [] },
        403
      );
    }

    // ---- Generate 10-digit code (server-authoritative) ----
    const code = generate10DigitCode();

    // ---- Email you (Resend) ----
    // Set RESEND_API_KEY + EMAIL_TO + EMAIL_FROM in Cloudflare Pages Variables
    const resendKey = env.RESEND_API_KEY;
    const emailTo = env.EMAIL_TO;
    const emailFrom = env.EMAIL_FROM;

    if (!resendKey || !emailTo || !emailFrom) {
      // Still return code, but tell you what’s missing
      return json({ error: "Email not configured", code }, 200);
    }

    const subject = `ESCAPED: ${discord} (${code})`;
    const text =
`A player completed the game.

Discord: ${discord}
Answer: ${answer || "(empty)"}
Code: ${code}
Time: ${new Date().toISOString()}
`;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${resendKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [emailTo],
        subject,
        text,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.text().catch(() => "");
      // return code anyway, but report email failure
      return json({ code, emailError: "Failed to send", details: err.slice(0, 400) }, 200);
      sessionStorage.setItem("escape_code", data.code);
      location.href = `/escaped.html?escaped=1`;
    }

    return json({ code }, 200);
  } catch {
    return json({ error: "Bad request" }, 400);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function generate10DigitCode() {
  // crypto-safe
  const arr = new Uint32Array(2);
  crypto.getRandomValues(arr);
  // 0..(10^10 - 1)
  const n = (BigInt(arr[0]) << 32n) | BigInt(arr[1]);
  const mod = n % 10000000000n;
  return mod.toString().padStart(10, "0");
}
