export async function onRequestGet({ env }) {
  const key = env.TURNSTILE_SITE_KEY || "";
  return new Response(JSON.stringify({ turnstile_site_key: key }), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
