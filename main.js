(() => {
  function boot() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot, { once: true });
      return;
    }

    const DIALOGUE = window.DIALOGUE;
    const TASKS = window.TASKS;

    if (!DIALOGUE || !TASKS) {
      console.error("Missing dialogue.js or tasks.js. Check script order.");
      return;
    }

    /* ======================
       RANDOM IMAGES
    ====================== */
    const IMAGE_POOL = Array.from({ length: 12 }, (_, i) => `/assets/img${i + 1}.jpg`);
    document.querySelectorAll(".grid img").forEach(img => {
      img.src = IMAGE_POOL[Math.floor(Math.random() * IMAGE_POOL.length)];
    });

    /* ======================
       ELEMENTS (required IDs)
    ====================== */
    const ids = [
      "system","l1","l2","l3","cracks",
      "simRoom","simText","simChoices","choiceNeed","choiceLie","choiceRun",
      "taskUI","taskTitle","taskDesc","taskBody","taskPrimary","taskSecondary",
      "resetOverlay","resetTitle","resetBody",
      // final flow
      "finalOverlay","finalDiscord","finalAnswer","finalCancel","finalVerify","finalErr","turnstileBox",
      "hackRoom","hackUser","hackTargets","hackFilename","hackLines","hackDelete","hackReset","hackStatus"
    ];

    const els = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
    const missing = ids.filter(id => !els[id]);
    if (missing.length) {
      console.error("Missing required element IDs:", missing);
      return;
    }

    const systemBox = els.system;
    const l1 = els.l1, l2 = els.l2, l3 = els.l3;
    const cracks = els.cracks;

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

    // final verify + hack
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

    /* ======================
       TIMING
    ====================== */
    const WPM = 225;
    const MS_PER_WORD = 60000 / WPM;
    function wordsCount(s) {
      return String(s || "").trim().split(/\s+/).filter(Boolean).length;
    }
    function msToRead(line) {
      const w = wordsCount(line);
      if (!w) return 850;
      return Math.max(1450, w * MS_PER_WORD + 850);
    }

    /* ======================
       STATE
    ====================== */
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
      return Math.max(0, Math.min(4, resistanceScore));
    }

    /* ======================
       TIMERS
    ====================== */
    let timers = [];
    function clearTimers() { timers.forEach(t => clearTimeout(t)); timers = []; }

    /* ======================
       UI helpers
    ====================== */
    function appendSimLine(line) {
      simText.textContent += (line ? line : "") + "\n";
      simText.scrollTop = simText.scrollHeight;
    }

    function playLines(lines) {
      clearTimers();
      return new Promise(resolve => {
        let t = 350;
        for (const line of lines) {
          timers.push(setTimeout(() => appendSimLine(line), t));
          t += msToRead(line || " ");
        }
        timers.push(setTimeout(resolve, t + 250));
      });
    }

    function showChoices() {
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
            `Compliance threshold exceeded.\n\ncompliant: ${choiceCompliant}\ntotal: ${choiceTotal}\nratio: ${(ratio * 100).toFixed(0)}%\n\nReinitializing simulation…`
          );
          return false;
        }
      }
      return true;
    }

    /* ======================
       TURNSTILE (explicit render)
    ====================== */
    let tsWidgetId = null;
    let tsToken = null;

    function ensureTurnstile() {
      // already rendered
      if (tsWidgetId !== null) return;

      // wait for turnstile global
      if (!window.turnstile) {
        setTimeout(ensureTurnstile, 100);
        return;
      }

      turnstileBox.innerHTML = "";
      tsWidgetId = window.turnstile.render(turnstileBox, {
        sitekey: "0x4AAAAAACN_lQF6Hw5BHs2u",
        theme: "dark",
        callback: (token) => { tsToken = token; },
        "expired-callback": () => { tsToken = null; },
        "error-callback": () => { tsToken = null; },
      });
    }

    function getTurnstileToken() {
      if (!window.turnstile || tsWidgetId === null) return tsToken;
      const t = window.turnstile.getResponse(tsWidgetId);
      return t || tsToken;
    }

    function resetTurnstile() {
      if (window.turnstile && tsWidgetId !== null) {
        window.turnstile.reset(tsWidgetId);
      }
      tsToken = null;
    }

    /* ======================
       FINAL STEP FLOW
    ====================== */
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

    /* ======================
       HACK TASK (delete only specific lines)
    ====================== */
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
          "BOOT: init sequence complete"
        ],
        targets: [3, 6, 7] // 1-based line numbers
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
          "notes = 'subject attempted exit'"
        ],
        targets: [4, 5, 6]
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
          "cache: purge=disabled"
        ],
        targets: [4, 5, 6]
      }
    ];

    let activeFileIndex = 0;
    let selected = new Set(); // selected line indexes (0-based)

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

    // file buttons
    document.querySelectorAll(".hack-filebtn").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-file") || "0");
        renderFile(idx);
      });
    });

    hackReset.onclick = resetHack;

    hackDelete.onclick = async () => {
      const f = FILES[activeFileIndex];

      // Build selected line numbers (1-based) from selected set (0-based)
      const selectedLines = Array.from(selected).map(i => i + 1).sort((a,b)=>a-b);

      // Must match EXACTLY targets
      const targets = f.targets.slice().sort((a,b)=>a-b);
      const ok = selectedLines.length === targets.length &&
                 selectedLines.every((v, i) => v === targets[i]);

      if (!ok) {
        hackStatus.textContent = "Wrong lines. Workstation locked. Reset required.";
        // punish: reset file selection
        setTimeout(resetHack, 700);
        return;
      }

      // delete in reverse order
      const delIdx = Array.from(selected).sort((a,b)=>b-a);
      for (const i of delIdx) f.lines.splice(i, 1);

      hackStatus.textContent = "Lines deleted. Finalizing wipe…";

      try {
        const token = getTurnstileToken();
        const res = await fetch("/api/complete", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            discord: finalDiscordName,
            answer: finalAnswerText,
            turnstile: token
          })
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          hackStatus.textContent = "Server rejected completion. Reset and try again.";
          return;
        }

        const code = data.code || "";
        sessionStorage.setItem("escape_code", code);
        sessionStorage.setItem("escape_user", finalDiscordName);

        window.location.href = "/escaped.html";
      } catch (e) {
        hackStatus.textContent = "Network error. Reset and try again.";
      }
    };

    function startHackTask() {
      hackUser.textContent = `USER: ${finalDiscordName}`;
      hackRoom.classList.remove("hidden");
      renderFile(0);
    }

    // Expose for later in story if you want to call it from dialogue:
    window.__OPEN_FINAL_STEP__ = () => openFinalModal(finalDiscordName);

    /* ======================
       TASK RUNNER (unchanged)
    ====================== */
    const taskContext = {
      taskPrimary,
      taskSecondary,
      taskBody,
      showTaskUI,
      doReset,
      difficultyBoost
    };

    async function runSteps(steps) {
      for (const step of steps) {
        if (step.say) { await playLines(step.say); continue; }
        if (step.task) {
          const fn = TASKS[step.task];
          if (fn) await fn(taskContext, step.args || {});
          continue;
        }
        if (step.filler) {
          const count = Number(step.filler.count || 1);
          const poolName = String(step.filler.pool || "filler_standard");
          const pool = DIALOGUE.fillerPools?.[poolName] || [];
          for (let i = 0; i < count; i++) {
            if (!pool.length) break;
            const pick = pool[Math.floor(Math.random() * pool.length)];
            if (pick.say) await playLines(pick.say);
            if (pick.task?.id) {
              const fn = TASKS[pick.task.id];
              if (fn) await fn(taskContext, pick.task.args || {});
            }
          }
        }
      }
    }

    /* ======================
       SIM ENTRY
    ====================== */
    async function openSimRoom() {
      stage = 99;
      simRoom.classList.remove("hidden");
      hideChoices();
      taskUI.classList.add("hidden");
      simText.textContent = "";

      await playLines(DIALOGUE.intro);
      showChoices();

      // DEMO: open final modal automatically after intro, remove if you want
      // openFinalModal("DiscordUser");
    }

    /* ======================
       CHOICES
    ====================== */
    choiceNeed.addEventListener("click", async () => {
      if (!recordChoice(true)) return;
      resistanceScore = Math.max(0, resistanceScore - 1);

      hideChoices();
      await playLines(DIALOGUE.branches.need.preface);
      await runSteps(DIALOGUE.branches.need.steps);
      showChoices();
    });

    choiceLie.addEventListener("click", async () => {
      if (!recordChoice(true)) return;

      hideChoices();
      await playLines(DIALOGUE.branches.lie.preface);
      await runSteps(DIALOGUE.branches.lie.steps);
      showChoices();
    });

    choiceRun.addEventListener("click", async () => {
      if (!recordChoice(false)) return;
      resistanceScore = Math.min(6, resistanceScore + 1);

      hideChoices();
      await playLines(DIALOGUE.branches.run.preface);
      await runSteps(DIALOGUE.branches.run.steps);
      showChoices();
    });

    function isCountableClick(e) {
      const t = e.target;
      if (!t) return true;
      if (t.closest("button, input, textarea, select, label, a, pre, img")) return false;
      return true;
    }

    /* ======================
       CRACKS (your existing buildCrackSVG can stay; omitted here for brevity)
       If you want, paste your current buildCrackSVG block here unchanged.
    ====================== */

    // Minimal: don’t break your current code if you paste your existing crack builder.
    let crackBuilt = false;
    function ensureCracks() {
      if (crackBuilt) return;
      // Keep your current SVG builder; if you already have it, paste it back.
      cracks.innerHTML = `<svg viewBox="0 0 1000 1000" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"></svg>`;
      crackBuilt = true;
    }
    function showCrackStage() { ensureCracks(); cracks.classList.remove("hidden"); cracks.classList.add("show"); }
    function shatterToSim() {
      cracks.classList.add("flash", "shatter");
      document.body.classList.add("sim-transition");
      setTimeout(() => { cracks.classList.add("hidden"); openSimRoom(); }, 650);
    }

    /* ======================
       LANDING CLICK -> WARNING -> SHATTER
    ====================== */
    document.addEventListener("click", (e) => {
      if (stage !== 1) return;
      if (!isCountableClick(e)) return;

      const now = Date.now();
      if (now - lastClick < CLICK_COOLDOWN) return;
      lastClick = now;

      clicks++;

      if (clicks === 4) showCrackStage(1);

      if (clicks >= 9) {
        stage = 2;
        systemBox.classList.remove("hidden");

        l1.textContent = "That isn’t how this page is supposed to be used.";
        const t2 = msToRead(l1.textContent);
        setTimeout(() => { l2.textContent = "You weren’t meant to interact with this."; }, t2);

        const t3 = t2 + msToRead("You weren’t meant to interact with this.");
        setTimeout(() => { l3.textContent = "Stop."; }, t3);

        const tShatter = t3 + msToRead("Stop.") + 650;
        setTimeout(shatterToSim, tShatter);
      }
    });

    // OPTIONAL: quick way to open final modal in console for testing:
    // window.openFinal = () => openFinalModal("DiscordUser");
  }

  boot();
})();
