// ttsQueue.js (NON-module)
// Queue-based Azure TTS player via /api/tts (Pages Function)
(() => {
  const API_URL = "/api/tts";

  function clamp01(v){ v = Number(v); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 1; }

  class TTSQueue {
    constructor() {
      this._q = [];
      this._busy = false;
      this._audio = null;
      this._unlocked = false;
      this._stopToken = 0;
    }

    async unlock() {
      if (this._unlocked) return;
      this._unlocked = true;

      // best effort: tiny muted play
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
      // payload: { voice, text, style?, rate?, pitch?, volume? }
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

          const res = await fetch(API_URL, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(item),
          });

          // If TTS is disabled/misconfigured, the endpoint returns 204.
          // Treat that as "no audio" (but don't error / don't stall).
          if (res.status === 204) { resolve(); continue; }
          
          if (!res.ok) { resolve(); continue; }
          
          const blob = await res.blob();
          if (!blob || blob.size < 64) { // guard empty/invalid audio
            resolve();
            continue;
          }
          
          const url = URL.createObjectURL(blob);
          
          await new Promise((r) => {
            const a = new Audio(url);
            this._audio = a;
            a.volume = clamp01(item.volume ?? 1);
          
            let settled = false;
            const done = () => {
              if (settled) return;
              settled = true;
              try { URL.revokeObjectURL(url); } catch {}
              r();
            };
          
            // Safety timeout so we never hang if the browser never fires ended/error
            const t = setTimeout(done, 12000);
          
            a.addEventListener("ended", () => { clearTimeout(t); done(); }, { once:true });
            a.addEventListener("error", () => { clearTimeout(t); done(); }, { once:true });
          
            a.play().catch(() => { clearTimeout(t); done(); });
          });

            a.addEventListener("ended", done, { once:true });
            a.addEventListener("error", done, { once:true });

            a.play().catch(done);
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
