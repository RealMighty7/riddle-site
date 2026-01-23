// audio_player.js (NON-module script)

// ✅ no "export"
class VoiceBank {
  constructor({
    voicesUrl = "/data/voices.json",
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

  // ... keep the rest of your VoiceBank methods here ...
}

// ✅ attach AFTER the class
window.VoiceBank = VoiceBank;
