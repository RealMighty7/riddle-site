(() => {
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
     ELEMENTS (null-safe)
  ====================== */
  const $ = (id) => document.getElementById(id);

  const systemBox = $("system");
  const l1 = $("l1"), l2 = $("l2"), l3 = $("l3");
  const cracks = $("cracks");

  const simRoom = $("simRoom");
  const simText = $("simText");
  const simChoices = $("simChoices");
  const choiceNeed = $("choiceNeed");
  const choiceLie = $("choiceLie");
  const choiceRun = $("choiceRun");

  const taskUI = $("taskUI");
  const taskTitle = $("taskTitle");
  const taskDesc = $("taskDesc");
  const taskBody = $("taskBody");
  const taskPrimary = $("taskPrimary");
  const taskSecondary = $("taskSecondary");

  const resetOverlay = $("resetOverlay");
  const resetTitle = $("resetTitle");
  const resetBody = $("resetBody");

const requiredIds = [
  "system","l1","l2","l3","cracks",
  "simRoom","simText","simChoices","choiceNeed","choiceLie","choiceRun",
  "taskUI","taskTitle","taskDesc","taskBody","taskPrimary","taskSecondary",
  "resetOverlay","resetTitle","resetBody"
];

const els = Object.fromEntries(requiredIds.map(id => [id, document.getElementById(id)]));
const missing = requiredIds.filter(id => !els[id]);

if (missing.length) {
  console.error("Missing required element IDs:", missing);
  // optional: highlight if they exist but are duplicated (getElementById only returns first)
  return;
}

// then assign:
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
  let stage = 1;         // 1 landing, 2 warning, 99 sim
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
        continue;
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
   CRACK SVG (GLASS SAFE)
====================== */

function seededRandFactory() {
  let seed = Math.floor(Math.random() * 2147483647);
  return function rnd() {
    seed = (1103515245 * seed + 12345) % 2147483647;
    return seed / 2147483647;
  };
}

function makeWobblyPath(rnd, startX, startY, angle, length, segments, wanderScale) {
  let x = startX, y = startY;
  let d = `M ${x.toFixed(1)} ${y.toFixed(1)}`;
  let a = angle;

  for (let i = 0; i < segments; i++) {
    const t = (i + 1) / segments;
    a += (rnd() - 0.5) * (0.16 + wanderScale * t);

    const step = length / segments;
    const jitter = (rnd() - 0.5) * (8 + 28 * t);

    const dx = Math.cos(a) * step + Math.cos(a + Math.PI / 2) * jitter;
    const dy = Math.sin(a) * step + Math.sin(a + Math.PI / 2) * jitter;

    x += dx;
    y += dy;
    d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

function buildCrackSVG() {
  const rnd = seededRandFactory();
  const cx = 500, cy = 500;

  const sx = cx + (rnd() - 0.5) * 12;
  const sy = cy + (rnd() - 0.5) * 12;

  const stages = [
    { id: 1, main: 3, branchChance: 0.35, len: [110, 190], seg: [4, 6], wander: 0.20 },
    { id: 2, main: 5, branchChance: 0.55, len: [170, 280], seg: [5, 8], wander: 0.28 },
    { id: 3, main: 7, branchChance: 0.75, len: [240, 420], seg: [6, 10], wander: 0.36 },
  ];

  const triple = (d) => {
    const dash = 999;
    return `
      <path class="crack-under crack-path" d="${d}" stroke-dasharray="${dash}" stroke-dashoffset="${dash}"/>
      <path class="crack-line  crack-path" d="${d}" stroke-dasharray="${dash}" stroke-dashoffset="${dash}"/>
      <path class="crack-glint crack-path" d="${d}" stroke-dasharray="${dash}" stroke-dashoffset="${dash}"/>
    `;
  };

  const stageMarkup = stages.map(cfg => {
    const parts = [];

    for (let i = 0; i < cfg.main; i++) {
      const baseAngle = rnd() * Math.PI * 2;
      const len = cfg.len[0] + rnd() * (cfg.len[1] - cfg.len[0]);
      const seg = cfg.seg[0] + Math.floor(rnd() * (cfg.seg[1] - cfg.seg[0] + 1));

      const d = makeWobblyPath(rnd, sx, sy, baseAngle, len, seg, cfg.wander);
      parts.push(triple(d));

      if (rnd() < cfg.branchChance) {
        const bAngle = baseAngle + (rnd() < 0.5 ? -1 : 1) * (0.55 + rnd() * 0.60);
        const bLen = 60 + rnd() * (120 + cfg.id * 40);
        const bSeg = 3 + Math.floor(rnd() * 5);

        const anchorDist = len * (0.28 + rnd() * 0.22);
        const bx = sx + Math.cos(baseAngle) * anchorDist;
        const by = sy + Math.sin(baseAngle) * anchorDist;

        const bd = makeWobblyPath(rnd, bx, by, bAngle, bLen, bSeg, cfg.wander + 0.12);
        parts.push(triple(bd));
      }
    }

    return `<g class="crack-stage" data-stage="${cfg.id}" style="display:none">${parts.join("")}</g>`;
  }).join("");

  /* ======================
     GLASS SHARDS (POLYLINE)
     NEVER FILLED
  ====================== */

  const shards = [];
  for (let i = 0; i < 18; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 90 + rnd() * 340;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;

    const size = 60 + rnd() * 130;
    const a2 = a + (rnd() - 0.5) * 1.0;

    const p1 = `${px.toFixed(1)},${py.toFixed(1)}`;
    const p2 = `${(px + Math.cos(a2) * size).toFixed(1)},${(py + Math.sin(a2) * size).toFixed(1)}`;
    const p3 = `${(px + Math.cos(a2 + 1.7) * (size * (0.55 + rnd() * 0.70))).toFixed(1)},${(py + Math.sin(a2 + 1.7) * (size * (0.55 + rnd() * 0.70))).toFixed(1)}`;

    const delay = (0.03 * i + rnd() * 0.10).toFixed(2);
    const dur = (0.95 + rnd() * 0.55).toFixed(2);

    shards.push(`
      <polyline
        class="shard"
        points="${p1} ${p2} ${p3}"
        style="animation-delay:${delay}s;animation-duration:${dur}s;"
      />
    `);
  }

  return `
    <svg viewBox="0 0 1000 1000" fill="none" preserveAspectRatio="none"
         xmlns="http://www.w3.org/2000/svg">
      ${stageMarkup}
      ${shards.join("")}
    </svg>
  `;
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
      setTimeout(shatterToSim, tShatter);
    }
  });

})();
