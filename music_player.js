// music_player.js
// Simple stem mixer (WebAudio) for /music/*.ogg
(() => {
  const FILES = {
    bed: "/music/01_Bed_Pad.ogg",
    sysDrone: "/music/02_System_Drone_Dramatic.ogg",
    sysStabs: "/music/03_System_Stabs_Takeover.ogg",
    emma: "/music/04_Security_Patrol_Controlled.ogg",
    micro: "/music/05_Security_Click_Edge.ogg",
    liam: "/music/06_Worker_Motif_Loose.ogg",
    air: "/music/07_Worker_Air_Open.ogg",
    sub: "/music/08_Sub_Bass_Confinement.ogg",
    heartbeat: "/music/09_Task_Heartbeat_Pressure.ogg",
    glitch: "/music/10_Micro_Glitch_Events.ogg",
  };

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  class StemMixer {
    constructor() {
      this.ctx = null;
      this.buffers = new Map();
      this.nodes = new Map();   // key -> {src, gain}
      this.master = null;
      this.unlocked = false;
      this.loaded = false;

      // gentle defaults (user said files have no preset volume)
      this.baseGains = {
        bed: 0.35,
        sysDrone: 0.22,
        sysStabs: 0.10,
        emma: 0.20,
        micro: 0.16,
        liam: 0.22,
        air: 0.16,
        sub: 0.18,
        heartbeat: 0.20,
        glitch: 0.10,
      };

      this.glitchTimer = 0;
      this.mode = {
        scene: "landing", // landing | sim | task | final | escaped
        guidePath: "emma",
        resistance: 0,
      };
    }

    _ensure() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
    }

    async unlock() {
      this._ensure();
      if (this.unlocked) return;
      try { await this.ctx.resume(); } catch {}
      this.unlocked = true;
    }

    async loadAll() {
      this._ensure();
      if (this.loaded) return;
      const entries = Object.entries(FILES);

      await Promise.all(entries.map(async ([k, url]) => {
        try {
          const res = await fetch(url, { cache: "force-cache" });
          const ab = await res.arrayBuffer();
          const buf = await this.ctx.decodeAudioData(ab.slice(0));
          this.buffers.set(k, buf);
        } catch (e) {
          // missing stem shouldn't crash the whole mix
          console.warn("stem missing:", k, url);
        }
      }));

      this.loaded = true;
    }

    _startStem(key) {
      if (this.nodes.has(key)) return;
      const buf = this.buffers.get(key);
      if (!buf) return;

      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;

      const g = this.ctx.createGain();
      g.gain.value = 0.0001;

      src.connect(g);
      g.connect(this.master);

      src.start(0);

      this.nodes.set(key, { src, gain: g });
    }

    _stopStem(key) {
      const n = this.nodes.get(key);
      if (!n) return;
      try { n.src.stop(); } catch {}
      try { n.src.disconnect(); } catch {}
      try { n.gain.disconnect(); } catch {}
      this.nodes.delete(key);
    }

    _fade(key, target, ms = 240) {
      const n = this.nodes.get(key);
      if (!n) return;
      const t = this.ctx.currentTime;
      const g = n.gain.gain;
      try {
        g.cancelScheduledValues(t);
        g.setValueAtTime(g.value, t);
        g.linearRampToValueAtTime(clamp(target, 0, 1), t + ms / 1000);
      } catch {}
    }

    _stopAll() {
      for (const k of Array.from(this.nodes.keys())) this._stopStem(k);
    }

    setScene(scene) {
      this.mode.scene = scene;
      this._applyMix();
    }

    setGuidePath(path) {
      this.mode.guidePath = path || "emma";
      this._applyMix();
    }

    setResistancePoints(r) {
      this.mode.resistance = Math.max(0, Number(r) || 0);
      this._applyMix();
    }

    _applyMix() {
      if (!this.unlocked || !this.loaded) return;

      const scene = this.mode.scene;

      // always keep bed/sub in sim/task, silence on landing
      if (scene === "landing") {
        this._stopAll();
        return;
      }

      // ensure core stems exist
      ["bed", "sub", "glitch"].forEach((k) => this._startStem(k));

      // scene-specific stems
      if (scene === "sim" || scene === "task") {
        this._startStem("sysDrone");
        this._startStem("micro");
        this._startStem("liam");
        this._startStem("emma");
        this._startStem("air");
        this._startStem("heartbeat");
        this._startStem("sysStabs");
      }

      if (scene === "final") {
        // strip to takeover feel
        this._startStem("sysStabs");
        this._startStem("sysDrone");
        this._startStem("glitch");
        // kill lighter motifs
        ["liam", "emma", "air", "micro", "heartbeat"].forEach((k) => this._fade(k, 0, 220));
      }

      if (scene === "escaped") {
        // open / relief feel
        this._startStem("air");
        this._startStem("liam");
        ["sysStabs", "sysDrone", "micro", "heartbeat"].forEach((k) => this._fade(k, 0, 240));
      }

      // base
      this._fade("bed", scene === "final" ? 0.20 : 0.35, 260);
      this._fade("sub", scene === "final" ? 0.22 : 0.18, 260);

      // micro-glitch stem: never hard on/off; jitter gain
      this._fade("glitch", scene === "final" ? 0.14 : 0.08, 260);

      // system pressure increases with resistance points
      const pressure = clamp(this.mode.resistance / 20, 0, 1);
      this._fade("sysDrone", (scene === "final" ? 0.26 : 0.14 + 0.22 * pressure), 260);
      this._fade("sysStabs", (scene === "final" ? 0.22 : 0.04 + 0.12 * pressure), 260);

      // guide path emphasis
      const gp = this.mode.guidePath;
      const emmaOn = gp === "emma" ? 1 : 0;
      const liamOn = gp === "liam" ? 1 : 0;

      this._fade("emma", (scene === "final" ? 0 : 0.06 + 0.16 * emmaOn), 260);
      this._fade("liam", (scene === "final" ? 0 : 0.06 + 0.18 * liamOn), 260);
      this._fade("air", (scene === "final" ? 0 : 0.04 + 0.12 * liamOn), 260);

      // security click edge lightly when emma path OR high pressure
      this._fade("micro", (scene === "final" ? 0 : 0.05 + 0.10 * emmaOn + 0.08 * pressure), 260);

      // task heartbeat only during tasks
      this._fade("heartbeat", scene === "task" ? (0.10 + 0.18 * pressure) : 0.0, 220);

      this._scheduleGlitchJitter();
    }

    _scheduleGlitchJitter() {
      if (this.glitchTimer) return;
      const tick = () => {
        if (!this.nodes.has("glitch")) {
          this.glitchTimer = 0;
          return;
        }
        const n = this.nodes.get("glitch");
        const base = (this.mode.scene === "final") ? 0.14 : 0.08;
        const jitter = (Math.random() * 0.06) - 0.03;
        const target = clamp(base + jitter, 0.02, 0.18);
        this._fade("glitch", target, 180 + Math.random() * 220);
        this.glitchTimer = window.setTimeout(tick, 240 + Math.random() * 420);
      };
      this.glitchTimer = window.setTimeout(tick, 300);
    }
  }

  window.Music = new StemMixer();
})();
