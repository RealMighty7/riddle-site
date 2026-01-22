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
    ];

    const els = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
    const missing = ids.filter((id) => !els[id]);
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

    resetOverlay.classList.add("hidden");
    systemBox.textContent = "This page is currently under revision.";

    /* ====================== AUDIO ====================== */
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

    let audioUnlocked = false;
    function unlockAudio() {
      if (audioUnlocked) return;
      audioUnlocked = true;
      try {
        SFX.ambience.currentTime = 0;
        SFX.ambience.play().catch(() => {});
      } catch {}
    }
    function playSfx(name, vol = 0.6) {
      const a = SFX[name];
      if (!a) return;
      try {
        a.pause();
        a.currentTime = 0;
        a.volume = vol;
        a.play().catch(() => {});
      } catch {}
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

    const MAX_COMPLIANT_RATIO = 0.40;
    const MIN_CHOICES_BEFORE_CHECK = 10;
    let choiceTotal = 0;
    let choiceCompliant = 0;

    let resistanceScore = 0;
    function difficultyBoost() {
      return Math.max(0, Math.min(6, resistanceScore));
    }

    /* ====================== TIMERS ====================== */
    let timers = [];
    function clearTimers() {
      timers.forEach((t) => clearTimeout(t));
      timers = [];
    }

    /* ====================== UI helpers ====================== */
    function appendSimLine(line) {
      simText.textContent += (line ? line : "") + "\n";
      simText.scrollTop = simText.scrollHeight;
    }

    function playLines(lines) {
      clearTimers();
      return new Promise((resolve) => {
        let t = 260;
        for (const line of lines) {
          timers.push(setTimeout(() => appendSimLine(line), t));
          t += msToRead(line || " ");
        }
        timers.push(setTimeout(resolve, t + 120));
      });
    }

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
            selected.add(i);
            row.classList.add("selected");
          }
        };

        hackLines.appendChild(row);
      });
    }

    function resetHack() {
      renderFile(activeFileIndex);
    }

    document.querySelectorAll(".hack-filebtn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-file") || "0");
        renderFile(idx);
      });
    });

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
        await playLines(
          beat.respond && beat.respond[choice] ? beat.respond[choice] : []
        );
      }
    }

    function isCountableClick(e) {
      const t = e.target;
      if (!t) return true;
      // ignore actual interactive UI
      if (t.closest("button, input, textarea, select, label, a")) return false;
      // allow images + cards + background to count
      return true;
    }

    /* ======================
       CRACKS (4 staged) + GLASS FALL -> SIM
    ====================== */

    document.addEventListener("selectstart", (e) => e.preventDefault());

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
      let x = cx,
        y = cy;
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
  g.setAttribute("class", "seg");                // stays hidden until stage unlock
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

  // dash animation setup (but do NOT animate yet)
  [pUnder, pLine, pGlint].forEach(p => {
    try {
      const len = p.getTotalLength();
      p.style.strokeDasharray = String(len);
      p.style.strokeDashoffset = String(len);
      p.style.setProperty("--dash", String(len));
    } catch {}
  });

  // random glint chance (still hidden until stage unlock)
  if (Math.random() < 0.35) pGlint.style.opacity = "0.85";
}


    function ensureCracks() {
      if (crackBuilt) return;

      const seed = (Date.now() ^ (Math.random() * 1e9)) & 0xffffffff;
      const rng = rand(seed);

      cracks.innerHTML = "";

      // ---- PANE LAYER (glass shards) ----
      const paneCount = 18;
      const paneRanks = [1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4];

      const mkPane = (rank) => {
        const p = document.createElement("div");
        p.className = "pane";
        p.setAttribute("data-rank", String(rank));

        const bias =
          rank === 1 ? 0.18 : rank === 2 ? 0.28 : rank === 3 ? 0.38 : 0.5;

        const pts = [];
        const centerPull = () => 0.5 + (rng() - 0.5) * bias;

        const n = 4 + Math.floor(rng() * 3); // 4..6
        for (let i = 0; i < n; i++) {
          const x = clamp(
            centerPull() + (rng() - 0.5) * (0.55 + rank * 0.06),
            0,
            1
          );
          const y = clamp(
            centerPull() + (rng() - 0.5) * (0.55 + rank * 0.06),
            0,
            1
          );
          pts.push([x, y]);
        }

        const cx = pts.reduce((a, v) => a + v[0], 0) / pts.length;
        const cy = pts.reduce((a, v) => a + v[1], 0) / pts.length;
        pts.sort(
          (a, b) =>
            Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx)
        );

        const poly = pts
          .map(([x, y]) => `${(x * 100).toFixed(1)}% ${(y * 100).toFixed(1)}%`)
          .join(", ");
        p.style.clipPath = `polygon(${poly})`;

        const dx = (rng() * 10 - 5).toFixed(1) + "px";
        const dy = (rng() * 10 - 5).toFixed(1) + "px";
        p.style.setProperty("--dx", dx);
        p.style.setProperty("--dy", dy);

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

      const cx = 500,
        cy = 500;

      const ring = (radiusMin, radiusMax) => {
        const a = rng() * Math.PI * 2;
        const r = radiusMin + rng() * (radiusMax - radiusMin);
        return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
      };

      for (let i = 0; i < 7; i++) {
        const [sx, sy] = ring(0, 26);
        const d = makePathFromCenter(
          rng,
          sx,
          sy,
          6 + Math.floor(rng() * 3),
          18,
          0.85
        );
        addSeg(svg, d, 1);
      }

      for (let i = 0; i < 12; i++) {
        const [sx, sy] = ring(18, 120);
        const d = makePathFromCenter(
          rng,
          sx,
          sy,
          9 + Math.floor(rng() * 4),
          28,
          0.75
        );
        addSeg(svg, d, 2);
      }

      for (let i = 0; i < 18; i++) {
        const [sx, sy] = ring(120, 360);
        const d = makePathFromCenter(
          rng,
          sx,
          sy,
          10 + Math.floor(rng() * 5),
          22,
          1.05
        );
        addSeg(svg, d, 3);
      }

      for (let i = 0; i < 14; i++) {
        const [sx, sy] = ring(60, 220);
        const d = makePathFromCenter(
          rng,
          sx,
          sy,
          18 + Math.floor(rng() * 8),
          46,
          0.55
        );
        addSeg(svg, d, 4);
      }

      crackBuilt = true;
    }

