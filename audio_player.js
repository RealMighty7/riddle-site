// audio_player.js
// Cloudflare Pages friendly: plays /audio/<speakerFolder>/<id>.wav
// Loads /data/voices.json for subtitle + tag timing (basic).
//
// Improvements:
// - reliable browser unlock via AudioContext
// - race-safe playback (token)
// - stopCurrent() fully cancels + resets
// - optional tag hooks (pause/beat already affect hold; add SFX later)

const TAG_RE = /\{[a-zA-Z0-9_]+\}/g;

function stripTags(text) {
  return String(text || "").replace(TAG_RE, "").replace(/\s+/g, " ").trim();
}

function speakerToFolder(speaker) {
  const s = String(speaker || "").toLowerCase();
  if (s.includes("emma")) return "emma";
  if (s.includes("liam")) return "liam";
  if (s.includes("system")) return "system";
  if (s.includes("ui")) return "ui";
  return "misc";
}

// Extracts tags like {pause_500}, {pause}, {beat_350}, {beat}, {breath}, {calm}
function extractTags(textRaw) {
  const raw = String(textRaw || "");
  const tags = [];
  for (const m of raw.matchAll(/\{([a-zA-Z0-9_]+)\}/g)) {
    tags.push(m[1]);
  }
  return tags;
}

// {pause_500}, {pause}, {beat_350}, {beat}
function extraDelayFromRaw(textRaw) {
  const t = String(textRaw || "");
  let ms = 0;

  for (const m of t.matchAll(/\{pause_(\d{1,4})\}/g)) ms += Number(m[1] || 0);
  if (/\{pause\}/.test(t)) ms += 250;

  for (const m of t.matchAll(/\{beat_(\d{1,4})\}/g)) ms += Number(m[1] || 0);
  if (/\{beat\}/.test(t)) ms += 350;

  return Math.max(0, Math.min(ms, 2500));
}

function readableFallbackMs(cleanText) {
  const s = String(cleanText || "");
  return Math.max(900, Math.min(4500, s.length * 35));
}

export class VoiceBank {
  constructor({
    voicesUrl = "/data/voices.json",
    // Optional hook: (tagName, {id, speaker, folder, textRaw, clean}) => void
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

    // Unlock helpers
    this._ctx = null;
    this._ctxUnlocked = false;
  }

  bindSubtitleUI({ nameEl, subtitleEl }) {
    this.nameEl = nameEl || null;
    this.subtitleEl = subtitleEl || null;
  }

  async load() {
    if (this.loaded) return;

    const res = await fetch(this.voicesUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load voices.json: ${res.status}`);

    const data = await res.json();
    const lines = Array.isArray(data) ? data : data.lines;

    if (!Array.isArray(lines)) {
      throw new Error("voices.json format invalid (missing lines array)");
    }

    for (const line of lines) {
      if (!line || !line.id) continue;
      this.byId.set(String(line.id).padStart(4, "0"), line);
    }

    this.loaded = true;
  }

  // Call this once after the first user click to unlock audio on browsers.
  async unlockAudio() {
    // AudioContext unlock tends to be the most reliable across browsers.
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;

      if (!this._ctx) this._ctx = new Ctx();
      if (this._ctx.state === "suspended") await this._ctx.resume();

      // Play a 1-sample silent buffer to fully unlock in iOS/Safari cases.
      const buf = this._ctx.createBuffer(1, 1, 22050);
      const src = this._ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this._ctx.destination);
      src.start(0);
      this._ctxUnlocked = true;
    } catch {
      // ignore; user-triggered <audio>.play will still work in many cases
    }
  }

  stopCurrent() {
    this._playToken++; // invalidate any pending resolves/listeners
    const a = this._currentAudio;
    this._currentAudio = null;

    if (a) {
      try {
        a.onended = null;
        a.onerror = null;
        a.pause();
        a.currentTime = 0;
        a.src = ""; // helps cancel download on some browsers
      } catch {}
    }
  }

  async playById(id, { volume = 1.0, baseHoldMs = 200, stopPrevious = true } = {}) {
    if (!this.loaded) await this.load();

    const key = String(id).padStart(4, "0");
    const line = this.byId.get(key);

    if (!line) {
      if (this.nameEl) this.nameEl.textContent = "";
      if (this.subtitleEl) this.subtitleEl.textContent = `(missing line ${key})`;
      await new Promise(r => setTimeout(r, 800));
      return;
    }

    const speaker = line.speaker || "System";
    const folder = speakerToFolder(speaker);
    const url = `/audio/${folder}/${key}.wav`;

    const textRaw = line.text_raw ?? line.text ?? "";
    const clean = line.text ?? stripTags(textRaw);

    // Update subtitle UI immediately
    if (this.nameEl) this.nameEl.textContent = speaker;
    if (this.subtitleEl) this.subtitleEl.textContent = clean;

    const tags = extractTags(textRaw);
    if (this.onTag && tags.length) {
      for (const t of tags) {
        // Only fire “pure” tags; pause/beat are already handled as timing,
        // but still exposed here for effects if you want.
        try {
          this.onTag(t, { id: key, speaker, folder, textRaw, clean });
        } catch {}
      }
    }

    const extraHold = extraDelayFromRaw(textRaw);
    const fallbackMs = readableFallbackMs(clean);

    if (stopPrevious) this.stopCurrent();

    const token = ++this._playToken;

    const audio = new Audio(url);
    this._currentAudio = audio;

    // Better defaults for VO
    audio.preload = "auto";
    audio.crossOrigin = "anonymous"; // safe for same-origin; helps if you later analyze
    audio.volume = Math.max(0, Math.min(1, volume));

    // Optional: if you want to guarantee unlock first, you can auto-call unlockAudio()
    // but ONLY after user interaction. So we don't do it here.

    return new Promise((resolve) => {
      let settled = false;

      const done = (ms) => {
        if (settled) return;
        // ignore stale plays
        if (token !== this._playToken) return;
        settled = true;
        setTimeout(() => {
          if (token !== this._playToken) return;
          resolve();
        }, ms);
      };

      audio.onended = () => done(baseHoldMs + extraHold);
      audio.onerror = () => done(fallbackMs + extraHold);

      audio.play().catch(() => done(fallbackMs + extraHold));
    });
  }
}
