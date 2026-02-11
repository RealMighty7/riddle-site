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
        // Landing campaign: subtle bed + microglitch so the page feels "alive" before entry.
        // Keep volumes low; this should not fight dialogue later.
        // (Requires unlock + loadAll)
        const stems = ["s1","s10"];
        stems.forEach(k => this._start(k));
        this._fade("s1", 0.22, 420);
        this._fade("s10", 0.05, 420);
        // Ensure scene tracks are stopped
        this._stop("finalHack");
        this._stop("escaped");
        return;
      }

      // Final scenes: kill stems, only play scene track
      if (s === "finalhack" || s === "escaped") {
        for (const k of Object.keys(FILES)) {
          if (k !== "finalHack" && k !== "escaped") this._stop(k);
        }
        const k = (s === "finalhack") ? "finalHack" : "escaped";
        this._start(k);
        this._fade(k, 0.92, 420);
        return;
      }

      // Sim/task scenes: start stems we might need
      const stems = ["s1","s2","s3","s4","s5","s6","s7","s8","s9","s10"];
      stems.forEach(k => this._start(k));

      const c = this.mode.compliance;
      const r = this.mode.resistance;
      const tDone = this.mode.tasksDone;
      const tIndex = this.mode.taskIndex;

      // ratio: 0 compliant, 1 resistant
      const total = c + r;
      const ratio = total ? (r / total) : 0.5;

      // thresholds tuned to feel reactive without flipping constantly
      const moreCompliant = ratio <= 0.45;
      const veryCompliant = ratio <= 0.22;

      const moreResistant = ratio >= 0.55;
      const veryResistant = (r >= (c + 4)) || ratio >= 0.82; // “no compliance / very resistant” feel

      const balanced = !moreCompliant && !moreResistant;

      // 01 bed always
      this._fade("s1", 0.62, 360);

      // Compliance overlays
      this._fade("s2", moreCompliant ? 0.22 : 0.0, 360);
      this._fade("s3", veryCompliant ? 0.18 : 0.0, 360);

      // Balanced overlays (04 tasks 1-10, 05 tasks 11-20)
      const use4 = balanced && tIndex > 0 && tIndex <= 10;
      const use5 = balanced && tIndex > 10;
      this._fade("s4", use4 ? 0.22 : 0.0, 360);
      this._fade("s5", use5 ? 0.20 : 0.0, 360);

      // Resistance overlays
      const s6v = moreResistant ? (veryResistant ? 0.07 : 0.22) : 0.0;
      const s7v = veryResistant ? 0.26 : 0.0;
      this._fade("s6", s6v, 360);
      this._fade("s7", s7v, 360);

      // 08 progression overlay:
      // Starting at task 1: very quiet overlay; each task finished +3%; cap 80% at task 20.
      let prog = 0.0;
      if (tIndex >= 1) {
        prog = clamp(0.02 + (tDone * 0.03), 0.02, 0.80);
      }
      this._fade("s8", prog, 360);

      // 09 & 10 pressure overlays:
      // volume = (resistance + tasksCompleted - compliance) + 10 (%)
      const drivePct = (r + tDone - c) + 10;
      const drive = clamp(drivePct / 100, 0.0, 0.95);

      // Only really present during tasks; faint in sim to hint pressure
      const inTask = (s === "task");
      this._fade("s9", inTask ? clamp(0.06 + drive * 0.58, 0.0, 0.82) : clamp(drive * 0.10, 0.0, 0.10), 360);
      this._fade("s10", inTask ? clamp(0.03 + drive * 0.30, 0.0, 0.42) : 0.0, 360);
    }
  }

  window.Music = new StemMixer();
})();
