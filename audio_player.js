// audio_player.js (NON-module, FULL REPLACEMENT)

/* =========================================================
   GLOBAL SFX (uses /assets)
========================================================= */

const SFX_MAP = {
  click: "/assets/glitch1.wav",
  glitch: "/assets/glitch2.wav",
  thud: "/assets/thud.wav",
  static: "/assets/static1.wav",
  staticSoft: "/assets/static2.wav",
  ambience: "/assets/ambience.wav",
  glassBreak: "/assets/glassbreaking.mp3",
  mclick: "/assets/click.mp3",
};

function clamp01(v) {
  v = Number(v);
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 1;
}
function clampRate(v) {
  v = Number(v);
  return Number.isFinite(v) ? Math.max(0.6, Math.min(1.6, v)) : 1;
}

function playSfx(id, opts = {}) {
  const src = SFX_MAP[id];
  if (!src) return;

  const volume = clamp01(opts.volume ?? 0.9);
  const rate = clampRate(opts.rate ?? 1);
  const overlap = opts.overlap !== false;

  if (!overlap) {
    playSfx._single ??= {};
    const prev = playSfx._single[id];
    if (prev) {
      try {
        prev.pause();
        prev.currentTime = 0;
      } catch {}
    }
    const a = new Audio(src);
    playSfx._single[id] = a;
    a.volume = volume;
    a.playbackRate = rate;
    a.play().catch(() => {});
    return;
  }

  const a = new Audio(src);
  a.volume = volume;
  a.playbackRate = rate;
  a.play().catch(() => {});
}

// expose globally (main.js relies on this)
window.playSfx = playSfx;

/* =========================================================
   VOICE BANK (dialogue playback)
========================================================= */

function speakerToFolder(speaker) {
  // Goal: map "Emma (Security)" -> "emma", "Liam (Worker)" -> "liam", "System" -> "system"
  const s = String(speaker || "system").trim().toLowerCase();
  if (!s) return "system";

  // fast path for common speakers
  if (s.startsWith("emma")) return "emma";
  if (s.startsWith("liam")) return "liam";
  if (s.startsWith("system")) return "system";
  if (s.startsWith("you")) return "you";

  // generic sanitize: keep first alnum token
  const token = (s.match(/[a-z0-9]+/) || [])[0];
  return token || "system";
}

class VoiceBank {
  constructor({ voicesUrl = "/audio/data/voices.json", onTag = null } = {}) {
    this.voicesUrl = voicesUrl;
    this.onTag = typeof onTag === "function" ? onTag : null;

    this.byId = new Map();
    this.loaded = false;

    this.subtitleEl = null;
    this.nameEl = null;

    this._currentAudio = null;
    this._activeAudios = new Set();
    this._playToken = 0;
    this._unlocked = false;
  }

  bindSubtitleUI({ nameEl, subtitleEl }) {
    this.nameEl = nameEl || null;
    this.subtitleEl = subtitleEl || null;
  }

