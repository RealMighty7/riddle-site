// music_player.js
// Stem mixer for /music/*.ogg plus scene tracks FinalHack.WAV / Escaped.WAV
// Rules (from design):
// - Landing: silent (no stems)
// - Simulation: 01 bed always.
//   Compliance-heavy: add 02, and if very compliant add 03.
//   Balanced: add 04 (task 1-10) and swap to 05 after task 10.
//   Resistance-heavy: add 06, and if very resistant add 07.
//   Task pressure: 08 very quiet at task1, +3% per completed task (cap 80% at task20).
//   Resistance adds 09 & 10 with: vol = (resistance + tasksDone - compliance) + 10%.
// - Final hack: crossfade to FinalHack.WAV (no timer bar) ...
// - Escaped: crossfade to Escaped.WAV.

(() => {
  const FILES = {
    s1: "/music/01_Bed_Pad.ogg",
    s2: "/music/02_System_Drone_Dramatic.ogg",
    s3: "/music/03_System_Stabs_Takeover.ogg",
    s4: "/music/04_Security_Patrol_Controlled.ogg",
    s5: "/music/05_Security_Click_Edge.ogg",
    s6: "/music/06_Worker_Motif_Loose.ogg",
    s7: "/music/07_Worker_Air_Open.ogg",
    s8: "/music/08_Sub_Bass_Confinement.ogg",
    s9: "/music/09_Task_Heartbeat_Pressure.ogg",
    s10:"/music/10_Micro_Glitch_Events.ogg",
    finalHack: "/music/FinalHack.WAV",
    escaped:  "/music/Escaped.WAV",
  };

  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  class StemMixer {
    constructor(){
      this.ctx = null;
      this.master = null;
      this.buffers = new Map();
      this.nodes = new Map(); // key -> {src,gain}
      this.unlocked = false;
      this.loaded = false;

      this.mode = {
        scene: "landing", // landing | sim | task | finalhack | escaped
        compliance: 0,
        resistance: 0,
        tasksDone: 0,
      };
    }

    _ensure(){
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.92;
      this.master.connect(this.ctx.destination);
    }

    async unlock(){
      this._ensure();
      if (this.unlocked) return;
      try { await this.ctx.resume(); } catch {}
      this.unlocked = true;
    }

    async loadAll(){
      this._ensure();
      if (this.loaded) return;
      const entries = Object.entries(FILES);
      await Promise.all(entries.map(async ([k, url]) => {
        try{
          const res = await fetch(url, { cache: "force-cache" });
          const ab = await res.arrayBuffer();
          const buf = await this.ctx.decodeAudioData(ab.slice(0));
          this.buffers.set(k, buf);
        }catch(e){
          console.warn("stem missing:", k, url);
        }
      }));
      this.loaded = true;
    }

    _start(key){
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

    _stop(key){
      const n = this.nodes.get(key);
      if (!n) return;
      try { n.src.stop(); } catch {}
      try { n.src.disconnect(); } catch {}
      try { n.gain.disconnect(); } catch {}
      this.nodes.delete(key);
    }

    _fade(key, target, ms=260){
      const n = this.nodes.get(key);
      if (!n) return;
      const t = this.ctx.currentTime;
      const g = n.gain.gain;
      try{
        g.cancelScheduledValues(t);
        g.setValueAtTime(g.value, t);
        g.linearRampToValueAtTime(clamp(target, 0, 1), t + ms/1000);
      }catch{}
    }

    _stopAll(){
      for (const k of Array.from(this.nodes.keys())) this._stop(k);
    }

    stopAll(){ this._stopAll(); }

    setScene(scene){
      this.mode.scene = scene || "landing";
      this._apply();
    }

    setScores(compliance, resistance){
      this.mode.compliance = Math.max(0, Number(compliance)||0);
      this.mode.resistance = Math.max(0, Number(resistance)||0);
      this._apply();
    }

    setTasksDone(n){
      this.mode.tasksDone = Math.max(0, Math.floor(Number(n)||0));
      this._apply();
    }

    _apply(){
      if (!this.unlocked || !this.loaded) return;

      const s = this.mode.scene;

      if (s === "landing"){
        this._stopAll();
        return;
      }

      // Always on in sim/task
      const wants = new Set();
      if (s === "sim" || s === "task"){
        wants.add("s1"); // bed always
        // base atmosphere always present a bit
        wants.add("s8"); // sub confinement
      }

      if (s === "finalhack"){
        wants.add("finalHack");
      }

      if (s === "escaped"){
        wants.add("escaped");
      }

      // If in finalhack/escaped, we strip ogg stems for clarity.
      if (s === "finalhack" || s === "escaped"){
        for (const key of Object.keys(FILES)){
          if (key !== "finalHack" && key !== "escaped") this._stop(key);
        }
        // start the scene track
        this._start(s === "finalhack" ? "finalHack" : "escaped");
        this._fade(s === "finalhack" ? "finalHack" : "escaped", 0.9, 420);
        return;
      }

      // Start any wanted stems
      for (const k of wants) this._start(k);

      // Ensure all other sim stems started lazily when needed
      ["s2","s3","s4","s5","s6","s7","s9","s10"].forEach(k => this._start(k));

      const c = this.mode.compliance;
      const r = this.mode.resistance;
      const t = this.mode.tasksDone;

      const total = c + r;
      const ratio = total ? (r/total) : 0.5; // 0 = fully compliant, 1 = fully resistant

      // Compliance layer thresholds
      const veryCompliant = ratio <= 0.25;
      const compliant = ratio <= 0.40;

      // Resistance thresholds
      const veryResistant = ratio >= 0.75;
      const resistant = ratio >= 0.60;

      // Balanced = none of the above
      const balanced = !compliant && !resistant;

      // Bed always
      this._fade("s1", 0.55, 320);
      this._fade("s8", 0.18, 320);

      // System overlays
      this._fade("s2", compliant ? 0.22 : 0.0, 320);
      this._fade("s3", veryCompliant ? 0.18 : 0.0, 320);

      // Emma overlays (balanced): 04 for tasks1-10; replace with 05 after task10
      const emmaA = balanced && t < 10;
      const emmaB = balanced && t >= 10;
      this._fade("s4", emmaA ? 0.22 : 0.0, 320);
      this._fade("s5", emmaB ? 0.20 : 0.0, 320);

      // Liam overlays
      this._fade("s6", resistant ? 0.24 : 0.0, 320);
      this._fade("s7", veryResistant ? 0.26 : 0.0, 320);

      // Task progression layer (08): starts task1 very quiet, +3% per task, cap 80% at task20
      const prog = clamp((Math.max(1, t) * 0.03), 0.03, 0.80);
      this._fade("s8", 0.18, 320);
      this._fade("s9", (s === "task") ? clamp(prog * 0.35, 0.03, 0.28) : 0.0, 260);

      // Pressure stems (09 & 10) driven by (r + tasksDone - c)+10%
      const drivePct = (r + t - c) + 10;
      const drive = clamp(drivePct / 100, 0, 0.85);
      this._fade("s9", (s === "task") ? clamp(0.06 + drive * 0.42, 0.06, 0.60) : 0.0, 260);
      this._fade("s10", clamp(0.02 + drive * 0.22, 0.02, 0.28), 320);
    }
  }

  window.Music = new StemMixer();
})();
