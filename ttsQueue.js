// ttsQueue.js (NON-module)
// Browser TTS queue using Web Speech API (speechSynthesis)
// Generated speech only (no server). Small humanization + optional system noise bed.

(() => {
  const synth = window.speechSynthesis;

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function clamp01(v) { v = Number(v); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 1; }

  function normSpeaker(s) {
    s = String(s || "").toLowerCase();
    if (s.includes("emma") || s.includes("security")) return "emma";
    if (s.includes("liam") || s.includes("worker")) return "liam";
    return "system";
  }

  // Pick voices by heuristic (best effort; varies by OS/browser)
  function pickVoice(list, speaker) {
    const want = speaker === "system"
      ? ["microsoft david", "microsoft mark", "google uk english male", "daniel", "fred"]
      : speaker === "emma"
      ? ["microsoft zira", "microsoft aria", "google uk english female", "samantha", "victoria"]
      : ["microsoft guy", "google us english", "alex", "daniel"];

    const l = (list || []).slice();
    const byName = (needle) => l.find(v => String(v.name || "").toLowerCase().includes(needle));
    for (const n of want) {
      const v = byName(n);
      if (v) return v;
    }
    // fallback: first non-remote, non-compact if possible
    return l.find(v => !/remote|compact/i.test(String(v.name || ""))) || l[0] || null;
  }

  // Base personality tuning
  const BASE = {
    emma:   { rate: 0.95, pitch: 0.95, volume: 1.0 },
    liam:   { rate: 0.99, pitch: 1.06, volume: 0.86 },
    system: { rate: 0.92, pitch: 0.78, volume: 0.85 },
  };

  // Subtle “humanization” jitter per utterance
  function withJitter(base, speaker) {
    const j = speaker === "system" ? 0.012 : 0.022;
    const r = base.rate * (1 + (Math.random() * 2 - 1) * j);
    const p = base.pitch + (Math.random() * 2 - 1) * (speaker === "system" ? 0.02 : 0.04);
    return {
      rate: clamp(r, 0.84, 1.18),
      pitch: clamp(p, 0.55, 1.35),
      volume: clamp01(base.volume),
    };
  }

  // System background bed (low volume ambience) — only audible while system speaks
  const bed = new Audio("/assets/ambience.wav");
  bed.loop = true;
  bed.volume = 0;
  bed.preload = "auto";

  let bedTarget = 0;
  let bedRAF = 0;
  function bedAnim() {
    const cur = bed.volume;
    const next = cur + (bedTarget - cur) * 0.08;
    bed.volume = clamp01(next);
    if (Math.abs(bedTarget - next) > 0.004) {
      bedRAF = requestAnimationFrame(bedAnim);
    }
  }
  async function bedOn() {
    bedTarget = 0.10;
    try { if (bed.paused) await bed.play(); } catch {}
    cancelAnimationFrame(bedRAF);
    bedRAF = requestAnimationFrame(bedAnim);
  }
  function bedOff() {
    bedTarget = 0;
    cancelAnimationFrame(bedRAF);
    bedRAF = requestAnimationFrame(bedAnim);
    // don't force pause; keep it ready (prevents autoplay re-blocking)
  }

  // Queue
  const q = [];
  let speaking = false;
  let voices = [];
  let unlocked = false;

  function refreshVoices() {
    try { voices = synth.getVoices() || []; } catch { voices = []; }
  }
  refreshVoices();
  if (synth && typeof synth.onvoiceschanged !== "undefined") {
    synth.onvoiceschanged = refreshVoices;
  }

  function normalizeArgs(textOrObj, opts) {
    if (typeof textOrObj === "object" && textOrObj) {
      // enqueue({ text, voice, rate, pitch, volume })
      return {
        text: String(textOrObj.text || ""),
        speaker: normSpeaker(textOrObj.voice || textOrObj.speaker),
        rate: textOrObj.rate,
        pitch: textOrObj.pitch,
        volume: textOrObj.volume,
      };
    }
    return {
      text: String(textOrObj || ""),
      speaker: normSpeaker(opts?.speaker),
      rate: opts?.rate,
      pitch: opts?.pitch,
      volume: opts?.volume,
    };
  }

  function next() {
    if (speaking) return;
    const item = q.shift();
    if (!item) return;
    const { text, speaker } = item;
    if (!text) return next();

    refreshVoices();
    const voice = pickVoice(voices, speaker);

    const base = { ...(BASE[speaker] || BASE.system) };
    if (typeof item.rate === "number") base.rate = item.rate;
    if (typeof item.pitch === "number") base.pitch = item.pitch;
    if (typeof item.volume === "number") base.volume = item.volume;

    const tuned = withJitter(base, speaker);

    // Build utterance
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.rate = tuned.rate;
    u.pitch = tuned.pitch;
    u.volume = tuned.volume;

    speaking = true;

    // system bed in/out
    if (speaker === "system") bedOn(); else bedOff();

    const done = () => {
      speaking = false;
      if (speaker === "system") bedOff();
      setTimeout(next, 40);
    };
    u.onend = done;
    u.onerror = done;

    try {
      synth.speak(u);
    } catch {
      done();
    }
  }

  const TTS = (window.TTS = window.TTS || {});
  TTS.enqueue = (textOrObj, opts) => {
    const item = normalizeArgs(textOrObj, opts);
    q.push(item);
    next();
  };

  TTS.stop = () => {
    q.length = 0;
    speaking = false;
    try { synth.cancel(); } catch {}
    bedOff();
  };

  // Must be called from a user gesture once.
  TTS.unlock = async () => {
    if (unlocked) return true;
    unlocked = true;
    try {
      // poke speech
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      synth.speak(u);
      synth.cancel();
    } catch {}
    try {
      bed.volume = 0;
      await bed.play();
      bed.pause();
      bed.currentTime = 0;
    } catch {}
    return true;
  };

  // alias used by older code
  TTS.unlockOnce = TTS.unlock;
})();
