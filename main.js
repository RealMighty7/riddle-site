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

    const CRACK_AT = [15, 17, 19];
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

    function newCrackPath() {
      const c = cracksCanvas;
      const w = c.width, h = c.height;
      const dpr = Math.max(1, window.devicePixelRatio || 1);

      const edge = Math.floor(sRand() * 4);
      let x = 0, y = 0;
      if (edge === 0) { x = sRand() * w; y = 0; }
      if (edge === 1) { x = w; y = sRand() * h; }
      if (edge === 2) { x = sRand() * w; y = h; }
      if (edge === 3) { x = 0; y = sRand() * h; }

      const pts = [{ x, y }];
      const steps = 18 + Math.floor(sRand() * 22);

      const cx = w * 0.5, cy = h * 0.5;
      for (let i = 0; i < steps; i++) {
        const last = pts[pts.length - 1];
        const toCx = (cx - last.x) / w;
        const toCy = (cy - last.y) / h;

        let ang = Math.atan2(toCy, toCx) + (sRand() - 0.5) * 1.2;
        const len = (10 + sRand() * 26) * dpr;

        x = last.x + Math.cos(ang) * len;
        y = last.y + Math.sin(ang) * len;

        x = Math.max(-40 * dpr, Math.min(w + 40 * dpr, x));
        y = Math.max(-40 * dpr, Math.min(h + 40 * dpr, y));
        pts.push({ x, y });

        if (i > 5 && sRand() < 0.16) {
          const bpts = [{ x: last.x, y: last.y }];
          let bx = last.x, by = last.y;
          const bsteps = 5 + Math.floor(sRand() * 9);
          let bang = ang + (sRand() < 0.5 ? -1 : 1) * (0.35 + sRand() * 0.8);
          for (let j = 0; j < bsteps; j++) {
            const blen = (8 + sRand() * 16) * dpr;
            bx += Math.cos(bang + (sRand() - 0.5) * 0.6) * blen;
            by += Math.sin(bang + (sRand() - 0.5) * 0.6) * blen;
            bpts.push({ x: bx, y: by });
          }
          crackState.paths.push(bpts);
        }
      }
      return pts;
    }

    function ensureCracksForStage(stageN) {
      const want = stageN === 0 ? 0 : stageN === 1 ? 5 : stageN === 2 ? 10 : 16;
      while (crackState.paths.length < want) crackState.paths.push(newCrackPath());
      while (crackState.paths.length > want) crackState.paths.pop();
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

    let crackStage = 0;
    function setCrackStage(n) {
      crackStage = clamp(n, 0, 3);
      crackState.stage = crackStage;
      ensureCracksForStage(crackStage);
      drawCracks();

      // show/hide overlay container
      cracks.style.opacity = crackStage > 0 ? "1" : "0";
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

    async function shatterAndEnterSim() {
      if (document.body.classList.contains("sim-transition")) return;
      document.body.classList.add("sim-transition");

      setCrackStage(3);
      playSfx("glassBreak", { volume: 0.70, overlap: false });
      playSfx("glitch2", { volume: 0.14, overlap: true });

      await runTriGlitch(1100);

      setCrackStage(0);

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

      clicks++;
      playSfx("mclick", { volume: 0.30, overlap: true });

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

      document.body.classList.add("in-sim");
      subs?.classList.remove("hidden");

      simRoom.classList.remove("hidden");
      taskUI.classList.add("hidden");
      simChoices.classList.add("hidden");
      hackRoom.classList.add("hidden");

      simText.textContent = "";
      playSfx("static1", { volume: 0.22, overlap: false });

      await playLines(DIALOGUE.intro);
      // your DIALOGUE.steps runner stays in your existing file set; keep it if you have it there
      if (Array.isArray(DIALOGUE.steps) && typeof window.__RUN_STEPS__ === "function") {
        await window.__RUN_STEPS__(DIALOGUE.steps);
      }
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