function setCrackStage(n) {
  ensureCracks();

  const next = Math.max(crackStage, n);
  if (next === crackStage) return;

  const prev = crackStage;
  crackStage = next;

  cracks.dataset.stage = String(crackStage);

  // shard pane intensity (your existing look)
  const paneMap = { 1: 0.14, 2: 0.24, 3: 0.34, 4: 0.44 };
  cracks.style.setProperty("--paneOpacity", String(paneMap[crackStage] ?? 0.0));

  // show overlay
  cracks.classList.remove("hidden");
  cracks.classList.add("show");

  // Reveal all segs up to current stage
  const segs = cracks.querySelectorAll(".seg");
  segs.forEach(seg => {
    const r = Number(seg.getAttribute("data-rank") || "0");
    if (r <= crackStage) seg.classList.add("on");
  });

  // Animate ONLY the newly unlocked rank(s)
  // (usually just one rank at a time, but supports skipping)
  for (let r = prev + 1; r <= crackStage; r++) {
    const newly = cracks.querySelectorAll(`.seg[data-rank="${r}"] .crack-path.pending`);
    newly.forEach(p => {
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

        const rot = (Math.random() * 18 - 9).toFixed(2) + "deg";
        const sx = (Math.random() * 260 - 130).toFixed(1) + "px";
        const sy = (Math.random() * 120 - 60).toFixed(1) + "px";
        const rx = (Math.random() * 18 - 9).toFixed(1) + "px";
        const ry = (Math.random() * 18 - 9).toFixed(1) + "px";

        p.style.setProperty("--rot", rot);
        p.style.setProperty("--sx", sx);
        p.style.setProperty("--sy", sy);
        p.style.setProperty("--rx", rx);
        p.style.setProperty("--ry", ry);

        const blur = (0.7 + Math.random() * 1.2).toFixed(2) + "px";
        p.style.setProperty("--rblur", blur);

        const inner = document.createElement("div");
        inner.className = "glass-inner";

        const rgbx = (Math.random() * 3.2 + 1.2).toFixed(2) + "px";
        const rgby = (Math.random() * 2.6 - 1.3).toFixed(2) + "px";
        p.style.setProperty("--rgbx", rgbx);
        p.style.setProperty("--rgby", rgby);

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

    // ======================
    // SHATTER -> SIM (single source of truth)
    // ======================
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

    /* ======================
       LANDING -> SIM
    ====================== */
    document.addEventListener("click", (e) => {
      unlockAudio();
      if (stage !== 1) return;
      if (!isCountableClick(e)) return;

      const now = Date.now();
      if (now - lastClick < CLICK_COOLDOWN) return;
      lastClick = now;

      clicks++;

      if (clicks === 4) setCrackStage(1);
      if (clicks === 6) setCrackStage(2);
      if (clicks === 8) setCrackStage(3);
      if (clicks === 10) setCrackStage(4);

      if (clicks >= 10) {
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
    });
  }

  boot();
})();
