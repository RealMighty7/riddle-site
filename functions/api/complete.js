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
    const verifyRes = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: tsSecret,
          response: token,
          ...(ip ? { remoteip: ip } : {}),
        }),
      }
    );

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
    // Secrets in Cloudflare Pages: RESEND_API_KEY, EMAIL_TO, EMAIL_FROM
    const resendKey = env.RESEND_API_KEY;
    const emailTo = env.EMAIL_TO;
    const emailFrom = env.EMAIL_FROM;

    if (resendKey && emailTo && emailFrom) {
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

      // Don’t block the player if email fails — just include debug info
      if (!emailRes.ok) {
        const err = await emailRes.text().catch(() => "");
        return json(
          { code, emailError: "Failed to send", details: err.slice(0, 400) },
          200
        );
      }
    } else {
      // If you haven't configured Resend yet, still let the player proceed
      return json({ code, emailWarning: "Email not configured" }, 200);
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
  const arr = new Uint32Array(2);
  crypto.getRandomValues(arr);
  const n = (BigInt(arr[0]) << 32n) | BigInt(arr[1]);
  const mod = n % 10000000000n;
  return mod.toString().padStart(10, "0");
}
