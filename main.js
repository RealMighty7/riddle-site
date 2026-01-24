// main.js
(() => {
  function boot() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot, { once: true });
      return;
    }

    function clamp(n, a, b) {
      return Math.max(a, Math.min(b, n));
    }

    const DIALOGUE = window.DIALOGUE;
    const TASKS = window.TASKS;

    if (!DIALOGUE || !TASKS) {
      console.error("Missing dialogue.js or tasks.js. Check script order.");
      return;
    }

    /* ====================== RANDOM IMAGES ====================== */
    const IMAGE_POOL = Array.from({ length: 12 }, (_, i) => `/assets/img${i + 1}.jpg`);
    document.querySelectorAll(".grid img").forEach((img) => {
      img.src = IMAGE_POOL[Math.floor(Math.random() * IMAGE_POOL.length)];
    });

    /* ====================== ELEMENTS ====================== */
const ids = [
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
  "finalAnswer",
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

  // NEW:
  "viewerToken",
];


    const els = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
    const missing = ids.filter((id) => !els[id]);
    const viewerToken = els.viewerToken;
    if (missing.length) {
      console.error("Missing required element IDs:", missing);
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
    const finalAnswer = els.finalAnswer;
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

    // subtitles nodes
    const subs = els.subs;
    const subsName = els.subsName;
    const subsText = els.subsText;

    resetOverlay.classList.add("hidden");
    systemBox.textContent = "This page is currently under revision.";

    /* ====================== AUDIO (SFX) ====================== */
    const SFX = {
      ambience: new Audio("/assets/ambience.wav"),
      thud: new Audio("/assets/thud.wav"),
      glitch1: new Audio("/assets/glitch1.wav"),
      glitch2: new Audio("/assets/glitch2.wav"),
      static1: new Audio("/assets/static1.wav"),
      static2: new Audio("/assets/static2.wav"),
    };

    Object.values(SFX).forEach((a) => {
      try {
        a.preload = "auto";
      } catch {}
    });

    SFX.ambience.loop = true;
    SFX.ambience.volume = 0.22;

    function playSfx(name, vol = 1) {
      const a = SFX[name];
      if (!a) return;
      try {
        a.pause();
        a.currentTime = 0;
        a.volume = Math.max(0, Math.min(1, vol));
        a.play().catch(() => {});
      } catch {}
    }

    let audioUnlocked = false;
    async function unlockAudio() {
      if (audioUnlocked) return;
      audioUnlocked = true;

      // unlock VO system (AudioContext)
      try {
        if (window.AudioPlayer?.unlock) await window.AudioPlayer.unlock();
      } catch {}

      // unlock SFX (simple browser gesture capture)
      try {
        SFX.ambience.currentTime = 0;
        SFX.ambience.play().catch(() => {});
      } catch {}
    }
    /* =========================
       POP-IN + SHAKE HELPERS
    ========================= */
    function popIn(el) {
      if (!el) return;
      el.classList.remove("pop-in");
      void el.offsetWidth; // restart anim
      el.classList.add("pop-in");
    }

    function shake(el) {
      if (!el) return;
      el.classList.remove("shake");
      void el.offsetWidth;
      el.classList.add("shake");
    }

    /* ====================== TIMING ====================== */
    const WPM = 300;
    const MS_PER_WORD = 60000 / WPM;

    function wordsCount(s) {
      return String(s || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
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

    // crack thresholds (start at 15 clicks)
    const CRACK_AT = [15, 20, 25, 30]; // stage 1..4
    const SHATTER_AT = 31;

    const MAX_COMPLIANT_RATIO = 0.40;
    const MIN_CHOICES_BEFORE_CHECK = 10;
    let choiceTotal = 0;
    let choiceCompliant = 0;

    let resistanceScore = 0;
    function difficultyBoost() {
      const late = tasksCompleted >= 10;
      const base = Math.max(0, Math.min(6, resistanceScore));
      return late ? base + 1 : base;
    }

    /* ====================== TIMERS ====================== */
    let timers = [];
    function clearTimers() {
      timers.forEach((t) => clearTimeout(t));
      timers = [];
    }

    /* ======================
       VOICE LAYER (voices.json + /audio/*)
       - Requires audio_player.js to set: window.VoiceBank = VoiceBank;
    ====================== */
    let VO = null;
    let VO_READY = false;

    function handleVoiceTag(tag) {
      if (tag === "breath") playSfx("static2", 0.08); // replace later with breath sfx
      if (tag === "calm") {
        if (subs) subs.classList.add("calm");
        setTimeout(() => subs && subs.classList.remove("calm"), 900);
      }
    }

    function normalizeForMatch(s) {
      return String(s || "")
        .replace(/\{[a-zA-Z0-9_]+\}/g, "") // strip {tags}
        .replace(/^\s*\[\d{1,4}\]\s*/g, "") // strip [0123]
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
    }

    function getIdFromLine(rawLine) {
      const raw = String(rawLine || "");

      // Preferred: embed IDs like: "[0123] Emma: hello"
      const m = raw.match(/^\s*\[(\d{1,4})\]\s*/);
      if (m) return String(m[1]).padStart(4, "0");

      // Fallback: try to match by text in voices.json
      if (!VO || !VO.byId) return null;
      const target = normalizeForMatch(raw);

      for (const [id, line] of VO.byId.entries()) {
        const textRaw = line.text_raw ?? line.text ?? "";
        if (normalizeForMatch(textRaw) === target) return String(id).padStart(4, "0");
      }
      return null;
    }

    window.AudioPlayer = {
      async init() {
        if (VO_READY) return;

        if (!window.VoiceBank) {
          console.warn("VoiceBank not found. Make sure /audio_player.js loads before /main.js.");
          return;
        }

        VO = new window.VoiceBank({
          // your real file location:
          voicesUrl: "/audio/data/voices.json",
          onTag: (tagName) => handleVoiceTag(tagName),
        });
        console.log("[VO] voicesUrl =", "/audio/data/voices.json");

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
        try {
          await this.init();
          if (!VO) return;

          if (subs) subs.classList.remove("hidden");

          const id = getIdFromLine(rawLine);
          if (!id) return;

          await VO.playById(id, { volume: 1.0, baseHoldMs: 160, stopPrevious: true });
        } catch (e) {
          console.warn("AudioPlayer.playLine failed:", e);
        }
      },

      stop() {
        try {
          VO?.stopCurrent?.();
        } catch {}
      },
    };

    /* ======================
       OUTPUT PIPE (text + audio)
    ====================== */
    async function emitLine(line) {
      const raw = String(line || "");
      if (!raw) {
        simText.textContent += "\n";
        simText.scrollTop = simText.scrollHeight;
        return;
      }

      // log line (strip optional [0123] id from visible log)
      const logLine = raw.replace(/^\s*\[\d{1,4}\]\s*/, "");
      simText.textContent += logLine + "\n";
      simText.scrollTop = simText.scrollHeight;

      // voice/subtitles
      if (window.AudioPlayer && typeof window.AudioPlayer.playLine === "function") {
        await window.AudioPlayer.playLine(raw);
      }
    }

    function playLines(lines) {
      clearTimers();
      return new Promise((resolve) => {
        let t = 260;

        for (const line of lines) {
          timers.push(
            setTimeout(() => {
              emitLine(line);
            }, t)
          );
          t += msToRead(line || " ");
        }

        timers.push(setTimeout(resolve, t + 120));
      });
    }

    /* ====================== UI helpers ====================== */
    function showChoices(labels) {
      if (labels?.complyLabel) choiceNeed.textContent = labels.complyLabel;
      if (labels?.lieLabel) choiceLie.textContent = labels.lieLabel;
      if (labels?.runLabel) choiceRun.textContent = labels.runLabel;
      simChoices.classList.remove("hidden");
      taskUI.classList.add("hidden");
    }

    function hideChoices() {
      simChoices.classList.add("hidden");
    }

    function showTaskUI(title, desc) {
      taskUI.classList.remove("hidden");
      taskTitle.textContent = title;
      taskDesc.textContent = desc;
      taskBody.innerHTML = "";
      taskSecondary.classList.add("hidden");
      taskPrimary.disabled = false;
    }

    function hardReload() {
      window.location.href = window.location.href.split("#")[0];
    }

    function doReset(reasonTitle, reasonBody) {
      resetTitle.textContent = reasonTitle || "RESET";
      resetBody.textContent = reasonBody || "";
      resetOverlay.classList.remove("hidden");
      setTimeout(hardReload, 1800);
    }

    function recordChoice(isCompliant) {
      choiceTotal++;
      if (isCompliant) choiceCompliant++;
      if (choiceTotal >= MIN_CHOICES_BEFORE_CHECK) {
        const ratio = choiceCompliant / choiceTotal;
        if (ratio > MAX_COMPLIANT_RATIO) {
          doReset(
            "TOO COMPLIANT",
            `Compliance threshold exceeded.

compliant: ${choiceCompliant}
total: ${choiceTotal}
ratio: ${(ratio * 100).toFixed(0)}%

Reinitializing simulation…`
          );
          return false;
        }
      }
      return true;
    }

    function penalize(amount = 1, note = "") {
      resistanceScore = Math.min(12, resistanceScore + Math.max(0, amount));
      if (note && !taskUI.classList.contains("hidden")) {
        const div = document.createElement("div");
        div.style.marginTop = "10px";
        div.style.opacity = "0.85";
        div.style.color = "rgba(255,190,190,.95)";
        div.textContent = `${note} (resistance: ${resistanceScore})`;
        taskBody.appendChild(div);
      }
    }

    function glitchPulse() {
      playSfx(Math.random() < 0.5 ? "glitch1" : "glitch2", 0.55);
      cracks.classList.add("flash");
      setTimeout(() => cracks.classList.remove("flash"), 220);

      // UI feedback on task card
      try {
        taskUI.classList.remove("is-ok");
        taskUI.classList.add("is-error");
        setTimeout(() => taskUI.classList.remove("is-error"), 240);
      } catch {}
    }

    /* ====================== TURNSTILE ====================== */
    let tsWidgetId = null;
    let tsToken = null;

    function ensureTurnstile() {
      if (tsWidgetId !== null) return;
      if (!window.turnstile) {
        setTimeout(ensureTurnstile, 100);
        return;
      }
      turnstileBox.innerHTML = "";
      tsWidgetId = window.turnstile.render(turnstileBox, {
        sitekey: "0x4AAAAAACN_lQF6Hw5BHs2u",
        theme: "dark",
        callback: (token) => {
          tsToken = token;
        },
        "expired-callback": () => {
          tsToken = null;
        },
        "error-callback": () => {
          tsToken = null;
        },
      });
    }

    function getTurnstileToken() {
      if (!window.turnstile || tsWidgetId === null) return tsToken;
      const t = window.turnstile.getResponse(tsWidgetId);
      return t || tsToken;
    }

    function resetTurnstile() {
      if (window.turnstile && tsWidgetId !== null) window.turnstile.reset(tsWidgetId);
      tsToken = null;
    }

    /* ====================== FINAL MODAL ====================== */
    let finalDiscordName = "";
    let finalAnswerText = "";

    function openFinalModal(prefillDiscord = "") {
      finalErr.textContent = "";
      finalOverlay.classList.remove("hidden");
      finalOverlay.setAttribute("aria-hidden", "false");
      finalDiscord.value = prefillDiscord || finalDiscordName || "";
      finalAnswer.value = finalAnswerText || "";
      ensureTurnstile();
      resetTurnstile();
    }

    function closeFinalModal() {
      finalOverlay.classList.add("hidden");
      finalOverlay.setAttribute("aria-hidden", "true");
    }

    finalCancel.onclick = () => closeFinalModal();

    finalVerify.onclick = async () => {
      finalErr.textContent = "";
      finalDiscordName = (finalDiscord.value || "").trim();
      finalAnswerText = (finalAnswer.value || "").trim();

      if (!finalDiscordName) {
        finalErr.textContent = "Username required.";
        return;
      }
      const token = getTurnstileToken();
      if (!token) {
        finalErr.textContent = "Please complete the verification checkbox.";
        return;
      }

      closeFinalModal();
      startHackTask();
    };

    /* ====================== HACK TASK ====================== */
    const FILES = [
      {
        name: "logs/boot.log",
        lines: [
          "BOOT: init sequence start",
          "CFG: load profile",
          "TRACE: session fingerprint = 8f1c-0a9d",
          "TRACE: user cache pinned",
          "NOTE: do not remove core lines",
          "AUDIT: mirror enabled",
          "AUDIT: upload pending",
          "BOOT: init sequence complete",
        ],
        targets: [3, 6, 7],
      },
      {
        name: "user/profile.cfg",
        lines: [
          "user.id = unknown",
          "user.handle = DiscordUser",
          "permissions = limited",
          "telemetry = on",
          "retention = forever",
          "escape.flag = false",
          "notes = 'subject attempted exit'",
        ],
        targets: [4, 5, 6],
      },
      {
        name: "sys/cache.tmp",
        lines: [
          "cache: build=cf-pages",
          "cache: layer=memory",
          "cache: record=user_actions",
          "cache: record=clickstream",
          "cache: record=session_map",
          "cache: record=turnstile_token",
          "cache: purge=disabled",
        ],
        targets: [4, 5, 6],
      },
    ];

    let activeFileIndex = 0;
    let selected = new Set();

    function renderFile(idx) {
      activeFileIndex = idx;
      selected = new Set();
      const f = FILES[idx];

      hackFilename.textContent = f.name;
      hackStatus.textContent = "Select ONLY the highlighted target lines, then delete.";
      hackTargets.textContent = ` (target lines: ${f.targets.join(", ")})`;

      hackLines.innerHTML = "";
      f.lines.forEach((txt, i) => {
        const ln = i + 1;
        const row = document.createElement("div");
        row.className = "hack-line";
        if (f.targets.includes(ln)) row.classList.add("target");

        const left = document.createElement("div");
        left.className = "hack-ln";
        left.textContent = String(ln);

        const right = document.createElement("div");
        right.className = "hack-txt";
        right.textContent = txt;

        row.appendChild(left);
        row.appendChild(right);

        row.onclick = () => {
          if (selected.has(i)) {
            selected.delete(i);
            row.classList.remove("selected");
          } else {
            row.classList.add("selected");
            selected.add(i);
          }
        };

        hackLines.appendChild(row);
      });
    }

    function resetHack() {
      renderFile(activeFileIndex);
    }

    const hackFileBtns = Array.from(document.querySelectorAll(".hack-filebtn"));
    hackFileBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        hackFileBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const idx = Number(btn.getAttribute("data-file") || "0");
        renderFile(idx);
      });
    });
    if (hackFileBtns[0]) hackFileBtns[0].classList.add("active");

    hackReset.onclick = resetHack;

    hackDelete.onclick = async () => {
      const f = FILES[activeFileIndex];
      const selectedLines = Array.from(selected)
        .map((i) => i + 1)
        .sort((a, b) => a - b);
      const targets = f.targets.slice().sort((a, b) => a - b);

      const ok =
        selectedLines.length === targets.length &&
        selectedLines.every((v, i) => v === targets[i]);

      if (!ok) {
        hackStatus.textContent = "Wrong lines. Workstation locked. Reset required.";
        glitchPulse();
        setTimeout(resetHack, 700);
        return;
      }

      const delIdx = Array.from(selected).sort((a, b) => b - a);
      for (const i of delIdx) f.lines.splice(i, 1);

      hackStatus.textContent = "Lines deleted. Finalizing wipe…";
      playSfx("thud", 0.45);

      try {
        const token = getTurnstileToken();
        const res = await fetch("/api/complete", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            discord: finalDiscordName,
            answer: finalAnswerText,
            turnstile: token,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          hackStatus.textContent = "Server rejected completion. Reset and try again.";
          glitchPulse();
          return;
        }

        const code = data.code || "";
        sessionStorage.setItem("escape_code", code);
        sessionStorage.setItem("escape_user", finalDiscordName);
        window.location.href = "/escaped.html";
      } catch {
        hackStatus.textContent = "Network error. Reset and try again.";
        glitchPulse();
      }
    };

    function startHackTask() {
      hackUser.textContent = `USER: ${finalDiscordName}`;
      hackRoom.classList.remove("hidden");
      renderFile(0);
    }

    /* ====================== TASK RUNNER ====================== */
    const taskContext = {
      taskPrimary,
      taskSecondary,
      taskBody,
      showTaskUI,
      doReset,
      difficultyBoost,
      penalize,
      glitch: glitchPulse,
    };

    let tasksCompleted = 0;
    let guidePath = "unknown"; // "emma" | "liam" | "run" | "unknown"

    function chooseFillerPool() {
      if (guidePath === "run") {
        if (resistanceScore >= 6) return "filler_run_hard";
        return "filler_run";
      }
      if (guidePath === "emma") {
        if (resistanceScore >= 6) return "filler_security_pressure";
        return "filler_security";
      }
      if (guidePath === "liam") {
        if (resistanceScore >= 6) return "filler_worker_pressure";
        return "filler_worker";
      }

      if (resistanceScore >= 7) return "filler_system_pressure";
      if (resistanceScore >= 3) return "filler_standard";
      return "filler_security";
    }

    let almostDoneTriggered = false;
    async function maybeAlmostDonePhase() {
      if (almostDoneTriggered) return;
      if (tasksCompleted < 10) return;

      almostDoneTriggered = true;

      const pool = DIALOGUE.almostDone?.say || [
        "System: You are close.",
        "System: Please do not celebrate early.",
        "Emma (Security): This part is where people mess up.",
        "Liam (Worker): Keep it boring. Keep it small.",
      ];
      await playLines(pool);

      const endPoolName = chooseFillerPool();
      const endPool = DIALOGUE.fillerPools?.[endPoolName] || [];
      if (endPool.length) {
        const pick1 = endPool[Math.floor(Math.random() * endPool.length)];
        const pick2 = endPool[Math.floor(Math.random() * endPool.length)];
        await playLines([String(pick1), String(pick2)]);
      }

      openFinalModal(finalDiscordName);
    }

    async function runSteps(steps) {
      for (const step of steps) {
        if (step.say) {
          await playLines(step.say);
          continue;
        }

        if (step.task) {
          const fn = TASKS[step.task];
          if (fn) {
            await fn(taskContext, step.args || {});
            tasksCompleted++;
            await maybeAlmostDonePhase();
          }
          continue;
        }

        if (step.filler) {
          const count = Number(step.filler.count || 1);

          let poolName = String(step.filler.pool || "filler_standard");
          if (poolName === "AUTO") poolName = chooseFillerPool();

          const pool = DIALOGUE.fillerPools?.[poolName] || [];
          for (let i = 0; i < count; i++) {
            if (!pool.length) break;
            const pick = pool[Math.floor(Math.random() * pool.length)];
            if (typeof pick === "string") await playLines([pick]);
            else if (pick?.say) await playLines(pick.say);
          }
          continue;
        }
      }
    }

    /* ====================== SIM FLOW ====================== */
    async function openSimRoom() {
      stage = 99;

      document.body.classList.add("in-sim");

      simRoom.classList.remove("hidden");
      taskUI.classList.add("hidden");
      simChoices.classList.add("hidden");
      simText.textContent = "";

      await playLines(DIALOGUE.intro);
      await runChoiceBeats();
      await runSteps(DIALOGUE.steps);
    }

    function waitForChoice() {
      return new Promise((resolve) => {
        const cleanup = () => {
          choiceNeed.onclick = null;
          choiceLie.onclick = null;
          choiceRun.onclick = null;
        };
        choiceNeed.onclick = () => {
          cleanup();
          resolve("comply");
        };
        choiceLie.onclick = () => {
          cleanup();
          resolve("lie");
        };
        choiceRun.onclick = () => {
          cleanup();
          resolve("run");
        };
      });
    }

    async function runChoiceBeats() {
      for (let i = 0; i < (DIALOGUE.choiceBeats || []).length; i++) {
        const beat = DIALOGUE.choiceBeats[i];

        await playLines(beat.say || []);
        showChoices(beat.choices);

        const choice = await waitForChoice();

        if (i === 0) {
          if (choice === "comply") guidePath = "emma";
          else if (choice === "lie") guidePath = "liam";
          else guidePath = "run";
        }

        if (choice === "comply") {
          if (!recordChoice(true)) return;
          resistanceScore = Math.max(0, resistanceScore - 1);
        } else if (choice === "lie") {
          if (!recordChoice(true)) return;
          resistanceScore = Math.min(12, resistanceScore + 0);
        } else {
          if (!recordChoice(false)) return;
          resistanceScore = Math.min(12, resistanceScore + 2);
        }

        hideChoices();
        await playLines(beat.respond && beat.respond[choice] ? beat.respond[choice] : []);
      }
    }
    // NOTE: handleLandingClick is declared later (in the CRACKS section)
  
      /* ======================
         CRACKS (4 staged) + GLASS FALL -> SIM
      ====================== */
      document.addEventListener("selectstart", (e) => {
        const t = e.target;
        const el = (t && t.nodeType === 1) ? t : (t && t.parentElement) ? t.parentElement : null;
  
        // allow selecting inside inputs/textareas
        if (el && el.closest && el.closest("input, textarea")) return;
  
        // only block selection during landing click-spam + shatter
        if (stage === 1 || document.body.classList.contains("sim-transition")) {
          e.preventDefault();
        }
      });
  
      let crackBuilt = false;
      let crackStage = 0;
  
  
      function rand(seed) {
        let t = seed >>> 0;
        return () => {
          t += 0x6d2b79f5;
          let x = Math.imul(t ^ (t >>> 15), 1 | t);
          x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
          return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
        };
      }
  
      function makePathFromCenter(rng, cx, cy, steps, stepLen, jitter) {
        let x = cx, y = cy;
        let ang = rng() * Math.PI * 2;
        const pts = [`M ${x.toFixed(1)} ${y.toFixed(1)}`];
  
        for (let i = 0; i < steps; i++) {
          ang += (rng() - 0.5) * jitter;
          x += Math.cos(ang) * stepLen * (0.75 + rng() * 0.7);
          y += Math.sin(ang) * stepLen * (0.75 + rng() * 0.7);
          x = Math.max(-60, Math.min(1060, x));
          y = Math.max(-60, Math.min(1060, y));
          pts.push(`L ${x.toFixed(1)} ${y.toFixed(1)}`);
        }
        return pts.join(" ");
      }
  
      function addSeg(svg, d, rank) {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("class", "seg");
        g.setAttribute("data-rank", String(rank));
  
        const pUnder = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pUnder.setAttribute("d", d);
        pUnder.setAttribute("class", "crack-path crack-under pending");
  
        const pLine = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pLine.setAttribute("d", d);
        pLine.setAttribute("class", "crack-path crack-line pending");
  
        const pGlint = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pGlint.setAttribute("d", d);
        pGlint.setAttribute("class", "crack-path crack-glint pending");
        pGlint.style.opacity = "0.0";
  
        g.appendChild(pUnder);
        g.appendChild(pLine);
        g.appendChild(pGlint);
        svg.appendChild(g);
  
        [pUnder, pLine, pGlint].forEach((p) => {
          try {
            const len = p.getTotalLength();
            p.style.strokeDasharray = String(len);
            p.style.strokeDashoffset = String(len);
            p.style.setProperty("--dash", String(len));
          } catch {}
        });
  
        if (Math.random() < 0.35) pGlint.style.opacity = "0.85";
      }
  
      function ensureCracks() {
        if (crackBuilt) return;
  
        const seed = (Date.now() ^ (Math.random() * 1e9)) & 0xffffffff;
        const rng = rand(seed);
  
        cracks.innerHTML = "";
  
        // ---- PANE LAYER ----
        const paneCount = 18;
        const paneRanks = [1,1,1, 2,2,2,2, 3,3,3,3, 4,4,4,4,4,4,4];
  
        const mkPane = (rank) => {
          const p = document.createElement("div");
          p.className = "pane";
          p.setAttribute("data-rank", String(rank));
  
          const bias = rank === 1 ? 0.18 : rank === 2 ? 0.28 : rank === 3 ? 0.38 : 0.5;
          const pts = [];
          const centerPull = () => 0.5 + (rng() - 0.5) * bias;
  
          const n = 4 + Math.floor(rng() * 3);
          for (let i = 0; i < n; i++) {
            const x = clamp(centerPull() + (rng() - 0.5) * (0.55 + rank * 0.06), 0, 1);
            const y = clamp(centerPull() + (rng() - 0.5) * (0.55 + rank * 0.06), 0, 1);
            pts.push([x, y]);
          }
  
          const cx = pts.reduce((a, v) => a + v[0], 0) / pts.length;
          const cy = pts.reduce((a, v) => a + v[1], 0) / pts.length;
          pts.sort(
            (a, b) =>
              Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx)
          );
  
          const poly = pts.map(([x, y]) => `${(x * 100).toFixed(1)}% ${(y * 100).toFixed(1)}%`).join(", ");
          p.style.clipPath = `polygon(${poly})`;
  
          p.style.setProperty("--dx", (rng() * 10 - 5).toFixed(1) + "px");
          p.style.setProperty("--dy", (rng() * 10 - 5).toFixed(1) + "px");
  
          if (rng() < 0.35) p.classList.add("glint");
          return p;
        };
  
        for (let i = 0; i < paneCount; i++) {
          const rank = paneRanks[i] || 4;
          cracks.appendChild(mkPane(rank));
        }
  
        // ---- SVG LINES ----
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 1000 1000");
        svg.setAttribute("preserveAspectRatio", "none");
        cracks.appendChild(svg);
  
        const cx = 500, cy = 500;
  
        const ring = (radiusMin, radiusMax) => {
          const a = rng() * Math.PI * 2;
          const r = radiusMin + rng() * (radiusMax - radiusMin);
          return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
        };
  
        for (let i = 0; i < 7; i++) addSeg(svg, makePathFromCenter(rng, ...ring(0, 26), 7, 18, 0.85), 1);
        for (let i = 0; i < 12; i++) addSeg(svg, makePathFromCenter(rng, ...ring(18, 120), 11, 28, 0.75), 2);
        for (let i = 0; i < 18; i++) addSeg(svg, makePathFromCenter(rng, ...ring(120, 360), 12, 22, 1.05), 3);
        for (let i = 0; i < 14; i++) addSeg(svg, makePathFromCenter(rng, ...ring(60, 220), 20, 46, 0.55), 4);
  
        crackBuilt = true;
      }
  
      function setCrackStage(n) {
        ensureCracks();
  
        const next = Math.max(crackStage, n);
        if (next === crackStage) return;
  
        const prev = crackStage;
        crackStage = next;
  
        cracks.dataset.stage = String(crackStage);
  
        const paneMap = { 1: 0.14, 2: 0.24, 3: 0.34, 4: 0.44 };
        cracks.style.setProperty("--paneOpacity", String(paneMap[crackStage] ?? 0.0));
  
        cracks.classList.remove("hidden");
        cracks.classList.add("show");
  
        const segs = cracks.querySelectorAll(".seg");
        segs.forEach((seg) => {
          const r = Number(seg.getAttribute("data-rank") || "0");
          if (r <= crackStage) seg.classList.add("on");
        });
  
        for (let r = prev + 1; r <= crackStage; r++) {
          const newly = cracks.querySelectorAll(`.seg[data-rank="${r}"] .crack-path.pending`);
          newly.forEach((p) => {
            p.classList.remove("pending");
            p.classList.add("draw");
          });
        }
  
        if (crackStage === 1) playSfx("thud", 0.55);
        else playSfx("static1", 0.30);
      }
  
      function buildGlassPieces() {
        glassFX.innerHTML = "";
        glassFX.classList.remove("hidden");
  
        const panes = Array.from(cracks.querySelectorAll(".pane"));
        if (!panes.length) return [];
  
        const wrap = document.getElementById("wrap");
  
        const pieces = panes.map((pane) => {
          const p = document.createElement("div");
          p.className = "glass-piece";
  
          const clip = pane.style.clipPath || pane.style.webkitClipPath;
          if (clip) {
            p.style.clipPath = clip;
            p.style.webkitClipPath = clip;
          }
  
          p.style.setProperty("--rot", (Math.random() * 18 - 9).toFixed(2) + "deg");
          p.style.setProperty("--sx", (Math.random() * 260 - 130).toFixed(1) + "px");
          p.style.setProperty("--sy", (Math.random() * 120 - 60).toFixed(1) + "px");
          p.style.setProperty("--rx", (Math.random() * 18 - 9).toFixed(1) + "px");
          p.style.setProperty("--ry", (Math.random() * 18 - 9).toFixed(1) + "px");
          p.style.setProperty("--rblur", (0.7 + Math.random() * 1.2).toFixed(2) + "px");
          p.style.setProperty("--rgbx", (Math.random() * 3.2 + 1.2).toFixed(2) + "px");
          p.style.setProperty("--rgby", (Math.random() * 2.6 - 1.3).toFixed(2) + "px");
  
          const inner = document.createElement("div");
          inner.className = "glass-inner";
  
          if (wrap) {
            const makeLayer = (cls) => {
              const layer = document.createElement("div");
              layer.className = `glass-rgb ${cls}`;
              const clone = wrap.cloneNode(true);
              clone.id = "";
              clone.classList.add("wrap-clone");
              clone.style.pointerEvents = "none";
              layer.appendChild(clone);
              return layer;
            };
  
            inner.appendChild(makeLayer("r"));
            inner.appendChild(makeLayer("g"));
            inner.appendChild(makeLayer("b"));
          }
  
          p.appendChild(inner);
          glassFX.appendChild(p);
          return p;
        });
  
        for (let i = pieces.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
        }
  
        return pieces;
      }
  
      function shatterToSim() {
        if (stage === 99) return;
        stage = 99;
  
        ensureCracks();
  
        const pieces = buildGlassPieces();
        if (!pieces || !pieces.length) {
          cracks.classList.add("hidden");
          openSimRoom();
          return;
        }
  
        document.body.classList.add("sim-transition");
        const wrap = document.getElementById("wrap");
        if (wrap) wrap.classList.add("wrap-hidden");
  
        cracks.classList.add("hidden");
        cracks.classList.remove("show");
        cracks.classList.remove("flash");
  
        simRoom.classList.remove("hidden");
        taskUI.classList.add("hidden");
        simChoices.classList.add("hidden");
  
        glassFX.classList.remove("hidden");
        glassFX.classList.add("glass-fall");
  
        const STAGGER_MS = 28;
        const BASE_MS = 1100;
  
        pieces.forEach((p, i) => {
          p.style.animationDelay = i * STAGGER_MS + "ms";
        });
  
        const totalMs = BASE_MS + pieces.length * STAGGER_MS + 80;
  
        setTimeout(() => {
          glassFX.innerHTML = "";
          glassFX.classList.remove("glass-fall");
          glassFX.classList.add("hidden");
  
          document.body.classList.remove("sim-transition");
          openSimRoom();
        }, totalMs);
      }
  
      // -----------------------
      // CLICK ADVANCE (shared)
      // - fixes: launch button no longer skips progression
      // - fixes: .closest TypeError (text nodes)
      // -----------------------
      function isCountableClick(e) {
        const t = e.target;
        const el = (t && t.nodeType === 1) ? t : (t && t.parentElement) ? t.parentElement : null;
        if (!el) return true;
  
        // ignore actual interactive UI
        if (el.closest && el.closest("button, input, textarea, select, label, a")) return false;
  
        return true;
      }
  
      function advanceLandingClick() {
        if (stage !== 1) return;
  
        const now = Date.now();
        if (now - lastClick < CLICK_COOLDOWN) return;
        lastClick = now;
  
        clicks++;
  
        if (clicks === CRACK_AT[0]) setCrackStage(1);
        if (clicks === CRACK_AT[1]) setCrackStage(2);
        if (clicks === CRACK_AT[2]) setCrackStage(3);
        if (clicks === CRACK_AT[3]) setCrackStage(4);
  
        if (clicks >= SHATTER_AT) {
          stage = 2;
  
          systemBox.textContent = "You weren't supposed to do that.";
          const t1 = msToRead(systemBox.textContent);
  
          setTimeout(() => {
            systemBox.textContent =
              "All you had to do was sit there like everyone else and watch the ads.";
          }, t1);
  
          const t2 =
            t1 + msToRead("All you had to do was sit there like everyone else and watch the ads.");
          setTimeout(() => {
            systemBox.textContent = "Stop.";
          }, t2);
  
          const t3 = t2 + msToRead("Stop.") + 650;
  
          setTimeout(() => {
            cracks.classList.add("flash");
            setTimeout(() => cracks.classList.remove("flash"), 220);
          }, Math.max(0, t3 - 280));
  
          setTimeout(() => {
            shatterToSim();
          }, t3);
        }
      }
    function handleLandingClick(e) {
      if (!isCountableClick(e)) return;
      advanceLandingClick();
    }
    window.handleLandingClick = handleLandingClick;
    document.addEventListener("click", handleLandingClick);
      
    /* ======================
       LAUNCH BUTTON
       - unlock audio
       - enable viewer token typing
       - show fake "launcher" status animation
    ====================== */
    const viewerFake = document.getElementById("viewerFake");
    const viewerState = document.getElementById("viewerState");
    const launchBtn = document.getElementById("launchBtn");
    const launchStatus = document.getElementById("launchStatus");
    
    let launchBusy = false;
    
    function runLaunchStatusAnim() {
      if (!launchStatus || !launchBtn) return;
    
      // prevent spamming
      if (launchBusy) return;
      launchBusy = true;
    
      launchStatus.textContent = "requesting campaign…";
      launchBtn.classList.add("busy");
    
      setTimeout(() => (launchStatus.textContent = "loading creatives…"), 500);
      setTimeout(() => (launchStatus.textContent = "waiting for view signal…"), 1100);
    
      setTimeout(() => {
        launchStatus.textContent = "idle";
        launchBtn.classList.remove("busy");
        launchBusy = false;
      }, 1800);
    }
    
      if (launchBtn) {
        launchBtn.addEventListener(
          "click",
          (e) => {
            e.preventDefault();
            e.stopPropagation(); // enough in most cases
      
            unlockAudio();
      
            if (viewerToken) {
              viewerToken.disabled = false;
              viewerToken.classList.remove("hidden");
              viewerToken.focus();
              try { viewerToken.select(); } catch {}
            }
      
            if (viewerFake) viewerFake.classList.add("hidden");
            if (viewerState) viewerState.textContent = "active";
      
            runLaunchStatusAnim();
          },
          true
        );
      }
  boot();
})();
