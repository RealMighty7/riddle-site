// functions/api/complete.js

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function onRequestPost({ request, env }) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return json({ error: "Expected JSON body" }, 415);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const discord = (body.discord || "").trim();
    const answer = String(body.answer || "").trim();
    const token = (body.turnstile || "").trim();

    if (!discord || discord.length > 64) return json({ error: "Invalid username" }, 400);
    if (!token) return json({ error: "Missing Turnstile token" }, 400);

    // ---- Turnstile verify ----
    const tsSecret = env.TURNSTILE_SECRET;
    if (!tsSecret) return json({ error: "Server misconfigured (TURNSTILE_SECRET missing)" }, 500);

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

    const verify = await verifyRes.json().catch(() => ({}));
    if (!verify?.success) {
      return json(
        {
          error: "Turnstile failed",
          details: verify?.["error-codes"] || [],
        },
        403
      );
    }

    // ---- Generate code (server-authoritative) ----
    const code = generate10DigitCode();

    // ---- Email you (Resend) ----
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

      if (!emailRes.ok) {
        const err = await emailRes.text().catch(() => "");
        // still let them proceed
        return json({ code, emailError: "Resend failed", details: err.slice(0, 400) }, 200);
      }
    } else {
      // still let them proceed
      return json({ code, emailWarning: "Email not configured" }, 200);
    }

    return json({ code }, 200);
  } catch (e) {
    return json({ error: "Server error", details: String(e?.message || e).slice(0, 200) }, 500);
  }
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
  };
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json",
      ...corsHeaders(),
    },
  });
}

function generate10DigitCode() {
  const arr = new Uint32Array(2);
  crypto.getRandomValues(arr);
  const n = (BigInt(arr[0]) << 32n) | BigInt(arr[1]);
  const mod = n % 10000000000n;
  return mod.toString().padStart(10, "0");
}
