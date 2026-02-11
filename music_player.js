// music_player.js
// Simple stem mixer / scene player.
// IMPORTANT: Landing MUST be silent. No track should autoplay on load.
// Music starts only when main.js enters sim (scene = "sim").
//
// Exposes: window.Music with methods:
//   loadAll(), unlock(), setScene(scene), stopAll(), setTasksDone(n), setScores(c,r)
//
// This intentionally avoids fancy scheduling; it is built for reliability.

(() => {
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  // Map your files here (paths relative to site root)
  const FILES = {
    bed:        "music/01_Bed_Pad.ogg",
    system:     "music/02_System_Drone.ogg",
    worker:     "music/03_Worker_Pulse.ogg",
    tension:    "music/04_Tension_Rise.ogg",
    finalHack:  "music/FinalHack.WAV",
    escaped:    "music/Escaped.WAV",
  };

  class MusicController {
    constructor() {
      this.ctx = null;
      this.nodes = new Map(); // key -> { audio, src, gain }
      this.unlocked = false;
      this.loaded = false;

      this.state = {
        scene: "landing",
        compliance: 0,
        resistance: 0,
        tasksDone: 0,
      };
    }

    _ensureCtx() {
      if (this.ctx) return this.ctx;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      return this.ctx;
    }

    async loadAll() {
      // Create audio elements (no play) and wire through WebAudio gains.
      const ctx = this._ensureCtx();
      if (!ctx) return;

      const makeNode = (key, url) => {
        if (this.nodes.has(key)) return;
        const audio = new Audio(url);
        audio.loop = true;
        audio.preload = "auto";
        audio.crossOrigin = "anonymous";
        audio.volume = 1;

        const src = ctx.createMediaElementSource(audio);
        const gain = ctx.createGain();
        gain.gain.value = 0;

        src.connect(gain).connect(ctx.destination);
        this.nodes.set(key, { audio, src, gain });
      };

      makeNode("bed", FILES.bed);
      makeNode("system", FILES.system);
      makeNode("worker", FILES.worker);
      makeNode("tension", FILES.tension);

      // scene one-shots (loop = true but we will stop immediately after scene changes)
      makeNode("finalHack", FILES.finalHack);
      makeNode("escaped", FILES.escaped);

      this.loaded = true;
    }

    async unlock() {
      // Called from a user gesture. Does NOT start music.
      const ctx = this._ensureCtx();
      if (!ctx) return;
      try {
        if (ctx.state === "suspended") await ctx.resume();
      } catch {}
      this.unlocked = true;

      // Touch-play a muted element to satisfy Safari/Chrome oddities, then stop.
      // This is defensive; it should not be audible.
      try {
        const n = this.nodes.get("bed");
        if (n) {
          n.gain.gain.value = 0;
          const p = n.audio.play();
          if (p && typeof p.catch === "function") p.catch(() => {});
          n.audio.pause();
        }
      } catch {}

      this._apply();
    }

    stopAll() {
      for (const k of this.nodes.keys()) this._stop(k);
    }

    setScene(scene) {
      this.state.scene = String(scene || "landing");
      this._apply();
    }
    setScores(compliance, resistance) {
      this.state.compliance = Math.max(0, Number(compliance) || 0);
      this.state.resistance = Math.max(0, Number(resistance) || 0);
      this._apply();
    }
    setTasksDone(n) {
      this.state.tasksDone = Math.max(0, Math.floor(Number(n) || 0));
      this._apply();
    }

    _play(key) {
      const n = this.nodes.get(key);
      if (!n) return;
      try {
        if (n.audio.paused) {
          const p = n.audio.play();
          if (p && typeof p.catch === "function") p.catch(() => {});
        }
      } catch {}
    }
    _stop(key) {
      const n = this.nodes.get(key);
      if (!n) return;
      try { n.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03); } catch {}
      try { n.audio.pause(); } catch {}
    }
    _fade(key, v, ms=300) {
      const n = this.nodes.get(key);
      if (!n || !this.ctx) return;
      const t = this.ctx.currentTime;
      const target = clamp(Number(v)||0, 0, 1);
      const tc = clamp(ms/1000, 0.06, 1.2);
      try { n.gain.gain.setTargetAtTime(target, t, tc/5); } catch {}
      if (target > 0.0001) this._play(key);
      if (target <= 0.0001) {
        // stop after fade to prevent “stuck” playback
        setTimeout(() => { try { this._stop(key); } catch {} }, Math.max(220, ms + 40));
      }
    }

    _apply() {
      if (!this.loaded || !this.unlocked || !this.ctx) return;

      const s = this.state.scene;

      // Always guarantee landing is silent.
      if (s === "landing") {
        this._fade("bed", 0, 180);
        this._fade("system", 0, 180);
        this._fade("worker", 0, 180);
        this._fade("tension", 0, 180);
        this._fade("finalHack", 0, 180);
        this._fade("escaped", 0, 180);
        return;
      }

      // Scores shape layers a bit.
      const c = this.state.compliance;
      const r = this.state.resistance;
      const done = this.state.tasksDone;

      // Baseline sim bed
      let bed = 0.35;
      let sys = 0.00;
      let worker = 0.00;
      let tension = 0.00;

      // Resistance adds tension & system presence.
      tension = clamp(0.05 + r * 0.02, 0, 0.55);
      sys = clamp(0.02 + r * 0.012, 0, 0.35);

      // Compliance makes the worker layer a little louder (player “in control”).
      worker = clamp(0.04 + c * 0.02, 0, 0.45);

      // Tasks completed slightly raise the bed to feel like escalation.
      bed = clamp(bed + done * 0.01, 0.25, 0.55);

      if (s === "sim") {
        this._fade("bed", bed, 520);
        this._fade("system", sys, 520);
        this._fade("worker", worker, 520);
        this._fade("tension", tension * 0.65, 520);
        this._fade("finalHack", 0, 240);
        this._fade("escaped", 0, 240);
        return;
      }

      if (s === "task") {
        this._fade("bed", clamp(bed + 0.06, 0, 0.65), 420);
        this._fade("system", clamp(sys + 0.08, 0, 0.55), 420);
        this._fade("worker", clamp(worker + 0.04, 0, 0.55), 420);
        this._fade("tension", clamp(tension + 0.18, 0, 0.75), 420);
        this._fade("finalHack", 0, 240);
        this._fade("escaped", 0, 240);
        return;
      }

      if (s === "finalhack" || s === "hack") {
        // Kill stems and play scene track.
        this._fade("bed", 0, 260);
        this._fade("system", 0, 260);
        this._fade("worker", 0, 260);
        this._fade("tension", 0, 260);
        this._fade("escaped", 0, 260);
        this._fade("finalHack", 0.85, 380);
        return;
      }

      if (s === "escaped") {
        this._fade("bed", 0, 260);
        this._fade("system", 0, 260);
        this._fade("worker", 0, 260);
        this._fade("tension", 0, 260);
        this._fade("finalHack", 0, 260);
        this._fade("escaped", 0.9, 380);
        return;
      }

      // Unknown scene -> silence for safety
      this.setScene("landing");
    }
  }

  window.Music = new MusicController();
})();
