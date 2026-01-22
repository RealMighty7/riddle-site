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

    const IMAGE_POOL = Array.from({ length: 12 }, (_, i) => `/assets/img${i + 1}.jpg`);
    document.querySelectorAll(".grid img").forEach(img => {
      img.src = IMAGE_POOL[Math.floor(Math.random() * IMAGE_POOL.length)];
    });

    const ids = [
      "system","l1","l2","l3","cracks","glitchFX",
      "simRoom","simText","simChoices","choiceNeed","choiceLie","choiceRun",
      "taskUI","taskTitle","taskDesc","taskBody","taskPrimary","taskSecondary",
      "resetOverlay","resetTitle","resetBody",
      "finalOverlay","finalDiscord","finalAnswer","finalCancel","finalVerify","finalErr","turnstileBox",
      "hackRoom","hackUser","hackTargets","hackFilename","hackLines","hackDelete","hackReset","hackStatus"
    ];
    const glitchFX = els.glitchFX;

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

    // ---------------- STATE ----------------
    let stage = 1;
    let clicks = 0;
    let lastClick = 0;
    const CLICK_COOLDOWN = 650;

    // choice-based compliance, but evaluated after 10 tasks
    const MAX_COMPLIANT_RATIO = 0.40;
    const TASKS_BEFORE_CHECK = 10;

    let choiceTotal = 0;
    let choiceCompliant = 0;

    let tasksCompleted = 0;
    let gateTriggered = false;

    let resistanceScore = 0;
    function difficultyBoost() {
      return Math.max(0, Math.min(4, resistanceScore));
    }

    let timers = [];
    function clearTimers() { timers.forEach(t => clearTimeout(t)); timers = []; }

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
      taskUI.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
    }

    function maybeTriggerGate() {
      if (gateTriggered) return;
      if (tasksCompleted < TASKS_BEFORE_CHECK) return;

      const ratio = choiceTotal ? (choiceCompliant / choiceTotal) : 1;

      // if too compliant -> reset
      if (ratio > MAX_COMPLIANT_RATIO) {
        doReset(
          "TOO COMPLIANT",
          `Compliance threshold exceeded.\n\ncompliant: ${choiceCompliant}\ntotal: ${choiceTotal}\nratio: ${(ratio * 100).toFixed(0)}%\n\nReinitializing simulation…`
        );
        return;
      }

      // otherwise unlock final flow
      gateTriggered = true;
      hideChoices();
      playLines([
        `System: "COMPLIANCE CHECK COMPLETE."`,
        `System: "RESULT: ${(ratio * 100).toFixed(0)}% COMPLIANT."`,
        `Security: "…Fine."`,
        `Security: "If you want out, you do it yourself."`,
        `System: "FINAL TASK UNLOCKED: WORKSTATION ACCESS."`
      ]).then(() => {
        openFinalModal("");
      });
    }
    /* ======================
       GLITCH / CORRUPTION
    ====================== */
  let corruption = 0; // 0..100

  function setCorruption(v){
    corruption = Math.max(0, Math.min(100, v));

    document.body.classList.toggle("glitch-on", corruption > 0);

  // levels 1..4
    document.body.classList.toggle("glitch-1", corruption >= 10);
    document.body.classList.toggle("glitch-2", corruption >= 30);
    document.body.classList.toggle("glitch-3", corruption >= 55);
    document.body.classList.toggle("glitch-4", corruption >= 75);
  }

  function addCorruption(delta){
    setCorruption(corruption + delta);
  }

