// main.js (FULL REPLACEMENT)
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

    const viewerToken = els.viewerToken;

    resetOverlay.classList.add("hidden");
    systemBox.textContent = "This page is currently under revision.";

    /* ======================
       ABORT FLAG
    ====================== */
    let ABORTED = false;

    /* ====================== SFX ====================== */
    function playSfx(name, opts = {}) {
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

    /* ======================
       REVISION COUNTER
    ====================== */
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
      els.build.textContent = `build: revision ${getRevisionCount()}`;
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

    /* ======================
       AUDIO UNLOCK
    ====================== */
    let audioUnlocked = false;
    async function unlockAudio() {
      if (audioUnlocked) return;
      audioUnlocked = true;
      try { await window.AudioPlayer?.unlock?.(); } catch {}
      try { await window.TTS?.unlock?.(); } catch {}
      try { await VO?.unlockAudio?.(); } catch {}
      try { await window.Music?.unlock?.(); } catch {}
      try { await window.Music?.loadAll?.(); } catch {}
    }
    window.addEventListener("pointerdown", unlockAudio, { once: true, capture: true });
    window.addEventListener("keydown", unlockAudio, { once: true, capture: true });

    /* ======================
       TIMING (text typing)
    ====================== */
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

    /* ======================
       STATE
    ====================== */
    let stage = 1;
    let clicks = 0;
    let lastClick = 0;
    const CLICK_COOLDOWN = 650;

    // 3 crack stages now (your PNGs)
    const CRACK_AT = [15, 17, 19];
    const SHATTER_AT = 21;

    let guidePath = "emma";
    let paceBias = 0;

    const COMPLIANCE_LIMIT = 0.30;
    const MIN_CHOICES_BEFORE_CHECK = 10;

    let choiceTotal = 0;
    let complianceChoices = 0;
    let resistanceChoices = 0;

    // resistancePoints affects timer/difficulty (choices + wrong attempts)
    let resistancePoints = 0;

    /* ======================
       PNG CRACK OVERLAYS
    ====================== */
    // ===== Procedural crack overlay (canvas) =====
    let crackStage = 0;
    const crackState = {
      seed: (Date.now() ^ (Math.random() * 1e9)) >>> 0,
      paths: [], // array of paths; each path is array of points [{x,y},...]
    };

    function sRand() {
      // xorshift32
      let x = crackState.seed | 0;
      x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
      crackState.seed = x >>> 0;
      return (crackState.seed & 0xffffffff) / 4294967296;
    }

    function resizeCracksCanvas() {
      const c = cracksCanvas;
      if (!c) return;
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

    function newCrackPath() {
      const c = cracksCanvas;
      const w = c.width, h = c.height;
      const dpr = Math.max(1, window.devicePixelRatio || 1);

      // start near edge
      const edge = Math.floor(sRand() * 4);
      let x = 0, y = 0;
      if (edge === 0) { x = sRand() * w; y = 0; }
      if (edge === 1) { x = w; y = sRand() * h; }
      if (edge === 2) { x = sRand() * w; y = h; }
      if (edge === 3) { x = 0; y = sRand() * h; }

      const pts = [{ x, y }];
      const steps = 18 + Math.floor(sRand() * 26);

      const cx = w * 0.5, cy = h * 0.5;
      for (let i = 0; i < steps; i++) {
        const last = pts[pts.length - 1];
        const toCx = (cx - last.x) / w;
        const toCy = (cy - last.y) / h;

        let ang = Math.atan2(toCy, toCx) + (sRand() - 0.5) * 1.1;
        const len = (10 + sRand() * 26) * dpr;

        x = last.x + Math.cos(ang) * len;
        y = last.y + Math.sin(ang) * len;

        x = Math.max(-40 * dpr, Math.min(w + 40 * dpr, x));
        y = Math.max(-40 * dpr, Math.min(h + 40 * dpr, y));
        pts.push({ x, y });

        // occasional branch
        if (i > 6 && sRand() < 0.16) {
          const bpts = [{ x: last.x, y: last.y }];
          let bx = last.x, by = last.y;
          const bsteps = 6 + Math.floor(sRand() * 10);
          let bang = ang + (sRand() < 0.5 ? -1 : 1) * (0.35 + sRand() * 0.75);
          for (let j = 0; j < bsteps; j++) {
            const blen = (8 + sRand() * 18) * dpr;
            bx += Math.cos(bang + (sRand() - 0.5) * 0.6) * blen;
            by += Math.sin(bang + (sRand() - 0.5) * 0.6) * blen;
            bpts.push({ x: bx, y: by });
          }
          crackState.paths.push(bpts);
        }
      }
      return pts;
    }

    function ensureCracksForStage(stage) {
      const want = stage === 0 ? 0 : stage === 1 ? 5 : stage === 2 ? 10 : 16;
      while (crackState.paths.length < want) crackState.paths.push(newCrackPath());
      while (crackState.paths.length > want) crackState.paths.pop();
    }

    function drawCracks() {
      const c = cracksCanvas;
      if (!c) return;
      const ctx = c.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, c.width, c.height);
      if (crackStage <= 0) return;

      ctx.save();
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      // micro scratches
      ctx.globalAlpha = 0.08;
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

      ctx.globalAlpha = 0.85;
      ctx.shadowColor = "rgba(0,0,0,0.25)";
      ctx.shadowBlur = Math.max(1, (window.devicePixelRatio || 1) * 1.6);

      for (const pts of crackState.paths) {
        ctx.strokeStyle = "rgba(0,0,0,0.55)";
        ctx.lineWidth = (1.4 + (crackStage - 1) * 0.35) * (window.devicePixelRatio || 1);
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.22;
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = (0.8 + (crackStage - 1) * 0.2) * (window.devicePixelRatio || 1);
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

    function setCrackStage(n) {
      crackStage = clamp(n, 0, 3);

      document.body.classList.toggle("crack1", crackStage >= 1);
      document.body.classList.toggle("crack2", crackStage >= 2);
      document.body.classList.toggle("crack3", crackStage >= 3);

      if (crackStage === 0) {
        crackState.paths.length = 0;
        drawCracks();
        cracks.style.opacity = "0";
        return;
      }

      cracks.style.opacity = "1";
      ensureCracksForStage(crackStage);
      drawCracks();
    }

    // init cracks
    resizeCracksCanvas();
    }

    function maybeAdvanceCracks() {
      const next =
        clicks >= CRACK_AT[2] ? 3 :
        clicks >= CRACK_AT[1] ? 2 :
        clicks >= CRACK_AT[0] ? 1 : 0;

      if (next <= crackStage) return;
      setCrackStage(next);
      playSfx("glitch1", { volume: 0.18, overlap: true });
    }

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
    // random triangle via clip-path
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

async function runTriGlitch(msTotal = 2000) {
  const wrap = ensureTriGlitch();
  wrap.style.opacity = "1";

  const start = performance.now();
  let sfxTick = 0;
  while (!ABORTED && performance.now() - start < msTotal) {
    // flicker between landing and sim tones
    document.body.classList.toggle("tri-flicker", Math.random() > 0.45);
    // nudge shards
    wrap.querySelectorAll(".triShard").forEach((d) => {
      d.style.transform = `translate(${(Math.random()*10-5).toFixed(1)}px, ${(Math.random()*10-5).toFixed(1)}px)`;
      d.style.opacity = String(0.08 + Math.random() * 0.25);
    });
    // keep this sparse; constant spam feels "broken" instead of glitchy
    if ((sfxTick++ % 3) === 0) playSfx("glitch2", { volume: 0.08, overlap: true });
    await wait(80 + Math.random() * 90);
  }

  document.body.classList.remove("tri-flicker");
  wrap.style.opacity = "0";
  await wait(200);
}

// Subtle sim-room glitch texture (brief "desync" bursts).
// This replaces the old heavy shake/spam feel with a low-key glitchy tone.
let SIM_GLITCH_ON = false;
function startSimGlitchLoop() {
  if (SIM_GLITCH_ON) return;
  SIM_GLITCH_ON = true;

  const loop = () => {
    if (!SIM_GLITCH_ON) return;
    if (!document.body.classList.contains("in-sim")) {
      setTimeout(loop, 800);
      return;
    }

    // 1-in-3 chance to do a short burst
    if (Math.random() < 0.34) {
      document.body.classList.add("sim-glitch");
      playSfx("glitch1", { volume: 0.08, overlap: true });
      setTimeout(() => document.body.classList.remove("sim-glitch"), 70 + Math.random() * 110);
    }

    setTimeout(loop, 420 + Math.random() * 1200);
  };

  setTimeout(loop, 600);
}

    async function shatterAndEnterSim() {
      if (document.body.classList.contains("sim-transition")) return;

      document.body.classList.add("sim-transition");

      if (!document.getElementById("flashFX")) {
        const fx = document.createElement("div");
        fx.id = "flashFX";
        document.body.appendChild(fx);
      }
      if (!document.getElementById("cutBlack")) {
        const cb = document.createElement("div");
        cb.id = "cutBlack";
        document.body.appendChild(cb);
      }

      setCrackStage(3);
      cracks.style.opacity = "1";

      document.body.classList.add("shatter-cine");

      playSfx("glassBreak", { volume: 0.75, overlap: false });
      playSfx("glitch2", { volume: 0.20, overlap: true });
      setTimeout(() => playSfx("static1", { volume: 0.16, overlap: true }), 120);

      // 2s triangular glitch between landing + sim
      await runTriGlitch(2000);

      // remove crack overlays before committing to sim
      setCrackStage(0);
      cracks.style.opacity = "0";

      await wait(120);
      document.body.classList.add("cut-black");
      await wait(160);

      await openSimRoom();

      document.body.classList.remove("cut-black");
      document.body.classList.remove("shatter-cine");
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

      maybeAdvanceCracks();

      if (clicks >= SHATTER_AT) shatterAndEnterSim();
    }

    document.addEventListener("pointerdown", registerLandingClick, { passive: true });

    /* ======================
       /* ======================
   LANDING: launch button -> viewer box (admin key)
====================== */
const ADMIN_KEY_HASH_HEX = "27fedb02589c0bacf10ecdda0d63486573fa76350d2edf7ee6e6e6cc35858c44"; // sha256 hex of the real key (never store plaintext)
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

// wire admin buttons if present
if (els.adminPanel) {
  if (els.adminToggle) {
    els.adminToggle.addEventListener("click", () => setAdminUI(!isAdmin));
  } else {
    // default visibility based on session
    setAdminUI(isAdmin);
  }

  if (els.adminSkip) {
    els.adminSkip.addEventListener("click", () => {
      if (!isAdmin) return;
      // main task gate listens for this
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

    if (status) status.textContent = "status: viewer staged";
    if (box) box.classList.remove("hidden");
    if (keyInput) keyInput.focus();
    if (keyMsg) keyMsg.textContent = isAdmin ? "status: admin session active" : "status: awaiting key";
  });

  async function tryKey() {
    const raw = (keyInput?.value || "").trim();
    if (!raw) {
      if (keyMsg) keyMsg.textContent = "status: enter a key";
      return;
    }
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
  if (keyInput) {
    keyInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") tryKey();
    });
  }
}
/* ======================
       TASK TIMER HUD
    ====================== */
    function makeHud() {
      let barWrap = document.getElementById("taskTimeWrap");
      let barFill = document.getElementById("taskTimeFill");

      if (!barWrap) {
        barWrap = document.createElement("div");
        barWrap.id = "taskTimeWrap";
        barWrap.style.position = "fixed";
        barWrap.style.left = "0";
        barWrap.style.top = "0";
        barWrap.style.width = "100%";
        barWrap.style.height = "3px";
        barWrap.style.zIndex = "99999";
        barWrap.style.pointerEvents = "none";
        barWrap.style.background = "rgba(255,255,255,0.08)";
        barWrap.style.opacity = "0";
        barWrap.style.transition = "opacity 220ms ease";

        barFill = document.createElement("div");
        barFill.id = "taskTimeFill";
        barFill.style.height = "100%";
        barFill.style.width = "100%";
        barFill.style.background = "rgba(255,255,255,0.95)";
        barFill.style.transition = "width 80ms linear, background 120ms linear";

        barWrap.appendChild(barFill);
        document.body.appendChild(barWrap);
      }

      let resWrap = document.getElementById("resMeterWrap");
      let resPip = document.getElementById("resMeterPip");
      let resTxt = document.getElementById("resMeterTxt");

      if (!resWrap) {
        resWrap = document.createElement("div");
        resWrap.id = "resMeterWrap";
        resWrap.style.position = "fixed";
        resWrap.style.right = "10px";
        resWrap.style.top = "10px";
        resWrap.style.zIndex = "99999";
        resWrap.style.pointerEvents = "none";
        resWrap.style.display = "flex";
        resWrap.style.alignItems = "center";
        resWrap.style.gap = "8px";
        resWrap.style.opacity = "0";
        resWrap.style.transition = "opacity 220ms ease";

        const track = document.createElement("div");
        track.style.width = "56px";
        track.style.height = "6px";
        track.style.borderRadius = "999px";
        track.style.background = "rgba(255,255,255,0.10)";
        track.style.overflow = "hidden";
        track.style.border = "1px solid rgba(255,255,255,0.10)";

        resPip = document.createElement("div");
        resPip.id = "resMeterPip";
        resPip.style.height = "100%";
        resPip.style.width = "0%";
        resPip.style.background = "rgba(255,255,255,0.75)";
        resPip.style.transition = "width 160ms ease, background 160ms ease";
        track.appendChild(resPip);

        resTxt = document.createElement("div");
        resTxt.id = "resMeterTxt";
        resTxt.textContent = "resistance: 0";
        resTxt.style.fontFamily =
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
        resTxt.style.fontSize = "12px";
        resTxt.style.color = "rgba(255,255,255,0.72)";
        resTxt.style.textShadow = "0 1px 0 rgba(0,0,0,0.35)";

        resWrap.appendChild(track);
        resWrap.appendChild(resTxt);
        document.body.appendChild(resWrap);
      }

let compWrap = document.getElementById("compMeterWrap");
let compPip = document.getElementById("compMeterPip");
let compTxt = document.getElementById("compMeterTxt");

if (!compWrap) {
  compWrap = document.createElement("div");
  compWrap.id = "compMeterWrap";
  compWrap.style.position = "fixed";
  compWrap.style.left = "10px";
  compWrap.style.top = "10px";
  compWrap.style.zIndex = "99999";
  compWrap.style.pointerEvents = "none";
  compWrap.style.display = "flex";
  compWrap.style.alignItems = "center";
  compWrap.style.gap = "8px";
  compWrap.style.opacity = "0";
  compWrap.style.transition = "opacity 220ms ease";

  const track = document.createElement("div");
  track.style.width = "56px";
  track.style.height = "6px";
  track.style.borderRadius = "999px";
  track.style.background = "rgba(255,255,255,0.10)";
  track.style.overflow = "hidden";
  track.style.border = "1px solid rgba(255,255,255,0.10)";

  compPip = document.createElement("div");
  compPip.id = "compMeterPip";
  compPip.style.height = "100%";
  compPip.style.width = "0%";
  compPip.style.background = "rgba(255,255,255,0.75)";
  compPip.style.transition = "width 160ms ease, background 160ms ease";
  track.appendChild(compPip);

  compTxt = document.createElement("div");
  compTxt.id = "compMeterTxt";
  compTxt.textContent = "compliance: 0%";
  compTxt.style.fontFamily =
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
  compTxt.style.fontSize = "12px";
  compTxt.style.color = "rgba(255,255,255,0.72)";
  compTxt.style.textShadow = "0 1px 0 rgba(0,0,0,0.35)";

  compWrap.appendChild(track);
  compWrap.appendChild(compTxt);
  document.body.appendChild(compWrap);
}

      return { barWrap, barFill, resWrap, resPip, resTxt, compWrap, compPip, compTxt };
    }

    const HUD = makeHud();

    function updateResistanceMeter() {
      const max = 30;
      const pct = clamp(resistancePoints / max, 0, 1);
      HUD.resPip.style.width = `${(pct * 100).toFixed(1)}%`;
      HUD.resTxt.textContent = `resistance: ${resistancePoints}`;

      if (pct >= 0.70) HUD.resPip.style.background = "rgba(255,80,80,0.85)";
      else if (pct >= 0.35) HUD.resPip.style.background = "rgba(255,220,90,0.85)";
      else HUD.resPip.style.background = "rgba(255,255,255,0.70)";
    }

function updateComplianceMeter() {
  const denom = Math.max(1, complianceChoices + resistanceChoices);
  const pct = clamp(complianceChoices / denom, 0, 1);

  HUD.compPip.style.width = `${(pct * 100).toFixed(1)}%`;
  HUD.compTxt.textContent = `compliance: ${(pct * 100).toFixed(0)}%`;

  if (pct >= COMPLIANCE_LIMIT) HUD.compPip.style.background = "rgba(255,80,80,0.85)";
  else if (pct >= 0.20) HUD.compPip.style.background = "rgba(255,255,255,0.70)";
  else HUD.compPip.style.background = "rgba(180,220,255,0.75)";
}


    function setTaskTimeBarFrac(frac) {
      const f = clamp(frac, 0, 1);
      HUD.barFill.style.width = `${(f * 100).toFixed(2)}%`;

      if (f <= 0.10) HUD.barFill.style.background = "rgba(255,80,80,0.95)";
      else if (f <= 0.30) HUD.barFill.style.background = "rgba(255,220,90,0.95)";
      else HUD.barFill.style.background = "rgba(255,255,255,0.92)";
    }

    // 2 minutes base; each resistance reduces by 5%
    function calcTaskLimitMs() {
      const base = 2 * 60 * 1000;
      const perRes = 0.05;
      const mult = clamp(1 - resistancePoints * perRes, 0.20, 1.0);
      return Math.floor(base * mult);
    }

    function createTaskTimerController() {
      let totalMs = calcTaskLimitMs();
      let leftMs = totalMs;
      let running = false;
      let raf = 0;
      let lastT = 0;
      let drainMult = 1.0;

      const api = {
        show() {
          HUD.barWrap.style.opacity = "1";
          HUD.resWrap.style.opacity = "1";
          HUD.compWrap.style.opacity = "1";
          setTaskTimeBarFrac(1);
          updateResistanceMeter();
        },
        hide() {
          HUD.barWrap.style.opacity = "0";
        },
        start() {
          if (running) return;
          running = true;
          lastT = performance.now();
          loop();
        },
        stop() {
          running = false;
          if (raf) cancelAnimationFrame(raf);
          raf = 0;
        },
        bumpDrain(multAdd) {
          drainMult = clamp(drainMult + (multAdd || 0), 1.0, 4.0);
        },
        onWrong() {
          api.bumpDrain(0.25);
        },
        resetForNewTask() {
          totalMs = calcTaskLimitMs();
          leftMs = totalMs;
          drainMult = 1.0;
          setTaskTimeBarFrac(1);
        },
      };

      function loop() {
        if (!running || ABORTED) return;

        const now = performance.now();
        const dt = Math.max(0, now - lastT);
        lastT = now;

        leftMs -= dt * drainMult;
        setTaskTimeBarFrac(leftMs / totalMs);

        if (leftMs <= 0) {
          running = false;
          api.stop();
          doReset(
            "TIMEOUT",
            `Time limit exceeded.\n\nresistance: ${resistancePoints}\nbuild: revision ${getRevisionCount()}\n\nReinitializing…`
          );
          return;
        }

        raf = requestAnimationFrame(loop);
      }

      return api;
    }

    /* ======================
       VOICE: WAV if possible, otherwise Azure TTS
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

    function stripSpeakerPrefix(s) {
      return String(s || "").replace(/^\s*[^:]{1,32}:\s*/, "");
    }

    function normalizeForMatch(s) {
      return String(s || "")
        .replace(/\{[a-zA-Z0-9_]+\}/g, "")
        .replace(/^\s*\[\d{1,4}\]\s*/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
    }

    let VO = null;
    let VO_READY = false;

    function getIdFromLine(rawLine) {
      const raw = String(rawLine || "");
      const m = raw.match(/^\s*\[(\d{1,4})\]\s*/);
      if (m) return String(m[1]).padStart(4, "0");

      if (!VO || !VO.byId) return null;

      const targetA = normalizeForMatch(raw);
      const targetB = normalizeForMatch(stripSpeakerPrefix(raw));

      for (const [id, line] of VO.byId.entries()) {
        const textRaw = line.text_raw ?? line.text ?? "";
        const candA = normalizeForMatch(textRaw);
        const candB = normalizeForMatch(stripSpeakerPrefix(textRaw));
        if (candA === targetA || candA === targetB || candB === targetA || candB === targetB) {
          return String(id).padStart(4, "0");
        }
      }
      return null;
    }

    async function ensureVoiceBank() {
      if (VO_READY) return;
      if (!window.VoiceBank) return;
      VO = new window.VoiceBank({
        voicesUrl: "/audio/data/voices.json",
        onTag: () => {},
      });
      VO.bindSubtitleUI({ nameEl: subsName, subtitleEl: subsText });
      await VO.load().catch(() => {});
      VO_READY = true;
    }

    // speaker configs for Azure
    window.TTS_SPEAKERS = window.TTS_SPEAKERS || {
      System: { voice: "en-US-GuyNeural", style: "", rate: "-6%", pitch: "-2Hz", volume: 1 },
      Emma:   { voice: "en-US-ErinNeural", style: "serious", rate: "-4%", pitch: "-1Hz", volume: 1 },
      Liam:   { voice: "en-US-DavisNeural", style: "calm", rate: "-2%", pitch: "-2Hz", volume: 1 },
    };

    async function playVoiceWavIfExists(rawLine) {
      await ensureVoiceBank();
      const id = getIdFromLine(rawLine);
      if (!id || !VO) return false;

      try {
        await VO.playById(id, { volume: 1.0, baseHoldMs: 160, stopPrevious: false });
        return true;
      } catch {
        return false;
      }
    }

    function getTypingMsForLine(rawLine) {
      try {
        const id = getIdFromLine(rawLine);
        if (id && VO && VO.byId) {
          const meta = VO.byId.get(id);
          const d = Number(meta?.duration_sec ?? meta?.durationSec ?? meta?.duration ?? 0);
          if (Number.isFinite(d) && d > 0) return Math.floor(d * 1000);
        }
      } catch {}
      return msToRead(rawLine);
    }

    async function typeLineIntoSim(text, ms) {
      if (ABORTED) return;

      const s = String(text || "");
      if (!s) {
        simText.textContent += "\n";
        simText.scrollTop = simText.scrollHeight;
        return;
      }

      const minMs = 450;
      const total = Math.max(minMs, Math.floor(ms || 900));
      const chars = [...s];
      const per = total / Math.max(1, chars.length);

      for (let i = 0; i < chars.length; i++) {
        if (ABORTED) return;
        simText.textContent += chars[i];
        simText.scrollTop = simText.scrollHeight;
        await wait(per);
      }
      simText.textContent += "\n";
      simText.scrollTop = simText.scrollHeight;
    }

    async function emitLine(line) {
      if (ABORTED) return;

      // Visual sync: brief CRT "response" so dialogue feels tied to the monitor UI
      try {
        document.body.classList.add("ui-pulse");
        clearTimeout(window.__TNR_UI_PULSE_T);
        window.__TNR_UI_PULSE_T = setTimeout(() => {
          document.body.classList.remove("ui-pulse");
        }, 260);
      } catch {}

      const raw = String(line || "");
      const printed = raw.replace(/^\s*\[\d{1,4}\]\s*/, "");

	      // Music: briefly bias the stem mix toward the active speaker
	      try {
	        const { speaker } = parseSpeakerAndText(raw);
	        const hold = Math.max(650, Math.min(2600, getTypingMsForLine(raw)));
	        window.Music?.setVoiceFocus?.(speaker, hold);
	      } catch {}

      const typingMs = getTypingMsForLine(raw);
      const typingPromise = typeLineIntoSim(printed, typingMs);

      const audioPromise = (async () => {
        const playedWav = await playVoiceWavIfExists(raw);
        if (playedWav) return;

        // Browser TTS fallback (no server). Do not block typing on speech.
        try {
          if (!window.TTS?.enqueue) return;

          const { speaker, text } = parseSpeakerAndText(raw);
          window.TTS.enqueue(String(text || "").trim(), { speaker });
        } catch {}
      })();

      await Promise.all([typingPromise, audioPromise]);
    }

    async function playLines(lines) {
      for (const line of lines || []) {
        if (ABORTED) return;
        await emitLine(line);
        await wait(70);
      }
    }

    /* ======================
       CHOICE HANDLING
    ====================== */
    function checkComplianceOrReset() {
  if (choiceTotal < MIN_CHOICES_BEFORE_CHECK) return true;

  const denom = Math.max(1, complianceChoices + resistanceChoices);
  const ratio = complianceChoices / denom;

  updateComplianceMeter();

  if (ratio >= COMPLIANCE_LIMIT) {
    doReset(
      "TOO COMPLIANT",
      `Compliance threshold exceeded.

comply: ${complianceChoices}
resist: ${resistanceChoices}
ratio: ${(ratio * 100).toFixed(0)}%

Reinitializing simulation…`
    );
    return false;
  }
  return true;
}

    function waitForChoice() {
      return new Promise((resolve) => {
        const cleanup = () => {
          choiceNeed.onclick = null;
          choiceLie.onclick = null;
          choiceRun.onclick = null;
        };
        choiceNeed.onclick = () => { cleanup(); resolve("comply"); };
        choiceLie.onclick = () => { cleanup(); resolve("lie"); };
        choiceRun.onclick = () => { cleanup(); resolve("run"); };
      });
    }

    /* ======================
       TASK FLOW (AUTO-CONTINUE)
       - tasks must call ctx.success() when verified correct
       - wrong attempts must call ctx.penalize()
    ====================== */
    let activeTaskId = null;
    let activeTaskAnswer = "";
    let taskWrongCount = 0;
    let taskTimer = null;

    function recordWrongAttempt() {
      if (ABORTED) return;

      resistancePoints += 3;
      updateResistanceMeter();
      taskTimer?.onWrong?.();

      taskWrongCount++;

      if (taskWrongCount >= 3) {
        doReset(
          "SYSTEM HAYWIRE",
          `Anomalous input density detected.\n\ntask: ${activeTaskId || "unknown"}\nwrong attempts: ${taskWrongCount}\nresistance: ${resistancePoints}\n\nResetting simulation…`
        );
        return;
      }

      if (taskWrongCount === 1) void emitLine("System: Incorrect.");
      else if (taskWrongCount === 2) void emitLine("System: Stop guessing.");
      else void emitLine("System: Input rejected.");
    }

    let _taskResolve = null;
    let _taskDone = false;

    function beginTaskGate() {
      _taskDone = false;
      _taskResolve = null;
      return new Promise((resolve) => { _taskResolve = resolve; });
    }

    function finishTaskGate(ok) {
      if (_taskDone) return;
      _taskDone = true;
      try { _taskResolve?.(!!ok); } catch {}
    }

    function showFallbackContinue() {
      taskPrimary.classList.remove("hidden");
      taskPrimary.disabled = false;
      taskPrimary.textContent = "Continue";
      taskPrimary.onclick = () => finishTaskGate(true);

      taskSecondary.classList.add("hidden");
    }

    const taskContext = {
      taskPrimary,
      taskSecondary,
      taskBody,

      showTaskUI(title, desc){
        taskTitle.textContent = String(title || "TASK");
        taskDesc.textContent = String(desc || "");
      },

      setAnswer(answerText) {
        activeTaskAnswer = String(answerText || "");
        updateAdminPanelForTask(activeTaskId, activeTaskAnswer);
      },

      onTaskPick(pickId) {
        activeTaskId = String(pickId || activeTaskId || "task");
        activeTaskAnswer = "";
        updateAdminPanelForTask(activeTaskId, activeTaskAnswer);
      },

      success(msg = "Ok.") {
        try {
          const p = document.createElement("div");
          p.style.marginTop = "10px";
          p.style.opacity = "0.85";
          p.textContent = msg;
          taskBody.appendChild(p);
        } catch {}

        setTimeout(() => finishTaskGate(true), 380);

        setTimeout(() => {
          if (!_taskDone) showFallbackContinue();
        }, 1500);
      },

      fail(msg = "Not accepted.") {
        try {
          const p = document.createElement("div");
          p.style.marginTop = "10px";
          p.style.opacity = "0.85";
          p.textContent = msg;
          taskBody.appendChild(p);
        } catch {}
      },

      penalize() {
        recordWrongAttempt();
      },

      doReset,
    };

    async function runSteps(steps) {
      let loopIndex = 0;

      for (const step of steps) {
        if (ABORTED) return;

        if (step.say) {
          document.body.classList.remove("task-open");
          simRoom.classList.remove("hidden");
          taskUI.classList.add("hidden");
          hackRoom.classList.add("hidden");
          await playLines(step.say);
          continue;
        }

        if (step.filler) {
          const count = step.filler.count ?? 1;
          const pool = String(step.filler.pool || "AUTO");
          const meta = { ...(step.filler.meta || {}) };

          loopIndex += 1;
          meta.loopIndex ??= loopIndex;
          meta.guidePath ??= guidePath;
          // pressure tier inference, but can be passed in meta.pressure
          meta.pressure ??= (meta.loopIndex >= 7 ? 2 : meta.loopIndex >= 4 ? 1 : 0);

          for (let i = 0; i < count; i++) {
            if (ABORTED) return;

            if (pool === "AUTO" && window.DIALOGUE_HELPERS?.autoFiller) {
              const line = window.DIALOGUE_HELPERS.autoFiller(meta);
              await emitLine(line);
            } else {
              await emitLine("System: Buffering…");
            }

            await wait(30);
          }
          continue;
        }

        if (step.choice) {
          document.body.classList.remove("task-open");
          simRoom.classList.remove("hidden");
          taskUI.classList.add("hidden");
          hackRoom.classList.add("hidden");

          const labels = step.choice;

// Add subtle alignment hints to labels (requested)
const complyTxt = labels?.complyLabel ? `${labels.complyLabel} (comply)` : "comply (comply)";
const lieTxt    = labels?.lieLabel    ? `${labels.lieLabel} (slight-resistance)` : "lie (slight-resistance)";
const runTxt    = labels?.runLabel    ? `${labels.runLabel} (full-resistance)` : "run (full-resistance)";

choiceNeed.textContent = complyTxt;
choiceLie.textContent = lieTxt;
choiceRun.textContent = runTxt;

simChoices.classList.remove("hidden");
const choice = await waitForChoice();
simChoices.classList.add("hidden");

choiceTotal++;

if (choice === "comply") {
  guidePath = "emma";
  paceBias = -1;
  complianceChoices += 1;
} else if (choice === "lie") {
  guidePath = "liam";
  paceBias = 1;
  resistanceChoices += 1;
  resistancePoints += 1;
} else {
  guidePath = "run";
  paceBias = 2;
  resistanceChoices += 1;
  resistancePoints += 2;
}

updateResistanceMeter();
updateComplianceMeter();

if (!checkComplianceOrReset()) return;
continue;
        }

        if (step.task) {
          const fn = TASKS[step.task];
          if (!fn) {
            await playLines([`System: PROCEDURE MISSING (${step.task}).`]);
            continue;
          }

          document.body.classList.add("task-open");
          simRoom.classList.add("hidden");
          simChoices.classList.add("hidden");
          hackRoom.classList.add("hidden");

          taskUI.classList.remove("hidden");
          taskBody.innerHTML = "";
          try { window.Music?.setScene?.("task"); } catch {}
          try { window.Music?.setGuidePath?.(guidePath); } catch {}
          try { window.Music?.setResistancePoints?.(resistancePoints); } catch {}

          activeTaskId = step.task;
activeTaskAnswer = "";
updateAdminPanelForTask(activeTaskId, activeTaskAnswer);

// allow admin to skip *only* while a task gate is open
window.__TNR_ADMIN_SKIP__ = () => {
  if (!isAdmin) return;
  finishTaskGate(true);
};

taskWrongCount = 0;

const noTimer = !!(step.args && step.args.noTimer);
if (!noTimer) {
  taskTimer = createTaskTimerController();
  taskTimer.resetForNewTask();
  taskTimer.show();
  taskTimer.start();
} else {
  taskTimer = null;
}

          const gate = beginTaskGate();

          // Run task (it should call ctx.success() on verified correct)
          await fn(taskContext, step.args || {});
          if (ABORTED) return;

          setTimeout(() => {
            if (!_taskDone) showFallbackContinue();
          }, 800);

          const ok = await gate;
          if (ABORTED) return;

          if (taskTimer) {
            taskTimer.stop();
            taskTimer.hide();
          }
          taskTimer = null;
          window.__TNR_ADMIN_SKIP__ = null;

          if (!checkComplianceOrReset()) return;

          taskUI.classList.add("hidden");
          document.body.classList.remove("task-open");
          simRoom.classList.remove("hidden");
          try { window.Music?.setScene?.("sim"); } catch {}
          try { window.Music?.setGuidePath?.(guidePath); } catch {}
          try { window.Music?.setResistancePoints?.(resistancePoints); } catch {}

          await wait(220);
          continue;
        }
      }
    }

    /* ======================
       SIM FLOW
    ====================== */
    async function openSimRoom() {
      stage = 99;

      await unlockAudio();
      try { window.Music?.setScene?.("sim"); } catch {}
      try { window.Music?.setGuidePath?.(guidePath); } catch {}
      try { window.Music?.setResistancePoints?.(resistancePoints); } catch {}

      // If we entered via the shatter transition, a full-screen black cut can be active.
      // Reveal the sim UI immediately; do not keep the cut up while dialogue runs.
      document.body.classList.remove("cut-black");

      document.body.classList.add("in-sim");
      try { setAdminUI(isAdmin); } catch {}
      startSimGlitchLoop();
      subs?.classList.remove("hidden");

      simRoom.classList.remove("hidden");
      taskUI.classList.add("hidden");
      simChoices.classList.add("hidden");
      hackRoom.classList.add("hidden");

      simText.textContent = "";
      playSfx("static1", { volume: 0.22, overlap: false });

      HUD.resWrap.style.opacity = "1";
      HUD.compWrap.style.opacity = "1";
      updateResistanceMeter();
      updateComplianceMeter();

      await playLines(DIALOGUE.intro);
      await runSteps(DIALOGUE.steps);
    }

    /* ======================
       LANDING: timestamp tick
    ====================== */
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
