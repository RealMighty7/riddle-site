export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const name = (body.discord || "").trim();

    if (!name || name.length > 64) {
      return new Response(
        JSON.stringify({ error: "Invalid username" }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    const secret = env.COMPLETION_SECRET;
    if (!secret) {
      return new Response(
        JSON.stringify({ error: "Server misconfigured" }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }

    const timestamp = new Date().toISOString();
    const payload = `${name}|${timestamp}`;

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const sigBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(payload)
    );

    const sig = btoa(
      String.fromCharCode(...new Uint8Array(sigBuffer))
    ).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    const token = btoa(`${payload}|${sig}`)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    return new Response(
      JSON.stringify({ token }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Bad request" }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }
}
