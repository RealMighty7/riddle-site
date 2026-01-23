// audio_player.js
// Cloudflare Pages friendly: plays /audio/<speakerFolder>/<id>.wav
// Loads /data/voices.json for subtitle + tag timing.

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
  constructor({ voicesUrl = "/data/voices.json" } = {}) {
    this.voicesUrl = voicesUrl;
    this.byId = new Map();
    this.loaded = false;

    this.subtitleEl = null;
    this.nameEl = null;

    this._currentAudio = null;
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

    if (!Array.isArray(lines)) throw new Error("voices.json format invalid (missing lines array)");

    for (const line of lines) {
      if (!line || !line.id) continue;
      this.byId.set(String(line.id), line);
    }

    this.loaded = true;
  }

  // Call this once after the first user click to unlock audio on browsers.
  async unlockAudio() {
    try {
      const a = new Audio();
      a.muted = true;
      // tiny silent play attempt
      await a.play();
      a.pause();
    } catch {
      // ignore; subsequent user-triggered play still works
    }
  }

  stopCurrent() {
    if (this._currentAudio) {
      try { this._currentAudio.pause(); } catch {}
      this._currentAudio = null;
    }
  }

  async playById(id, { volume = 1.0, baseHoldMs = 200, stopPrevious = true } = {}) {
    if (!this.loaded) await this.load();

    const key = String(id).padStart(4, "0");
    const line = this.byId.get(key);

    if (!line) {
      // show something, don’t crash
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

    // Update subtitle UI
    if (this.nameEl) this.nameEl.textContent = speaker;
    if (this.subtitleEl) this.subtitleEl.textContent = clean;

    const extraHold = extraDelayFromRaw(textRaw);
    const fallbackMs = readableFallbackMs(clean);

    if (stopPrevious) this.stopCurrent();

    const audio = new Audio(url);
    this._currentAudio = audio;
    audio.volume = volume;

    return new Promise((resolve) => {
      let settled = false;
      const done = (ms) => {
        if (settled) return;
        settled = true;
        // only clear if we're still showing the same line
        setTimeout(() => resolve(), ms);
      };

      audio.addEventListener("ended", () => done(baseHoldMs + extraHold));
      audio.addEventListener("error", () => done(fallbackMs + extraHold));

      audio.play().catch(() => done(fallbackMs + extraHold));
    });
  }
}