// Short burst glitch (pixels “drop” then recover)
  function glitchBurst(strength = 20){
    const before = corruption;
    setCorruption(Math.max(before, strength));
    setTimeout(() => setCorruption(before), 220);
  }


    // ---------------- TURNSTILE ----------------
    let tsWidgetId = null;
    let tsToken = null;

    function ensureTurnstile() {
      if (tsWidgetId !== null) return;
      if (!window.turnstile) { setTimeout(ensureTurnstile, 100); return; }

      turnstileBox.innerHTML = "";
      tsWidgetId = window.turnstile.render(turnstileBox, {
        sitekey: "0x4AAAAAACN_lQF6Hw5BHs2u",
        theme: "dark",
        callback: (token) => { tsToken = token; },
        "expired-callback": () => { tsToken = null; },
        "error-callback": () => { tsToken = null; },
        refreshexpired: "auto",
        retry: "auto",
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

    // ---------------- FINAL MODAL ----------------
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

    finalCancel.onclick = () => {
      // don’t allow escape if gate already triggered
      if (gateTriggered) {
        finalErr.textContent = "Finish the workstation step.";
        return;
      }
      closeFinalModal();
    };

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

    // ---------------- HACK TASK ----------------
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
        targets: [3, 6, 7]
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
        if (corruption >= 60 && Math.random() < 0.12) {
          right.style.transform = `translate(${(Math.random()*2-1).toFixed(2)}px, ${(Math.random()*2-1).toFixed(2)}px)`;
          right.style.textShadow = `1px 0 rgba(255,0,120,.45), -1px 0 rgba(0,255,255,.35)`;
        }


        row.appendChild(left);
        row.appendChild(right);

  row.onclick = () => {
    if (selected.has(i)) {
      selected.delete(i);
      row.classList.remove("selected");
      addCorruption(1);
    } else {
      selected.add(i);
      row.classList.add("selected");
      addCorruption(2);
    }
    if (corruption >= 55 && Math.random() < 0.22) glitchBurst(65);
  };


    function resetHack() { renderFile(activeFileIndex); }

  document.querySelectorAll(".hack-filebtn").forEach(btn => {
    btn.addEventListener("click", () => {
      addCorruption(4);
      glitchBurst(28);
      const idx = Number(btn.getAttribute("data-file") || "0");
      renderFile(idx);
    });
  });


    hackReset.onclick = resetHack;

    hackDelete.onclick = async () => {
      const f = FILES[activeFileIndex];

      const selectedLines = Array.from(selected).map(i => i + 1).sort((a,b)=>a-b);
      const targets = f.targets.slice().sort((a,b)=>a-b);

      const ok = selectedLines.length === targets.length &&
                 selectedLines.every((v, i) => v === targets[i]);

      if (!ok) {
        hackStatus.textContent = "Wrong lines. Workstation locked. Reset required.";
        setTimeout(resetHack, 700);
        addCorruption(12);
        glitchBurst(80);
        return;
      }

      const delIdx = Array.from(selected).sort((a,b)=>b-a);
      for (const i of delIdx) f.lines.splice(i, 1);

      hackStatus.textContent = "Lines deleted. Finalizing wipe…";
      addCorruption(18);
      glitchBurst(90);
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
          hackStatus.textContent = `Server rejected completion (${res.status}). Reset and try again.`;
          return;
        }

        const code = data.code || "";
        sessionStorage.setItem("escape_code", code);
        sessionStorage.setItem("escape_user", finalDiscordName);
        
        setCorruption(95);
        glitchBurst(100);
        
        window.location.href = "/escaped.html";
      } catch {
        hackStatus.textContent = "Network error. Reset and try again.";
      }
    };

  function startHackTask() {
    setCorruption(12);
    hackUser.textContent = `USER: ${finalDiscordName}`;
    hackRoom.classList.remove("hidden");
    renderFile(0);
  }


    window.__OPEN_FINAL_STEP__ = () => openFinalModal(finalDiscordName);

    // ---------------- TASK RUNNER ----------------
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
          if (fn) {
            await fn(taskContext, step.args || {});
            tasksCompleted++;
            maybeTriggerGate();
            if (gateTriggered) return;
          }
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
              if (fn) {
                await fn(taskContext, pick.task.args || {});
                tasksCompleted++;
                maybeTriggerGate();
                if (gateTriggered) return;
              }
            }
          }
        }
      }
    }

    // ---------------- SIM ENTRY ----------------
    async function openSimRoom() {
      stage = 99;
      simRoom.classList.remove("hidden");
      hideChoices();
      taskUI.classList.add("hidden");
      simText.textContent = "";

      await playLines(DIALOGUE.intro);
      showChoices();
    }

    // ---------------- CHOICES ----------------
    choiceNeed.addEventListener("click", async () => {
      recordChoice(true);
      resistanceScore = Math.max(0, resistanceScore - 1);

      hideChoices();
      await playLines(DIALOGUE.branches.need.preface);
      await runSteps(DIALOGUE.branches.need.steps);
      if (!gateTriggered) showChoices();
    });

    choiceLie.addEventListener("click", async () => {
      recordChoice(true);

      hideChoices();
      await playLines(DIALOGUE.branches.lie.preface);
      await runSteps(DIALOGUE.branches.lie.steps);
      if (!gateTriggered) showChoices();
    });

    choiceRun.addEventListener("click", async () => {
      recordChoice(false);
      resistanceScore = Math.min(6, resistanceScore + 1);

      hideChoices();
      await playLines(DIALOGUE.branches.run.preface);
      await runSteps(DIALOGUE.branches.run.steps);
      if (!gateTriggered) showChoices();
    });

    function isCountableClick(e) {
      const t = e.target;
      if (!t) return true;
      if (t.closest("button, input, textarea, select, label, a, pre, img")) return false;
      return true;
    }

    // ---------------- GLASS BUILD (center-out) ----------------
    let crackBuilt = false;
    let crackLevel = 0;

    function buildCrackSVG(level) {
      const cx = 500, cy = 500;

      // number of radial cracks increases with level
      const spokes = 6 + level * 4;     // 6..22
      const branchesPer = 1 + Math.floor(level * 0.8); // 1..4

      const paths = [];

      const rand = (a,b) => a + Math.random()*(b-a);
      const polar = (r, ang) => [cx + r*Math.cos(ang), cy + r*Math.sin(ang)];

      for (let s = 0; s < spokes; s++) {
        const ang = (Math.PI * 2) * (s / spokes) + rand(-0.12, 0.12);

        // main line outwards
        let d = "";
        const r0 = rand(6, 24);
        const r1 = rand(320 + level*70, 520 + level*85);
        const [x0,y0] = polar(r0, ang);
        d += `M ${x0.toFixed(1)} ${y0.toFixed(1)} `;

        const segs = 6 + level * 2;
        for (let i = 1; i <= segs; i++) {
          const t = i / segs;
          const rr = r0 + (r1 - r0) * t;
          const aa = ang + rand(-0.06, 0.06) * (1 + t*0.6);
          const [x,y] = polar(rr, aa);
          d += `L ${x.toFixed(1)} ${y.toFixed(1)} `;
        }

        paths.push(d);

        // branch cracks off the main line
        for (let b = 0; b < branchesPer; b++) {
          const brStart = rand(120, r1-80);
          const brLen = rand(80, 200) + level*24;
          const brAng = ang + (Math.random()<0.5 ? -1 : 1) * rand(0.35, 0.9);

          let bd = "";
          const [bx0,by0] = polar(brStart, ang);
          bd += `M ${bx0.toFixed(1)} ${by0.toFixed(1)} `;

          const brSeg = 4 + Math.floor(level * 0.8);
          for (let i = 1; i <= brSeg; i++) {
            const t = i / brSeg;
            const rr = brStart + brLen * t;
            const aa = brAng + rand(-0.08, 0.08);
            const [x,y] = polar(rr, aa);
            bd += `L ${x.toFixed(1)} ${y.toFixed(1)} `;
          }

          paths.push(bd);
        }
      }

      // shard triangles for falling glass
      const shardPolys = [];
      const shardCount = 18 + level * 4; // more shards later
      for (let i = 0; i < shardCount; i++) {
        const ang = rand(0, Math.PI*2);
        const r = rand(120, 520);
        const [x1,y1] = polar(r, ang);
        const [x2,y2] = polar(r + rand(60, 160), ang + rand(-0.18, 0.18));
        const [x3,y3] = polar(r + rand(30, 140), ang + rand(-0.18, 0.18));

        // per-shard fall randoms
        const dx = rand(-220, 220).toFixed(0);
        const rot = rand(-40, 40).toFixed(0);
        const delay = rand(0, 220).toFixed(0);

        shardPolys.push(
          `<polygon class="shard" style="--dx:${dx}px;--r:${rot}deg;--d:${delay}ms"
            points="${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)} ${x3.toFixed(1)},${y3.toFixed(1)}" />`
        );
      }

      const mkPath = (d, cls) => {
        const len = 1600; // fake dash length for draw
        return `<path class="crack-path ${cls}" d="${d}"
          stroke-dasharray="${len}" stroke-dashoffset="${len}"></path>`;
      };

      const crackMarkup = paths.map(d => (
        mkPath(d, "crack-under") +
        mkPath(d, "crack-line") +
        (level >= 2 ? mkPath(d, "crack-glint") : "")
      )).join("\n");

      cracks.innerHTML = `
        <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          ${crackMarkup}
          ${shardPolys.join("\n")}
        </svg>
      `;
    }

    function ensureCracks(level) {
      buildCrackSVG(level);
      crackBuilt = true;
    }

    function showCrackStage(newLevel) {
      crackLevel = Math.max(crackLevel, newLevel);
      ensureCracks(crackLevel);
      cracks.classList.remove("hidden");
      cracks.classList.add("show");
    }

    function shatterToSim() {
      // reveal sim underneath FIRST
      simRoom.classList.remove("hidden");
      simRoom.style.opacity = "0";
      simRoom.style.transition = "opacity 420ms ease";
      requestAnimationFrame(() => (simRoom.style.opacity = "1"));

      // cinematic fall of shards
      cracks.classList.add("fall");
      document.body.classList.add("sim-transition");

      setTimeout(() => {
        cracks.classList.add("hidden");
        openSimRoom();
      }, 950);
    }

    // ---------------- LANDING CLICK ----------------
    document.addEventListener("click", (e) => {
      if (stage !== 1) return;
      if (!isCountableClick(e)) return;

      const now = Date.now();
      if (now - lastClick < CLICK_COOLDOWN) return;
      lastClick = now;

      clicks++;

      // crack progression: 3 stages
      if (clicks === 3) showCrackStage(1);
      if (clicks === 5) showCrackStage(2);
      if (clicks === 7) showCrackStage(3);

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
  })

  boot();
})();
