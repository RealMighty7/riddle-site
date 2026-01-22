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
       RANDOM IMAGES (12 pool)
    ====================== */
    const IMAGE_POOL = Array.from({ length: 12 }, (_, i) => `/assets/img${i + 1}.jpg`);
    document.querySelectorAll(".grid img").forEach(img => {
      img.src = IMAGE_POOL[Math.floor(Math.random() * IMAGE_POOL.length)];
    });

    /* ======================
       ELEMENTS (required IDs)
    ====================== */
    const ids = [
      "wrap",
      "system","l1","l2","l3","cracks",
      "shatterLayer",
      "simRoom","simText","simChoices","choiceNeed","choiceLie","choiceRun",
      "taskUI","taskTitle","taskDesc","taskBody","taskPrimary","taskSecondary",
      "resetOverlay","resetTitle","resetBody",
      "verifyOverlay","verifyDiscord","verifyMsg","verifyGo","verifyCancel"
    ];

    const els = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
    const missing = ids.filter(id => !els[id]);
    if (missing.length) {
      console.error("Missing required element IDs:", missing);
      return;
    }

    const wrap = els.wrap;
    const systemBox = els.system;
    const l1 = els.l1, l2 = els.l2, l3 = els.l3;
    const cracks = els.cracks;
    const shatterLayer = els.shatterLayer;

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

    const verifyOverlay = els.verifyOverlay;
    const verifyDiscord = els.verifyDiscord;
    const verifyMsg = els.verifyMsg;
    const verifyGo = els.verifyGo;
    const verifyCancel = els.verifyCancel;

    resetOverlay.classList.add("hidden");

    /* ======================
       TIMING (225 WPM)
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
    let stage = 1; // 1 landing, 2 warning, 99 sim
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
       TASK RUNNER
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
        if (step.say) {
          await playLines(step.say);
          continue;
        }

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
       TURNSTILE + TOKEN GATE
    ====================== */
    function openVerifyOverlay() {
      verifyMsg.textContent = "";
      verifyOverlay.classList.remove("hidden");
    }
    function closeVerifyOverlay() {
      verifyOverlay.classList.add("hidden");
    }
    function getTurnstileResponse() {
      // turnstile puts the response into a hidden input named "cf-turnstile-response"
      const inp = document.querySelector('input[name="cf-turnstile-response"]');
      return (inp?.value || "").trim();
    }

    async function getCompletionToken(discordName) {
      const r = await fetch("/api/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discord: discordName,
          turnstile: getTurnstileResponse()
        })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Verification failed");
      return j.token;
    }

    async function ensureVerified() {
      const cached = sessionStorage.getItem("completion_token");
      if (cached) return cached;

      openVerifyOverlay();

      return await new Promise(resolve => {
        verifyCancel.onclick = () => {
          closeVerifyOverlay();
          resolve(null);
        };

        verifyGo.onclick = async () => {
          verifyMsg.textContent = "verifying…";
          verifyGo.disabled = true;

          try {
            const name = (verifyDiscord.value || "").trim();
            if (!name) throw new Error("Enter a discord name first.");
            const ts = getTurnstileResponse();
            if (!ts) throw new Error("Complete the verification checkbox first.");

            const token = await getCompletionToken(name);
            sessionStorage.setItem("completion_token", token);
            verifyMsg.textContent = "verified.";
            setTimeout(() => {
              closeVerifyOverlay();
              verifyGo.disabled = false;
              resolve(token);
            }, 450);
          } catch (e) {
            verifyMsg.textContent = String(e?.message || "Verification failed.");
            verifyGo.disabled = false;
          }
        };
      });
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

    /* ======================
       CLICK FILTER
    ====================== */
    function isCountableClick(e) {
      const t = e.target;
      if (!t) return true;
      if (t.closest("button, input, textarea, select, label, a, pre, img")) return false;
      return true;
    }

    /* ======================
       CINEMATIC CRACKS
    ====================== */
    let crackBuilt = false;
    let crackOrigin = { x: 500, y: 500 }; // viewBox coords

    function seededRandFactory(seed) {
      let s = seed || Math.floor(Math.random() * 2147483647);
      return function rnd() {
        s = (1103515245 * s + 12345) % 2147483647;
        return s / 2147483647;
      };
    }

    function makeWobblyPath(rnd, startX, startY, angle, length, segments, wanderScale) {
      let x = startX, y = startY;
      let d = `M ${x.toFixed(1)} ${y.toFixed(1)}`;
      let a = angle;

      for (let i = 0; i < segments; i++) {
        const t = (i + 1) / segments;
        a += (rnd() - 0.5) * (0.18 + wanderScale * t);

        const step = length / segments;
        const jitter = (rnd() - 0.5) * (6 + 22 * t);

        const dx = Math.cos(a) * step + Math.cos(a + Math.PI / 2) * jitter;
        const dy = Math.sin(a) * step + Math.sin(a + Math.PI / 2) * jitter;

        x += dx; y += dy;
        d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      return d;
    }

    function triple(d) {
      const dash = 999;
      return `
        <path class="crack-core crack-path" d="${d}" stroke-dasharray="${dash}" stroke-dashoffset="${dash}"></path>
        <path class="crack-hi   crack-path" d="${d}" stroke-dasharray="${dash}" stroke-dashoffset="${dash}"></path>
        <path class="crack-glint crack-path" d="${d}" stroke-dasharray="${dash}" stroke-dashoffset="${dash}"></path>
      `;
    }

    function buildCrackSVG() {
      // seed based on origin so it "feels" consistent per shatter
      const seed = ((crackOrigin.x * 73856093) ^ (crackOrigin.y * 19349663)) >>> 0;
      const rnd = seededRandFactory(seed);

      const cx = crackOrigin.x, cy = crackOrigin.y;
      const sx = cx + (rnd() - 0.5) * 8;
      const sy = cy + (rnd() - 0.5) * 8;

      // staged main cracks
      const stages = [
        { id: 1, main: 3, branchChance: 0.45, len: [140, 230], seg: [5, 7], wander: 0.22 },
        { id: 2, main: 5, branchChance: 0.62, len: [210, 330], seg: [6, 9], wander: 0.30 },
        { id: 3, main: 7, branchChance: 0.78, len: [280, 460], seg: [7, 11], wander: 0.38 },
      ];

      const stageMarkup = stages.map(cfg => {
        const parts = [];
        for (let i = 0; i < cfg.main; i++) {
          const baseAngle = rnd() * Math.PI * 2;
          const len = cfg.len[0] + rnd() * (cfg.len[1] - cfg.len[0]);
          const seg = cfg.seg[0] + Math.floor(rnd() * (cfg.seg[1] - cfg.seg[0] + 1));

          const d = makeWobblyPath(rnd, sx, sy, baseAngle, len, seg, cfg.wander);
          parts.push(triple(d));

          // branches
          const branches = (rnd() < cfg.branchChance) ? (1 + (rnd() < 0.25 ? 1 : 0)) : 0;
          for (let b = 0; b < branches; b++) {
            const bAngle = baseAngle + (rnd() < 0.5 ? -1 : 1) * (0.55 + rnd() * 0.70);
            const bLen = 80 + rnd() * (140 + cfg.id * 50);
            const bSeg = 4 + Math.floor(rnd() * 6);

            const anchorDist = len * (0.22 + rnd() * 0.30);
            const bx = sx + Math.cos(baseAngle) * anchorDist;
            const by = sy + Math.sin(baseAngle) * anchorDist;

            const bd = makeWobblyPath(rnd, bx, by, bAngle, bLen, bSeg, cfg.wander + 0.10);
            parts.push(triple(bd));
          }
        }
        return `<g class="crack-stage" data-stage="${cfg.id}" style="display:none">${parts.join("")}</g>`;
      }).join("");

      // hairline stress cracks (always present, subtle)
      const hair = [];
      for (let i = 0; i < 26; i++) {
        const a = rnd() * Math.PI * 2;
        const len = 120 + rnd() * 520;
        const seg = 6 + Math.floor(rnd() * 10);
        const d = makeWobblyPath(rnd, sx, sy, a, len, seg, 0.10 + rnd() * 0.10);
        const dash = 999;
        hair.push(`<path class="hair crack-path" d="${d}" stroke-dasharray="${dash}" stroke-dashoffset="${dash}"></path>`);
      }

      return `
        <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <g class="hair-stage">${hair.join("")}</g>
          ${stageMarkup}
        </svg>
      `;
    }

    function ensureCracks() {
      if (crackBuilt) return;
      cracks.innerHTML = buildCrackSVG();
      crackBuilt = true;
    }

    function showCrackStage(n) {
      ensureCracks();
      cracks.classList.remove("hidden");
      cracks.classList.add("show");
      cracks.querySelectorAll(".crack-stage").forEach(g => {
        const s = Number(g.getAttribute("data-stage"));
        if (s <= n) g.style.display = "block";
      });
    }

    /* ======================
       FALLING PIECES REVEAL
    ====================== */
    function buildFallingTiles() {
      shatterLayer.innerHTML = "";
      shatterLayer.classList.remove("hidden");

      // reveal sim behind
      simRoom.classList.remove("hidden");

      const rows = 4;
      const cols = 6;

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const tileW = Math.ceil(vw / cols);
      const tileH = Math.ceil(vh / rows);

      // create a clone of the whole "landing" area (#wrap)
      // and position it so each tile shows the right portion
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * tileW;
          const y = r * tileH;

          const tile = document.createElement("div");
          tile.className = "shatter-tile";
          tile.style.left = x + "px";
          tile.style.top = y + "px";
          tile.style.width = tileW + "px";
          tile.style.height = tileH + "px";

          // movement
          const tx = (Math.random() - 0.5) * 220;
          const ty = 520 + Math.random() * 560;
          const rot = (Math.random() - 0.5) * 38;

          tile.style.setProperty("--tx", `${tx}px`);
          tile.style.setProperty("--ty", `${ty}px`);
          tile.style.setProperty("--rot", `${rot}deg`);

          // inside clone (so tile looks like real page fragment)
          const inner = document.createElement("div");
          inner.className = "shatter-inner";

          const clone = wrap.cloneNode(true);
          clone.style.margin = "0";
          clone.style.transform = `translate(${-x}px, ${-y}px)`;
          clone.style.width = vw + "px";
          clone.style.maxWidth = "none";

          inner.appendChild(clone);
          tile.appendChild(inner);
          shatterLayer.appendChild(tile);
        }
      }
    }

    async function shatterToSim() {
      // 1) gate access with Turnstile
      const token = await ensureVerified();
      if (!token) return; // user cancelled

      // 2) crack flash at click position
      cracks.classList.add("flash");
      document.body.style.setProperty("--flash-x", `${(crackOrigin.x / 1000) * 100}%`);
      document.body.style.setProperty("--flash-y", `${(crackOrigin.y / 1000) * 100}%`);

      // 3) build falling tiles and animate them away
      document.body.classList.add("sim-transition");
      buildFallingTiles();

      const tiles = Array.from(shatterLayer.querySelectorAll(".shatter-tile"));
      tiles.forEach((t, i) => {
        const delay = 0.02 * i + Math.random() * 0.06;
        const dur = 0.95 + Math.random() * 0.55;
        t.style.animation = `tileFall ${dur.toFixed(2)}s ease-in forwards`;
        t.style.animationDelay = `${delay.toFixed(2)}s`;
      });

      // 4) while tiles fall, also show crack overlay briefly
      cracks.classList.add("show");
      cracks.classList.remove("hidden");

      setTimeout(() => {
        // remove old landing from view
        wrap.style.opacity = "0";
      }, 120);

      // 5) finalize into sim
      setTimeout(() => {
        cracks.classList.add("hidden");
        shatterLayer.classList.add("hidden");
        shatterLayer.innerHTML = "";
        openSimRoom();
      }, 1450);
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

      // set crack origin from click position
      const px = e.clientX / window.innerWidth;
      const py = e.clientY / window.innerHeight;
      crackOrigin = { x: Math.round(px * 1000), y: Math.round(py * 1000) };
      crackBuilt = false; // rebuild for new origin
      cracks.innerHTML = "";

      if (clicks === 4) showCrackStage(1);
      if (clicks === 6) showCrackStage(2);
      if (clicks === 8) showCrackStage(3);

      if (clicks >= 9) {
        stage = 2;
        systemBox.classList.remove("hidden");

        l1.textContent = "That isn’t how this page is supposed to be used.";

        const t2 = msToRead(l1.textContent);
        setTimeout(() => { l2.textContent = "You weren’t meant to interact with this."; }, t2);

        const t3 = t2 + msToRead("You weren’t meant to interact with this.");
        setTimeout(() => { l3.textContent = "Stop."; }, t3);

        const tShatter = t3 + msToRead("Stop.") + 850;
        setTimeout(() => { shatterToSim(); }, tShatter);
      }
    });
  }

  boot();
})();