  async load() {
    if (this.loaded) return;

    const res = await fetch(this.voicesUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load voices.json (${res.status})`);

    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (!ct.includes("application/json")) {
      const preview = (await res.text()).slice(0, 120);
      throw new Error(`voices.json is not JSON: ${preview}`);
    }

    const data = await res.json();
    const lines = Array.isArray(data) ? data : data.lines;
    if (!Array.isArray(lines)) throw new Error("voices.json missing lines[]");

    for (const line of lines) {
      if (!line || line.id == null) continue;
      const id = String(line.id).padStart(4, "0");
      this.byId.set(id, line);
    }

    this.loaded = true;
  }

  async unlockAudio() {
    if (this._unlocked) return;
    this._unlocked = true;

    // Best-effort unlock across browsers
    try {
      if (window.AudioContext || window.webkitAudioContext) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        const ctx = new Ctx();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        g.gain.value = 0.0001;
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.01);
        await ctx.resume().catch(() => {});
        setTimeout(() => {
          try { ctx.close(); } catch {}
        }, 50);
        return;
      }
    } catch {}

    // Fallback: play a muted element briefly
    try {
      const a = new Audio();
      a.muted = true;
      a.src =
        "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=";
      await a.play().catch(() => {});
      a.pause();
    } catch {}
  }

  stopCurrent() {
    // Stop *all* active audios (important when stopPrevious:false was used)
    try {
      for (const a of this._activeAudios) {
        try { a.pause(); } catch {}
        try { a.currentTime = 0; } catch {}
      }
    } catch {}

    this._activeAudios.clear();

    try {
      if (this._currentAudio) {
        try { this._currentAudio.pause(); } catch {}
        try { this._currentAudio.currentTime = 0; } catch {}
      }
    } catch {}

    this._currentAudio = null;
  }

  // ✅ Returns Promise<boolean>
  // true  => likely played (ended fired)
  // false => missing/blocked/error
  async playById(id, opts = {}) {
    await this.load();

    const key = String(id).padStart(4, "0");
    const line = this.byId.get(key);
    if (!line) {
      console.warn("[VoiceBank] missing line", key);
      return false;
    }

    const token = ++this._playToken;

    const stopPrevious = opts.stopPrevious !== false; // default true
    if (stopPrevious) this.stopCurrent();

    // UI text
    if (this.nameEl) this.nameEl.textContent = line.speaker || "";
    if (this.subtitleEl) this.subtitleEl.textContent = line.text || "";

    // tag hooks
    if (Array.isArray(line.tags) && this.onTag) {
      for (const tag of line.tags) {
        try { this.onTag(tag, line); } catch {}
      }
    }

    const folder = speakerToFolder(line.speaker || "system");
    const src = `/audio/${folder}/${key}.wav`;

    const audio = new Audio(src);
    this._currentAudio = audio;
    this._activeAudios.add(audio);

    if (typeof opts.volume === "number") audio.volume = clamp01(opts.volume);
    if (typeof opts.rate === "number") audio.playbackRate = clampRate(opts.rate);

    const baseHoldMs = Number(opts.baseHoldMs ?? 0);
    const holdMs = Number.isFinite(baseHoldMs) ? Math.max(0, baseHoldMs) : 0;

    return new Promise((resolve) => {
      let ok = false;

      const cleanup = () => {
        try { this._activeAudios.delete(audio); } catch {}
        if (token === this._playToken && this._currentAudio === audio) this._currentAudio = null;
      };

      const finish = () => {
        cleanup();
        if (token !== this._playToken) return resolve(false); // replaced by newer line
        if (holdMs) setTimeout(() => resolve(ok), holdMs);
        else resolve(ok);
      };

      audio.addEventListener("ended", () => {
        ok = true;
        finish();
      }, { once: true });

      audio.addEventListener("error", () => {
        ok = false;
        finish();
      }, { once: true });

      audio.play().catch(() => {
        ok = false;
        finish();
      });
    });
  }
}

// expose globally
window.VoiceBank = VoiceBank;

/* =========================================================
   AudioPlayer wrapper (WHAT main.js needs)
   - playLine(rawLine) => Promise<boolean>
========================================================= */

(() => {
  const AP = (window.AudioPlayer = window.AudioPlayer || {});
  let VO = null;
  let READY = false;

  function normalizeForMatch(s) {
    return String(s || "")
      .replace(/\{[a-zA-Z0-9_]+\}/g, "")
      .replace(/^\s*\[\d{1,4}\]\s*/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function stripSpeakerPrefix(s) {
    return String(s || "").replace(/^\s*[^:]{1,48}:\s*/, "");
  }

  function getIdFromLine(rawLine) {
    const raw = String(rawLine || "");

    // explicit [####]
    const m = raw.match(/^\s*\[(\d{1,4})\]\s*/);
    if (m) return String(m[1]).padStart(4, "0");

    if (!VO || !VO.byId) return null;

    const targetA = normalizeForMatch(raw);
    const targetB = normalizeForMatch(stripSpeakerPrefix(raw));

    for (const [id, line] of VO.byId.entries()) {
      const textRaw = line.text_raw ?? line.text ?? "";
      const candA = normalizeForMatch(textRaw);
      const candB = normalizeForMatch(stripSpeakerPrefix(textRaw));
      if (candA === targetA || candA === targetB || candB === targetA || candB === targetB) {
        return String(id).padStart(4, "0");
      }
    }

    return null;
  }

  AP.init = async function init() {
    if (READY) return;
    if (!window.VoiceBank) return;

    VO = new window.VoiceBank({
      voicesUrl: "/audio/data/voices.json",
      onTag: () => {},
    });

    // main.js will bind subtitles too, but doing it here is harmless if they re-bind later
    try {
      const nameEl = document.getElementById("subsName");
      const subtitleEl = document.getElementById("subsText");
      if (nameEl || subtitleEl) VO.bindSubtitleUI({ nameEl, subtitleEl });
    } catch {}

    await VO.load();
    READY = true;
  };

  AP.unlock = async function unlock() {
    try {
      await AP.init();
      await VO?.unlockAudio?.();
    } catch {}
  };

  // ✅ Returns boolean: true if WAV likely played, false if no match / missing / blocked
  AP.playLine = async function playLine(rawLine) {
    try {
      await AP.init();
      if (!VO) return false;

      const id = getIdFromLine(rawLine);
      if (!id) return false;

      const ok = await VO.playById(id, { volume: 1.0, baseHoldMs: 160, stopPrevious: false });
      return ok === true;
    } catch {
      return false;
    }
  };

  AP.stop = function stop() {
    try { VO?.stopCurrent?.(); } catch {}
  };
})();
