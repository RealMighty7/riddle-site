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

    
    /* ======================
       TELEMETRY (reactive barks)
    ====================== */
    const TELEMETRY = {
      armed: false,
      inTaskGraceUntil: 0,
      inChoice: false,
      inTask: false,
    };

    function now(){ return performance.now(); }

    function markInput(){
      GAME.memory.lastInputAt = now();
    }

    function markMove(){
      GAME.memory.lastMoveAt = now();
    }

    // click clustering for "poking UI" vs normal task clicks
    function recordClick(e){
      markInput();
      const t = e.target;
      const insideTask = !!(t && t.closest && t.closest("#taskUI"));
      const insideChoices = !!(t && t.closest && t.closest("#simChoices"));
      const insideAdmin = !!(t && t.closest && t.closest("#adminPanel"));
      const insideDialogue = !!(t && t.closest && t.closest("#simText"));
      const allowed = insideTask || insideChoices || insideAdmin || insideDialogue;
      const ts = now();
      GAME.memory.spamClickWindow.push(ts);
      GAME.memory.spamClickWindow = GAME.memory.spamClickWindow.filter(x => ts - x < 1500);
      if (GAME.memory.spamClickWindow.length >= 9 && (GAME.memory.lastBarkTypeAt.spam||0) + 6000 < ts){
        GAME.facts.spamClusters++;
        resistancePoints += 1;
        syncMetersToUI();
        maybeBark("spam");
        GAME.memory.lastBarkTypeAt.spam = ts;
      }

      if (!allowed){
        GAME.memory.strayClickWindow.push(ts);
        GAME.memory.strayClickWindow = GAME.memory.strayClickWindow.filter(x => ts - x < 2500);
        if (GAME.memory.strayClickWindow.length >= 3 && (GAME.memory.lastBarkTypeAt.stray||0) + 7000 < ts){
          GAME.facts.strayClickClusters++;
          resistancePoints += 1;
          syncMetersToUI();
          maybeBark("click");
          GAME.memory.lastBarkTypeAt.stray = ts;
        } else {
          // single stray click still gets a light bark occasionally in later stages
          if (GAME.stage >= 2) maybeBark("click_soft");
        }
      }
    }

    function telemetryTick(){
      const ts = now();
      // idle bark (but not during "stay still" grace window, and not while choices visible)
      if (GAME.scene === "sim" && !TELEMETRY.inChoice && !TELEMETRY.inTask){
        const idleFor = ts - Math.max(GAME.memory.lastInputAt, GAME.memory.lastMoveAt);
        if (idleFor > 12000 && (GAME.memory.lastBarkTypeAt.idle||0)+14000 < ts){
          GAME.facts.idleHints++;
          maybeBark("idle");
          GAME.memory.lastBarkTypeAt.idle = ts;
        }
      }
      requestAnimationFrame(telemetryTick);
    }

    window.addEventListener("mousemove", markMove, { passive: true });
    window.addEventListener("keydown", markInput, { passive: true });
    window.addEventListener("pointerdown", recordClick, { passive: true });
    requestAnimationFrame(telemetryTick);

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
      try { await window.Music?.unlock?.(); } catch {}
      try { await window.Music?.loadAll?.(); } catch {}
      // Start subtle landing campaign music once audio is unlocked.
      try { window.Music?.setScene?.("landing"); } catch {}
    }
    window.addEventListener("pointerdown", unlockAudio, { once: true, capture: true });
    window.addEventListener("keydown", unlockAudio, { once: true, capture: true });

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
    let clicks = 0;
    let lastClick = 0;
    const CLICK_COOLDOWN = 650;

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
       CORE STATE (Phase 1/2)
    ====================== */
    const GAME = (window.__GAME__ = window.__GAME__ || {
      scene: "landing",
      phase: "idle",          // idle | transition | sim | hack | ending
      stage: 1,               // 1..6 narrative stage (mapped from task ordinal)
      taskOrdinal: 0,         // 0..totalTasks
      totalTasks: 20,
      meters: { compliance: 0, resistance: 0 }, // 0..100 integers (UI)
      facts: {
        perfectRun: true,
        failures: 0,
        strayClickClusters: 0,
        spamClusters: 0,
        idleHints: 0,
        predictionErrorUsed: false,
        assistsUsed: 0,
        lastAssistAt: 0,
      },
      memory: {
        lastSpeakers: [],
        lastLines: [],
        lastBarkAt: 0,
        lastBarkTypeAt: {},
        lastInputAt: performance.now(),
        lastMoveAt: performance.now(),
        strayClickWindow: [],
        spamClickWindow: [],
      },
      ending: null,           // worker | reinsertion | invisibility
    });

    function stageForOrdinal(n){
      if (n <= 3) return 1;
      if (n <= 6) return 2;
      if (n <= 9) return 3;
      if (n <= 13) return 4;
      if (n <= 17) return 5;
      return 6;
    }

    function clampInt(n,a,b){ n = Math.round(Number(n)||0); return Math.max(a, Math.min(b, n)); }

    function syncMetersToUI(){
      // keep legacy points but expose visible meter scale (0..100)
      // points are small integers; we map using observed activity + points
      const c = compliancePoints;
      const r = resistancePoints;
      // base: each task can add up to ~5 points. Normalize to 0..100 over 20 tasks.
      const denom = Math.max(1, GAME.totalTasks * 5);
      const comp = clampInt((c / denom) * 100, 0, 100);
      const resi = clampInt((r / denom) * 100, 0, 100);
      GAME.meters.compliance = comp;
      GAME.meters.resistance = resi;
      try { window.Music?.setScores?.(compliancePoints, resistancePoints); } catch {}
    }
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
        ctx.strokeStyle = "rgba(0,0,0,0.22)";
        ctx.lineWidth = 0.6 * dpr;
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

      // Main fractures: thick + high contrast per stage.
      ctx.globalAlpha = 0.92;
      ctx.shadowColor = "rgba(0,0,0,0.34)";
      ctx.shadowBlur = 2.2 * dpr;

      for (const pts of crackState.paths) {
        // dark core
        ctx.strokeStyle = "rgba(0,0,0,0.78)";
        ctx.lineWidth = (3.8 + (crackState.stage - 1) * 1.35) * dpr;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();

        // bright edge highlight
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.28 + crackState.stage * 0.06;
        ctx.strokeStyle = "rgba(255,255,255,0.28)";
        ctx.lineWidth = (1.2 + (crackState.stage - 1) * 0.35) * dpr;
        ctx.beginPath();
        ctx.moveTo(pts[0].x + 0.8 * dpr, pts[0].y - 0.6 * dpr);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x + 0.8 * dpr, pts[i].y - 0.6 * dpr);
        ctx.stroke();

        ctx.globalAlpha = 0.92;
        ctx.shadowBlur = 2.2 * dpr;
      }

      ctx.restore();
    }

    window.addEventListener("resize", resizeCracksCanvas);
    resizeCracksCanvas();

    let crackStage = 0;
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
      await wait(160);
      document.body.classList.remove("cut-black");

      await openSimRoom();

      document.body.classList.remove("sim-transition");
    }

    function isClickableTarget(e) {
      const t = e.target;
      if (!t) return true;
      if (t.closest && t.closest("input, textarea, select")) return false;
      if (t.closest && t.closest("#finalOverlay, #hackRoom, #taskUI, #adminPanel")) return false;
      return true;
    }

    function registerLandingClick(e) {
      if (stage !== 1) return;
      if (document.body.classList.contains("sim-transition")) return;
      if (!isClickableTarget(e)) return;

      const now = Date.now();
      if (now - lastClick < CLICK_COOLDOWN) return;
      lastClick = now;

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
      const handle = panel.querySelector(".adminDrag") || panel;
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
        const x = clamp(e.clientX - drag.dx, 8, window.innerWidth - 260);
        const y = clamp(e.clientY - drag.dy, 8, window.innerHeight - 80);
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
        await unlockAudio();
        try { window.Music?.setScene?.("sim"); } catch {}
        if (status) status.textContent = "status: viewer staged";
        if (box) box.classList.remove("hidden");
        if (keyInput) keyInput.focus();
        if (keyMsg) keyMsg.textContent = isAdmin ? "status: admin session active" : "status: awaiting key";
      });

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

      if (enterBtn) enterBtn.addEventListener("click", tryKey);
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
    const picked = (roll < wSystem) ? (sys ?? def ?? em ?? li)
      : (roll < wSystem + wEmma) ? (em ?? def ?? sys ?? li)
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


    
    /* ======================
       REACTIVE BARKS (chatty, stage-gated)
    ====================== */
    function recentHas(text){
      const t = String(text||"").trim();
      if (!t) return false;
      return GAME.memory.lastLines.slice(-10).includes(t);
    }

    function pushRecent(text){
      const t = String(text||"").trim();
      if (!t) return;
      GAME.memory.lastLines.push(t);
      if (GAME.memory.lastLines.length > 40) GAME.memory.lastLines.splice(0, GAME.memory.lastLines.length-40);
    }

    function maybeBark(type){
      if (!DIALOGUE || !DIALOGUE.barks) return;
      if (GAME.scene !== "sim") return;
      const ts = now();
      // global bark cooldown to avoid overlap
      if (GAME.memory.lastBarkAt + 4500 > ts) return;
      // don't bark during task grace/read window
      if (TELEMETRY.inTask && TELEMETRY.inTaskGraceUntil > ts) return;
      // don't bark while choice UI is actively waiting for click
      if (TELEMETRY.inChoice) return;

      const stage = GAME.stage || 1;
      const stageBarks = DIALOGUE.barks[String(stage)] || DIALOGUE.barks[stage] || DIALOGUE.barks.any;
      if (!stageBarks) return;

      const pool = stageBarks[type] || stageBarks[type.replace(/_soft$/,'')] || [];
      if (!pool.length) return;

      // pick a non-recent line
      let pick = "";
      for (let k=0;k<6;k++){
        const cand = pool[Math.floor(Math.random()*pool.length)];
        const line = resolveLineForPath(cand);
        if (line && !recentHas(line)){ pick = line; break; }
      }
      if (!pick) return;

      GAME.memory.lastBarkAt = ts;
      pushRecent(pick);
      // Bark is just another line, but do not block tasks; fire-and-forget
      speakLine(pick, { isBark: true, instantUI: false }).catch(()=>{});
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
      GAME.scene = "sim";
      GAME.phase = "sim";
      GAME.memory.lastInputAt = performance.now();
      GAME.memory.lastMoveAt = performance.now();
      try { window.Music?.setHum?.(true); } catch {}
      await unlockAudio();

      // Music: simulation uses stem mixer (3 “songs” via guidePath + intensity via resistance)
      try {
        await window.Music?.unlock?.();
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
      hackRoom.classList.add("hidden");

      simText.textContent = "";
      playSfx("static1", { volume: 0.22, overlap: false });

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
    function pickFromPoolNames(poolNames, usedSet) {
      const pools = window.TASK_POOLS || {};
      // Back-compat aliases: older plan configs may refer to pack6/pack7.
      const alias = (n) => (n === "pack6" ? "phase2_pack6" : (n === "pack7" ? "phase2_pack7" : n));
      const flat = [];
      for (const pn of poolNames) {
        const key = alias(pn);
        const arr = pools[key];
        if (Array.isArray(arr)) {
          for (const id of arr) if (id && !usedSet.has(id)) flat.push({ id, pool: key });
        }
      }
      if (!flat.length) {
        // allow repeats if we somehow exhausted
        for (const pn of poolNames) {
        const key = alias(pn);
          const arr = pools[key];
          if (Array.isArray(arr)) for (const id of arr) if (id) flat.push({ id, pool: key });
        }
      }
      if (!flat.length) return null;
      return flat[Math.floor(Math.random() * flat.length)];
    }

    
async function runPlan(plan) {
      const used = new Set();
      const totalTasks = plan.totalTasks || 20;
      const phase1Count = plan.phase1Count || 10;
      const phase1Pools = plan.phase1Pools || ["pack1","pack2","pack3","pack4","pack5"];
      const phase2Pools = plan.phase2Pools || ["phase2_pack6","phase2_pack7","pack6","pack7"];

      GAME.totalTasks = totalTasks;

      await playLines(plan.intro || DIALOGUE.intro || []);

      // First choice sets initial bias + guidePath (music accent), but dialogue selection stays dynamic.
      if (plan.firstChoice) {
        TELEMETRY.inChoice = true;
        const res = await showChoice(plan.firstChoice);
        TELEMETRY.inChoice = false;

        choiceTotal++;
        if (res === "comply") compliancePoints += 1;
        if (res === "resist") resistancePoints += 1;
        if (res === "full") resistancePoints += 2;

        guidePath = (res === "comply") ? "system" : (res === "full") ? "liam" : "emma";
        syncMetersToUI();
        hudUpdate();
        if (Array.isArray(plan.afterFirstChoice)) await playLines(plan.afterFirstChoice);
      }

      // helper: stage-gated pre-task beat to avoid scrambled feel
      const beatState = { idx: {1:0,2:0,3:0,4:0,5:0,6:0}, lastStage: 1 };

      async function playStageBeat(kind, stageNum){
        const s = String(stageNum);
        const stageObj = (plan.stages && (plan.stages[s] || plan.stages[stageNum])) || (DIALOGUE.stages && (DIALOGUE.stages[s] || DIALOGUE.stages[stageNum])) || null;
        const pool = stageObj && stageObj[kind] ? stageObj[kind] : [];
        if (!pool || !pool.length) return;
        const i = beatState.idx[stageNum] % pool.length;
        beatState.idx[stageNum] = i + 1;
        const beat = pool[i];
        await playLines(Array.isArray(beat) ? beat : [beat]);
      }

      for (let i = 1; i <= totalTasks; i++) {
        if (ABORTED) return;

        GAME.taskOrdinal = i;
        GAME.stage = stageForOrdinal(i);
        beatState.lastStage = GAME.stage;

        // Stage pivot beats at the first task of each stage
        const stageStarts = {1:1,2:4,3:7,4:10,5:14,6:18};
        if (i === stageStarts[GAME.stage]) {
          await playStageBeat("pivot", GAME.stage);
        }

        // Per-task pre-beat
        await playStageBeat("preTask", GAME.stage);

        // Pick task from pools
        const pools = (i <= phase1Count) ? phase1Pools : phase2Pools;
        const picked = pickFromPoolNames(pools, used);
        if (!picked || !picked.id) {
          doReset("TASK POOLS", "No tasks were available in the configured pools.");
          return;
        }
        used.add(picked.id);

        // args include pool info for admin panel
        const poolArr = (window.TASK_POOLS && Array.isArray(window.TASK_POOLS[picked.pool])) ? window.TASK_POOLS[picked.pool] : [];
        const idx = poolArr.indexOf(picked.id);

        await runTask(picked.id, { pack: picked.pool, index: idx >= 0 ? idx : null, ordinal: i, total: totalTasks });

        // Post-task resolve beat (short)
        await playStageBeat("resolve", GAME.stage);

        syncMetersToUI();
        hudUpdate();

        // Pressure chatter (stage-gated)
        const comp = GAME.meters.compliance;
        const resi = GAME.meters.resistance;

        if (GAME.stage >= 2) {
          if (resi >= 65) await playStageBeat("pressureHighResistance", GAME.stage);
          if (comp >= 70) await playStageBeat("pressureHighCompliance", GAME.stage);
        }

        // Prediction error moment (single use) around stage 5
        if (!GAME.facts.predictionErrorUsed && GAME.stage >= 5 && i >= 14) {
          GAME.facts.predictionErrorUsed = true;
          await playStageBeat("predictionError", 5);
        }
      }

      // End-of-run evaluation (only here)
      const result = evaluateEnding();
      GAME.ending = result;
      window.__ENDING_EVAL__ = { ending: result, meters: {...GAME.meters}, points: { compliancePoints, resistancePoints }, facts: {...GAME.facts} };

      // Final beats + branching
      if (result === "worker") {
        await playStageBeat("endingWorker", 6);
        doFinalOverlay("RECLASSIFIED", "Your session stabilizes. You are recognized as staff. The door opens because it no longer needs to remember you.");
        return;
      }

      if (result === "reinsertion") {
        await playStageBeat("endingReinsertion", 6);
        doReset("REINSERTED", "Containment window stabilized. You are returned to the simulation.");
        return;
      }

      // invisibility (default): run final hack task
      await playStageBeat("endingInvisibility", 6);
      await runTask("hack_final", { ordinal: totalTasks + 1, total: totalTasks + 1 });
    }

    function evaluateEnding(){
      // Strict worker ending: perfect run + very low resistance
      const comp = GAME.meters.compliance;
      const resi = GAME.meters.resistance;

      const perfect = GAME.facts.perfectRun && GAME.facts.failures === 0 && GAME.facts.strayClickClusters === 0 && GAME.facts.spamClusters === 0;
      if (perfect && comp >= 95 && resi <= 5) return "worker";

      // reinsertion: high resistance and low compliance
      if (resi >= 65 && comp < 40) return "reinsertion";

      // invisibility window: balanced
      if (comp >= 40 && comp <= 60 && resi >= 30 && resi <= 60) return "invisibility";

      // otherwise prefer invisibility (gameplay) over reinsertion unless extremely messy
      if (resi >= 80 && comp < 30) return "reinsertion";
      return "invisibility";
    }
/* ======================
       STEPS RUNNER (dialogue → choice → task)
    ====================== */
    let __ADMIN_SKIP_FN__ = null;
    window.__TNR_ADMIN_SKIP__ = () => { try { __ADMIN_SKIP_FN__ && __ADMIN_SKIP_FN__(); } catch {} };

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
      TELEMETRY.inChoice = true;
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
          TELEMETRY.inChoice = false;
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
      TELEMETRY.inTask = true;
      TELEMETRY.inTaskGraceUntil = performance.now() + 3000; // read window for "no move" style tasks
      document.body.classList.add("task-open");

      simChoices.classList.add("hidden");
      taskUI.classList.remove("hidden");
      hackRoom.classList.add("hidden");

      // Music: task intensity scene
      try { window.Music?.setScene?.("task"); } catch {}

      // Reset task UI content
      taskTitle.textContent = taskId;
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

      // Rare assist system (Phase 2): a single shield or margin adjustment based on affinity.
      const aff = (() => {
        const comp = GAME.meters.compliance, resi = GAME.meters.resistance;
        if (comp >= 65 && resi < 45) return "emma";
        if (resi >= 65 && comp < 55) return "liam";
        return "system";
      })();

      let assist = null;
      const tNow = performance.now();
      const canAssist = (GAME.facts.assistsUsed < 3) && (tNow - (GAME.facts.lastAssistAt||0) > 45000) && (Math.random() < 0.14) && (GAME.stage >= 4);
      if (canAssist) {
        assist = { by: aff, shield: 1 };
        GAME.facts.assistsUsed += 1;
        GAME.facts.lastAssistAt = tNow;
      }


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

        showTaskUI: (title, desc) => {
          if (title) taskTitle.textContent = String(title);
          if (desc) taskDesc.textContent = String(desc);
          resetTaskButtons();
        },

        // packs call this to store per-task answer for admin
        setAnswer: (phrase) => {
          simState.storedAnswer = String(phrase || "");
          try {
            if (els.adminStoredAnswer) els.adminStoredAnswer.textContent = simState.storedAnswer || "—";
            if (els.adminAnswer) els.adminAnswer.value = simState.storedAnswer || "";
          } catch {}
        },

        success: () => {
          if (done) return;
          done = true;
          timerStop = true;

          // scoring: first-try success = +1 compliance
          if (wrong === 0) compliancePoints += 1;
          if (wrong !== 0) GAME.facts.perfectRun = false;
          // A clean pass reduces perceived resistance slightly (soft)
          if (wrong === 0 && resistancePoints > 0 && GAME.stage >= 4) resistancePoints = Math.max(0, resistancePoints - 0.2);
          syncMetersToUI();

          console.debug("[TNR] task:success", taskId, { wrong });

          // tasks completed
          simState.tasksDone = Math.max(0, (simState.tasksDone || 0)) + 1;
          try { window.Music?.setTasksDone?.(simState.tasksDone); } catch {}

          hudUpdate();
          resolver(true);
        },

        penalize: () => {
          if (done) return;
          if (assist && assist.shield > 0) {
            assist.shield -= 1;
            // announce assist once
            try {
              const msg = (assist.by === "liam") ? "Liam (Worker): I bent it. Don’t waste it." : (assist.by === "emma") ? "Emma (Security): One warning. Do it clean." : "System: CORRECTION APPLIED.";
              speakLine(msg, { isBark: true }).catch(()=>{});
            } catch {}
            return;
          }
          wrong++;
          resistancePoints += 2;
          GAME.facts.failures += 1;
          GAME.facts.perfectRun = false;
          syncMetersToUI();
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
      };

      __ADMIN_SKIP_FN__ = () => {
        if (done) return;
        console.debug("[TNR] task:admin_skip", taskId);
        try { ctx.success?.("admin_skip"); } catch {}
        if (!done) {
          done = true;
          timerStop = true;
          resolver(true);
        }
      };

      const fn = window.TASKS?.[taskId];
      if (typeof fn !== "function") {
        console.error("[TNR] missing task handler", taskId);
        doReset("MISSING TASK", `Task '${taskId}' is not registered.`);
        return;
      }

      try {
        await fn(ctx, args);
        if (!done) {
          // If task returned without calling success/penalize, treat as success
          ctx.success();
        }
      } catch (e) {
        console.error(e);
        doReset("TASK ERROR", String(e && e.message ? e.message : e));
        return;
      }

      await p;
      __ADMIN_SKIP_FN__ = null;
      timerStop = true;
      TELEMETRY.inTask = false;
      document.body.classList.remove("task-open");

      // Hide task UI, return to sim
      taskUI.classList.add("hidden");
      simRoom.classList.remove("hidden");

      // back to sim scene
      try { window.Music?.setScene?.("sim"); } catch {}
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
