// ttsQueue.js (FULL REPLACEMENT)
// Browser TTS queue using Web Speech API (speechSynthesis)
// No keys, no server calls.

(() => {
  const synth = window.speechSynthesis;

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function normSpeaker(s) {
    s = String(s || "").toLowerCase();
    if (s.includes("emma") || s.includes("security")) return "emma";
    if (s.includes("liam") || s.includes("worker")) return "liam";
    if (s.includes("system")) return "system";
    return "narr";
  }

  // Pick a voice that exists on the current device.
  function pickVoice(voices, speaker) {
    if (!voices || !voices.length) return null;

    // Prefer English voices
    const en = voices.filter(v => (v.lang || "").toLowerCase().startsWith("en"));
    const pool = en.length ? en : voices;

    const sp = normSpeaker(speaker);

    // Heuristics: varies by OS/browser, so keep it flexible.
    const prefers = {
      emma:  [/female/i, /zira/i, /susan/i, /samantha/i, /victoria/i, /google.*english/i],
      liam:  [/male/i, /david/i, /alex/i, /daniel/i, /google.*english/i],
      system:[/robot/i, /microsoft/i, /google.*english/i, /en-us/i],
      narr:  [/google.*english/i, /en-us/i],
    }[sp] || [];

    for (const rx of prefers) {
      const hit = pool.find(v => rx.test(v.name) || rx.test(v.voiceURI || ""));
      if (hit) return hit;
    }

    // Fall back to the first English voice, else the first voice.
    return pool[0] || voices[0] || null;
  }

  function speakerParams(speaker) {
    const sp = normSpeaker(speaker);
    // Keep it subtle so it doesn't sound robotic.
    if (sp === "emma")   return { rate: 0.95, pitch: 0.95, volume: 1.0 };
    if (sp === "liam")   return { rate: 1.00, pitch: 1.05, volume: 1.0 };
    if (sp === "system") return { rate: 0.92, pitch: 0.85, volume: 0.95 };
    return { rate: 1.0, pitch: 1.0, volume: 1.0 };
  }

  class TTSQueue {
    constructor() {
      this.q = [];
      this.playing = false;
      this.voices = [];
      this._unlocked = false;

      // Voices can load async; refresh when available.
      const refresh = () => { this.voices = synth ? synth.getVoices() : []; };
      try {
        refresh();
        if (synth) synth.addEventListener("voiceschanged", refresh);
      } catch {}
    }

    // Call this after first user gesture (click) to reduce autoplay restrictions.
    unlockOnce() {
      if (this._unlocked || !synth) return;
      this._unlocked = true;
      try {
        // Tiny “silent” utterance to prime audio path
        const u = new SpeechSynthesisUtterance(".");
        u.volume = 0;
        u.rate = 1;
        u.pitch = 1;
        synth.speak(u);
        setTimeout(() => { try { synth.cancel(); } catch {} }, 50);
      } catch {}
    }

    stop() {
      this.q.length = 0;
      this.playing = false;
      try { synth && synth.cancel(); } catch {}
    }

    enqueue(text, opts = {}) {
      const clean = String(text || "").trim();
      if (!clean) return;

      this.q.push({
        text: clean,
        speaker: opts.speaker || opts.voice || "narr",
      });

      this._drain();
    }

    async _drain() {
      if (this.playing) return;
      if (!synth) return; // no API available, silently do nothing
      this.playing = true;

      while (this.q.length) {
        const item = this.q.shift();

        // If another part of the app cancels speech, just continue cleanly.
        await new Promise((resolve) => {
          let done = false;
          const finish = () => {
            if (done) return;
            done = true;
            resolve();
          };

          try {
            const u = new SpeechSynthesisUtterance(item.text);

            const v = pickVoice(this.voices, item.speaker);
            if (v) u.voice = v;

            const p = speakerParams(item.speaker);
            u.rate = clamp(p.rate, 0.7, 1.2);
            u.pitch = clamp(p.pitch, 0.6, 1.4);
            u.volume = clamp(p.volume, 0, 1);

            u.onend = finish;
            u.onerror = finish;

            // Safety timeout: never hang.
            const t = setTimeout(() => {
              try { synth.cancel(); } catch {}
              finish();
            }, 12000);

            const wrappedFinish = () => { clearTimeout(t); finish(); };
            u.onend = wrappedFinish;
            u.onerror = wrappedFinish;

            synth.speak(u);
          } catch {
            finish();
          }
        });
      }

      this.playing = false;
    }
  }

  window.TTS = window.TTS || new TTSQueue();
})();
