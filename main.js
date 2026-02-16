// main.js (FULL REPLACEMENT) — canvas cracks only, no cracksImg
(() => {
  function boot() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot, { once: true });
      return;
    }

    function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
    function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

    const DIALOGUE = window.DIALOGUE;
    const TASKS = window.TASKS;

    if (!DIALOGUE || !TASKS) {
      console.error("Missing dialogue.js or tasks.js. Check script order.");
      return;
    }

    /* ====================== ELEMENTS ====================== */
    const REQUIRED_IDS = [
      "system",
      "cracks",
      "cracksCanvas",
      "glassFX",
      "subs",
      "subsName",
      "subsText",
      "simRoom",
      "simText",
      "simChoices",
      "choiceNeed",
      "choiceLie",
      "choiceRun",
      "taskUI",
      "taskTitle",
      "taskDesc",
      "taskBody",
      "taskPrimary",
      "taskSecondary",
      "resetOverlay",
      "resetTitle",
      "resetBody",
      "finalOverlay",
      "finalDiscord",
      "finalCancel",
      "finalVerify",
      "finalErr",
      "turnstileBox",
      "hackRoom",
      "hackUser",
      "hackTargets",
      "hackFilename",
      "hackLines",
      "hackDelete",
      "hackReset",
      "hackStatus",
    ];

    const OPTIONAL_IDS = [
      "viewerToken",
      "launchBtn",
      "launchStatus",
      "adminPanel",
      "adminTask",
      "adminAnswer",
      "adminStoredAnswer",
      "adminSkip",
      "adminToggle",
      "taskActions",
      "timestamp",
      "build",

      "impossibleTrack",
      "impossibleToggle",
      "impossibleCount",
      "impossibleHint",

      // HUD
      "hud",
      "hudCompliance",
      "hudResistance",
      "hudTimer",
      "hudComplianceTxt",
      "hudResistanceTxt",
      "hudTimerTxt",
    ];

    const ids = [...REQUIRED_IDS, ...OPTIONAL_IDS];
    const els = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));

    const missingRequired = REQUIRED_IDS.filter((id) => !els[id]);
    if (missingRequired.length) {
      console.error("Missing required element IDs:", missingRequired);
      return;
    }

    // Keep admin panel visible in simulation (the sim hides #wrap).
    try {
      const ap = els.adminPanel;
      if (ap && ap.parentElement && ap.parentElement.id === "wrap") {
        document.body.appendChild(ap);
      }
    } catch {}

    const systemBox = els.system;
    const cracks = els.cracks;
    const cracksCanvas = els.cracksCanvas;
    const glassFX = els.glassFX;

    const simRoom = els.simRoom;
    const simText = els.simText;
    const simChoices = els.simChoices;
    const choiceNeed = els.choiceNeed;
    const choiceLie = els.choiceLie;
    const choiceRun = els.choiceRun;

    const taskUI = els.taskUI;
    const taskTitle = els.taskTitle;
    const taskDesc = els.taskDesc;
    const taskBody = els.taskBody;
    const taskPrimary = els.taskPrimary;
    const taskSecondary = els.taskSecondary;

    // Make "continue" resilient even when packs overwrite onclick handlers.
    // This runs after any per-task click handler.
    try {
      taskPrimary.addEventListener("click", () => {
        setTimeout(() => {
          const lbl = (taskPrimary.textContent || "").trim().toLowerCase();
          if (lbl !== "continue") return;
          const ctx = window.__TNR_CURRENT_CTX__;
          if (ctx && typeof ctx.success === "function") ctx.success();
        }, 0);
      });
    } catch {}

    const resetOverlay = els.resetOverlay;
    const resetTitle = els.resetTitle;
    const resetBody = els.resetBody;

    const finalOverlay = els.finalOverlay;
    const finalDiscord = els.finalDiscord;
    const finalCancel = els.finalCancel;
    const finalVerify = els.finalVerify;
    const finalErr = els.finalErr;
    const turnstileBox = els.turnstileBox;

    const hackRoom = els.hackRoom;
    const hackUser = els.hackUser;
    const hackTargets = els.hackTargets;
    const hackFilename = els.hackFilename;
    const hackLines = els.hackLines;
    const hackDelete = els.hackDelete;
    const hackReset = els.hackReset;
    const hackStatus = els.hackStatus;

    const subs = els.subs;
    const subsName = els.subsName;
    const subsText = els.subsText;

    /* ====================== HUD (compliance/resistance/timer) ====================== */
    const hud = els.hud;
    const hudCompliance = els.hudCompliance;
    const hudResistance = els.hudResistance;
    const hudTimer = els.hudTimer;
    const hudComplianceTxt = els.hudComplianceTxt;
    const hudResistanceTxt = els.hudResistanceTxt;
    const hudTimerTxt = els.hudTimerTxt;

    function hudShow(on) {
      if (!hud) return;
      hud.classList.toggle("hidden", !on);
      hud.setAttribute("aria-hidden", on ? "false" : "true");
    }

    function hudFmtMs(ms) {
      const t = Math.max(0, Math.floor(ms / 1000));
      const m = Math.floor(t / 60);
      const s = t % 60;
      return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
    }

    let __HUD_TIMER_TOTAL__ = 150000;
    let __HUD_TIMER_LEFT__ = 150000;

    function hudSetTimer(leftMs, totalMs) {
      if (Number.isFinite(totalMs)) __HUD_TIMER_TOTAL__ = Math.max(1, Math.floor(totalMs));
      if (Number.isFinite(leftMs)) __HUD_TIMER_LEFT__ = Math.max(0, Math.floor(leftMs));
      if (hudTimer) {
        const pct = Math.max(0, Math.min(1, __HUD_TIMER_LEFT__ / __HUD_TIMER_TOTAL__));
        hudTimer.style.width = (pct * 100).toFixed(1) + "%";
      }
      if (hudTimerTxt) hudTimerTxt.textContent = hudFmtMs(__HUD_TIMER_LEFT__);
    }

    function hudUpdate() {
      // Bars are relative to total points accumulated this run.
      const c = Math.max(0, Number(compliancePoints) || 0);
      const r = Math.max(0, Number(resistancePoints) || 0);
      const tot = Math.max(1, c + r);
      const cp = c / tot;
      const rp = r / tot;
      if (hudCompliance) hudCompliance.style.width = (cp * 100).toFixed(1) + "%";
      if (hudResistance) hudResistance.style.width = (rp * 100).toFixed(1) + "%";
      if (hudComplianceTxt) hudComplianceTxt.textContent = String(Math.floor(c));
      if (hudResistanceTxt) hudResistanceTxt.textContent = String(Math.floor(r));
    }

    resetOverlay.classList.add("hidden");
    systemBox.textContent = "This page is currently under revision.";

    /* ====================== ABORT FLAG ====================== */
    let ABORTED = false;
    let simStarted = false;

    /* ====================== SFX ====================== */
    const __SFX_LAST__ = Object.create(null);
    function playSfx(name, opts = {}) {
      const now = performance.now();
      const key = String(name || "");
      const minGap = key.startsWith("glitch") ? 900 : key.startsWith("static") ? 700 : 120;
      if (__SFX_LAST__[key] && (now - __SFX_LAST__[key] < minGap)) return;
      __SFX_LAST__[key] = now;

      if (typeof window.playSfx === "function") {
        const map = {
          glitch1: "glitch",
          glitch2: "glitch",
          static1: "static",
          static2: "staticSoft",
          mclick: "mclick",
          glassBreak: "glassBreak",
        };
        const id = map[name] || name;
        try { window.playSfx(id, opts); } catch {}
      }
    }

    /* ====================== REVISION COUNTER ====================== */
    const REV_KEY = "tnr_revision_count";
    function getRevisionCount() {
      const v = Number(localStorage.getItem(REV_KEY));
      return Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
    }
    function setRevisionCount(n) {
      const v = Math.max(0, Math.floor(Number(n) || 0));
      localStorage.setItem(REV_KEY, String(v));
      return v;
    }
    function incRevisionCount() {
      return setRevisionCount(getRevisionCount() + 1);
    }
    function renderRevisionCount() {
      if (!els.build) return;
      els.build.textContent = `build: reversion ${getRevisionCount()}`;
    }
    renderRevisionCount();

    function hardReload() {
      window.location.href = window.location.href.split("#")[0];
    }

    function doReset(reasonTitle, reasonBody) {
      if (ABORTED) return;
      ABORTED = true;

      incRevisionCount();
      renderRevisionCount();

      resetTitle.textContent = reasonTitle || "RESET";
      resetBody.textContent = reasonBody || "";
      resetOverlay.classList.remove("hidden");
      try { hudShow(false); } catch {}


      try { window.AudioPlayer?.stop?.(); } catch {}
      try { window.TTS?.stop?.(); } catch {}

      setTimeout(hardReload, 1800);
    }

    /* ====================== AUDIO UNLOCK ====================== */
    let audioUnlocked = false;
    async function unlockAudio() {
      if (audioUnlocked) return;
      audioUnlocked = true;
      try { await window.AudioPlayer?.unlock?.(); } catch {}
      try { window.TTS?.unlockOnce?.(); } catch {}
      try { await window.TTS?.unlock?.(); } catch {}
      // IMPORTANT: never start or preload background music on the landing page.
      // We only unlock the underlying AudioContext(s) here.
      try { await window.Music?.unlock?.(); } catch {}
    }
    window.addEventListener("pointerdown", unlockAudio, { once: true, capture: true });
    window.addEventListener("keydown", unlockAudio, { once: true, capture: true });

    // Start sim-room music exactly once (never on landing).
    let __SIM_MUSIC_STARTED__ = false;
    async function startSimMusicOnce() {
      if (__SIM_MUSIC_STARTED__) return;

      // Ensure audio is actually unlocked; if start fails, allow retry.
      try { await unlockAudio(); } catch {}

      try { await window.Music?.setScene?.("sim"); } catch {}

      try {
        await window.Music?.start?.("sim");
        __SIM_MUSIC_STARTED__ = true;
      } catch {
        __SIM_MUSIC_STARTED__ = false;
      }
    }


    /* ====================== TIMING ====================== */
    const BASE_WPM = 300;
    const MS_PER_WORD = 60000 / BASE_WPM;
    function wordsCount(s) {
      return String(s || "").trim().split(/\s+/).filter(Boolean).length;
    }
    function msToRead(line) {
      const w = wordsCount(line);
      if (!w) return 650;
      return Math.max(1100, w * MS_PER_WORD + 650);
    }

    /* ====================== STATE ====================== */
    let stage = 1;

    // Stable debug/state surface (used for console testing + avoids "undefined" state reads)
    // Keep this separate from the gameplay state to prevent accidental mutation.
    const GAME = (window.__GAME__ = window.__GAME__ || {
      scene: "Landing",
      stage: 1,
      taskOrdinal: 0,
      totalTasks: 20,
      phase: "phase1",
      compliance: 0,
      resistance: 0,
      lastTaskId: null,
      lastPool: null,
    });

    function syncGameState(extra) {
      try {
        GAME.scene = document.body.classList.contains("in-sim") ? "Sim" : "Landing";
        GAME.stage = stage;
        const simState = window.__SIM_STATE__;
        const done = simState && typeof simState.tasksDone === "number" ? simState.tasksDone : 0;
        GAME.taskOrdinal = done;
        GAME.totalTasks = 20;
        GAME.phase = done >= 10 ? "phase2" : "phase1";
        GAME.compliance = Number(compliancePoints) || 0;
        GAME.resistance = Number(resistancePoints) || 0;
        if (extra) Object.assign(GAME, extra);
        // expose for debugging
        try { window.__GAME = GAME; window.GAME = GAME; } catch {}
      } catch {}
    }
    let clicks = 0;
    let lastClick = 0;
    let lastClickPos = { x: -1, y: -1 };
    const CLICK_COOLDOWN = 520;

    const CRACK_AT = [15, 17, 19, 21];
    const SHATTER_AT = 21;

    let guidePath = "system";
    let paceBias = 0;

    const COMPLIANCE_LIMIT = 0.30;
    const MIN_CHOICES_BEFORE_CHECK = 10;

    let choiceTotal = 0;
    let compliancePoints = 0;
    let resistancePoints = 0;

    /* ======================
       CANVAS CRACKS (NO cracksImg)
    ====================== */
    const crackState = {
      stage: 0,
      seed: (Date.now() ^ (Math.random() * 1e9)) >>> 0,
      paths: [],
      // Click-origin seeds (stored in canvas pixels; already DPR-scaled)
      seeds: [],
    };

    function sRand() {
      let x = crackState.seed | 0;
      x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
      crackState.seed = x >>> 0;
      return (crackState.seed & 0xffffffff) / 4294967296;
    }

    function resizeCracksCanvas() {
      const c = cracksCanvas;
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.floor(window.innerWidth * dpr));
      const h = Math.max(1, Math.floor(window.innerHeight * dpr));
      if (c.width !== w || c.height !== h) {
        c.width = w; c.height = h;
        c.style.width = "100%";
        c.style.height = "100%";
      }
      drawCracks();
    }

    function newCrackPath(startPt, baseAngle) {
      const c = cracksCanvas;
      const w = c.width, h = c.height;
      const dpr = Math.max(1, window.devicePixelRatio || 1);

      const cx = w * 0.5, cy = h * 0.5;

      // Start: either provided (from click or branch) or near center.
      let x, y;
      if (startPt && Number.isFinite(startPt.x) && Number.isFinite(startPt.y)) {
        x = startPt.x;
        y = startPt.y;
      } else {
        const seedAng = sRand() * Math.PI * 2;
        const r0 = Math.min(w, h) * (sRand() * 0.02); // 0–2% radius from center
        const j = Math.min(w, h) * 0.006;
        x = cx + Math.cos(seedAng) * r0 + (sRand() - 0.5) * j;
        y = cy + Math.sin(seedAng) * r0 + (sRand() - 0.5) * j;
      }

      const pts = [{ x, y }];

      // Direction: push outward from seed, but slightly biased away from screen center.
      let ang = Number.isFinite(baseAngle) ? baseAngle : Math.atan2(y - cy, x - cx) + (sRand() - 0.5) * 0.6;
      const steps = 18 + Math.floor(sRand() * 14);

      for (let i = 0; i < steps; i++) {
        const last = pts[pts.length - 1];
        const outward = Math.atan2(last.y - cy, last.x - cx);
        // keep pushing outward, but let it fracture/jag
        ang = ang * 0.86 + outward * 0.14 + (sRand() - 0.5) * (0.42 + i * 0.01);

        const len = (70 + sRand() * 160) * dpr;
        x = last.x + Math.cos(ang) * len;
        y = last.y + Math.sin(ang) * len;

        // Clamp inside bounds (slight bleed is OK)
        x = Math.max(2, Math.min(w - 2, x));
        y = Math.max(2, Math.min(h - 2, y));
        pts.push({ x, y });

        // NOTE: do not recurse here (it can explode the call stack). All branching/new origins
        // are handled in ensureCracksForStage().
      }

      return pts;
    }

    function pointerToCanvasPoint(e) {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      // canvas is fullscreen; translate pointer to DPR-scaled canvas coords
      const x = clamp(e.clientX * dpr, 2, cracksCanvas.width - 2);
      const y = clamp(e.clientY * dpr, 2, cracksCanvas.height - 2);
      return { x, y };
    }

    function addCrackSeed(pt) {
      if (!pt) return;
      crackState.seeds.push({ x: pt.x, y: pt.y, t: performance.now() });
      if (crackState.seeds.length > 6) crackState.seeds.shift();
    }

    function pickSeedForNewOrigin() {
      // Prefer most recent clicks so cracks feel “from your action”.
      if (crackState.seeds.length) {
        const recent = crackState.seeds[crackState.seeds.length - 1];
        if (recent) return recent;
      }
      return null;
    }

    function pickBranchPoint() {
      if (!crackState.paths.length) return null;
      const base = crackState.paths[Math.floor(sRand() * crackState.paths.length)];
      if (!base || base.length < 3) return null;
      const maxIdx = Math.max(2, Math.floor(base.length * 0.45));
      const idx = 1 + Math.floor(sRand() * (maxIdx - 1));
      const p = base[idx];
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
      const j = 6 * (window.devicePixelRatio || 1);
      return { x: p.x + (sRand() - 0.5) * j, y: p.y + (sRand() - 0.5) * j };
    }

    function ensureCracksForStage(stageN) {
      // Stage 1: 2–3 obvious primaries (from click).
      // Stage 2+: add branches + occasional new origins from newer clicks.
      const want =
        stageN === 0 ? 0 :
        stageN === 1 ? 3 :
        stageN === 2 ? 9 :
        stageN === 3 ? 15 :
        22;

      // If entering stage 1 with nothing, seed from most recent click.
      if (stageN === 1 && crackState.paths.length === 0) {
        const seed = pickSeedForNewOrigin();
        for (let i = 0; i < 3; i++) crackState.paths.push(newCrackPath(seed, sRand() * Math.PI * 2));
      }

      while (crackState.paths.length < want) {
        const start = stageN >= 2 ? (pickBranchPoint() || pickSeedForNewOrigin()) : pickSeedForNewOrigin();
        crackState.paths.push(newCrackPath(start, sRand() * Math.PI * 2));
      }

      // Never remove existing cracks (build-off feel). If stage decreases, we still keep established paths.
    }

    function drawCracks() {
      const c = cracksCanvas;
      const ctx = c.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, c.width, c.height);
      if (crackState.stage <= 0) return;

      ctx.save();
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      const dpr = Math.max(1, window.devicePixelRatio || 1);

      // Micro-scratches only after the main break is obvious (don’t compete).
      if (crackState.stage >= 3) {
        ctx.globalAlpha = 0.05;
        ctx.strokeStyle = "rgba(0,0,0,0.10)";
        // Hairline scratches
        ctx.lineWidth = 0.14 * dpr;
        const scratches = 10 + (crackState.stage === 4 ? 8 : 0);
        for (let i = 0; i < scratches; i++) {
          const x1 = sRand() * c.width;
          const y1 = sRand() * c.height;
          const x2 = x1 + (sRand() - 0.5) * 140;
          const y2 = y1 + (sRand() - 0.5) * 44;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }

      // Main fractures: hairline fractures with a subtle refracted edge (not thick marker lines).
      // NOTE: darkened further so the lines read clearly against the landing UI.
      ctx.globalAlpha = 1;
      ctx.shadowColor = "rgba(0,0,0,0.70)";
      ctx.shadowBlur = 6 * dpr;

      for (const pts of crackState.paths) {
        // under-glow (thin)
        ctx.strokeStyle = "rgba(0,0,0,0.66)";
        ctx.lineWidth = (0.20 + (crackState.stage - 1) * 0.04) * dpr;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();

        // Subtle split-refraction ghost (gives the "mirrored" feel without heavy filters)
        // This is intentionally very faint so it reads as glass distortion, not a second crack.
        ctx.globalAlpha = 0.18;
        ctx.strokeStyle = "rgba(255,255,255,0.14)";
        ctx.lineWidth = (0.16 + (crackState.stage - 1) * 0.03) * dpr;
        ctx.beginPath();
        ctx.moveTo(pts[0].x - 1.1 * dpr, pts[0].y + 0.9 * dpr);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x - 1.1 * dpr, pts[i].y + 0.9 * dpr);
        ctx.stroke();

        // inner line (hairline)
        ctx.shadowBlur = 1 * dpr;
        ctx.globalAlpha = Math.min(0.96, 0.72 + crackState.stage * 0.07);
        ctx.strokeStyle = "rgba(0,0,0,0.92)";
        ctx.lineWidth = (0.16 + (crackState.stage - 1) * 0.03) * dpr;
        ctx.beginPath();
        ctx.moveTo(pts[0].x + 0.8 * dpr, pts[0].y - 0.6 * dpr);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x + 0.8 * dpr, pts[i].y - 0.6 * dpr);
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 4 * dpr;
      }

      ctx.restore();
    }

    window.addEventListener("resize", resizeCracksCanvas);
    resizeCracksCanvas();

    let crackStage = 0;
    
    /* ======================
       Refraction shards (landing distortion)
    ====================== */
    function ensureRefractionLayer() {
      let layer = document.getElementById("refractionLayer");
      if (layer) return layer;
      layer = document.createElement("div");
      layer.id = "refractionLayer";
      document.body.appendChild(layer);
      return layer;
    }

    function randomPoly() {
      // jagged polygon in % space
      const pts = [];
      const n = 8 + Math.floor(Math.random()*5);
      for (let i=0;i<n;i++){
        const x = Math.round(Math.random()*100);
        const y = Math.round(Math.random()*100);
        pts.push(`${x}% ${y}%`);
      }
      return `polygon(${pts.join(",")})`;
    }

    function updateRefraction(stage) {
      const layer = ensureRefractionLayer();
      if (stage < 2) { layer.innerHTML = ""; return; }
      // rebuild shards on each stage step for a "refractive duplicate" vibe
      layer.innerHTML = "";
      const count = stage === 2 ? 6 : stage === 3 ? 10 : 14;
      const w = window.innerWidth, h = window.innerHeight;
      for (let i=0;i<count;i++){
        const s = document.createElement("div");
        s.className = "refShard";
        const rw = Math.max(180, Math.floor(w*(0.18 + Math.random()*0.22)));
        const rh = Math.max(140, Math.floor(h*(0.12 + Math.random()*0.18)));
        const rx = Math.floor(Math.random()*(w-rw));
        const ry = Math.floor(Math.random()*(h-rh));
        s.style.left = rx + "px";
        s.style.top = ry + "px";
        s.style.width = rw + "px";
        s.style.height = rh + "px";
        s.style.clipPath = randomPoly();
        const dx = (-8 + Math.random()*16).toFixed(2);
        const dy = (-6 + Math.random()*12).toFixed(2);
        s.style.transform = `translate(${dx}px, ${dy}px)`;
        layer.appendChild(s);
        requestAnimationFrame(()=>{ s.style.opacity = stage === 4 ? "0.22" : "0.14"; });
      }
    }

    function setCrackStage(n) {
      crackStage = clamp(n, 0, 4);
      crackState.stage = crackStage;
      ensureCracksForStage(crackStage);
      drawCracks();

      // show/hide overlay container
      cracks.style.opacity = crackStage > 0 ? "1" : "0";

      // stage classes for CSS hooks
      document.body.classList.remove("crack1","crack2","crack3","crack4");
      if (crackStage > 0) document.body.classList.add(`crack${crackStage}`);
      try { updateRefraction(crackStage); } catch {}
    }

    function maybeAdvanceCracks() {
      const next =
        clicks >= CRACK_AT[3] ? 4 :
        clicks >= CRACK_AT[2] ? 3 :
        clicks >= CRACK_AT[1] ? 2 :
        clicks >= CRACK_AT[0] ? 1 : 0;

      if (next <= crackStage) return;
      setCrackStage(next);
      playSfx("glitch1", { volume: 0.18, overlap: true });
    }

    /* ======================
       Transition helpers (kept as-is)
    ====================== */
    function ensureTriGlitch() {
      let wrap = document.getElementById("triGlitch");
      if (wrap) return wrap;

      wrap = document.createElement("div");
      wrap.id = "triGlitch";
      wrap.style.position = "fixed";
      wrap.style.inset = "0";
      wrap.style.zIndex = "9999";
      wrap.style.pointerEvents = "none";
      wrap.style.opacity = "0";
      wrap.style.transition = "opacity 180ms ease";
      document.body.appendChild(wrap);

      const N = 18;
      for (let i = 0; i < N; i++) {
        const d = document.createElement("div");
        d.className = "triShard";
        d.style.position = "absolute";
        d.style.inset = "0";
        d.style.mixBlendMode = "screen";
        d.style.opacity = String(0.10 + Math.random() * 0.18);
        d.style.filter = "contrast(1.2) saturate(1.1)";
        d.style.background = "linear-gradient(90deg, rgba(255,255,255,0.02), rgba(0,0,0,0.02))";
        const ax = (Math.random() * 100).toFixed(1);
        const ay = (Math.random() * 100).toFixed(1);
        const bx = (Math.random() * 100).toFixed(1);
        const by = (Math.random() * 100).toFixed(1);
        const cx = (Math.random() * 100).toFixed(1);
        const cy = (Math.random() * 100).toFixed(1);
        d.style.clipPath = `polygon(${ax}% ${ay}%, ${bx}% ${by}%, ${cx}% ${cy}%)`;
        wrap.appendChild(d);
      }
      return wrap;
    }

    async function runTriGlitch(msTotal = 1200) {
      const wrap = ensureTriGlitch();
      wrap.style.opacity = "1";

      const start = performance.now();
      let sfxTick = 0;
      while (!ABORTED && performance.now() - start < msTotal) {
        document.body.classList.toggle("tri-flicker", Math.random() > 0.45);
        wrap.querySelectorAll(".triShard").forEach((d) => {
          d.style.transform = `translate(${(Math.random() * 10 - 5).toFixed(1)}px, ${(Math.random() * 10 - 5).toFixed(1)}px)`;
          d.style.opacity = String(0.08 + Math.random() * 0.25);
        });
        if ((sfxTick++ % 3) === 0) playSfx("glitch2", { volume: 0.08, overlap: true });
        await wait(80 + Math.random() * 90);
      }

      document.body.classList.remove("tri-flicker");
      wrap.style.opacity = "0";
      await wait(120);
    }

    async function fractureLanding(ms = 900) {
      const targets = Array.from(document.querySelectorAll('#wrap > .card, #wrap > section.card, #wrap > header.card, #wrap > .grid.card, #wrap > .grid'))
        .filter(Boolean);
      if (!targets.length) return;
      document.body.classList.add('page-fracture');
      // assign random transforms (stable-ish per run)
      for (const el of targets) {
        const rx = (Math.random() * 24 - 12).toFixed(2);
        const ry = (Math.random() * 18 - 9).toFixed(2);
        const rz = (Math.random() * 10 - 5).toFixed(2);
        const sc = (0.98 + Math.random() * 0.08).toFixed(3);
        el.style.setProperty('--fx', `${rx}px`);
        el.style.setProperty('--fy', `${ry}px`);
        el.style.setProperty('--fr', `${rz}deg`);
        el.style.setProperty('--fs', sc);
        const dly = Math.floor(40 + Math.random()*240);
        const dur = Math.floor(680 + Math.random()*520);
        el.style.setProperty('--fdelay', `${dly}ms`);
        el.style.setProperty('--fdur', `${dur}ms`);
        el.classList.add('fracture-piece');
      }
      // ramp intensity based on crack stage
      document.body.style.setProperty('--fractureIntensity', String(Math.max(1, crackStage)));
      await wait(ms);
    }

    
    // Falling shard rain for transition (uses cracksCanvas)
    function spawnShards(durationMs = 1200) {
      const c = cracksCanvas;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const start = performance.now();
      const shards = [];
      const W = () => c.width;
      const H = () => c.height;

      function addShard() {
        const w = (12 + Math.random() * 70) * dpr;
        const h = (6 + Math.random() * 24) * dpr;
        shards.push({
          x: Math.random() * W(),
          y: -40 * dpr,
          vx: (Math.random() - 0.5) * 120 * dpr,
          vy: (120 + Math.random() * 520) * dpr,
          r: (Math.random() - 0.5) * 0.8,
          vr: (Math.random() - 0.5) * 0.12,
          w, h,
          a: 0.35 + Math.random() * 0.25,
        });
      }

      let last = performance.now();
      (function frame(t) {
        const dt = Math.min(32, t - last) / 1000;
        last = t;

        // spawn rate ramps
        const p = Math.min(1, (t - start) / durationMs);
        const spawnN = 2 + Math.floor(p * 6);
        for (let i = 0; i < spawnN; i++) addShard();

        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "rgba(0,0,0,0.06)";
        ctx.fillRect(0, 0, c.width, c.height);

        for (let i = shards.length - 1; i >= 0; i--) {
          const s = shards[i];
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          s.r += s.vr;
          s.vy += 420 * dpr * dt;
          if (s.y > H() + 200 * dpr) { shards.splice(i, 1); continue; }

          ctx.save();
          ctx.translate(s.x, s.y);
          ctx.rotate(s.r);
          ctx.globalAlpha = s.a * (1 - p * 0.35);
          ctx.fillStyle = "rgba(0,0,0,0.65)";
          ctx.fillRect(-s.w / 2, -s.h / 2, s.w, s.h);
          ctx.restore();
        }

        ctx.restore();

        if (t - start < durationMs) requestAnimationFrame(frame);
      })(performance.now());
    }
