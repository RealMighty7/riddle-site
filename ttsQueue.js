// /ttsQueue.js
// Client-side TTS queue with Cache Storage + deterministic keys.
// Usage:
//   await window.TTS.say({ speaker:"Emma", voice:"en-US-ErinNeural", text:"{breath} Don't touch anything." })

(() => {
  const cacheName = "tts-audio-v1";
  const inMem = new Map(); // key -> objectURL
  let chain = Promise.resolve();
  let currentAudio = null;

  async function sha256Base64Url(str) {
    const enc = new TextEncoder().encode(str);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    const bytes = new Uint8Array(buf);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const b64 = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    return b64;
  }

  async function getCachedObjectUrl(cacheKey) {
    if (inMem.has(cacheKey)) return inMem.get(cacheKey);

    const cache = await caches.open(cacheName);
    const match = await cache.match(cacheKey);
    if (!match) return null;

    const blob = await match.blob();
    const url = URL.createObjectURL(blob);
    inMem.set(cacheKey, url);
    return url;
  }

  async function putCache(cacheKey, audioArrayBuffer) {
    const cache = await caches.open(cacheName);
    const blob = new Blob([audioArrayBuffer], { type: "audio/mpeg" });
    await cache.put(cacheKey, new Response(blob, { headers: { "content-type": "audio/mpeg" } }));
    const url = URL.createObjectURL(blob);
    inMem.set(cacheKey, url);
    return url;
  }

  function stop() {
    if (currentAudio) {
      try { currentAudio.pause(); } catch {}
      try { currentAudio.currentTime = 0; } catch {}
    }
    currentAudio = null;
  }

  function playUrl(url, volume = 1) {
    return new Promise((resolve) => {
      stop();
      const a = new Audio(url);
      currentAudio = a;
      a.volume = Math.max(0, Math.min(1, Number(volume) || 1));
      a.onended = () => resolve();
      a.onerror = () => resolve(); // fail soft
      a.play().catch(() => resolve());
    });
  }

  async function fetchTTS(payload) {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      // fail soft; you can surface errors if you want
      return null;
    }
    return await res.arrayBuffer();
  }

  async function say(opts) {
    const speaker = String(opts.speaker || "System");
    const voice = String(opts.voice || "").trim();
    const text = String(opts.text || "").trim();
    if (!voice || !text) return;

    const rate = opts.rate ?? null;
    const pitch = opts.pitch ?? null;
    const volume = opts.volume ?? null;
    const style = opts.style ?? "";

    // deterministic key
    const hash = await sha256Base64Url(JSON.stringify({ speaker, voice, rate, pitch, volume, style, text }));
    const cacheKey = new Request(`/api/tts-cache/${hash}.mp3`);

    // cache hit?
    let url = await getCachedObjectUrl(cacheKey);
    if (!url) {
      const audioBuf = await fetchTTS({ speaker, voice, rate, pitch, volume, style, text });
      if (!audioBuf) return;
      url = await putCache(cacheKey, audioBuf);
    }

    await playUrl(url, 1);
  }

  // Queue so dialogue lines never overlap:
  function enqueue(opts) {
    chain = chain.then(() => say(opts));
    return chain;
  }

  window.TTS = {
    enqueue,
    stop,
    // optional helpers
    warm: enqueue,
    clearCache: async () => {
      inMem.forEach((url) => { try { URL.revokeObjectURL(url); } catch {} });
      inMem.clear();
      await caches.delete(cacheName);
    },
  };
})();
