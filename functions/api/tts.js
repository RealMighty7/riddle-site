// /functions/api/tts.js
// Cloudflare Pages Functions endpoint
// POST JSON -> returns audio/mpeg

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    },
  });
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Supports: {breath}, {beat}, {pause=300}, {pause 300}
function tokensToSsmlText(raw) {
  const s = String(raw || "");
  return escapeXml(s)
    .replace(/\{breath\}/gi, `<break time="220ms"/>`)
    .replace(/\{beat\}/gi, `<break time="140ms"/>`)
    .replace(/\{pause\s*=\s*(\d{1,4})\}/gi, (_, ms) => `<break time="${ms}ms"/>`)
    .replace(/\{pause\s+(\d{1,4})\}/gi, (_, ms) => `<break time="${ms}ms"/>`);
}

function clampNum(n, a, b) {
  n = Number(n);
  if (!Number.isFinite(n)) return null;
  return Math.max(a, Math.min(b, n));
}

function normalizeProsody({ rate, pitch, volume } = {}) {
  const out = {};

  const toRate = (v) => {
    if (typeof v === "string" && /%$/.test(v.trim())) return v.trim();
    const n = clampNum(v, -35, 35);
    if (n === null) return null;
    return (n >= 0 ? `+${n}%` : `${n}%`);
  };

  const toPitch = (v) => {
    if (typeof v === "string" && /hz$/i.test(v.trim())) return v.trim();
    const n = clampNum(v, -80, 80);
    if (n === null) return null;
    return (n >= 0 ? `+${n}Hz` : `${n}Hz`);
  };

  const toVol = (v) => {
    if (typeof v === "string" && /%$/.test(v.trim())) return v.trim();
    const n = clampNum(v, -60, 60);
    if (n === null) return null;
    return (n >= 0 ? `+${n}%` : `${n}%`);
  };

  const r = toRate(rate);
  const p = toPitch(pitch);
  const vol = toVol(volume);

  if (r) out.rate = r;
  if (p) out.pitch = p;
  if (vol) out.volume = vol;

  return out;
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-max-age": "86400",
    },
  });
}

export async function onRequestPost({ request, env }) {
  try {
    const key = env.AZURE_SPEECH_KEY;
    const region = env.AZURE_SPEECH_REGION;
    const format = env.TTS_DEFAULT_FORMAT || "audio-24khz-48kbitrate-mono-mp3";

    if (!key || !region) {
      return json({ error: "Server misconfigured: missing AZURE_SPEECH_KEY or AZURE_SPEECH_REGION" }, 500);
    }

    const body = await request.json().catch(() => null);
    if (!body) return json({ error: "Invalid JSON" }, 400);

    const text = String(body.text || "").trim();
    const voice = String(body.voice || "").trim();
    const style = String(body.style || "").trim();

    if (!text) return json({ error: "Missing text" }, 400);
    if (!voice) return json({ error: "Missing voice" }, 400);

    const prosody = normalizeProsody({
      rate: body.rate,
      pitch: body.pitch,
      volume: body.volume,
    });

    const ssmlText = tokensToSsmlText(text);

    const styleOpen = style ? `<mstts:express-as style="${escapeXml(style)}">` : "";
    const styleClose = style ? `</mstts:express-as>` : "";

    const prosodyAttrs = [
      prosody.rate ? ` rate="${escapeXml(prosody.rate)}"` : "",
      prosody.pitch ? ` pitch="${escapeXml(prosody.pitch)}"` : "",
      prosody.volume ? ` volume="${escapeXml(prosody.volume)}"` : "",
    ].join("");

    const ssml =
      `<?xml version="1.0" encoding="utf-8"?>` +
      `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" ` +
      `xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="en-US">` +
      `<voice name="${escapeXml(voice)}">` +
      styleOpen +
      `<prosody${prosodyAttrs}>${ssmlText}</prosody>` +
      styleClose +
      `</voice>` +
      `</speak>`;

    const azureUrl = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

    const res = await fetch(azureUrl, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": format,
        "User-Agent": "there-is-no-riddle-tts",
      },
      body: ssml,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return json(
        { error: "Azure TTS failed", status: res.status, details: errText.slice(0, 800), voice },
        502
      );
    }

    const audio = await res.arrayBuffer();
    return new Response(audio, {
      status: 200,
      headers: {
        "content-type": "audio/mpeg",
        "cache-control": "public, max-age=31536000, immutable",
        "access-control-allow-origin": "*",
      },
    });
  } catch (e) {
    return json({ error: "Server error", details: String(e?.message || e) }, 500);
  }
}