async function shatterAndEnterSim() {
      if (document.body.classList.contains("sim-transition")) return;
      document.body.classList.add("sim-transition");

      // Over-dramatic shatter: push cracks to max, blast shards, glitch, flash.
      setCrackStage(4);
      document.body.classList.add("shatter-burst");
      document.body.classList.add("glitch-storm");
      playSfx("glassBreak", { volume: 0.75, overlap: false });
      playSfx("glitch2", { volume: 0.16, overlap: true });

      spawnShards(2600);
      await runTriGlitch(620);
      document.body.classList.add("screen-flash");
      await wait(80);
      document.body.classList.remove("screen-flash");

      // first: visually break the landing UI apart before the security room
      await fractureLanding(860);
      await runTriGlitch(980);

      setCrackStage(0);
      document.body.classList.remove("shatter-burst");
      document.body.classList.remove("glitch-storm");
      document.body.classList.remove('page-fracture');
      document.querySelectorAll('.fracture-piece').forEach((el)=>{ el.classList.remove('fracture-piece'); el.style.removeProperty('--fx'); el.style.removeProperty('--fy'); el.style.removeProperty('--fr'); el.style.removeProperty('--fs'); });

      document.body.classList.add("cut-black");
      // Pre-stage sim styling while black (prevents landing flash)
      try { els.system && els.system.classList.add("hidden"); } catch {}
      document.body.classList.add("in-sim");

      // Open the sim while fully black to avoid any landing flash.
      await openSimRoom();
      await wait(60);
      requestAnimationFrame(() => {
        document.body.classList.remove("cut-black");
        startSimMusicOnce();
      });

      document.body.classList.remove("sim-transition");
    }

    function isClickableTarget(e) {
      const t = e.target;
      if (!t) return true;
      if (t.closest && t.closest("input, textarea, select")) return false;
      // Landing UI buttons/fields must NOT count toward crack progression.
      if (t.closest && t.closest("#viewerToken, #launchBtn, #viewerEnter, #impossibleBox, #impossibleTrack")) return false;
      if (t.closest && t.closest("#finalOverlay, #hackRoom, #taskUI, #adminPanel")) return false;
      return true;
    }

    // Gate crack progression until the landing verification toggle is completed.
    // This keeps the landing page "locked" until the viewer is authorized.
    let landingVerified = false;

    function registerLandingClick(e) {
      if (stage !== 1) return;
      if (document.body.classList.contains("sim-transition")) return;
      if (!landingVerified) return;
      if (!isClickableTarget(e)) return;

      const now = Date.now();
      if (now - lastClick < CLICK_COOLDOWN) return;

      // Prevent holding or micro-jitter spam from counting as real progression.
      const cx = (e?.clientX ?? -999);
      const cy = (e?.clientY ?? -999);
      const dx = cx - (lastClickPos.x ?? -999);
      const dy = cy - (lastClickPos.y ?? -999);
      if (dx*dx + dy*dy < 16*16 && now - lastClick < 900) return;
      lastClickPos = { x: cx, y: cy };
      lastClick = now;
      crackState.cooldownUntil = now + CLICK_COOLDOWN;

      // store crack origin at click point
      try {
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        crackOrigin = { x: clamp(e.clientX * dpr, 0, cracksCanvas.width), y: clamp(e.clientY * dpr, 0, cracksCanvas.height) };
      } catch {}

      clicks++;
      playSfx("mclick", { volume: 0.30, overlap: true });

      // Click-origin cracks: every click can seed (stage 1+ uses these).
      try { addCrackSeed(pointerToCanvasPoint(e)); } catch {}

      // Once cracks are visible, each click should also *advance* the existing network
      // (small new fractures from the click point) even if the stage doesn't change.
      if (crackStage > 0 && crackState.stage === crackStage) {
        try {
          const pt = pointerToCanvasPoint(e);
          // add a new fracture from click + a branch from existing to keep the network building
          crackState.paths.push(newCrackPath(pt, sRand() * Math.PI * 2));
          if (crackStage >= 2) {
            const bp = pickBranchPoint();
            if (bp) crackState.paths.push(newCrackPath(bp, sRand() * Math.PI * 2));
          }
          // keep it bounded so late spam doesn't tank performance
          const cap = crackStage === 1 ? 10 : crackStage === 2 ? 18 : crackStage === 3 ? 26 : 34;
          while (crackState.paths.length > cap) crackState.paths.shift();
          drawCracks();
        } catch {}
      }

      maybeAdvanceCracks();
      if (clicks >= SHATTER_AT) shatterAndEnterSim();
    }

    document.addEventListener("pointerdown", registerLandingClick, { passive: true });

    /* ======================
       ADMIN KEY / PANEL (kept)
    ====================== */
    const ADMIN_KEY_HASH_HEX = "27fedb02589c0bacf10ecdda0d63486573fa76350d2edf7ee6e6e6cc35858c44";
    let isAdmin = sessionStorage.getItem("tnr_is_admin") === "1";

    async function sha256Hex(str) {
      const enc = new TextEncoder().encode(String(str || ""));
      const buf = await crypto.subtle.digest("SHA-256", enc);
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    }


    function makeAdminDraggable(panel) {
      const handle = panel.querySelector("#adminDragHandle") || panel.querySelector(".adminLeft") || panel;
      const POS_KEY = "tnr_admin_pos_v1";
      try {
        const saved = JSON.parse(localStorage.getItem(POS_KEY) || "null");
        if (saved && typeof saved.x === "number" && typeof saved.y === "number") {
          panel.style.left = saved.x + "px";
          panel.style.top = saved.y + "px";
          panel.style.right = "auto";
          panel.style.bottom = "auto";
          panel.style.position = "fixed";
        }
      } catch {}

      let drag = null;
      const onDown = (e) => {
        if (!isAdmin) return;
        e.preventDefault();
        const r = panel.getBoundingClientRect();
        drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
        panel.classList.add("dragging");
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp, { once: true });
      };
      const onMove = (e) => {
        if (!drag) return;
        const pw = panel.offsetWidth || 340;
        const ph = panel.offsetHeight || 140;
        const x = clamp(e.clientX - drag.dx, 8, window.innerWidth - pw - 8);
        const y = clamp(e.clientY - drag.dy, 8, window.innerHeight - ph - 8);
        panel.style.position = "fixed";
        panel.style.left = x + "px";
        panel.style.top = y + "px";
        panel.style.right = "auto";
        panel.style.bottom = "auto";
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        panel.classList.remove("dragging");
        if (!drag) return;
        drag = null;
        try {
          const r = panel.getBoundingClientRect();
          localStorage.setItem(POS_KEY, JSON.stringify({ x: r.left, y: r.top }));
        } catch {}
      };

      handle.addEventListener("pointerdown", onDown);
    }


    function setAdminUI(on) {
      isAdmin = !!on;
      sessionStorage.setItem("tnr_is_admin", on ? "1" : "0");
      if (els.adminPanel) els.adminPanel.classList.toggle("hidden", !on);
      if (els.adminToggle) {
        els.adminToggle.textContent = on ? "admin: on" : "admin: off";
        els.adminToggle.classList.toggle("on", on);
      }
    }

    function updateAdminPanelForTask(taskId, answerText) {
      if (!els.adminPanel) return;
      if (els.adminTask) els.adminTask.textContent = `task: ${taskId || "—"}`;
      if (els.adminStoredAnswer) els.adminStoredAnswer.textContent = answerText ? `stored: ${answerText}` : "stored: —";
      if (els.adminAnswer) els.adminAnswer.value = answerText || "";
    }

    if (els.adminPanel) {
      try { makeAdminDraggable(els.adminPanel); } catch {}

      if (els.adminToggle) els.adminToggle.addEventListener("click", () => setAdminUI(!isAdmin));
      else setAdminUI(isAdmin);

      if (els.adminSkip) {
        els.adminSkip.addEventListener("click", () => {
          if (!isAdmin) return;
          try { window.__TNR_ADMIN_SKIP__?.(); } catch {}
        });
      }
    }

    if (els.launchBtn) {
      const btn = els.launchBtn;
      const status = els.launchStatus;
      const box = els.viewerToken;
      const keyInput = document.getElementById("viewerKey");
      const keyMsg = document.getElementById("viewerKeyMsg");
      const enterBtn = document.getElementById("viewerEnter");

      btn.addEventListener("click", async () => {
        try { playSfx("glitch1", { volume: 0.12, overlap: true }); } catch {}
        // Landing button should never start music. Only unlock the AudioContext.
        await unlockAudio();
        if (status) status.textContent = "status: viewer staged";
        if (box) box.classList.remove("hidden");
        if (keyInput) keyInput.focus();
        if (keyMsg) keyMsg.textContent = isAdmin ? "status: admin session active" : "status: awaiting key";
      });

      
      
      // "Impossible" authorization toggle.
      // - Attempts count ONLY when the viewer CLICKS.
      // - After 10 attempts, the toggle "slips" off the bar and becomes clickable.
      // - Until authorized, the landing page stays locked and crack clicks DO NOT progress.
      // NOTE: implemented as transform-based motion (more reliable than changing `left`).
      try {
        const trackEl = els.impossibleTrack || document.getElementById("impossibleTrack");
        const toggleEl = els.impossibleToggle || document.getElementById("impossibleToggle");
        const countEl = els.impossibleCount || document.getElementById("impossibleCount");
        const hintEl = els.impossibleHint || document.getElementById("impossibleHint");

        if (trackEl && toggleEl) {
          const REQUIRED = 10;
          let attempts = 0;
          let disabled = false;
          let fallen = false;
          let readyToAuthorize = false;

          // Two-layer motion: a "snap" target + a small "drift" away from the cursor.
          let snapX = 0;
          let driftX = 0;

          const PAD = 10;            // keep some padding inside the track
          const SNAP_COOLDOWN = 80;  // ms; prevents jitter spam
          const DODGE_RADIUS = 84;   // px; how close the cursor needs to be for drift
          const SAMPLES = 10;        // random candidates for "farthest" snap

          const randomBetween = (min, max) => Math.random() * (max - min) + min;

          const maxX = () => {
            const r = trackEl.getBoundingClientRect();
            return Math.max(0, r.width - toggleEl.offsetWidth - PAD * 2);
          };

          const setX = (x) => {
            const clamped = clamp(x, 0, maxX());
            toggleEl.style.left = PAD + "px";
            toggleEl.style.top = "7px";
            toggleEl.style.transform = `translate3d(${clamped}px, 0px, 0px)`;
            return clamped;
          };

          const getX = () => snapX + driftX;

          const setAttempts = (n) => {
            attempts = n;
            if (countEl) countEl.textContent = String(attempts);
            if (hintEl) {
              hintEl.textContent = "attempts: " + attempts;
            }
          };

          const snapAway = (clientX) => {
            if (toggleEl.classList.contains("is-on")) return;
            if (isAdmin) return;
            if (fallen) return;
            if (disabled) return;

            disabled = true;
            setTimeout(() => (disabled = false), SNAP_COOLDOWN);

            const trackRect = trackEl.getBoundingClientRect();
            const cursorX = clientX - trackRect.left;

            const max = maxX();
            let bestX = clamp(getX(), 0, max);
            let bestD = -1;

            // Sample several random positions and pick the farthest from the cursor.
            for (let i = 0; i < SAMPLES; i++) {
              const candidate = randomBetween(0, max);
              const candidateCenter = PAD + candidate + toggleEl.offsetWidth / 2;
              const d = Math.abs(candidateCenter - cursorX);
              if (d > bestD) {
                bestD = d;
                bestX = candidate;
              }
            }

            snapX = bestX;
            driftX = 0;
            setX(snapX);
          };

          const driftAway = (clientX) => {
            if (toggleEl.classList.contains("is-on")) return;
            if (isAdmin) return;
            if (fallen) return;

            const trackRect = trackEl.getBoundingClientRect();
            const cursorX = clientX - trackRect.left;

            const btnCenterX = PAD + getX() + toggleEl.offsetWidth / 2;
            const dx = cursorX - btnCenterX;
            const dist = Math.abs(dx);
            if (dist > DODGE_RADIUS) return;

            // Move a small fraction away from the cursor.
            driftX += (-dx / 140);

            const combined = clamp(snapX + driftX, 0, maxX());
            driftX = combined - snapX;
            setX(combined);
          };

          const knockOffAndDrop = () => {
            if (fallen) return;
            fallen = true;
            readyToAuthorize = false;

            // IMPORTANT: if the landing UI/card (or any ancestor) uses transforms,
            // `position:fixed` can become relative to that transformed ancestor in
            // some browsers. To guarantee viewport-relative coordinates, move the
            // toggle to <body> before animating.
            let placeholder = null;
            try {
              placeholder = document.createElement("span");
              placeholder.style.display = "none";
              toggleEl.parentNode?.insertBefore(placeholder, toggleEl);
              document.body.appendChild(toggleEl);
            } catch {}

            // Freeze at current visual position in viewport space.
            const r = toggleEl.getBoundingClientRect();
            toggleEl.style.transition = "none";
            toggleEl.style.transform = "none";
            toggleEl.style.left = r.left + "px";
            toggleEl.style.top = r.top + "px";
            toggleEl.style.position = "fixed";
            toggleEl.style.right = "auto";
            toggleEl.style.bottom = "auto";
            toggleEl.style.zIndex = "9999";
            toggleEl.style.willChange = "transform";

            // Target: bottom of the screen, CENTERED.
            // We intentionally do NOT use the slider/card rect here because on some
            // zoom/scale/layout combinations the card can report surprising rects,
            // which made the knob land off to the side.
            const desiredLeft = (window.innerWidth / 2) - (r.width / 2);
            const targetLeft = clamp(desiredLeft, 16, window.innerWidth - r.width - 16);
            const targetTop = clamp(window.innerHeight - r.height - 24, 16, window.innerHeight - r.height - 16);
            const dx = targetLeft - r.left;
            const dy = targetTop - r.top;

            // Visually "knocked" off the slider: small hop up, then a tracked fall.
            const anim = toggleEl.animate(
              [
                { transform: "translate3d(0px, 0px, 0px) rotate(0deg)" },
                { transform: `translate3d(${dx * 0.20}px, -46px, 0px) rotate(${(sRand() - 0.5) * 10}deg)`, offset: 0.28 },
                { transform: `translate3d(${dx}px, ${dy}px, 0px) rotate(${(sRand() - 0.5) * 14}deg)` }
              ],
              { duration: 1300, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" }
            );

            if (hintEl) hintEl.textContent = "attempts: " + attempts;
            try { playSfx("glitch1", { volume: 0.10, overlap: true }); } catch {}

            anim.onfinish = () => {
              // Lock into the final resting spot for reliable clicking.
              toggleEl.style.left = targetLeft + "px";
              toggleEl.style.top = targetTop + "px";
              toggleEl.style.transform = "none";
              toggleEl.style.willChange = "auto";
              readyToAuthorize = true;

              // placeholder is intentionally left in place (hidden) to avoid layout shift.
              // (We don't reinsert the toggle back into the track once it has fallen.)
              void placeholder;
            };
          };

          const setLockedUI = (locked) => {
            // Keep only the verification control interactive until authorized.
            try {
              if (els.launchBtn) els.launchBtn.disabled = !!locked;
              if (document.getElementById("viewerEnter")) document.getElementById("viewerEnter").disabled = !!locked;
              if (document.getElementById("viewerKey")) document.getElementById("viewerKey").disabled = !!locked;
            } catch {}
            document.body.classList.toggle("launch-locked", !!locked);
            if (status && locked) status.textContent = "status: verification required";
          };

          // Ensure smooth transform motion.
          toggleEl.style.willChange = "transform, top, left";
          toggleEl.style.transition = "transform 120ms ease";

          // Hover drift (does NOT count attempts).
          trackEl.addEventListener("mousemove", (e) => driftAway(e.clientX));
          trackEl.addEventListener("pointermove", (e) => driftAway(e.clientX));

          // Attempts are counted ONLY on click.
          const onAttemptClick = (e) => {
            if (toggleEl.classList.contains("is-on")) return;

            // If it has fallen off, it no longer dodges; it just waits to be clicked.
            if (fallen) {
              if (readyToAuthorize) authorize();
              return;
            }

            // Count attempts ONLY on click.
            const next = attempts + 1;
            setAttempts(next);
            try { playSfx("tick", { volume: 0.07, overlap: true }); } catch {}

            if (next >= REQUIRED) {
              knockOffAndDrop();
              return;
            }
            snapAway(e.clientX);
          };

          const authorize = () => {
            if (toggleEl.classList.contains("is-on")) return;
            toggleEl.classList.add("is-on");
            toggleEl.setAttribute("aria-pressed", "true");
            if (hintEl) hintEl.textContent = "authorized";
            if (status) status.textContent = "status: viewer authorized";
            landingVerified = true;
            setLockedUI(false);
          };

          // Click handlers:
          // - Clicking the track anywhere counts as an attempt (unless already fallen).
          // - Clicking the knob after it falls authorizes.
          trackEl.addEventListener("click", (e) => {
            // Avoid double-count if the knob itself is clicked.
            if (e.target === toggleEl) return;
            onAttemptClick(e);
          });

          toggleEl.addEventListener("click", (e) => {
            onAttemptClick(e);
          });

          // Hard reset visual state on each load (prevents any cached/inline styles from earlier runs).
          try {
            toggleEl.classList.remove("is-on");
            toggleEl.setAttribute("aria-pressed", "false");
            toggleEl.style.position = "";
            toggleEl.style.left = "";
            toggleEl.style.top = "";
            toggleEl.style.right = "";
            toggleEl.style.bottom = "";
            toggleEl.style.transform = "";
            toggleEl.style.zIndex = "";
            toggleEl.style.transition = "transform 120ms ease";
          } catch {}

          // Initial: lock UI + center-ish after layout.
          setLockedUI(true);
          landingVerified = false;
          setAttempts(0);
          requestAnimationFrame(() => {
            const m = maxX();
            snapX = m / 2;
            driftX = 0;
            setX(snapX);
          });
        }
      } catch {}

async function tryKey() {
        const raw = (keyInput?.value || "").trim();
        if (!raw) { if (keyMsg) keyMsg.textContent = "status: enter a key"; return; }
        if (keyMsg) keyMsg.textContent = "status: verifying…";

        try {
          const hex = await sha256Hex(raw);
          const ok = hex === ADMIN_KEY_HASH_HEX;
          if (ok) {
            setAdminUI(true);
            if (keyMsg) keyMsg.textContent = "status: admin unlocked";
            if (status) status.textContent = "status: viewer authorized";
            keyInput.value = "";
          } else {
            setAdminUI(false);
            if (keyMsg) keyMsg.textContent = "status: invalid key";
            if (status) status.textContent = "status: viewer authorized";
          }
        } catch {
          if (keyMsg) keyMsg.textContent = "status: verify failed";
        }
      }

      // "enter" should actually start the simulation flow.
      // If a key is provided, attempt verification first (admin only), but viewers always proceed.
      // NOTE: viewers must NOT be able to enter the sim via the landing "enter" button.
      // Entry into the sim is only through the click/crack progression.
      async function enterFlowLandingOnly() {
        try {
          // Optional admin unlock.
          if ((keyInput?.value || "").trim()) await tryKey();
        } catch {}

        // For non-admin users, this is just an acknowledgement.
        try {
          if (status) status.textContent = "status: viewer authorized";
          if (keyMsg && !isAdmin) keyMsg.textContent = "status: interaction required";
        } catch {}

        // Never transition to sim here.
      }

      if (enterBtn) enterBtn.addEventListener("click", enterFlowLandingOnly);
      if (keyInput) keyInput.addEventListener("keydown", (e) => { if (e.key === "Enter") tryKey(); });
    }

    /* ======================
       VOICE (browser TTS) + SIM FLOW
       (kept minimal; your existing tasks system continues)
    ====================== */
    function parseSpeakerAndText(line) {
      const raw = String(line || "").replace(/^\s*\[\d{1,4}\]\s*/, "").trim();
      const m = raw.match(/^([^:]{1,48}):\s*(.*)$/);
      if (!m) return { speaker: "System", text: raw };
      const speakerRaw = (m[1] || "").trim();
      const speaker = speakerRaw.split("(")[0].trim() || "System";
      const text = (m[2] || "").trim();
      return { speaker, text };
    }

    // Speaker streak guard (prevents one voice from dominating)
    let __LAST_SPK = "";
    let __STREAK = 0;

function resolveLineForPath(line) {
  // line can be a string OR an object like { system:"System: ...", emma:"Emma: ...", liam:"Liam: ..." }
  // We *do not* hard-lock to a single guide voice; instead we pick based on resistance/compliance balance
  // so it feels like a tag-team that shifts over time.
  if (line && typeof line === "object") {
    const sys = line.system ?? line.sys;
    const em = line.emma;
    const li = line.liam;
    const def = line.default;

    // If it isn't a chorus object, fall back to the previous key-lookup behavior.
    const looksLikeChorus = (sys || em || li);
    if (!looksLikeChorus) {
      const key = guidePath || "system";
      const picked = line[key] ?? def;
      return String(picked ?? "");
    }

    const c = Math.max(0, Number(compliancePoints) || 0);
    const r = Math.max(0, Number(resistancePoints) || 0);
    const tot = Math.max(1, c + r);
    const balance = (r - c) / tot; // -1..+1 (more negative => more compliance)

    // Emma is strongest near 0; System ramps with compliance; Liam ramps with resistance.
    let wEmma = Math.max(0, 1 - Math.min(1, Math.abs(balance) * 1.7));
    let wSystem = Math.max(0, 0.55 - balance);
    let wLiam = Math.max(0, 0.55 + balance);

    // tiny floor so voices can still "bleed" through
    wEmma += 0.15; wSystem += 0.10; wLiam += 0.10;
    const sum = wEmma + wSystem + wLiam;
    wEmma /= sum; wSystem /= sum; wLiam /= sum;

    const roll = Math.random();

    // pick a speaker key first (so we can apply streak suppression)
    let key = (roll < wSystem) ? "system"
      : (roll < wSystem + wEmma) ? "emma"
      : "liam";

    if (key === __LAST_SPK) __STREAK++; else { __LAST_SPK = key; __STREAK = 1; }

    if (__STREAK >= 3) {
      // force a switch to avoid dominance
      key = (key === "system") ? (em ? "emma" : "liam")
          : (key === "emma") ? (li ? "liam" : "system")
          : (sys ? "system" : "emma");
      __LAST_SPK = key;
      __STREAK = 1;
    }

    const picked = (key === "system") ? (sys ?? def ?? em ?? li)
      : (key === "emma") ? (em ?? def ?? sys ?? li)
      : (li ?? def ?? em ?? sys);

    return String(picked ?? "");
  }
  return String(line ?? "");
}


async function emitLine(line) {
      if (ABORTED) return;
      const raw = resolveLineForPath(line);
      const printed = raw.replace(/^\s*\[\d{1,4}\]\s*/, "");
      const { speaker, text } = parseSpeakerAndText(raw);
      // Suppress rapid repeats (keeps the script from feeling like colliding loops)
      try {
        window.__TNR_RECENT_LINES = window.__TNR_RECENT_LINES || [];
        const recent = window.__TNR_RECENT_LINES;
        const keyLine = String(printed || "").trim();
        if (keyLine && recent.slice(-4).includes(keyLine)) {
          return; // drop repeat
        }
        recent.push(keyLine);
        if (recent.length > 30) recent.splice(0, recent.length - 30);
      } catch {}


      // UI/meta lines should appear instantly and never be spoken.
      const isUi = /^UI$/i.test(String(speaker || "")) || /^UI\s*:/i.test(String(printed || ""));
      if (isUi) {
        const uiText = String(printed || "").replace(/^UI\s*:\s*/i, "");
        simText.textContent += uiText + "\n";
        simText.scrollTop = simText.scrollHeight;
        return;
      }

      // Start speech FIRST (so typing can sync with audio as it plays)
      let speakP = null;
      try {
        if (window.TTS?.enqueueAsync) speakP = window.TTS.enqueueAsync(String(text || "").trim(), { speaker });
        else if (window.TTS?.enqueue) { window.TTS.enqueue(String(text || "").trim(), { speaker }); }
      } catch {}

      // Estimate duration using tuning rate when available
      let ms = Math.floor(msToRead(raw) * 1.15);
      try {
        const t = window.TTS?.getTuning?.(speaker);
        const m = (t && t.rate) ? String(t.rate).trim().match(/([+-]?\d+(?:\.\d+)?)%/) : null;
        if (m) {
          const pct = parseFloat(m[1]);
          const mult = Math.max(0.55, Math.min(1.6, 1 + pct / 100)); // speech rate factor
          ms = Math.floor(ms / mult);
        }
      } catch {}

      const chars = [...printed];
      const per = ms / Math.max(1, chars.length);

      for (const ch of chars) {
        if (ABORTED) return;
        simText.textContent += ch;
        simText.scrollTop = simText.scrollHeight;
        await wait(per);
      }
      simText.textContent += "\n";
      simText.scrollTop = simText.scrollHeight;

      // If speech is longer than typing, wait a little so it doesn't feel desynced
      try { if (speakP) await Promise.race([speakP, wait(800)]); } catch {}
    }


    async function playLines(lines) {
      for (const line of lines || []) {
        if (ABORTED) return;
        await emitLine(line);
        await wait(120);
      }
    }

    async function openSimRoom() {
      stage = 99;
      syncGameState({ stage });
      await unlockAudio();

      // Music: start only once we are actually in the sim (never on the landing page).
      try {
        await window.Music?.unlock?.();
        // NOTE: do not wait on the blackout flag here (it is cleared *after* openSimRoom returns).
        await window.Music?.loadAll?.();
        window.Music?.setScene?.("sim");
        window.Music?.setScores?.(compliancePoints, resistancePoints);
        window.Music?.setTasksDone?.(window.__SIM_STATE__?.tasksDone || 0);
      } catch {}

      document.body.classList.add("in-sim");
      subs?.classList.remove("hidden");
      hudShow(true);
      hudUpdate();
      hudSetTimer(150000,150000);


      simRoom.classList.remove("hidden");
      taskUI.classList.add("hidden");
      simChoices.classList.add("hidden");
      // Always start the sim with the hack room hidden.
      // (The hack room is only shown by the hack_final task later.)
      hackRoom.classList.add("hidden");

      simText.textContent = "";
      playSfx("static1", { volume: 0.22, overlap: false });

      // Ensure the public debug surface exists once the sim starts.
      window.__SIM_STATE__ = window.__SIM_STATE__ || { tasksDone: 0 };
      syncGameState();

      // Always run the scripted sequence
      if (DIALOGUE && DIALOGUE.plan && typeof DIALOGUE.plan === "object") {
        await runPlan(DIALOGUE.plan);
      } else if (Array.isArray(DIALOGUE.steps)) {
        await runSteps(DIALOGUE.steps);
      } else {
        await playLines(DIALOGUE.intro);
      }
    }

    /* ======================
       PLAN RUNNER (new flow)
       intro → first choice → (dialogue + UI tag) → task  x20
       first 10 from packs 1–5, second 10 from packs 6–7
    ====================== */
    
    /* ======================
       PLAN RUNNER (mirror flow)
       dialogue → choice → task → resolve   (repeat)
       first 10 from packs 1–5, second 10 from packs 6–7
    ====================== */

    function normalizePoolName(n) {
      // Back-compat aliases (accept either naming)
      if (n === "phase2_pack6") return "phase2_pack6";
      if (n === "phase2_pack7") return "phase2_pack7";
      if (n === "pack6") return "phase2_pack6";
      if (n === "pack7") return "phase2_pack7";
      return n;
    }

    function buildMirrorQueue(phasePools, targetCount) {
      const pools = window.TASK_POOLS || {};
      const queue = [];
      const used = new Set();

      // Normalize + de-duplicate pool names so we don't accidentally double-consume the same pool.
      const uniqPools = [];
      for (const raw of (phasePools || [])) {
        const n = normalizePoolName(raw);
        if (!n) continue;
        if (!uniqPools.includes(n)) uniqPools.push(n);
      }

      // Copy + shuffle each pool's ids (true randomness each run; avoids obvious repeats)
      const lists = uniqPools.map((name) => {
        const ids = Array.isArray(pools[name]) ? pools[name].slice() : [];
        for (let i = ids.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [ids[i], ids[j]] = [ids[j], ids[i]];
        }
        return { name, ids };
      });

      let guard = 0;
      while (queue.length < targetCount && guard++ < 9999) {
        const avail = lists.filter((L) => L.ids.length);
        if (!avail.length) break;

        // Pick a random pool that still has tasks, then consume one.
        const L = avail[Math.floor(Math.random() * avail.length)];
        const id = L.ids.shift();
        if (!id || used.has(id)) continue;
        used.add(id);
        queue.push({ id, pool: L.name });
      }

      return queue;
    }

    function defaultLoopChoice(plan) {
      // Use plan.loopChoice if provided, else reuse firstChoice labels.
      return plan.loopChoice || plan.firstChoice || {
        complyLabel: "Okay.",
        lieLabel: "…",
        runLabel: "No."
      };
    }

    const RESOLVE_BEATS = {
      clean: [
        { system: "System: ACCEPTED.", emma: "Emma (Security): Good. Keep it that way.", liam: "Liam (Worker): Nice. Quiet wins." },
        { system: "System: CHECK COMPLETE.", emma: "Emma (Security): Don’t get comfortable.", liam: "Liam (Worker): Keep moving—don’t let it learn your pattern." },
      ],
      messy: [
        { system: "System: ANOMALY REGISTERED.", emma: "Emma (Security): Stop improvising.", liam: "Liam (Worker): Good. Messy—but controlled." },
        { system: "System: VARIANCE: noted.", emma: "Emma (Security): You’re making this harder.", liam: "Liam (Worker): That’s it. Make it look human." },
      ],
    };

    async function runPlan(plan) {
      const totalTasks = plan.totalTasks || 20;
      const phase1Count = plan.phase1Count || 10;
      const phase1Pools = plan.phase1Pools || ["pack1","pack2","pack3","pack4","pack5"];
      const phase2Pools = plan.phase2Pools || ["phase2_pack6","phase2_pack7"];

      // Build deterministic queues (mirror flow)
      const q1 = buildMirrorQueue(phase1Pools, phase1Count);
      const q2 = buildMirrorQueue(phase2Pools, Math.max(0, totalTasks - phase1Count));
      const queue = q1.concat(q2);

      if (queue.length < totalTasks) {
        doReset("TASK POOLS", "Not enough tasks were available in the configured pools.");
        return;
      }

      await playLines(plan.intro || DIALOGUE.intro || []);

      if (plan.firstChoice) {
        const res = await showChoice(plan.firstChoice);
        choiceTotal++;
        if (res === "comply") compliancePoints += 1;
        if (res === "resist") resistancePoints += 1;
        if (res === "full") resistancePoints += 2;
        guidePath = (res === "comply") ? "system" : (res === "full") ? "liam" : "emma";
        hudUpdate();
        if (Array.isArray(plan.afterFirstChoice)) await playLines(plan.afterFirstChoice);
      }

      // Core loop: dialogue → choice → task → resolve
      // Avoid obvious repetition by cycling beats in a shuffled order.
      const beatPool = plan.taskBeats || DIALOGUE.taskBeats || [];
      let beatOrder = [];
      let beatPtr = 0;
      let lastBeat = -1;
      const shuffle = (arr) => {
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
      };
      const nextBeat = () => {
        if (!beatPool.length) return null;
        if (!beatOrder.length || beatOrder.length !== beatPool.length || beatPtr >= beatOrder.length) {
          beatOrder = shuffle([...Array(beatPool.length).keys()]);
          beatPtr = 0;
          if (beatOrder.length > 1 && beatOrder[0] === lastBeat) {
            [beatOrder[0], beatOrder[1]] = [beatOrder[1], beatOrder[0]];
          }
        }
        const idx = beatOrder[beatPtr++];
        lastBeat = idx;
        return beatPool[idx];
      };

      for (let i = 0; i < totalTasks; i++) {
        if (ABORTED) return;

        const beat = nextBeat();
        if (beat) await playLines(Array.isArray(beat) ? beat : [beat]);

        const loopChoice = defaultLoopChoice(plan);
        const decision = await showChoice(loopChoice);
        choiceTotal++;

        if (decision === "comply") compliancePoints += 1;
        if (decision === "resist") resistancePoints += 1;
        if (decision === "full") resistancePoints += 2;
        hudUpdate();

        const picked = queue[i];
        const poolArr = (window.TASK_POOLS && Array.isArray(window.TASK_POOLS[picked.pool])) ? window.TASK_POOLS[picked.pool] : [];
        const idx = poolArr.indexOf(picked.id);

        // task
        await runTask(picked.id, { pack: picked.pool, index: idx >= 0 ? idx : null, ordinal: i + 1, total: totalTasks });

        // resolve (based on whether the last task had wrong attempts)
        const simState = window.__SIM_STATE__ || {};
        const lastWrong = Number(simState.lastWrong || 0);
        const pool = (lastWrong > 0) ? RESOLVE_BEATS.messy : RESOLVE_BEATS.clean;
        const line = pool[i % pool.length];
        await playLines([line]);
      }

  if (Array.isArray(plan.afterTasks)) await playLines(plan.afterTasks);

  // Final hack terminal (if present). This is the end-cap of the run.
  // Can be disabled by setting plan.finalHack === false.
  if (plan.finalHack !== false && window.TASKS && typeof window.TASKS.hack_final === "function") {
    await runTask("hack_final", { pack: "final", index: 0, ordinal: (plan.totalTasks || 20) + 1, total: (plan.totalTasks || 20) + 1 });
  }
}

/* ======================
       STEPS RUNNER (dialogue → choice → task)
    ====================== */
    let __ADMIN_SKIP_FN__ = null;
    window.__TNR_ADMIN_SKIP__ = () => { try { if (typeof __ADMIN_SKIP_FN__ === "function") __ADMIN_SKIP_FN__(); } catch {} };

    async function runSteps(steps) {
      // Start with the intro beat (your “security room” opening)
      await playLines(DIALOGUE.intro || []);

      for (let i = 0; i < steps.length; i++) {
        if (ABORTED) return;
        const step = steps[i] || {};

        if (Array.isArray(step.say)) {
          await playLines(step.say);
          continue;
        }

        if (step.choice) {
          const res = await showChoice(step.choice);

          // scoring
          choiceTotal++;
          if (res === "comply") compliancePoints += 1;
          if (res === "resist") resistancePoints += 1;
          if (res === "full") resistancePoints += 2;

          // only the FIRST choice locks the guide path (per design)
          if (step.choice.lockPath && !step.choice.__locked) {
            step.choice.__locked = true;
            // system path uses the base bed; emma/liam are character accents
            guidePath = (res === "comply") ? "system" : (res === "full") ? "liam" : "emma";
          }

          hudUpdate();

          continue;
        }

        if (step.task) {
          await runTask(String(step.task), step.args || {});
          continue;
        }
      }
    }

    function setChoicesVisible(on) {
      if (!simChoices) return;
      simChoices.classList.toggle("hidden", !on);
    }

    async function showChoice(choiceObj) {
      setChoicesVisible(true);

      if (choiceNeed) choiceNeed.textContent = choiceObj.complyLabel || "Okay.";
      if (choiceLie)  choiceLie.textContent  = choiceObj.lieLabel || "…";
      if (choiceRun)  choiceRun.textContent  = choiceObj.runLabel || "Run.";

      return await new Promise((resolve) => {
        const cleanup = () => {
          try { choiceNeed?.removeEventListener("click", onNeed); } catch {}
          try { choiceLie?.removeEventListener("click", onLie); } catch {}
          try { choiceRun?.removeEventListener("click", onRun); } catch {}
          setChoicesVisible(false);
        };

        const onNeed = () => { cleanup(); resolve("comply"); };
        const onLie  = () => { cleanup(); resolve("resist"); };
        const onRun  = () => { cleanup(); resolve("full"); };

        choiceNeed?.addEventListener("click", onNeed, { once: true });
        choiceLie?.addEventListener("click", onLie, { once: true });
        choiceRun?.addEventListener("click", onRun, { once: true });
      });
    }

    
async function runTask(taskId, args) {
      console.debug("[TNR] task:start", taskId, args);
      simChoices.classList.add("hidden");
      taskUI.classList.remove("hidden");
      if (String(taskId) !== "hack_final") { hackRoom.classList.add("hidden"); } else { hackRoom.classList.remove("hidden"); taskUI.classList.add("hidden"); }

      // Music: task intensity scene
      try { window.Music?.setScene?.("task"); } catch {}

      // Reset task UI content
      taskTitle.textContent = "";
      taskDesc.textContent = "";
      taskBody.innerHTML = "";
      taskPrimary.classList.add("hidden");
      taskSecondary.classList.add("hidden");

      // Admin panel metadata
      try {
        if (els.adminTask) {
          const pack = (args && args.pack != null) ? `p${args.pack}` : (args && args.pool ? String(args.pool) : "—");
          const ix = (args && args.index != null) ? String(args.index) : "—";
          els.adminTask.textContent = `task: ${taskId}  (${pack}:${ix})`;
        }
        if (els.adminAnswer) els.adminAnswer.value = "";
        if (els.adminStoredAnswer) els.adminStoredAnswer.textContent = (window.__SIM_STATE__ && window.__SIM_STATE__.storedAnswer) ? String(window.__SIM_STATE__.storedAnswer) : "—";
      } catch {}

      let done = false;
      let resolver;
      const p = new Promise((r) => (resolver = r));

      window.__SIM_STATE__ = window.__SIM_STATE__ || {};
      const simState = window.__SIM_STATE__;

      // per-task attempt tracking
      let wrong = 0;
      let startedAt = performance.now();

      // Task timer: 2m30s base, speeds up 5% per resistance point
      const BASE_MS = 150000;
      const speed = 1 + (resistancePoints * 0.05);
      const totalMs = Math.floor(BASE_MS / Math.max(0.25, speed));
      let timerStop = false;

      const tickTimer = async () => {
        while (!timerStop && !done && !ABORTED) {
          const elapsed = performance.now() - startedAt;
          const left = Math.max(0, totalMs - elapsed);
          hudSetTimer(left, totalMs);
          if (left <= 0) {
            console.debug("[TNR] task:timeout", taskId);
            doReset("TIMEOUT", "You hesitated.");
            return;
          }
          await wait(120);
        }
      };
      tickTimer();

      const resetTaskButtons = () => {
        try { taskPrimary.onclick = null; } catch {}
        try { taskSecondary.onclick = null; } catch {}
        // Gate progression by default. Tasks should explicitly set the label
        // and handler when they are ready to allow completion.
        taskPrimary.textContent = "verify";
        taskPrimary.disabled = false;
        taskPrimary.classList.remove("hidden");
        taskSecondary.classList.add("hidden");
      };

      const ctx = {
        taskUI,
        taskBody,
        taskTitle,
        taskDesc,
        taskPrimary,
        taskSecondary,

        state: simState,

        getCompliance: () => Number(compliancePoints)||0,
        getResistance: () => Number(resistancePoints)||0,


        showTaskUI: (title, desc) => {
          if (title) taskTitle.textContent = String(title);
          if (desc) taskDesc.textContent = String(desc);
          resetTaskButtons();
        },

        // packs call this to store per-task answer for admin
                setAnswer: (phrase) => {
          const raw = String(phrase || "");
          simState.storedAnswer = raw;

          // Prettify for admin display only (do NOT change the stored raw answer).
          // Helps with long digit strings like "3822013" by spacing digits: "3 8 2 2 0 1 3".
          let pretty = raw;
          try {
            if (/^[0-9]{5,}$/.test(raw)) {
              pretty = raw.split("").join(" ");
            }
          } catch {}

          try {
            if (els.adminStoredAnswer) els.adminStoredAnswer.textContent = pretty || "—";
            if (els.adminAnswer) els.adminAnswer.value = raw || "";
          } catch {}
        },

        success: () => {
          if (done) return;
          done = true;
          timerStop = true;

          // scoring: first-try success = +1 compliance
          if (wrong === 0) compliancePoints += 1;
          console.debug("[TNR] task:success", taskId, { wrong });

          // tasks completed
          // expose last wrong count for resolve beats
          simState.lastWrong = wrong;

          // tasks completed
          simState.tasksDone = Math.max(0, (simState.tasksDone || 0)) + 1;
          try { window.Music?.setTasksDone?.(simState.tasksDone); } catch {}
          syncGameState({ lastTaskId: taskId, lastPool: args?.pool || null });

          hudUpdate();
          resolver(true);
        },

        // backwards alias
        succes: function() { return this.success(); },

        penalize: () => {
          if (done) return;
          wrong++;
          simState.lastWrong = wrong;
          resistancePoints += 3;
          console.debug("[TNR] task:wrong", taskId, { wrong });

          hudUpdate();

          try { playSfx("mclick", { volume: 0.25, overlap: true }); } catch {}
          taskUI.classList.add("task-bad");
          setTimeout(() => taskUI.classList.remove("task-bad"), 180);

          if (wrong >= 3) {
            console.debug("[TNR] task:fail3_reset", taskId);
            doReset("CAUGHT", "Too many incorrect attempts.");
          }
        },

        doReset,
      };      // Universal 'continue' handler: if the primary label is 'continue' (often after verify),
      // always advance by calling ctx.success(), even if a pack only resolves its own promise.
      try {
        if (taskPrimary.__tnrContFn) taskPrimary.removeEventListener("click", taskPrimary.__tnrContFn, true);
        taskPrimary.__tnrContFn = () => {
          const label = (taskPrimary.textContent || "").trim().toLowerCase();
          if (label !== "continue") return;
          Promise.resolve().then(() => { try { if (!done) ctx.success(); } catch {} });
        };
        taskPrimary.addEventListener("click", taskPrimary.__tnrContFn, true);
      } catch {}

      __ADMIN_SKIP_FN__ = () => {
        if (done) return;
        console.debug("[TNR] task:admin_skip", taskId);

        // Admin skip must NEVER count as a wrong answer.
        // Do not trigger any task button handlers (many call ctx.penalize on failure).
        try { ctx.success("admin_skip"); } catch {}
      };

      // Expose current task context for robust continue + admin tools.
      try { window.__TNR_CURRENT_CTX__ = ctx; } catch {}

      const fn = window.TASKS?.[taskId];
      if (typeof fn !== "function") {
        console.error("[TNR] missing task handler", taskId);
        doReset("MISSING TASK", `Task '${taskId}' is not registered.`);
        return;
      }

      try {
        await fn(ctx, args);

        // Normalize pack-style tasks: many packs resolve their own Promise on "continue"
        // but do not call ctx.success(). If the primary button reads 'continue', we force
        // ctx.success() on click (after running any existing handler).
        try {
          const wrapContinue = (btn) => {
            if (!btn) return;
            const label = (btn.textContent || "").trim().toLowerCase();
            if (label !== "continue") return;
            const prev = btn.onclick;
            btn.onclick = () => {
              try { if (typeof prev === "function") prev(); } catch (e) { console.error(e); }
              try { ctx.success(); } catch (e) { console.error(e); }
            };
          };
          wrapContinue(taskPrimary);
          wrapContinue(taskSecondary);
        } catch {}

        // IMPORTANT: many packs wire UI handlers and return immediately.
        // Do NOT auto-success here — we must wait for ctx.success()/ctx.penalize() or admin skip.
        if (!done) {
          const primHas = typeof taskPrimary.onclick === "function";
          const secHas = typeof taskSecondary.onclick === "function";
          if (!primHas && !secHas) {
            // Safe fallback: expose a continue button so the run cannot deadlock.
            try {
              taskPrimary.textContent = "continue";
              taskPrimary.classList.remove("hidden");
              taskSecondary.classList.add("hidden");
              taskPrimary.onclick = () => ctx.success();
            } catch {}
          }
        }
      } catch (e) {
        console.error(e);
        doReset("TASK ERROR", String(e && e.message ? e.message : e));
        return;
      }

      await p;
      __ADMIN_SKIP_FN__ = null;
      timerStop = true;

      // Hide task UI, return to sim
      if (String(taskId) !== "hack_final") {
        taskUI.classList.add("hidden");
        simRoom.classList.remove("hidden");
      }

      // back to sim scene
      if (String(taskId) !== "hack_final") {
        try { window.Music?.setScene?.("sim"); } catch {}
      }
      console.debug("[TNR] task:end", taskId);

      await wait(120);
    }


    /* ====================== LANDING: timestamp tick ====================== */
    if (els.timestamp) {
      const tick = () => {
        const d = new Date();
        els.timestamp.textContent = "timestamp: " + d.toLocaleString();
      };
      tick();
      setInterval(tick, 1000);
    }

    // start
    stage = 1;
    setCrackStage(0);
  }

  boot();
})();
