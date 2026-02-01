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
      "cracksImg",
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
    const cracksImg = els.cracksImg;
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
    const CRACK_AT = [15, 18, 21];
    const SHATTER_AT = 22;

    let guidePath = "emma";
    let paceBias = 0;

    const COMPLIANCE_LIMIT = 0.30;
    const MIN_CHOICES_BEFORE_CHECK = 10;

    let choiceTotal = 0;
    let compliancePoints = 0;
    let resistancePoints = 0;

    /* ======================
       PNG CRACK OVERLAYS
    ====================== */
    const CRACK_PNGS = [
      "", // stage 0 = none
      "/assets/Cracks1.png",
      "/assets/Cracks2.png",
      "/assets/Cracks3.png",
    ];

    let crackStage = 0;

    function setCrackStage(n) {
      crackStage = clamp(n, 0, 3);

      document.body.classList.toggle("crack1", crackStage >= 1);
      document.body.classList.toggle("crack2", crackStage >= 2);
      document.body.classList.toggle("crack3", crackStage >= 3);

      const src = CRACK_PNGS[crackStage] || "";
      if (src) {
        // swap with no flash
        cracksImg.style.opacity = "0";
        requestAnimationFrame(() => {
          cracksImg.src = src;
          cracksImg.onload = () => { cracksImg.style.opacity = "1"; };
          // if cached load doesn't fire consistently:
          setTimeout(() => { cracksImg.style.opacity = "1"; }, 60);
        });
      } else {
        cracksImg.removeAttribute("src");
      }
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

    async function shatterAndEnterSim() {
      if (document.body.classList.contains("sim-transition")) return;

      document.body.classList.add("sim-transition");

      // overlays once
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

      // force final crack stage before impact
      setCrackStage(3);
      cracks.style.opacity = "1";

      document.body.classList.add("shatter-cine");

      playSfx("glassBreak", { volume: 0.75, overlap: false });
      playSfx("glitch2", { volume: 0.20, overlap: true });
      setTimeout(() => playSfx("static1", { volume: 0.16, overlap: true }), 120);

      await wait(420);
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
      if (t.closest && t.closest("input, textarea, select, button, a, label")) return false;
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

      return { barWrap, barFill, resWrap, resPip, resTxt };
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

    window.AudioPlayer = window.AudioPlayer || {};
    const _AudioPlayer = window.AudioPlayer;

    // If your audio_player.js defines these, this just uses them.
    async function ensureVoiceBank() {
      if (VO_READY) return;
      if (!window.VoiceBank) return;
      VO = new window.VoiceBank({
        voicesUrl: "/audio/data/voices.json",
        onTag: () => {},
      });
      VO.bindSubtitleUI({ nameEl: subsName, subtitleEl: subsText });
      await VO.load();
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
        // playById is async; we don't want it to block typing forever if it errors
        await VO.playById(id, { volume: 1.0, baseHoldMs: 160, stopPrevious: false });
        return true;
      } catch {
        return false;
      }
    }

    function shouldUseAzureTTS(rawLine) {
      // Use Azure when:
      // - no [####] id AND
      // - VoiceBank can't match the line to an id
      const id = getIdFromLine(rawLine);
      return !id;
    }

    function getTypingMsForLine(rawLine) {
      // If we have an id and duration metadata, use it; else fallback to WPM estimate
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
    // ===== Azure TTS routing =====
    // Use Azure when:
    // - VoiceBank has no matching pre-rendered line id, OR
    // - the line explicitly includes tokens like {pause}/{breath}/{beat}
    function shouldUseAzureTTS(rawLine) {
      const raw = String(rawLine || "");
      // If it contains SSML-like tokens, prefer Azure
      if (/\{(pause|breath|beat)(?:\s*[= ]\s*\d{1,4})?\}/i.test(raw)) return true;
    
      // If VoiceBank doesn't have an id for this line, use Azure
      const id = getIdFromLine(raw);
      return !id;
    }
    async function emitLine(line) {
      if (ABORTED) return;

      const raw = String(line || "");
      const printed = raw.replace(/^\s*\[\d{1,4}\]\s*/, "");

      // 1) Always type text (this is the "source of truth" for pacing)
      const typingMs = getTypingMsForLine(raw);
      const typingPromise = typeLineIntoSim(printed, typingMs);

      // 2) Try pre-uploaded WAV first; if it doesn't exist, use Azure TTS queue
      const audioPromise = (async () => {
        // If VoiceBank exists and can play this line, do that.
        const playedWav = await playVoiceWavIfExists(raw);
        if (playedWav) return;

        // Else, fall back to Azure TTS (your /functions/api/tts)
        try {
          if (!window.TTS || !shouldUseAzureTTS(raw)) return;

          const { speaker, text } = parseSpeakerAndText(raw);
          const cfg =
            window.TTS_SPEAKERS?.[speaker] ||
            window.TTS_SPEAKERS?.System ||
            window.TTS_SPEAKERS?.System;

          await window.TTS.enqueue({
            voice: cfg.voice,
            style: cfg.style ?? "",
            rate: cfg.rate ?? null,
            pitch: cfg.pitch ?? null,
            // volume in ttsQueue is 0..1
            volume: cfg.volume ?? 1,
            text: String(text || "").trim(),
          });
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

      const denom = Math.max(1, compliancePoints + resistancePoints);
      const ratio = compliancePoints / denom;

      if (ratio >= COMPLIANCE_LIMIT) {
        doReset(
          "TOO COMPLIANT",
          `Compliance threshold exceeded.\n\ncompliance: ${compliancePoints}\nresistance: ${resistancePoints}\nratio: ${(ratio * 100).toFixed(0)}%\n\nReinitializing simulation…`
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
       TASK FLOW (AUTO-CONTINUE DONE RIGHT)
       - No "phantom wrong"
       - No hanging on "Ok."
       - Fallback Continue button appears if success doesn't resolve
    ====================== */
    let activeTaskId = null;
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

    // per-task promise controls:
    let _taskResolve = null;
    let _taskDone = false;
    let _taskSuccess = false;

    function beginTaskGate() {
      _taskDone = false;
      _taskSuccess = false;
      _taskResolve = null;
      return new Promise((resolve) => { _taskResolve = resolve; });
    }

    function finishTaskGate(ok) {
      if (_taskDone) return;
      _taskDone = true;
      _taskSuccess = !!ok;
      try { _taskResolve?.(_taskSuccess); } catch {}
    }

    function showFallbackContinue() {
      // This button is ONLY a failsafe (if a pack forgets ctx.success())
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

      // Packs should call success() when verified correct
      success(msg = "Ok.") {
        // Show a tiny acknowledgement in the task UI, then auto-continue
        try {
          const p = document.createElement("div");
          p.style.marginTop = "10px";
          p.style.opacity = "0.85";
          p.textContent = msg;
          taskBody.appendChild(p);
        } catch {}

        // Auto-finish soon (keeps the “Ok.” beat)
        setTimeout(() => finishTaskGate(true), 380);

        // Fallback button appears after 1.5s if something stalls
        setTimeout(() => {
          if (!_taskDone) showFallbackContinue();
        }, 1500);
      },

      // Packs can call fail() when they want to show an error but NOT penalize
      fail(msg = "Not accepted.") {
        try {
          const p = document.createElement("div");
          p.style.marginTop = "10px";
          p.style.opacity = "0.85";
          p.textContent = msg;
          taskBody.appendChild(p);
        } catch {}
      },

      // This is the ONLY way a wrong attempt should add resistance:
      penalize() {
        recordWrongAttempt();
      },

      doReset,
    };

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
            resistancePoints += 1;
            updateResistanceMeter();
          }

          if (!checkComplianceOrReset()) return;
          continue;
        }

        if (step.task) {
          const fn = TASKS[step.task];
          if (!fn) {
            await playLines([`System: PROCEDURE MISSING (${step.task}).`]);
            continue;
          }

          // open task UI
          document.body.classList.add("task-open");
          simRoom.classList.add("hidden");
          simChoices.classList.add("hidden");

          taskUI.classList.remove("hidden");
          taskBody.innerHTML = "";

          // per-task init
          activeTaskId = step.task;
          taskWrongCount = 0;

          // show timer
          taskTimer = createTaskTimerController();
          taskTimer.resetForNewTask();
          taskTimer.show();
          taskTimer.start();

          // IMPORTANT:
          // Start a "gate" promise that resolves ONLY when ctx.success() is called
          const gate = beginTaskGate();

          // Run task pack (packs should call ctx.success() once verified)
          await fn(taskContext, step.args || {});
          if (ABORTED) return;

          // If the task pack forgot to call ctx.success(),
          // show fallback after a short delay.
          setTimeout(() => {
            if (!_taskDone) showFallbackContinue();
          }, 800);

          const ok = await gate;
          if (ABORTED) return;

          // stop timer
          taskTimer.stop();
          taskTimer.hide();
          taskTimer = null;

          if (ok) {
            compliancePoints += 1;
          }

          if (!checkComplianceOrReset()) return;

          // close task UI and continue sim
          taskUI.classList.add("hidden");
          document.body.classList.remove("task-open");
          simRoom.classList.remove("hidden");

          await wait(220);
          continue;
        }

        if (step.filler) {
          const count = step.filler.count ?? 1;
          for (let i = 0; i < count; i++) {
            if (ABORTED) return;
            await emitLine("System: Buffering…");
            await wait(30);
          }
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

      document.body.classList.add("in-sim");
      subs?.classList.remove("hidden");

      // IMPORTANT: cracks are hidden in sim by CSS now
      simRoom.classList.remove("hidden");
      taskUI.classList.add("hidden");
      simChoices.classList.add("hidden");
      hackRoom.classList.add("hidden");

      simText.textContent = "";
      playSfx("static1", { volume: 0.22, overlap: false });

      HUD.resWrap.style.opacity = "1";
      updateResistanceMeter();

      await playLines(DIALOGUE.intro);
      await runSteps(DIALOGUE.steps);
    }

    /* ======================
       LANDING: optional timestamp tick
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
