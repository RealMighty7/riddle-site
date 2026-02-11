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
// Supports speaker pinning via desiredNameExact.
function pickVoice(list, speaker, map, desiredNameExact) {
  const sp = String(speaker || "narr").toLowerCase();
  const l = (list || []).slice();
  const norm = (s) => String(s || "").toLowerCase().trim();

  // Exact-name pin (used for Liam)
  if (desiredNameExact) {
    const wantExact = norm(desiredNameExact);
    const ex = l.find(v => norm(v.name) === wantExact);
    if (ex) return ex;
  }

  // Stable map if provided
  if (map) {
    if (sp === "emma" && map.emma) return map.emma;
    if (sp === "liam" && map.liam) return map.liam;
    if (sp === "system" && map.system) return map.system;
  }

  // Per-speaker preference lists
  const want = sp === "system"
    ? ["microsoft david", "microsoft george", "microsoft mark", "google uk english male", "daniel", "fred"]
    : sp === "emma"
    ? ["microsoft aria", "microsoft jenny", "microsoft zira", "samantha", "victoria", "female"]
    : ["microsoft mark - english (united states)", "microsoft mark", "microsoft david", "microsoft guy", "alex", "male"];

  const byNameIncludes = (needle) => l.find(v => norm(v.name).includes(needle));
  for (const n of want) {
    const v = byNameIncludes(n);
    if (v) return v;
  }

  // fallback: prefer non-compact voices
  return l.find(v => !/remote|compact/i.test(String(v.name || ""))) || l[0] || null;
}


  let _voiceReady = null;
  function ensureVoicesLoaded(timeoutMs = 800) {
    const listNow = synth ? synth.getVoices() : [];
    if (listNow && listNow.length) return Promise.resolve(listNow);

    if (_voiceReady) return _voiceReady;

    _voiceReady = new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        try { synth && synth.removeEventListener?.("voiceschanged", onChanged); } catch {}
        resolve(synth ? synth.getVoices() : []);
      };
      const onChanged = () => finish();
      try { synth && synth.addEventListener?.("voiceschanged", onChanged); } catch {}
      setTimeout(finish, timeoutMs);
    });
    return _voiceReady;
  }

  // Stable per-speaker voice mapping (so Emma/Liam/System don't collapse to one voice)
  // Stable per-speaker voice mapping (LOCKED preferences)
function buildVoiceMap(list) {
  const v = (list || []).slice();
  const en = v.filter(x => String(x.lang || "").toLowerCase().startsWith("en"));
  const pool = en.length ? en : v;

  const norm = (s) => String(s || "").toLowerCase();

  const findBy = (needles) => {
    for (const n of needles) {
      const needle = norm(n);
      const hit = pool.find(vo => norm(vo.name).includes(needle) || norm(vo.voiceURI).includes(needle));
      if (hit) return hit;
    }
    return null;
  };

  // Emma: pinned to the closest match to en-US-ErinNeural (Edge/Windows usually provides "Microsoft Emma Online (Natural) - English (United States)")
  const emma = pool.find(vo => norm(vo.name) === "microsoft emma online (natural) - english (united states)") ||
               pool.find(vo => norm(vo.name) === "microsoft emma - english (united states)") ||
               findBy(["microsoft emma", "microsoft aria", "microsoft jenny", "microsoft zira", "female"]) || pool[0] || null;

  // Liam: must be Microsoft Mark - English (United States) if present
  const liam = pool.find(vo => norm(vo.name) === "microsoft mark - english (united states)") ||
               findBy(["microsoft mark", "microsoft david", "microsoft guy", "male"]) ||
               pool[1] || pool[0] || null;

  // System: pinned to Microsoft Mark (flat + robotic) when available
  let system = pool.find(vo => norm(vo.name) === "microsoft mark - english (united states)") ||
               findBy(["microsoft mark", "microsoft david", "microsoft guy", "male", "robot"]) || pool[0] || null;
  if (system && emma && system.name === emma.name) system = pool.find(x => x && x.name !== emma.name && x.name !== (liam && liam.name)) || system;
  if (system && liam && system.name === liam.name) system = pool.find(x => x && x.name !== liam.name && x.name !== (emma && emma.name)) || system;

  return { emma, liam, system };
}

  // Base personality tuning
  // Base personality tuning (LOCKED)
