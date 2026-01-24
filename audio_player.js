// audio_player.js (NON-module script)

class VoiceBank {
  constructor({
    // ✅ matches your folder: /audio/data/voices.json
    voicesUrl = "/audio/data/voices.json",
    // Optional hook: (tagName, ctx) => void
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
    if (!res.ok) {
      throw new Error(`Failed to load voices.json: ${res.status} (${this.voicesUrl})`);
    }

    // ✅ nicer error if server returns HTML
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
