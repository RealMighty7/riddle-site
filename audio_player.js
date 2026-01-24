// audio_player.js (NON-module, full file)

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
  glassBreak: "/assets/thud.wav", // replace later if you add real glass
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
      try { prev.pause(); prev.currentTime = 0; } catch {}
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
  constructor({
    voicesUrl = "/audio/data/voices.json",
    onTag = null
  } = {}) {
    this.voicesUrl = voicesUrl;
    this.onTag = typeof onTag === "function" ? onTag : null;

    this.byId = new Map();
    this.loaded = false;

    this.subtitleEl = null;
    this.nameEl = null;

    this._currentAudio = null;
    this._playToken = 0;
  }

  bindSubtitleUI({ nameEl, subtitleEl }) {
    this.nameEl = nameEl || null;
    this.subtitleEl = subtitleEl || null;
  }

  async load() {
    if (this.loaded) return;

    const res = await fetch(this.voicesUrl, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Failed to load voices.json (${res.status})`);
    }

    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (!ct.includes("application/json")) {
      const preview = (await res.text()).slice(0, 120);
      throw new Error(`voices.json is not JSON: ${preview}`);
    }

    const data = await res.json();
    const lines = Array.isArray(data) ? data : data.lines;
    if (!Array.isArray(lines)) {
      throw new Error("voices.json missing lines[]");
    }

    for (const line of lines) {
      if (!line || !line.id) continue;
      const id = String(line.id).padStart(4, "0");
      this.byId.set(id, line);
    }

    this.loaded = true;
  }

  async playById(id) {
    await this.load();

    const key = String(id).padStart(4, "0");
    const line = this.byId.get(key);
    if (!line) {
      console.warn("[VoiceBank] missing line", key);
      return;
    }

    const token = ++this._playToken;

    if (this._currentAudio) {
      try { this._currentAudio.pause(); } catch {}
      this._currentAudio = null;
    }

    if (this.nameEl) this.nameEl.textContent = line.speaker || "";
    if (this.subtitleEl) this.subtitleEl.textContent = line.text || "";

    if (Array.isArray(line.tags) && this.onTag) {
      for (const tag of line.tags) this.onTag(tag, line);
    }

    const folder = line.speaker?.toLowerCase() || "system";
    const src = `/audio/${folder}/${key}.wav`;

    const audio = new Audio(src);
    this._currentAudio = audio;

    audio.play().catch(() => {});

    audio.onended = () => {
      if (token !== this._playToken) return;
      this._currentAudio = null;
    };
  }
}

// expose globally
window.VoiceBank = VoiceBank;