const BASE = {
  // System: flat + robotic
  system: { rate: 0.78, pitch: 0.84, volume: 0.88 },
  // Emma: Erin-like (closest available in browser), stern + cold
  emma:   { rate: 0.99, pitch: 0.98, volume: 1.00 },
  // Liam: Microsoft Mark (en-US), hushed + urgent
  liam:   { rate: 0.92, pitch: 0.96, volume: 0.92 },
};


  // Subtle “humanization” jitter per utterance
  function withJitter(base, speaker) {
  // Keep identities locked; only tiny micro-variation to avoid “robotic” cadence.
  const j = speaker === "system" ? 0.0 : (speaker === "liam" ? 0.014 : 0.008);
  const r = base.rate * (1 + (Math.random() * 2 - 1) * j);
  const p = base.pitch + (Math.random() * 2 - 1) * (speaker === "system" ? 0.0 : 0.015);
  return {
    rate: clamp(r, 0.65, 1.35),
    pitch: clamp(p, 0.55, 1.45),
    volume: clamp01(base.volume),
  };
}

  // System background bed (low volume ambience) — only audible while system speaks
  // System background bed (low volume static) — only audible while system speaks
  const bed = new Audio("/assets/static2.wav");
  bed.loop = true;
  bed.volume = 0;
  bed.preload = "auto";

  // Instant on/off (NO fade) — only audible while system speaks
let _bedGlitchTimer = null;
async function bedOn() {
  try { if (bed.paused) await bed.play(); } catch {}
  bed.volume = 0.09;
  // tiny intermittent glitch clicks while the system speaks (kept very subtle)
  try {
    if (_bedGlitchTimer) return;
    _bedGlitchTimer = setInterval(() => {
      try {
        if (bed.volume <= 0.001) return;
        // sparse random ticks
        if (Math.random() < 0.16 && window.playSfx) window.playSfx("staticSoft", { volume: 0.035, overlap: true });
      } catch {}
    }, 320 + Math.floor(Math.random() * 260));
  } catch {}
}
function bedOff() {
  try {
    const start = bed.volume || 0;
    const t0 = performance.now();
    const dur = 140;
    const tick = () => {
      const a = Math.min(1, (performance.now() - t0) / dur);
      bed.volume = start * (1 - a);
      if (a < 1) requestAnimationFrame(tick);
      else bed.volume = 0;
    };
    requestAnimationFrame(tick);
  } catch { bed.volume = 0; }
  try { if (_bedGlitchTimer) { clearInterval(_bedGlitchTimer); _bedGlitchTimer = null; } } catch {}
  // keep it playing silently to avoid autoplay re-blocking
}

  // Queue
  let voiceMap = null;

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
        _resolve: null,
      };
    }
    return {
      text: String(textOrObj || ""),
      speaker: normSpeaker(opts?.speaker),
      rate: opts?.rate,
      pitch: opts?.pitch,
      volume: opts?.volume,
      _resolve: null,
    };
  }

  function next() {
    if (speaking) return;
    const item = q.shift();
    const itemResolve = item && item._resolve;
    if (!item) return;
    const { text, speaker } = item;
    if (!text) return next();

    refreshVoices();
    voiceMap = voiceMap || buildVoiceMap(voices);
    const desired = (speaker === "liam") ? "Microsoft Mark - English (United States)" : null;
    const voice = pickVoice(voices, speaker, voiceMap, desired);

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
      try { if (typeof itemResolve === "function") itemResolve(true); } catch {}
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

  // Promise-based enqueue (resolves when utterance finishes)
  TTS.enqueueAsync = (textOrObj, opts) => {
    return new Promise((resolve) => {
      const item = normalizeArgs(textOrObj, opts);
      item._resolve = resolve;
      q.push(item);
      next();
    });
  };

  // Expose current base tuning for sync typing
  TTS.getTuning = (speaker) => {
    const sp = normSpeaker(speaker);
    const b = BASE[sp] || BASE.system;
    return { rate: b.rate, pitch: b.pitch, volume: b.volume };
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
