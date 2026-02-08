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

    let guidePath = "emma";
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

    // Crack path that originates at a specific point (usually the player's click)
    // and fractures outward with jaggedness.
    function newCrackPath(startPt, baseAngle) {
      const c = cracksCanvas;
      const w = c.width, h = c.height;
      const dpr = Math.max(1, window.devicePixelRatio || 1);

      const cx = w * 0.5, cy = h * 0.5;

      // Start point: click position (canvas coords). Fallback near center.
      let x, y;
      if (startPt && Number.isFinite(startPt.x) && Number.isFinite(startPt.y)) {
        x = startPt.x;
        y = startPt.y;
      } else {
        const jitter = Math.min(w, h) * 0.01;
        x = cx + (sRand() - 0.5) * jitter;
        y = cy + (sRand() - 0.5) * jitter;
      }

      const pts = [{ x, y }];
      const steps = 16 + Math.floor(sRand() * 18);

      // Direction: random unless supplied.
      let ang = Number.isFinite(baseAngle) ? baseAngle : (sRand() * Math.PI * 2);

      for (let i = 0; i < steps; i++) {
        const last = pts[pts.length - 1];

        // Mild bias outward from the origin (not from center), plus jag.
        const outward = ang;
        ang = ang * 0.78 + outward * 0.22 + (sRand() - 0.5) * (0.55 + i * 0.012);

        const len = (18 + sRand() * 90) * dpr;
        x = last.x + Math.cos(ang) * len;
        y = last.y + Math.sin(ang) * len;

        // Keep inside canvas (allow nearing edges).
        x = Math.max(2, Math.min(w - 2, x));
        y = Math.max(2, Math.min(h - 2, y));
        pts.push({ x, y });

        // Branches: later segments occasionally fork.
        if (i > 3 && sRand() < (0.10 + crackState.stage * 0.03)) {
          const bpts = [{ x: last.x, y: last.y }];
          let bx = last.x, by = last.y;
          const bsteps = 4 + Math.floor(sRand() * 10);
          let bang = ang + (sRand() < 0.5 ? -1 : 1) * (0.35 + sRand() * 0.9);
          for (let j = 0; j < bsteps; j++) {
            const blen = (12 + sRand() * 50) * dpr;
            bang += (sRand() - 0.5) * 0.55;
            bx = Math.max(2, Math.min(w - 2, bx + Math.cos(bang) * blen));
            by = Math.max(2, Math.min(h - 2, by + Math.sin(bang) * blen));
            bpts.push({ x: bx, y: by });
          }
          crackState.paths.push(bpts);
        }
      }
      return pts;
    }

    // Choose a point on an existing crack for branching.
    function pickBranchPoint() {
      if (!crackState.paths.length) return null;
      const base = crackState.paths[Math.floor(sRand() * crackState.paths.length)];
      if (!base || base.length < 3) return null;
      const maxIdx = Math.max(2, Math.floor(base.length * 0.55));
      const idx = 1 + Math.floor(sRand() * (maxIdx - 1));
      const p = base[idx];
      const j = 6 * (window.devicePixelRatio || 1);
      return { x: p.x + (sRand() - 0.5) * j, y: p.y + (sRand() - 0.5) * j };
    }

    function addStressBranches(count = 2) {
      for (let i = 0; i < count; i++) {
        const start = pickBranchPoint();
        if (!start) break;
        crackState.paths.push(newCrackPath(start, sRand() * Math.PI * 2));
      }
      // Keep memory bounded.
      const cap = 90;
      if (crackState.paths.length > cap) crackState.paths.splice(0, crackState.paths.length - cap);
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

      // micro-scratches
      ctx.globalAlpha = 0.10;
      for (let i = 0; i < 120; i++) {
        const x1 = sRand() * c.width;
        const y1 = sRand() * c.height;
        const x2 = x1 + (sRand() - 0.5) * 80;
        const y2 = y1 + (sRand() - 0.5) * 20;
        ctx.strokeStyle = "rgba(0,0,0,0.25)";
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // main cracks
      ctx.globalAlpha = 0.85;
      ctx.shadowColor = "rgba(0,0,0,0.25)";
      ctx.shadowBlur = Math.max(1, (window.devicePixelRatio || 1) * 1.6);

      for (const pts of crackState.paths) {
        ctx.strokeStyle = "rgba(0,0,0,0.55)";
        ctx.lineWidth = (1.4 + (crackState.stage - 1) * 0.35) * (window.devicePixelRatio || 1);
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.28;
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = (0.8 + (crackState.stage - 1) * 0.2) * (window.devicePixelRatio || 1);
        ctx.beginPath();
        ctx.moveTo(pts[0].x + 0.6, pts[0].y - 0.4);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x + 0.6, pts[i].y - 0.4);
        ctx.stroke();

        ctx.globalAlpha = 0.85;
        ctx.shadowBlur = Math.max(1, (window.devicePixelRatio || 1) * 1.6);
      }

      ctx.restore();
    }

    window.addEventListener("resize", resizeCracksCanvas);
    resizeCracksCanvas();

    // We record click points even before cracks become visible so stage 1 can
    // “originate where the player clicked”.
    const pendingClickPts = [];

    let crackStage = 0;
    function seedFromPending(max = 3) {
      // Use the most recent points as visible origins.
      const take = pendingClickPts.slice(-max);
      if (!take.length) return;
      for (const p of take) {
        crackState.paths.push(newCrackPath(p, sRand() * Math.PI * 2));
      }
      // keep bounded
      if (crackState.paths.length > 90) crackState.paths.splice(0, crackState.paths.length - 90);
    }

    function setCrackStage(n) {
      const prev = crackStage;
      crackStage = clamp(n, 0, 4);
      crackState.stage = crackStage;

      // Stage 0 means “no cracks on screen” (and clears memory).
      if (crackStage === 0) {
        crackState.paths.length = 0;
        drawCracks();
      } else {
        // On first appearance, seed origins from the player's real click locations.
        if (prev === 0) seedFromPending(3);

        // When advancing stages, add stress fractures that branch off what already exists.
        if (crackStage > prev) {
          const burst = (crackStage - prev) * 4 + crackStage * 2;
          addStressBranches(burst);
        }
        drawCracks();
      }

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

    // RGB scanlines + noise curtain (DOM) used during shatter.
    function ensureGlitchCurtain() {
      let wrap = document.getElementById("glitchCurtain");
      if (wrap) return wrap;
      wrap = document.createElement("div");
      wrap.id = "glitchCurtain";
      wrap.innerHTML = `
        <div class="gc-lines"></div>
        <div class="gc-noise"></div>
        <div class="gc-vignette"></div>
      `;
      wrap.style.position = "fixed";
      wrap.style.inset = "0";
      wrap.style.zIndex = "9998";
      wrap.style.pointerEvents = "none";
      wrap.style.opacity = "0";
      wrap.style.transition = "opacity 120ms ease";
      document.body.appendChild(wrap);
      return wrap;
    }

    async function runGlitchCurtain(msTotal = 900) {
      const wrap = ensureGlitchCurtain();
      wrap.style.opacity = "1";
      const start = performance.now();
      while (!ABORTED && performance.now() - start < msTotal) {
        // jitter via CSS vars
        const jx = (Math.random() * 26 - 13).toFixed(2);
        const jy = (Math.random() * 18 - 9).toFixed(2);
        wrap.style.setProperty("--jx", `${jx}px`);
        wrap.style.setProperty("--jy", `${jy}px`);
        wrap.style.setProperty("--h", `${(Math.random() * 360).toFixed(1)}deg`);
        document.body.classList.toggle("gc-flicker", Math.random() > 0.45);
        await wait(55 + Math.random() * 65);
      }
      document.body.classList.remove("gc-flicker");
      wrap.style.opacity = "0";
      await wait(120);
    }

    // Draws big shard polygons + chromatic scanlines on the cracks canvas.
    async function runCanvasShatter(msTotal = 1200) {
      const c = cracksCanvas;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      const dpr = Math.max(1, window.devicePixelRatio || 1);

      const W = () => c.width;
      const H = () => c.height;

      // Pre-generate shards.
      const shards = [];
      const shardN = 34;
      for (let i = 0; i < shardN; i++) {
        const cx = (Math.random() * 0.8 + 0.1) * W();
        const cy = (Math.random() * 0.8 + 0.1) * H();
        const r = (60 + Math.random() * 260) * dpr;
        const sides = 3 + Math.floor(Math.random() * 4);
        const pts = [];
        for (let s = 0; s < sides; s++) {
          const ang = (Math.random() * Math.PI * 2);
          const rr = r * (0.35 + Math.random() * 0.75);
          pts.push({ x: cx + Math.cos(ang) * rr, y: cy + Math.sin(ang) * rr });
        }
        shards.push({
          pts,
          vx: (Math.random() - 0.5) * 520 * dpr,
          vy: (Math.random() - 0.5) * 620 * dpr,
          vr: (Math.random() - 0.5) * 0.06,
          r: (Math.random() - 0.5) * 0.6,
          a: 0.20 + Math.random() * 0.35,
        });
      }

      const start = performance.now();
      let last = start;
      while (!ABORTED) {
        const now = performance.now();
        const t = now - start;
        const dt = Math.min(32, now - last) / 1000;
        last = now;
        const p = Math.min(1, t / msTotal);

        // Fade to black behind everything.
        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = `rgba(0,0,0,${0.10 + p * 0.35})`;
        ctx.fillRect(0, 0, W(), H());

        // RGB scanlines.
        const lines = 22 + Math.floor(p * 32);
        for (let i = 0; i < lines; i++) {
          const x = Math.random() * W();
          const w = (1 + Math.random() * (6 + p * 22)) * dpr;
          const a = 0.10 + Math.random() * 0.20;
          const col = Math.random() < 0.33 ? `rgba(255,0,80,${a})` : Math.random() < 0.5 ? `rgba(0,220,255,${a})` : `rgba(120,255,0,${a})`;
          ctx.fillStyle = col;
          ctx.fillRect(x, 0, w, H());
        }

        // Shards.
        for (const s of shards) {
          // drift
          s.r += s.vr;
          const ox = s.vx * dt * (0.3 + p * 1.6);
          const oy = s.vy * dt * (0.25 + p * 1.9);
          for (const pt of s.pts) { pt.x += ox; pt.y += oy; }

          ctx.save();
          ctx.globalAlpha = s.a * (1 - p * 0.55);
          ctx.shadowColor = "rgba(255,255,255,0.22)";
          ctx.shadowBlur = (6 + p * 12) * dpr;
          ctx.fillStyle = "rgba(255,255,255,0.22)";
          ctx.beginPath();
          ctx.moveTo(s.pts[0].x, s.pts[0].y);
          for (let i = 1; i < s.pts.length; i++) ctx.lineTo(s.pts[i].x, s.pts[i].y);
          ctx.closePath();
          ctx.fill();

          // hard edge
          ctx.shadowBlur = 0;
          ctx.strokeStyle = "rgba(255,255,255,0.45)";
          ctx.lineWidth = (1.0 + p * 1.6) * dpr;
          ctx.stroke();
          ctx.restore();
        }

        ctx.restore();

        if (t >= msTotal) break;
        await new Promise((r) => requestAnimationFrame(() => r()));
      }
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

      // Max stage for the burst.
      setCrackStage(4);

      document.body.classList.add("glitch-storm");
      document.body.classList.add("shatter-burst");

      playSfx("glassBreak", { volume: 0.78, overlap: false });
      playSfx("glitch2", { volume: 0.16, overlap: true });

      // Layered transition: RGB curtain + canvas shards + falling debris.
      spawnShards(2200);
      const a = runGlitchCurtain(720);
      const b = runCanvasShatter(1100);
      await runTriGlitch(520);
      await Promise.all([a, b]);

      // Flash + break the landing UI apart.
      document.body.classList.add("screen-flash");
      await wait(70);
      document.body.classList.remove("screen-flash");

      await fractureLanding(860);
      await runTriGlitch(980);

      // Clean slate: cracks vanish entirely after shatter.
      setCrackStage(0);
      document.body.classList.remove("glitch-storm");
      document.body.classList.remove("shatter-burst");
      document.body.classList.remove('page-fracture');
      document.querySelectorAll('.fracture-piece').forEach((el)=>{ el.classList.remove('fracture-piece'); el.style.removeProperty('--fx'); el.style.removeProperty('--fy'); el.style.removeProperty('--fr'); el.style.removeProperty('--fs'); });

      // Hard cut to black, then into the sim.
      document.body.classList.add("cut-black");
      await wait(170);
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

      clicks++;
      playSfx("mclick", { volume: 0.30, overlap: true });

      // Record click origin in canvas coordinates.
      try {
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        const pt = { x: e.clientX * dpr, y: e.clientY * dpr };
        pendingClickPts.push(pt);
        if (pendingClickPts.length > 40) pendingClickPts.splice(0, pendingClickPts.length - 40);

        // If cracks are already visible, each click can spawn a fresh origin AND
        // occasionally advance existing networks.
        if (crackStage > 0) {
          crackState.paths.push(newCrackPath(pt, sRand() * Math.PI * 2));
          if (crackStage >= 2 && Math.random() < 0.55) addStressBranches(1);
          drawCracks();
        }
      } catch {}

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

    async function emitLine(line) {
      if (ABORTED) return;
      const raw = String(line || "");
      const printed = raw.replace(/^\s*\[\d{1,4}\]\s*/, "");
      const { speaker, text } = parseSpeakerAndText(raw);

      // type it
      const ms = Math.floor(msToRead(raw) * 1.25);
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

      // speak it (body only)
      try { window.TTS?.enqueue?.(String(text || "").trim(), { speaker }); } catch {}
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
      await unlockAudio();

      // Music: simulation uses stem mixer (3 “songs” via guidePath + intensity via resistance)
      try {
        await window.Music?.unlock?.();
        await window.Music?.loadAll?.();
        window.Music?.setScene?.("sim");
        window.Music?.setGuidePath?.(guidePath);
        window.Music?.setResistancePoints?.(resistancePoints);
      } catch {}

      document.body.classList.add("in-sim");
      subs?.classList.remove("hidden");

      simRoom.classList.remove("hidden");
      taskUI.classList.add("hidden");
      simChoices.classList.add("hidden");
      hackRoom.classList.add("hidden");

      simText.textContent = "";
      playSfx("static1", { volume: 0.22, overlap: false });

      // Always run the scripted sequence
      if (Array.isArray(DIALOGUE.steps)) {
        await runSteps(DIALOGUE.steps);
      } else {
        await playLines(DIALOGUE.intro);
      }
    }

    /* ======================
       STEPS RUNNER (dialogue → choice → task)
    ====================== */
    let __ADMIN_CAN_SKIP__ = false;
    window.__TNR_ADMIN_SKIP__ = () => { if (__ADMIN_CAN_SKIP__) __ADMIN_CAN_SKIP__(); };

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
          // Choice affects “side” + music feel.
          choiceTotal++;
          if (res === "comply") compliancePoints++;
          if (res === "run") resistancePoints++;
          if (res === "lie") resistancePoints += 0.5;

          // Guide path: emma (security), liam (worker), system (takeover)
          if (res === "comply") guidePath = "emma";
          else if (res === "lie") guidePath = "liam";
          else guidePath = "sys";

          try { window.Music?.setGuidePath?.(guidePath === "sys" ? "emma" : guidePath); } catch {}
          try { window.Music?.setResistancePoints?.(resistancePoints); } catch {}

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
        const onLie  = () => { cleanup(); resolve("lie"); };
        const onRun  = () => { cleanup(); resolve("run"); };

        choiceNeed?.addEventListener("click", onNeed, { once: true });
        choiceLie?.addEventListener("click", onLie, { once: true });
        choiceRun?.addEventListener("click", onRun, { once: true });
      });
    }

    async function runTask(taskId, args) {
      simChoices.classList.add("hidden");
      taskUI.classList.remove("hidden");
      hackRoom.classList.add("hidden");

      // Reset task UI content
      taskTitle.textContent = taskId;
      taskDesc.textContent = "";
      taskBody.innerHTML = "";
      taskPrimary.classList.add("hidden");
      taskSecondary.classList.add("hidden");

      // ctx for tasks.js
      let done = false;
      let resolver;
      const p = new Promise((r) => (resolver = r));

      // persistent sim task state (survives across tasks)
      window.__SIM_STATE__ = window.__SIM_STATE__ || {};
      const simState = window.__SIM_STATE__;
      
      const resetTaskButtons = () => {
        // Always clear handlers to avoid “stacking” onclicks across tasks
        try { taskPrimary.onclick = null; } catch {}
        try { taskSecondary.onclick = null; } catch {}
        taskPrimary.classList.remove("hidden");
        taskSecondary.classList.add("hidden");
      };
      
      const ctx = {
        // DOM refs tasks.js expects
        taskUI,
        taskBody,
        taskTitle,
        taskDesc,
        taskPrimary,
        taskSecondary,
      
        // persistent state tasks can use
        state: simState,
      
        showTaskUI: (title, desc) => {
          if (title) taskTitle.textContent = String(title);
          if (desc) taskDesc.textContent = String(desc);
          resetTaskButtons();
        },
      
        // optional helper tasks.js calls in checksum
        setAnswer: (phrase) => {
          simState.storedAnswer = String(phrase || "");
        },
      
        success: () => {
          if (done) return;
          done = true;
      
          // mark checksum “first done” only when it actually succeeds
          if (String(taskId) === "checksum") simState.__checksumFirstDone = true;
      
          resolver(true);
        },
      
        penalize: () => {
          try { playSfx("mclick", { volume: 0.25, overlap: true }); } catch {}
          taskUI.classList.add("task-bad");
          setTimeout(() => taskUI.classList.remove("task-bad"), 180);
        },
      
        doReset,
      };
      

      // Admin skip: allow skipping while the task is active
      __ADMIN_CAN_SKIP__ = () => {
        if (done) return;
        done = true;
        resolver(true);
      };

      // Run the task
      
      const fn = window.TASKS?.[taskId];
      if (typeof fn !== "function") {
        taskDesc.textContent = "missing task handler";
        await wait(400);
        doReset("MISSING TASK", `Task '${taskId}' is not registered.`);
        return;
      }

      try {
        await fn(ctx, args);
      } catch (e) {
        console.error(e);
        doReset("TASK ERROR", String(e && e.message ? e.message : e));
        return;
      }

      await p;

      __ADMIN_CAN_SKIP__ = false;

      // Hide task UI, return to sim
      taskUI.classList.add("hidden");
      simRoom.classList.remove("hidden");

      // Back to sim room music
      try { window.Music?.setScene?.("sim"); } catch {}
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
