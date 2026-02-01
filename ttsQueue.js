// ttsQueue.js (NON-module)
// Queue-based Azure TTS player via /functions/api/tts
(() => {
  const API_URL = "/functions/api/tts";

  function clamp01(v){ v = Number(v); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 1; }

  class TTSQueue {
    constructor() {
      this._q = [];
      this._busy = false;
      this._audio = null;
      this._unlocked = false;
      this._stopToken = 0;
      this.defaultVolume = 1;
    }

    async unlock() {
      if (this._unlocked) return;
      this._unlocked = true;

      // Best effort: tiny muted play to unlock autoplay restrictions.
      try {
        const a = new Audio();
        a.muted = true;
        a.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=";
        await a.play().catch(() => {});
        a.pause();
      } catch {}
    }

    stop() {
      this._stopToken++;
      this._q.length = 0;
      try {
        if (this._audio) {
          this._audio.pause();
          this._audio.currentTime = 0;
        }
      } catch {}
      this._audio = null;
      this._busy = false;
    }

    enqueue(payload) {
      const item = { ...payload };
      if (!item || !item.voice || !String(item.text || "").trim()) return Promise.resolve();

      return new Promise((resolve) => {
        this._q.push({ item, resolve });
        this._drain();
      });
    }

    async _drain() {
      if (this._busy) return;
      this._busy = true;

      while (this._q.length) {
        const myToken = this._stopToken;
        const { item, resolve } = this._q.shift();

        try {
          if (myToken !== this._stopToken) { resolve(); continue; }

          // Ensure autoplay unlock happened at least once
          await this.unlock();

          const res = await fetch(API_URL, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(item),
          });

          if (!res.ok) {
            resolve();
            continue;
          }

          // If server returns JSON by mistake (mis-route / error), don’t try to play it.
          const ct = (res.headers.get("content-type") || "").toLowerCase();
          if (ct.includes("application/json")) {
            // Consume it so connection closes cleanly
            try { await res.text(); } catch {}
            resolve();
            continue;
          }

          const buf = await res.arrayBuffer();
          const mime = ct || "audio/mpeg";
          const blob = new Blob([buf], { type: mime });
          const url = URL.createObjectURL(blob);

          await new Promise((r) => {
            const a = new Audio(url);
            this._audio = a;

            a.volume = clamp01(item.volume ?? this.defaultVolume);
            if (typeof item.rate === "number") {
              // Optional: client-side rate tweak if you ever want it (not required)
              a.playbackRate = Math.max(0.6, Math.min(1.6, item.rate));
            }

            let doneCalled = false;
            const done = () => {
              if (doneCalled) return;
              doneCalled = true;
              try { URL.revokeObjectURL(url); } catch {}
              r();
            };

            a.addEventListener("ended", done, { once:true });
            a.addEventListener("error", done, { once:true });

            // Failsafe: if audio hangs, resolve anyway
            const maxMs = Math.max(2500, Math.min(25000, (String(item.text).length * 80)));
            const t = setTimeout(done, maxMs);
            const wrapDone = () => { clearTimeout(t); done(); };
            a.removeEventListener("ended", done);
            a.removeEventListener("error", done);
            a.addEventListener("ended", wrapDone, { once:true });
            a.addEventListener("error", wrapDone, { once:true });

            a.play().catch(wrapDone);
          });

          this._audio = null;
          resolve();
        } catch {
          resolve();
        }
      }

      this._busy = false;
    }
  }

  window.TTS = new TTSQueue();
})();
