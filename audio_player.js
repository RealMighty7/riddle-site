// audio_player.js (NON-module script)
// Folder layout assumed:
// /audio/data/voices.json
// /audio/emma/0001.wav
// /audio/liam/0007.wav
// /audio/system/0008.wav

class VoiceBank {
  constructor({ voicesUrl = "/audio/data/voices.json", onTag = null } = {}) {
    this.voicesUrl = voicesUrl;
    this.onTag = typeof onTag === "function" ? onTag : null;

    this.byId = new Map();
    this.loaded = false;

    this.subtitleEl = null;
    this.nameEl = null;

    this._ctx = null;
    this._ctxUnlocked = false;

    this._currentAudio = null;
    this._currentGain = null;
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
      throw new Error(`Failed to load voices.json: ${res.status} (${this.voicesUrl})`);
    }

    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    if (!contentType.includes("application/json")) {
      const preview = (await res.text()).slice(0, 120);
      throw new Error(
        `voices.json is not JSON (content-type="${contentType}"). ` +
          `Check voicesUrl="${this.voicesUrl}". Got: ${preview}`
      );
    }

    const data = await res.json();
    const lines = Array.isArray(data) ? data : data.lines;
    if (!Array.isArray(lines)) throw new Error("voices.json format invalid (missing lines array)");

    for (const line of lines) {
      if (!line || !line.id) continue;
      this.byId.set(String(line.id).padStart(4, "0"), line);
    }

    this.loaded = true;
  }

  async unlockAudio() {
    if (this._ctxUnlocked) return;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      this._ctxUnlocked = true; // nothing to unlock
      return;
    }

    if (!this._ctx) this._ctx = new AudioCtx();

    if (this._ctx.state === "suspended") {
      await this._ctx.resume().catch(() => {});
    }

    // Tiny silent buffer to satisfy some browsers
    try {
      const o = this._ctx.createOscillator();
      const g = this._ctx.createGain();
      g.gain.value = 0.00001;
      o.connect(g);
      g.connect(this._ctx.destination);
      o.start();
      o.stop(this._ctx.currentTime + 0.02);
    } catch {}

    this._ctxUnlocked = true;
  }

  stopCurrent() {
    this._playToken++;
    try {
      if (this._currentAudio) {
        this._currentAudio.pause();
        this._currentAudio.currentTime = 0;
      }
    } catch {}
    this._currentAudio = null;

    try {
      if (this._currentGain) this._currentGain.disconnect();
    } catch {}
    this._currentGain = null;

    // hide subs fast
    try {
      if (this.subtitleEl) this.subtitleEl.textContent = "";
      if (this.nameEl) this.nameEl.textContent = "";
    } catch {}
  }

  _speakerToFolder(speaker) {
    const s = String(speaker || "").toLowerCase();
    if (s.includes("emma")) return "emma";
    if (s.includes("liam")) return "liam";
    return "system";
  }

  _applySubs(line) {
    if (!line) return;
    if (this.nameEl) this.nameEl.textContent = String(line.speaker || "").trim();
    if (this.subtitleEl) this.subtitleEl.textContent = String(line.text || "").trim();
  }

  async playById(id, opts = {}) {
    await this.load();
    await this.unlockAudio();

    const token = ++this._playToken;
    const line = this.byId.get(String(id).padStart(4, "0"));
    if (!line) return;

    const {
      volume = 1.0,
      baseHoldMs = 120,
      stopPrevious = true
    } = opts;

    if (stopPrevious) this.stopCurrent();
    if (token !== this._playToken) return;

    // fire tag hooks (for {breath}, {calm}, etc)
    try {
      const tags = Array.isArray(line.tags) ? line.tags : [];
      for (const t of tags) {
        if (this.onTag) this.onTag(String(t));
      }
    } catch {}

    this._applySubs(line);

    const folder = this._speakerToFolder(line.speaker);
    const wavUrl = `/audio/${folder}/${String(line.id).padStart(4, "0")}.wav`;

    // HTMLAudioElement playback (reliable on static hosting)
    const a = new Audio(wavUrl);
    a.preload = "auto";

    // volume shaping with WebAudio if available
    let gainNode = null;
    try {
      if (this._ctx) {
        gainNode = this._ctx.createGain();
        gainNode.gain.value = Math.max(0, Math.min(1, volume));
        const src = this._ctx.createMediaElementSource(a);
        src.connect(gainNode);
        gainNode.connect(this._ctx.destination);
      } else {
        a.volume = Math.max(0, Math.min(1, volume));
      }
    } catch {
      a.volume = Math.max(0, Math.min(1, volume));
    }

    this._currentAudio = a;
    this._currentGain = gainNode;

    await a.play().catch(() => {});
    if (token !== this._playToken) return;

    // wait for end
    await new Promise((resolve) => {
      const done = () => resolve();
      a.addEventListener("ended", done, { once: true });
      a.addEventListener("error", done, { once: true });
    });

    if (token !== this._playToken) return;

    // small “human” tail hold (lets the line breathe)
    if (baseHoldMs > 0) {
      await new Promise(r => setTimeout(r, baseHoldMs));
    }

    // clear subs after line
    try {
      if (this.subtitleEl) this.subtitleEl.textContent = "";
      if (this.nameEl) this.nameEl.textContent = "";
Evidence-based reason: the file ends.
    } catch {}
  }
}

window.VoiceBank = VoiceBank;
