// music_player.js
// Stem mixer for /music/*.ogg plus scene tracks FinalHack.WAV / Escaped.WAV
// Filename mapping (confirmed by user):
// 01_Bed_Pad.ogg = always-on simulation bed
// 02_System_Drone_Dramatic.ogg = compliant overlay
// 03_System_Stabs_Takeover.ogg = very compliant overlay
// 04_Security_Patrol_Controlled.ogg = balanced overlay (tasks 1-10)
// 05_Security_Click_Edge.ogg = balanced overlay (tasks 11-20)
// 06_Worker_Motif_Loose.ogg = resistant overlay
// 07_Worker_Air_Open.ogg = very resistant overlay
// 08_Sub_Bass_Confinement.ogg = progression overlay (task1 quiet; +3% per task finished; cap 80%)
// 09_Task_Heartbeat_Pressure.ogg = pressure overlay (driven by (resistance + tasksCompleted - compliance)+10%)
// 10_Micro_Glitch_Events.ogg = microglitch overlay (same drive as 09 but lighter)
// FinalHack.WAV / Escaped.WAV = scene tracks (no ogg stems while active)

(() => {
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  const FILES = {
    // stems
    s1:  "/music/01_Bed_Pad.ogg",
    s2:  "/music/02_System_Drone_Dramatic.ogg",
    s3:  "/music/03_System_Stabs_Takeover.ogg",
    s4:  "/music/04_Security_Patrol_Controlled.ogg",
    s5:  "/music/05_Security_Click_Edge.ogg",
    s6:  "/music/06_Worker_Motif_Loose.ogg",
    s7:  "/music/07_Worker_Air_Open.ogg",
    s8:  "/music/08_Sub_Bass_Confinement.ogg",
    s9:  "/music/09_Task_Heartbeat_Pressure.ogg",
    s10: "/music/10_Micro_Glitch_Events.ogg",
    // scene
    finalHack: "/music/FinalHack.WAV",
    escaped:   "/music/Escaped.WAV",
  };

  class StemMixer {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.nodes = new Map(); // key -> { audio, gain }
      this.unlocked = false;
      this.loaded = false;

      this.mode = {
        scene: "landing", // landing | sim | task | finalhack | escaped
        compliance: 0,
        resistance: 0,
        tasksDone: 0,
        taskIndex: 0, // 1..20 (current task ordinal), 0 if none started
      };
    }

    async unlock() {
      if (this.unlocked) return;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.92;
      this.master.connect(this.ctx.destination);

      // iOS/Chrome unlock
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      g.gain.value = 0.00001;
      o.connect(g); g.connect(this.master);
      o.start(); o.stop(this.ctx.currentTime + 0.02);

      this.unlocked = true;
    }

    async loadAll() {
      if (this.loaded) return;
      if (!this.unlocked) await this.unlock();
      if (!this.ctx) return;

      // create nodes lazily; just mark loaded if AudioContext exists
      for (const k of Object.keys(FILES)) {
        this._ensure(k);
      }
      this.loaded = true;
      this._apply();
    }

    _ensure(key) {
      if (this.nodes.has(key)) return this.nodes.get(key);
      const url = FILES[key];
      if (!url || !this.ctx) return null;

      const audio = new Audio();
      audio.src = url;
      audio.loop = (key.startsWith("s")); // stems loop, scene tracks loop too (safe for long sessions)
      audio.crossOrigin = "anonymous";
      audio.preload = "auto";

      const src = this.ctx.createMediaElementSource(audio);
      const gain = this.ctx.createGain();
      gain.gain.value = 0.0;
      src.connect(gain);
      gain.connect(this.master);

      const node = { audio, gain };
      this.nodes.set(key, node);
      return node;
    }

    _start(key) {
      const n = this._ensure(key);
      if (!n) return;
      if (n.audio.paused) {
        try { n.audio.currentTime = n.audio.currentTime || 0; } catch {}
        const p = n.audio.play();
        if (p && typeof p.catch === "function") p.catch(()=>{});
      }
    }

    _stop(key) {
      const n = this.nodes.get(key);
      if (!n) return;
      try { n.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03); } catch {}
      try { n.audio.pause(); } catch {}
    }

    _fade(key, target, ms=320) {
      const n = this.nodes.get(key);
      if (!n || !this.ctx) return;
      const t = this.ctx.currentTime;
      const v = clamp(Number(target)||0, 0, 1);
      const tc = clamp(ms / 1000, 0.06, 1.5);
      try { n.gain.gain.setTargetAtTime(v, t, tc / 6); } catch {}
    }

    stopAll() {
      for (const k of this.nodes.keys()) this._stop(k);
    }

    setScene(scene) {
      this.mode.scene = scene || "landing";
      this._apply();
    }

    setScores(compliance, resistance) {
      this.mode.compliance = Math.max(0, Number(compliance) || 0);
      this.mode.resistance = Math.max(0, Number(resistance) || 0);
      this._apply();
    }

    setTasksDone(n) {
      this.mode.tasksDone = Math.max(0, Math.floor(Number(n) || 0));
      this._apply();
    }

    setTaskIndex(n) {
      this.mode.taskIndex = Math.max(0, Math.floor(Number(n) || 0));
      this._apply();
    }

    setState(state = {}) {
      if (!state || typeof state !== "object") return;
      if (state.scene) this.mode.scene = state.scene;
      if (state.compliance != null) this.mode.compliance = Math.max(0, Number(state.compliance) || 0);
      if (state.resistance != null) this.mode.resistance = Math.max(0, Number(state.resistance) || 0);
      if (state.tasksDone != null) this.mode.tasksDone = Math.max(0, Math.floor(Number(state.tasksDone) || 0));
      if (state.taskIndex != null) this.mode.taskIndex = Math.max(0, Math.floor(Number(state.taskIndex) || 0));
      this._apply();
    }

    _apply() {
      if (!this.unlocked || !this.loaded) return;
      const s = this.mode.scene;

      if (s === "landing") {
        // Landing must be SILENT. (Audio is unlocked elsewhere, but we do not play any music here.)
        // Ensure any previously-started stems are faded out and stopped.
        for (const k of this.nodes.keys()) {
          if (String(k).startsWith("s") || String(k).startsWith("scene")) this._fade(k, 0.0, 220);
        }
        // Stop after a short grace to prevent “stuck” playback.
        setTimeout(() => {
          try {
            for (const k of this.nodes.keys()) {
              if (String(k).startsWith("s") || String(k).startsWith("scene")) this._stop(k);
            }
          } catch {}
        }, 260);
        return;
      }

      
