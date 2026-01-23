// audio_player.js
// Plain script (NOT a module). Safe for <script src="..."></script>

class VoiceBank {
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
    if (!res.ok) {
      throw new Error(`Failed to load voices.json: ${res.status}`);
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

  stopCurrent() {
    if (this._currentAudio) {
      try { this._currentAudio.pause(); } catch {}
      this._currentAudio = null;
    }
  }

  async playById(id, {
    volume = 1,
    baseHoldMs = 200,
    stopPrevious = true
  } = {}) {
    if (!this.loaded) await this.load();

    const key = String(id).padStart(4, "0");
    const line = this.byId.get(key);
    if (!line) return;

    const speaker = line.speaker || "System";
    const folder = speaker.toLowerCase().includes("emma") ? "emma"
                  : speaker.toLowerCase().includes("liam") ? "liam"
                  : speaker.toLowerCase().includes("system") ? "system"
                  : "misc";

    const url = `/audio/${folder}/${key}.wav`;

    if (this.nameEl) this.nameEl.textContent = speaker;
    if (this.subtitleEl) this.subtitleEl.textContent = line.text || "";

    if (stopPrevious) this.stopCurrent();

    const audio = new Audio(url);
    this._currentAudio = audio;
    audio.volume = volume;

    return new Promise((resolve) => {
      audio.addEventListener("ended", () => resolve());
      audio.addEventListener("error", () => resolve());
      audio.play().catch(() => resolve());
    });
  }
}

// ✅ expose globally (THIS is where it goes)
window.VoiceBank = VoiceBank;
