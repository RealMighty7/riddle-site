// ttsQueue.js (NON-module)
// Browser TTS queue using Web Speech API (speechSynthesis)
// Drop-in replacement for the old Azure /api/tts queue.
// Supports: TTS.unlock(), TTS.stop(), TTS.enqueue({ text, voice, rate, pitch, volume })

(() => {
  const synth = window.speechSynthesis;

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function clamp01(v) { v = Number(v); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 1; }

  function normSpeakerFromVoice(v) {
    const s = String(v || "").toLowerCase();
    if (s.includes("emma") || s.includes("security")) return "emma";
    if (s.includes("liam") || s.includes("worker")) return "liam";
    if (s.includes("system")) return "system";
    return "narr";
  }

  function speakerDefaults(speaker) {
    const sp = normSpeakerFromVoice(speaker);
    // Subtle differences; keep within natural ranges.
    if (sp === "emma")   return { rate: 0.95, pitch: 0.95, volume: 1.0 };
    if (sp === "liam")   return { rate: 1.00, pitch: 1.05, volume: 1.0 };
    if (sp === "system") return { rate: 0.92, pitch: 0.85, volume: 0.95 };
    return { rate: 1.0, pitch: 1.0, volume: 1.0 };
  }

  function pickVoice(voices, speakerHint) {
    if (!voices || !voices.length) return null;

    const en = voices.filter(v => (v.lang || "").toLowerCase().startsWith("en"));
    const pool = en.length ? en : voices;

    const sp = normSpeakerFromVoice(speakerHint);
    const prefers = {
      emma:  [/zira/i, /susan/i, /samantha/i, /victoria/i, /female/i, /google.*english/i],
      liam:  [/david/i, /alex/i, /daniel/i, /male/i, /google.*english/i],
      system:[/microsoft/i, /robot/i, /google.*english/i, /en-us/i],
      narr:  [/google.*english/i, /en-us/i],
    }[sp] || [];

    for (const rx of prefers) {
      const hit = pool.find(v => rx.test(v.name) || rx.test(v.voiceURI || ""));
      if (hit) return hit;
    }
    return pool[0] || voices[0] || null;
  }

  class TTSQueue {
    constructor() {
      this._q = [];
      this._busy = false;
      this._unlocked = false;
      this._voices = [];
      this._stopToken = 0;

      const refresh = () => {
        try { this._voices = synth ? synth.getVoices() : []; } catch { this._voices = []; }
      };
      refresh();
      try { synth && synth.addEventListener("voiceschanged", refresh); } catch {}
    }

    // Keep the same public API as the old queue.
    async unlock() {
      if (this._unlocked || !synth) return;
      this._unlocked = true;
      try {
        // Tiny silent utterance to prime the audio path.
        const u = new SpeechSynthesisUtterance(".");
        u.volume = 0;
        u.rate = 1;
        u.pitch = 1;
        synth.speak(u);
        setTimeout(() => { try { synth.cancel(); } catch {} }, 50);
      } catch {}
    }

    // Alias for newer code paths
    async unlockOnce() { return this.unlock(); }

    stop() {
      this._q.length = 0;
      this._stopToken++;
      this._busy = false;
      try { synth && synth.cancel(); } catch {}
    }

    // Accepts either object { text, voice, rate, pitch, volume } or (text, { speaker })
    // Returns a promise that resolves when the utterance finishes (or is skipped).
    enqueue(textOrItem, opts = null) {
      const stopTokenAtEnqueue = this._stopToken;

      const item = (typeof textOrItem === "object" && textOrItem)
        ? textOrItem
        : { text: String(textOrItem || ""), voice: (opts && (opts.speaker || opts.voice)) || "" };

      const text = String(item?.text || "").trim();
      if (!text || !synth) return Promise.resolve();

      const voiceHint = item?.voice || item?.speaker || "narr";
      const defaults = speakerDefaults(voiceHint);

      const rate = item?.rate == null ? defaults.rate : item.rate;
      const pitch = item?.pitch == null ? defaults.pitch : item.pitch;
      const volume = item?.volume == null ? defaults.volume : item.volume;

      return new Promise((resolve) => {
        this._q.push({
          text,
          voiceHint,
          rate: clamp(rate, 0.7, 1.2),
          pitch: clamp(pitch, 0.6, 1.4),
          volume: clamp01(volume),
          resolve,
          stopTokenAtEnqueue,
        });
        this._drain();
      });
    }

    _drain() {
      if (this._busy) return;
      if (!synth) return;
      this._busy = true;

      const next = () => {
        // If stopped, flush resolves.
        if (!this._q.length) { this._busy = false; return; }

        const job = this._q.shift();
        if (!job) { this._busy = false; return; }

        // If stop() happened after enqueue, skip.
        if (job.stopTokenAtEnqueue !== this._stopToken) {
          try { job.resolve(); } catch {}
          return next();
        }

        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          try { job.resolve(); } catch {}
          next();
        };

        try {
          const u = new SpeechSynthesisUtterance(job.text);

          const v = pickVoice(this._voices, job.voiceHint);
          if (v) u.voice = v;

          u.rate = job.rate;
          u.pitch = job.pitch;
          u.volume = job.volume;

          // Safety timeout so we never hang the game flow.
          const t = setTimeout(() => {
            try { synth.cancel(); } catch {}
            finish();
          }, 12000);

          u.onend = () => { clearTimeout(t); finish(); };
          u.onerror = () => { clearTimeout(t); finish(); };

          synth.speak(u);
        } catch {
          finish();
        }
      };

      next();
    }
  }

  window.TTS = window.TTS || new TTSQueue();
})();
