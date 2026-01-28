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

class VoiceBank {
  constructor({ voicesUrl = "/audio/data/voices.json", onTag = null } = {}) {
    this.voicesUrl = voicesUrl;
    this.onTag = typeof onTag === "function" ? onTag : null;

    this.byId = new Map();
    this.loaded = false;

    this.subtitleEl = null;
    this.nameEl = null;

    this._currentAudio = null;
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
      if (!line || !line.id) continue;
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
    try {
      if (this._currentAudio) {
        this._currentAudio.pause();
        this._currentAudio.currentTime = 0;
      }
    } catch {}
    this._currentAudio = null;
  }

  async playById(id, opts = {}) {
    await this.load();

    const key = String(id).padStart(4, "0");
    const line = this.byId.get(key);
    if (!line) {
      console.warn("[VoiceBank] missing line", key);
      return;
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

    // audio src
    const folder = (line.speaker || "system").toLowerCase();
    const src = `/audio/${folder}/${key}.wav`;

    const audio = new Audio(src);
    this._currentAudio = audio;

    if (typeof opts.volume === "number") audio.volume = clamp01(opts.volume);

    const baseHoldMs = Number(opts.baseHoldMs ?? 0);
    const holdMs = Number.isFinite(baseHoldMs) ? Math.max(0, baseHoldMs) : 0;

    return new Promise((resolve) => {
      const finish = () => {
        if (token !== this._playToken) return resolve(); // replaced by newer line
        this._currentAudio = null;
        if (holdMs) setTimeout(resolve, holdMs);
        else resolve();
      };

      audio.addEventListener("ended", finish, { once: true });
      audio.addEventListener("error", finish, { once: true });

      audio.play().catch(() => {
        // Autoplay block or missing file
        finish();
      });
    });
  }
}

// expose globally
window.VoiceBank = VoiceBank;
