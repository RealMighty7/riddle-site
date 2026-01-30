// main.js (FULL REPLACEMENT)
(() => {
  function boot() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot, { once: true });
      return;
    }

    /* ====================== UTIL ====================== */
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
       GLOBAL ABORT FLAG (prevents post-reset logic)
    ====================== */
    let ABORTED = false;
    const abortIfNeeded = () => ABORTED || document.body.classList.contains("sim-transition");

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
          // ===== TTS parsing + routing =====
    function parseSpeakerAndText(line) {
      const raw = String(line || "").replace(/^\s*\[\d{1,4}\]\s*/, "").trim();

      // "Emma (Security): blah" or "System: blah"
      const m = raw.match(/^([^:]{1,48}):\s*(.*)$/);
      if (!m) return { speaker: "System", text: raw };

      const speakerRaw = (m[1] || "").trim();
      const speaker = speakerRaw.split("(")[0].trim() || "System";
      const text = (m[2] || "").trim();
      return { speaker, text };
    }

    // ===== TTS helper (packs + dialogue) =====
    window.TTS_SPEAKERS = window.TTS_SPEAKERS || {
      System: { voice: "en-US-GuyNeural", style: "", rate: "-6%", pitch: "-2Hz", volume: "+0%" },
      Emma:   { voice: "en-US-ErinNeural", style: "serious", rate: "-4%", pitch: "-1Hz", volume: "+0%" },
      Liam:   { voice: "en-US-DavisNeural", style: "calm", rate: "-2%", pitch: "-2Hz", volume: "+0%" },
    };
    
    window.sayLine = function sayLine(speaker, text, extra = {}) {
      try {
        const cfg = window.TTS_SPEAKERS?.[speaker] || window.TTS_SPEAKERS?.System || {};
        const payload = {
          speaker: String(speaker || "System"),
          voice: cfg.voice || extra.voice,
          style: extra.style ?? cfg.style ?? "",
          rate:  extra.rate  ?? cfg.rate  ?? null,
          pitch: extra.pitch ?? cfg.pitch ?? null,
          volume: extra.volume ?? cfg.volume ?? null,
          text: String(text || "").trim(),
        };
        if (!payload.voice || !payload.text) return;
        window.TTS?.enqueue?.(payload);
      } catch {}
    };
    
    // Optional convenience:
    window.saySystem = (text, extra) => window.sayLine("System", text, extra);
    window.sayEmma   = (text, extra) => window.sayLine("Emma", text, extra);
    window.sayLiam   = (text, extra) => window.sayLine("Liam", text, extra);

    function stripIdsDeep(node) {
      try {
        if (node.nodeType !== 1) return;
        if (node.hasAttribute("id")) node.removeAttribute("id");
        const kids = node.children;
        for (let i = 0; i < kids.length; i++) stripIdsDeep(kids[i]);
      } catch {}
    }
    
    function buildShardFX() {
      const old = document.getElementById("shardFX");
      if (old) old.remove();
    
      const wrap = document.getElementById("wrap");
      if (!wrap) return null;
    
      const fx = document.createElement("div");
      fx.id = "shardFX";
    
      const W = window.innerWidth;
      const H = window.innerHeight;
    
      // one clean clone we can reuse per shard
      const baseClone = wrap.cloneNode(true);
      stripIdsDeep(baseClone);
      baseClone.style.margin = "0";
      baseClone.style.maxWidth = "none";
      baseClone.style.width = wrap.getBoundingClientRect().width + "px";
      baseClone.style.height = wrap.getBoundingClientRect().height + "px";
    
      const wrapRect = wrap.getBoundingClientRect();
    
      const shardCount = 14; // tweak
      for (let i = 0; i < shardCount; i++) {
        const shard = document.createElement("div");
        shard.className = "shard";
    
        // random-ish rectangles across viewport
        const w = 140 + Math.random() * 260;
        const h = 90 + Math.random() * 220;
        const x = Math.random() * (W - w);
        const y = Math.random() * (H - h);
    
        shard.style.left = x + "px";
        shard.style.top = y + "px";
        shard.style.width = w + "px";
        shard.style.height = h + "px";
    
        // fly direction + rotation
        const dx = (Math.random() - 0.5) * 520;
        const dy = (Math.random() - 0.5) * 420;
        const dr = (Math.random() - 0.5) * 26;
    
        shard.style.setProperty("--dx", dx.toFixed(1) + "px");
        shard.style.setProperty("--dy", dy.toFixed(1) + "px");
        shard.style.setProperty("--dr", dr.toFixed(1) + "deg");
    
        // jagged-ish clip polygon
        const j = () => (Math.random() * 6).toFixed(1) + "%";
        shard.style.clipPath = `polygon(${j()} ${j()}, ${100 - Math.random()*6}% ${j()}, ${100 - Math.random()*6}% ${100 - Math.random()*6}%, ${j()} ${100 - Math.random()*6}%)`;
    
        // inner is a fresh clone so each shard can position it independently
        const inner = baseClone.cloneNode(true);
        inner.className = "inner";
        stripIdsDeep(inner);
    
        // align clone so shard shows the correct “slice” of the landing UI
        // shift relative to wrap position on screen
        const offsetX = -(x - wrapRect.left);
        const offsetY = -(y - wrapRect.top);
        inner.style.left = offsetX + "px";
        inner.style.top = offsetY + "px";
    
        shard.appendChild(inner);
        fx.appendChild(shard);
      }
    
      document.body.appendChild(fx);
      return fx;
    }
    
    function removeShardFX() {
      const fx = document.getElementById("shardFX");
      if (fx) fx.remove();
    }

    /* ======================
       BUILD: REVISION COUNTER (persists across forced resets)
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
      const n = getRevisionCount();
      els.build.textContent = `build: revision ${n}`;
    }
    renderRevisionCount();

    /* ====================== LANDING ASSETS ====================== */
    const IMAGE_POOL = Array.from({ length: 12 }, (_, i) => `/assets/img${i + 1}.jpg`);
    document.querySelectorAll(".adImg").forEach((img) => {
      img.src = IMAGE_POOL[Math.floor(Math.random() * IMAGE_POOL.length)];
    });

    /* ====================== VIEWER TOKEN LOCK (until launch) ====================== */
    let launchArmed = false;

    if (viewerToken) {
      viewerToken.disabled = true;
      viewerToken.value = "";
    }

    function armLaunch() {
      if (launchArmed) return;
      launchArmed = true;

      if (viewerToken) {
        viewerToken.disabled = false;
        viewerToken.focus();
      }
    }

    /* ======================
       ADMIN ACCESS (SHA-256)
    ====================== */
    const ADMIN_HASH =
      "27fedb02589c0bacf10ecdda0d63486573fa76350d2edf7ee6e6e6cc35858c44";

    async function sha256(str) {
      const buf = new TextEncoder().encode(str);
      const hash = await crypto.subtle.digest("SHA-256", buf);
      return [...new Uint8Array(hash)]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }

    function grantAdmin() {
      if (document.body.classList.contains("admin")) return;
      document.body.classList.add("admin");
      console.log("%c[admin] elevated access granted", "color:#8cbcff");
      document.dispatchEvent(new CustomEvent("admin:enabled"));
    }

    if (viewerToken) {
      viewerToken.addEventListener("input", async () => {
        if (!launchArmed) return;

        const v = viewerToken.value.trim();
        if (!v || v.length < 8) return;

        let h = "";
        try { h = await sha256(v); }
        catch (e) { console.warn("[admin] sha256 failed", e); return; }

        if (h === ADMIN_HASH) grantAdmin();
      });
    }

    window.__ADMIN_FORCE_OK = false;

    function initAdminPanel() {
      const panel = document.getElementById("adminPanel");
      if (!panel) return;
      panel.classList.remove("hidden");

      if (panel.parentElement !== document.body) document.body.appendChild(panel);

      const elTask = document.getElementById("adminTask");
      const elArgs = document.getElementById("adminAnswer");
      const elStored = document.getElementById("adminStoredAnswer");
      const btnSkip = document.getElementById("adminSkip");
      const btnToggle = document.getElementById("adminToggle");

      btnToggle?.addEventListener("click", () => {
        const willHide = !panel.classList.contains("hidden");
        if (willHide) {
          try { document.activeElement?.blur?.(); } catch {}
        }
        panel.classList.toggle("hidden");
        panel.setAttribute("aria-hidden", panel.classList.contains("hidden") ? "true" : "false");
        btnToggle.textContent = panel.classList.contains("hidden") ? "show" : "hide";
      });

      btnSkip?.addEventListener("click", () => {
        window.__ADMIN_FORCE_OK = true;
        document.dispatchEvent(new CustomEvent("admin:skip", { bubbles: true }));
        panel.setAttribute("aria-hidden", "false");
        try { document.activeElement?.blur?.(); } catch {}
      });

      document.addEventListener("admin:task", (e) => {
        const id = e?.detail?.taskId || "—";
        const args = e?.detail?.args ? JSON.stringify(e.detail.args) : "—";
        if (elTask) elTask.textContent = id;
        if (elArgs) elArgs.textContent = args;
      });

      document.addEventListener("admin:answer", (e) => {
        const ans = e?.detail?.answer;
        if (!elStored) return;
        elStored.textContent = ans == null ? "—" : String(ans);
      });
    }

    document.addEventListener("admin:enabled", () => {
      const sys = document.getElementById("system");
      if (sys) sys.textContent = "admin context detected.";
      initAdminPanel();
    });

    /* ====================== AUDIO UNLOCK ====================== */
    let audioUnlocked = false;
    async function unlockAudio() {
      if (audioUnlocked) return;
      audioUnlocked = true;

      try {
        if (window.AudioPlayer?.unlock) await window.AudioPlayer.unlock();
      } catch (e) {
        console.warn("[audio] unlock failed:", e);
      }
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
    let stage = 1; // 1 = landing clickable, 99 = sim
    let clicks = 0;
    let lastClick = 0;
    const CLICK_COOLDOWN = 650;

    const CRACK_AT = [15, 17, 19, 21];
    const SHATTER_AT = 22;

    // choices: used for "voice+pacing feel"
    let guidePath = "emma"; // emma / liam / run
    let paceBias = 0; // -1 calm, 0 normal, +1 tense, +2 urgent

    // compliance/resistance now includes TASK outcomes
    const COMPLIANCE_LIMIT = 0.30;
    const MIN_CHOICES_BEFORE_CHECK = 10;

    let choiceTotal = 0;
    let compliancePoints = 0;
    let resistancePoints = 0;

    function hardReload() {
      window.location.href = window.location.href.split("#")[0];
    }

    function doReset(reasonTitle, reasonBody) {
      if (ABORTED) return;
      ABORTED = true;

      // forced reset increments revision and persists
      incRevisionCount();
      renderRevisionCount();

      resetTitle.textContent = reasonTitle || "RESET";
      resetBody.textContent = reasonBody || "";
      resetOverlay.classList.remove("hidden");

      // stop audio + timer if any
      try { window.AudioPlayer?.stop?.(); } catch {}
      try { window.TTS?.stop?.(); } catch {}
      try { taskTimer?.stop?.(); } catch {}

      setTimeout(hardReload, 1800);
    }

    // Auto-continue after a task calls ctx.setAnswer(...)
    let __autoContinueTimer = 0;
    
    function scheduleAutoContinue(delayMs = 550) {
      if (ABORTED) return;
      if (__autoContinueTimer) clearTimeout(__autoContinueTimer);
    
      // Hide buttons so it feels "automatic"
      try { taskPrimary.classList.add("hidden"); } catch {}
      try { taskSecondary.classList.add("hidden"); } catch {}
    
      __autoContinueTimer = setTimeout(() => {
        __autoContinueTimer = 0;
        if (ABORTED) return;
    
        // Mark task UI "done" if your CSS uses it
        try { document.body.classList.add("task-done"); } catch {}
    
        // Nothing else to do: runSteps resumes after fn() returns.
        // This just adds a beat so it doesn't feel instant.
      }, Math.max(0, delayMs | 0));
    }

    function glitchPulse() {
      playSfx("glitch1", { volume: 0.55, overlap: true });
      cracks.classList.add("flash");
      setTimeout(() => cracks.classList.remove("flash"), 220);
    }

    /* ======================
       DYNAMIC UI: task time bar + resistance meter
       (no CSS file changes required)
    ====================== */
    function makeHud() {
      // time bar (top)
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

      // resistance meter (small, top-right)
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

      return { barWrap, barFill, resWrap, resPip, resTxt };
    }

    const HUD = makeHud();

    /* ======================
       PRESSURE (tied to task time fraction)
    ====================== */
    let pressureTier = 0; // 0 white, 1 yellow, 2 red
    let pressureHinted = { yellow: false, red: false };

    function setPressureTier(tier) {
      const next = Math.max(0, Math.min(2, tier | 0));
      if (next === pressureTier) return;
      pressureTier = next;

      document.body.classList.toggle("pressure1", pressureTier >= 1);
      document.body.classList.toggle("pressure2", pressureTier >= 2);

      if (pressureTier === 1) playSfx("static2", { volume: 0.12, overlap: true });
      if (pressureTier === 2) playSfx("glitch2", { volume: 0.18, overlap: true });

      // stingers (once per task)
      if (pressureTier === 1 && !pressureHinted.yellow) {
        pressureHinted.yellow = true;
        void emitLine("System: Time window narrowing.");
      }
      if (pressureTier === 2 && !pressureHinted.red) {
        pressureHinted.red = true;
        void emitLine("System: Do not stall.");
      }
    }

    function setTaskTimeBarFrac(frac) {
      const clampedF = clamp(frac, 0, 1);
      HUD.barFill.style.width = `${(clampedF * 100).toFixed(2)}%`;

      // color mapping: white -> yellow -> red
      if (clampedF <= 0.10) {
        HUD.barFill.style.background = "rgba(255,80,80,0.95)";
        setPressureTier(2);
      } else if (clampedF <= 0.30) {
        HUD.barFill.style.background = "rgba(255,220,90,0.95)";
        setPressureTier(1);
      } else {
        HUD.barFill.style.background = "rgba(255,255,255,0.92)";
        setPressureTier(0);
      }
    }

    function updateResistanceMeter() {
      // scale: treat 0..30 as 0..100% (clamped)
      const max = 30;
      const pct = clamp(resistancePoints / max, 0, 1);

      HUD.resPip.style.width = `${(pct * 100).toFixed(1)}%`;
      HUD.resTxt.textContent = `resistance: ${resistancePoints}`;

      // subtle color cue: white -> yellow -> red
      if (pct >= 0.70) HUD.resPip.style.background = "rgba(255,80,80,0.85)";
      else if (pct >= 0.35) HUD.resPip.style.background = "rgba(255,220,90,0.85)";
      else HUD.resPip.style.background = "rgba(255,255,255,0.70)";
    }
    updateResistanceMeter();

    /* ======================
       TASK TIMER CONTROLLER
       - base 5 minutes
       - each resistance reduces limit by 1.5% (fits "1–2%" request)
       - wrong attempts speed drain (no reset)
       - timeout => forced reset (revision++)
    ====================== */
    function calcTaskLimitMs() {
      const base = 5 * 60 * 1000;
      const perRes = 0.015; // 1.5% per resistance
      const mult = clamp(1 - resistancePoints * perRes, 0.35, 1.0);
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
        getLeftMs() { return leftMs; },
        getTotalMs() { return totalMs; },
      };

      function loop() {
        if (!running || ABORTED) return;

        const now = performance.now();
        const dt = Math.max(0, now - lastT);
        lastT = now;

        leftMs -= dt * drainMult;
        const frac = leftMs / totalMs;
        setTaskTimeBarFrac(frac);

        if (leftMs <= 0) {
          running = false;
          api.stop();
          doReset(
            "TIMEOUT",
            `Time limit exceeded.

resistance: ${resistancePoints}
build: revision ${getRevisionCount()}

Reinitializing…`
          );
          return;
        }

        raf = requestAnimationFrame(loop);
      }

      return api;
    }

    /* ======================
       VOICE LAYER (your existing audio_player.js)
    ====================== */
    let VO = null;
    let VO_READY = false;

    function handleVoiceTag(tag) {
      if (tag === "breath") playSfx("static1", { volume: 0.08, overlap: true });
      if (tag === "calm") {
        if (subs) subs.classList.add("calm");
        setTimeout(() => subs && subs.classList.remove("calm"), 900);
      }
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

    window.AudioPlayer = {
      _audioChain: Promise.resolve(),
      async init() {
        if (VO_READY) return;
        if (!window.VoiceBank) {
          console.warn("VoiceBank not found. Make sure /audio_player.js loads before /main.js.");
          return;
        }

        VO = new window.VoiceBank({
          voicesUrl: "/audio/data/voices.json",
          onTag: (tagName) => handleVoiceTag(tagName),
        });

        VO.bindSubtitleUI({ nameEl: subsName, subtitleEl: subsText });
        await VO.load();
        VO_READY = true;
      },

      async unlock() {
        try {
          await this.init();
          if (VO && VO.unlockAudio) await VO.unlockAudio();
        } catch (e) {
          console.warn("AudioPlayer.unlock failed:", e);
        }
      },

      async playLine(rawLine) {
        await this.init();
        if (!VO || ABORTED) return Promise.resolve();

        const id = getIdFromLine(rawLine);
        if (!id) return Promise.resolve();

        this._audioChain = this._audioChain
          .then(() => (ABORTED ? null : VO.playById(id, { volume: 1.0, baseHoldMs: 160, stopPrevious: false })))
          .catch(() => {});
        return this._audioChain;
      },

      stop() {
        try { VO?.stopCurrent?.(); } catch {}
      },
    };

    /* ====================== OUTPUT PIPE ====================== */
    async function typeLineIntoSim(text, ms) {
      if (ABORTED) return;

      const s = String(text || "");
      if (!s) {
        simText.textContent += "\n";
        simText.scrollTop = simText.scrollHeight;
        return;
      }

      const minMs = 450;

      // pace influenced by: choice bias + pressure
      const pressureMult = (pressureTier === 2) ? 0.62 : (pressureTier === 1) ? 0.78 : 1.0;
      const biasMult =
        (paceBias >= 2) ? 0.70 :
        (paceBias === 1) ? 0.85 :
        (paceBias === -1) ? 1.10 :
        1.0;

      const total = Math.max(minMs, Math.floor((ms | 0) * pressureMult * biasMult));
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

    async function emitLine(line) {
      if (ABORTED) return;

      const raw = String(line || "");
      const printed = raw.replace(/^\s*\[\d{1,4}\]\s*/, "");

      // VoiceBank (your existing /audio_player.js system)
      const voPromise =
        window.AudioPlayer && typeof window.AudioPlayer.playLine === "function"
          ? window.AudioPlayer.playLine(raw)
          : Promise.resolve();

      // Azure TTS queue (your /ttsQueue.js + /functions/api/tts.js)
      let ttsPromise = Promise.resolve();
      try {
        if (shouldUseAzureTTS(raw)) {
          const { speaker, text } = parseSpeakerAndText(raw);
          // keep your token system working: {breath} {pause=220}
          ttsPromise = window.TTS?.enqueue?.({
            speaker,
            ...(window.TTS_SPEAKERS?.[speaker] || window.TTS_SPEAKERS?.System || {}),
            text,
          }) || Promise.resolve();
        }
      } catch {}

      const typingMs = getTypingMsForLine(raw);

      await Promise.all([
        typeLineIntoSim(printed, typingMs),
        voPromise,
        ttsPromise,
      ]);
    }


    async function playLines(lines) {
      for (const line of lines || []) {
        if (ABORTED) return;
        await emitLine(line);
        const gap =
          (pressureTier === 2) ? 20 :
          (pressureTier === 1) ? 45 :
          (paceBias >= 2) ? 35 :
          (paceBias === 1) ? 55 :
          80;
        await wait(gap);
      }
    }

    /* ======================
       TASK CONTEXT + ANSWER HOOK
    ====================== */
    let lastAnswer = null;

    // per-task tracking for haywire rule
    let activeTaskId = null;
    let taskWrongCount = 0;
    let taskTimer = null;

    function recordWrongAttempt(reason) {
      if (ABORTED) return;

      // +3 resistance on wrong attempt
      resistancePoints += 3;
      updateResistanceMeter();

      // speed drain a bit; timer never resets
      taskTimer?.onWrong?.();

      taskWrongCount++;

      // haywire on 3 wrong attempts within same task
      if (taskWrongCount >= 3) {
        doReset(
          "SYSTEM HAYWIRE",
          `Anomalous input density detected.

task: ${activeTaskId || "unknown"}
wrong attempts: ${taskWrongCount}
resistance: ${resistancePoints}

Resetting simulation…`
        );
        return;
      }

      // stingers
      if (taskWrongCount === 1) void emitLine("System: Incorrect.");
      else if (taskWrongCount === 2) void emitLine("System: Stop guessing.");
      else void emitLine("System: Input rejected.");
    }

    const taskContext = {
      taskPrimary,
      taskSecondary,
      taskBody,

      setAnswer(ans) {
        lastAnswer = ans;
        document.dispatchEvent(new CustomEvent("admin:answer", { detail: { answer: ans } }));

        scheduleAutoContinue(550);
      },

      getAnswer() { return lastAnswer; },

      showTaskUI(title, desc) {
        if (ABORTED) return;

        document.body.classList.add("task-open");
        simRoom.classList.add("hidden");

        taskUI.classList.remove("hidden");
        taskTitle.textContent = title;
        taskDesc.textContent = desc;
        taskBody.innerHTML = "";

        taskSecondary.classList.add("hidden");
        taskPrimary.disabled = false;
        taskPrimary.onclick = null;
        taskSecondary.onclick = null;

        els.taskActions?.classList.remove("hidden");

        // --- TTS: announce task (queued, no overlap) ---
        try {
          window.saySystem?.(`{breath}${title}. {pause=180}${desc}`);
        } catch {}
      },


      doReset,

      difficultyBoost() { return resistancePoints >= 10 ? 1 : 0; },

      // Packs MUST call ctx.penalize() for wrong attempts to count as resistance.
      penalize(n = 1, reason = "") {
        recordWrongAttempt(reason || "penalty");
      },

      glitch: glitchPulse,
    };

    /* ======================
       CHOICE HANDLING + COMPLIANCE CHECK
    ====================== */
    function checkComplianceOrReset() {
      if (choiceTotal < MIN_CHOICES_BEFORE_CHECK) return true;

      const denom = Math.max(1, compliancePoints + resistancePoints);
      const ratio = compliancePoints / denom;

      if (ratio >= COMPLIANCE_LIMIT) {
        doReset(
          "TOO COMPLIANT",
          `Compliance threshold exceeded.

compliance: ${compliancePoints}
resistance: ${resistancePoints}
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

    async function runSteps(steps) {
      for (const step of steps) {
        if (ABORTED) return;

        if (step.say) {
          document.body.classList.remove("task-open");
          simRoom.classList.remove("hidden");
          taskUI.classList.add("hidden");
          await playLines(step.say);
          continue;
        }

        if (step.choice) {
          document.body.classList.remove("task-open");
          simRoom.classList.remove("hidden");
          taskUI.classList.add("hidden");

          const labels = step.choice;
          if (labels?.complyLabel) choiceNeed.textContent = labels.complyLabel;
          if (labels?.lieLabel) choiceLie.textContent = labels.lieLabel;
          if (labels?.runLabel) choiceRun.textContent = labels.runLabel;
          simChoices.classList.remove("hidden");

          const choice = await waitForChoice();
          simChoices.classList.add("hidden");

          choiceTotal++;

          if (choice === "comply") {
            guidePath = "emma";
            paceBias = -1;
          } else if (choice === "lie") {
            guidePath = "liam";
            paceBias = 1;
          } else {
            guidePath = "run";
            paceBias = 2;
            resistancePoints += 1; // small nudge for run path
          }

          updateResistanceMeter();

          if (!checkComplianceOrReset()) return;
          continue;
        }

        if (step.task) {
          document.dispatchEvent(new CustomEvent("admin:task", {
            detail: { taskId: step.task, args: step.args || null }
          }));

          if (window.__ADMIN_FORCE_OK) {
            window.__ADMIN_FORCE_OK = false;
            await wait(200);
            continue;
          }

          const fn = TASKS[step.task];
          if (!fn) {
            await playLines([`System: PROCEDURE MISSING (${step.task}).`]);
            continue;
          }

          // open task UI
          document.body.classList.add("task-open");
          simRoom.classList.add("hidden");
          simChoices.classList.add("hidden");

          // per-task init
          activeTaskId = step.task;
          taskWrongCount = 0;

          pressureHinted = { yellow: false, red: false };
          setPressureTier(0);

          lastAnswer = null;

          // start timer
          taskTimer = createTaskTimerController();
          taskTimer.resetForNewTask();
          taskTimer.show();
          taskTimer.start();

          // run task
          await fn(taskContext, step.args || {});
          if (ABORTED) return;

          // completed => +1 compliance
          compliancePoints += 1;

          // stop timer
          taskTimer.stop();
          taskTimer.hide();
          taskTimer = null;

          if (!checkComplianceOrReset()) return;

          // close task UI
          taskUI.classList.add("hidden");
          document.body.classList.remove("task-open");
          simRoom.classList.remove("hidden");

          await wait(250);
          continue;
        }

        if (step.filler) {
          const count = step.filler.count ?? 1;
          const pool = step.filler.pool ?? "AUTO";
          const meta = step.filler.meta ?? {};

          for (let i = 0; i < count; i++) {
            if (ABORTED) return;
            let line = "";
            if (pool === "AUTO" && window.DIALOGUE_HELPERS?.autoFiller) {
              line = window.DIALOGUE_HELPERS.autoFiller({
                ...meta,
                path: guidePath,
                pressure: pressureTier,
                resistance: resistancePoints,
                compliance: compliancePoints,
              });
            } else {
              line = "System: Buffering…";
            }
            await emitLine(line);
            await wait(30);
          }
          continue;
        }
      }
    }

    /* ====================== SIM FLOW ====================== */
    async function openSimRoom() {
      stage = 99;
  
      document.body.classList.remove("cut-black");
      document.body.classList.remove("shatter-cine");
      document.body.classList.remove("into-sim");
      document.body.classList.remove("sim-transition");
      await unlockAudio();
      document.body.classList.add("in-sim");
      subs?.classList.remove("hidden");
      simRoom.classList.remove("hidden");
      taskUI.classList.add("hidden");
      simChoices.classList.add("hidden");
      hackRoom.classList.add("hidden");

      simText.textContent = "";
      playSfx("static1", { volume: 0.25, overlap: false });

      HUD.resWrap.style.opacity = "1";
      updateResistanceMeter();

      await playLines(DIALOGUE.intro);
      await runSteps(DIALOGUE.steps);
    }

    /* ======================
       CRACKS: progressive, builds off existing (no shifting)
    ====================== */
    let crackStage = 0;
    let crackSeed = 0;
    let crackRng = null;
    const endpoints = [];

    function rngFactory(seed) {
      let t = seed >>> 0;
      return () => {
        t += 0x6d2b79f5;
        let x = Math.imul(t ^ (t >>> 15), 1 | t);
        x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
      };
    }

    function pickEndpoint() {
      if (!endpoints.length) return { x: 500, y: 500 };
      return endpoints[Math.floor(crackRng() * endpoints.length)];
    }

    function clampPt(p) {
      return {
        x: Math.max(-60, Math.min(1060, p.x)),
        y: Math.max(-60, Math.min(1060, p.y)),
      };
    }

    function makeBranchPath(start, steps, stepLen, jitter) {
      let x = start.x, y = start.y;
      let ang = crackRng() * Math.PI * 2;
      const pts = [`M ${x.toFixed(1)} ${y.toFixed(1)}`];

      for (let i = 0; i < steps; i++) {
        ang += (crackRng() - 0.5) * jitter;
        x += Math.cos(ang) * stepLen * (0.75 + crackRng() * 0.7);
        y += Math.sin(ang) * stepLen * (0.75 + crackRng() * 0.7);
        const p = clampPt({ x, y });
        x = p.x; y = p.y;
        pts.push(`L ${x.toFixed(1)} ${y.toFixed(1)}`);
      }

      endpoints.push({ x, y });
      return pts.join(" ");
    }

    function addSeg(svg, d) {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "seg");

      const pUnder = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pUnder.setAttribute("d", d);
      pUnder.setAttribute("class", "crack-path crack-under");

      const pLine = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pLine.setAttribute("d", d);
      pLine.setAttribute("class", "crack-path crack-line");

      const pGlint = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pGlint.setAttribute("d", d);
      pGlint.setAttribute("class", "crack-path crack-glint");
      pGlint.style.opacity = crackRng() < 0.35 ? "0.85" : "0.0";

      g.appendChild(pUnder);
      g.appendChild(pLine);
      g.appendChild(pGlint);
      svg.appendChild(g);

      [pUnder, pLine, pGlint].forEach((p) => {
        try {
          const len = p.getTotalLength();
          p.style.strokeDasharray = String(len);
          p.style.strokeDashoffset = String(len);
          const delay = Math.floor(crackRng() * 110); // stagger
          setTimeout(() => {
            requestAnimationFrame(() => { p.style.strokeDashoffset = "0"; });
          }, delay);
        } catch {}
      });
    }

    function ensureCracks() {
      if (crackRng) return;

      crackSeed = (Date.now() ^ ((Math.random() * 1e9) | 0)) >>> 0;
      crackRng = rngFactory(crackSeed);

      try {
        cracks.setAttribute("viewBox", "0 0 1000 1000");
        cracks.setAttribute("preserveAspectRatio", "none");
      } catch {}

      endpoints.length = 0;

      const seeds = [
        { x: 320 + crackRng() * 90, y: 280 + crackRng() * 90 },
        { x: 680 + crackRng() * 90, y: 320 + crackRng() * 90 },
        { x: 360 + crackRng() * 90, y: 720 + crackRng() * 90 },
        { x: 720 + crackRng() * 90, y: 740 + crackRng() * 90 },
      ];

      for (const s of seeds) {
        const d = makeBranchPath(
          s,
          10 + Math.floor(crackRng() * 8),
          22 + crackRng() * 14,
          1.25 + crackRng() * 0.8
        );
        addSeg(cracks, d);
      }

      for (let i = 0; i < 6; i++) {
        const s = { x: 140 + crackRng() * 720, y: 140 + crackRng() * 720 };
        const d = makeBranchPath(
          s,
          4 + Math.floor(crackRng() * 4),
          10 + crackRng() * 10,
          2.1 + crackRng() * 1.1
        );
        addSeg(cracks, d);
      }
    }

    function setCrackStage(n) {
      crackStage = clamp(n, 0, 4);

      document.body.classList.toggle("crack1", crackStage >= 1);
      document.body.classList.toggle("crack2", crackStage >= 2);
      document.body.classList.toggle("crack3", crackStage >= 3);
      document.body.classList.toggle("crack4", crackStage >= 4);

      try { cracks.setAttribute("data-stage", String(crackStage)); } catch {}
      try { glassFX?.setAttribute("data-stage", String(crackStage)); } catch {}
    }

    function growCracksForStage(stageToAdd) {
      ensureCracks();

      const addCount =
        stageToAdd === 1 ? 18 :
        stageToAdd === 2 ? 28 :
        stageToAdd === 3 ? 40 :
        54;


      for (let i = 0; i < addCount; i++) {
        const base = pickEndpoint();
        const start = {
          x: base.x + (crackRng() - 0.5) * 24,
          y: base.y + (crackRng() - 0.5) * 24,
        };

        const steps = 7 + Math.floor(crackRng() * (stageToAdd * 5 + 8));
        const stepLen = 16 + crackRng() * (18 + stageToAdd * 12);
        const jitter = 2.1 + crackRng() * (1.6 + stageToAdd * 0.55);

        const d = makeBranchPath(start, steps, stepLen, jitter);
        addSeg(cracks, d);
      }
    }

    function maybeAdvanceCracks() {
      const next =
        clicks >= CRACK_AT[3] ? 4 :
        clicks >= CRACK_AT[2] ? 3 :
        clicks >= CRACK_AT[1] ? 2 :
        clicks >= CRACK_AT[0] ? 1 : 0;

      if (next <= crackStage) return;

      for (let s = crackStage + 1; s <= next; s++) {
        setCrackStage(s);
        growCracksForStage(s);
      }

      playSfx("glitch1", { volume: 0.22, overlap: true });
      cracks.classList.add("pulse");
      setTimeout(() => cracks.classList.remove("pulse"), 220);
    }

   async function shatterAndEnterSim() {
    if (document.body.classList.contains("sim-transition")) return;
  
    document.body.classList.add("sim-transition");
  
    ensureCracks();
    cracks.style.opacity = "1";
  
    // Create overlays once
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
  
    // Start cinematic pass
    document.body.classList.add("shatter-cine");
  
    // Audio + small extra glitch pulses
    playSfx("glassBreak", { volume: 0.75, overlap: false });
    playSfx("glitch2", { volume: 0.22, overlap: true });
    setTimeout(() => playSfx("glitch1", { volume: 0.20, overlap: true }), 90);
    setTimeout(() => playSfx("static1", { volume: 0.18, overlap: true }), 150);
  
    // Quick “final fracture growth burst” right at impact
    for (let s = crackStage + 1; s <= 4; s++) {
      setCrackStage(s);
      growCracksForStage(s);
    }
  
    // Let the shake/flash play, then hard cut
    await wait(420);
    document.body.classList.add("cut-black");
  
    // Cut duration (feels like a camera shutter)
    await wait(160);
  
    await openSimRoom();
  
    // Clean up transition states
    document.body.classList.remove("cut-black");
    document.body.classList.remove("shatter-cine");
    document.body.classList.remove("into-sim");
  }

    function isClickableTarget(e) {
      const t = e.target;
      if (!t) return true;
      if (t.closest && t.closest("input, textarea, select, button, a, label")) return false;
      if (t.closest && t.closest("#finalOverlay, #hackRoom, #taskUI, #adminPanel")) return false;
      return true;
    }

    function registerLandingClick(e, force = false) {
      if (stage !== 1) return;
      if (document.body.classList.contains("sim-transition")) return;
      if (!force && !isClickableTarget(e)) return;
    
      const now = Date.now();
      if (now - lastClick < CLICK_COOLDOWN) return;
      lastClick = now;
    
      ensureCracks();
    
      clicks++;
      playSfx("mclick", { volume: 0.35, overlap: true });
    
      maybeAdvanceCracks();
    
      if (clicks >= SHATTER_AT) {
        shatterAndEnterSim();
      }
    }
    
    // Prime crack seed
    ensureCracks();
    document.addEventListener("pointerdown", registerLandingClick, { passive: true });

    els.launchBtn?.addEventListener("click", (e) => {
      armLaunch();
      registerLandingClick(e, true);
      // Bias endpoints toward the click position (impact point)
      try {
        const r = cracks.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 1000;
        const y = ((e.clientY - r.top) / r.height) * 1000;
        endpoints.push({ x, y });
        if (endpoints.length > 140) endpoints.splice(0, endpoints.length - 140);
      } catch {}
    });

    if (els.timestamp) {
      const tick = () => {
        const d = new Date();
        els.timestamp.textContent = "timestamp: " + d.toLocaleString();
      };
      tick();
      setInterval(tick, 1000);
    }

    stage = 1;
  }

  boot();
})();
