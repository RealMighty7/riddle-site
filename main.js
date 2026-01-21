/* =========================================================
   RIDDLE SITE — MAIN (FULL)
   - WPM 225
   - Center-only staged cracking expanding outward
   - Simulation room with SECURITY AUTHORITY
   - Branching choices with LOTS of filler quests
   - Ends BEFORE verification code (by design)
========================================================= */

/* ======================
   RANDOM IMAGES (12)
====================== */
const IMAGE_POOL = Array.from({ length: 12 }, (_, i) => `/assets/img${i + 1}.jpg`);
document.querySelectorAll(".grid img").forEach(img => {
  img.src = IMAGE_POOL[Math.floor(Math.random() * IMAGE_POOL.length)];
});

/* ======================
   STATE
====================== */
let stage = 1; // 1=break phase, 2=warning, 99=sim started
let clicks = 0;
let lastClick = 0;
const CLICK_COOLDOWN = 650;

let simMode = "intro";     // intro | branch_need | branch_lie | branch_run | quests | gate
let branch = null;         // "need"|"lie"|"run"
let questIndex = 0;        // current quest pointer
let task = null;           // current task object
let timers = [];

/* ======================
   ELEMENTS
====================== */
const systemBox = document.getElementById("system");
const l1 = document.getElementById("l1");
const l2 = document.getElementById("l2");
const l3 = document.getElementById("l3");
const cracks = document.getElementById("cracks");

const simRoom = document.getElementById("simRoom");
const simText = document.getElementById("simText");
const simChoices = document.getElementById("simChoices");
const simContinue = document.getElementById("simContinue");
const choiceNeed = document.getElementById("choiceNeed");
const choiceLie = document.getElementById("choiceLie");
const choiceRun = document.getElementById("choiceRun");
const btnProceed = document.getElementById("btnProceed");

/* ======================
   TIMING (225 WPM + padded)
====================== */
const WPM = 225;
const MS_PER_WORD = 60000 / WPM; // ~266ms

function wordsCount(s) {
  return String(s || "").trim().split(/\s+/).filter(Boolean).length;
}
function msToRead(line) {
  const w = wordsCount(line);
  if (!w) return 850;
  return Math.max(1350, w * MS_PER_WORD + 800);
}
function clearTimers() {
  timers.forEach(t => clearTimeout(t));
  timers = [];
}
function wait(ms) {
  return new Promise(res => setTimeout(res, ms));
}

/* ======================
   CLICK FILTER
====================== */
function isCountableClick(e) {
  const t = e.target;
  if (!t) return true;
  if (t.closest("button, input, textarea, select, label, a, pre, img")) return false;
  return true;
}

/* =========================================================
   CENTER-OUT CRACKING (STAGED, REALISTIC)
   - Only starts in the center
   - Stage increases outward (short -> medium -> long)
   - Wobbly lines + branching
========================================================= */
let crackBuilt = false;

function seededRandFactory() {
  let seed = Math.floor(Math.random() * 2 ** 31);
  return function rnd() {
    seed = (1103515245 * seed + 12345) % 2147483648;
    return seed / 2147483648;
  };
}

function makeWobblyPath(rnd, x0, y0, angle, length, segments) {
  let x = x0, y = y0;
  let a = angle;
  let d = `M ${x.toFixed(1)} ${y.toFixed(1)}`;
  for (let i = 0; i < segments; i++) {
    const t = (i + 1) / segments;
    a += (rnd() - 0.5) * (0.16 + 0.20 * t);           // angle wander
    const step = length / segments;
    const jitter = (rnd() - 0.5) * (10 + 22 * t);     // perpendicular jag
    const dx = Math.cos(a) * step + Math.cos(a + Math.PI / 2) * jitter;
    const dy = Math.sin(a) * step + Math.sin(a + Math.PI / 2) * jitter;
    x += dx; y += dy;
    d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

function buildCracksSVG() {
  const rnd = seededRandFactory();
  const cx = 500, cy = 500;

  // Stages: only expand outward from center
  const stages = [
    { stage: 1, rays: 4,  len: [95, 150],  seg: [4, 6],  branches: 1 },
    { stage: 2, rays: 7,  len: [150, 260], seg: [6, 8],  branches: 3 },
    { stage: 3, rays: 11, len: [260, 430], seg: [8, 11], branches: 7 },
  ];

  const pathPair = (d) => {
    const dash = 999;
    return `
      <path class="crack-under crack-path" d="${d}" stroke-dasharray="${dash}" stroke-dashoffset="${dash}"></path>
      <path class="crack-line crack-path" d="${d}" stroke-dasharray="${dash}" stroke-dashoffset="${dash}"></path>
    `;
  };

  const stageGroups = stages.map(cfg => {
    const parts = [];
    for (let i = 0; i < cfg.rays; i++) {
      const baseAngle = (i / cfg.rays) * Math.PI * 2 + (rnd() - 0.5) * 0.35;
      const len = cfg.len[0] + rnd() * (cfg.len[1] - cfg.len[0]);
      const seg = cfg.seg[0] + Math.floor(rnd() * (cfg.seg[1] - cfg.seg[0] + 1));

      // start *at center* with tiny random offset (keeps it centered visually)
      const sx = cx + (rnd() - 0.5) * 8;
      const sy = cy + (rnd() - 0.5) * 8;

      const d = makeWobblyPath(rnd, sx, sy, baseAngle, len, seg);
      parts.push(pathPair(d));

      // branches come off mid-way (still near-ish center)
      if (rnd() < 0.55) {
        const bAngle = baseAngle + (rnd() < 0.5 ? -1 : 1) * (0.5 + rnd() * 0.6);
        const bLen = 60 + rnd() * 150;
        const bSeg = 3 + Math.floor(rnd() * 5);

        const midR = len * (0.28 + rnd() * 0.22);
        const bx = sx + Math.cos(baseAngle) * midR;
        const by = sy + Math.sin(baseAngle) * midR;

        const bd = makeWobblyPath(rnd, bx, by, bAngle, bLen, bSeg);
        parts.push(pathPair(bd));
      }
    }

    // extra tiny hairline cracks (near center) for realism
    for (let j = 0; j < cfg.branches; j++) {
      const ang = rnd() * Math.PI * 2;
      const sx = cx + Math.cos(ang) * (10 + rnd() * 40);
      const sy = cy + Math.sin(ang) * (10 + rnd() * 40);
      const len = 35 + rnd() * 90;
      const seg = 3 + Math.floor(rnd() * 4);
      const d = makeWobblyPath(rnd, sx, sy, ang + (rnd() - 0.5) * 0.7, len, seg);
      parts.push(pathPair(d));
    }

    return `<g class="crack-stage" data-stage="${cfg.stage}" style="display:none">${parts.join("")}</g>`;
  }).join("");

  // Shards (only animate on shatter)
  const shards = [];
  const shardCount = 18;
  for (let i = 0; i < shardCount; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 80 + rnd() * 340;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;

    const size = 55 + rnd() * 135;
    const a2 = a + (rnd() - 0.5) * 0.9;

    const p1 = `${px.toFixed(1)},${py.toFixed(1)}`;
    const p2 = `${(px + Math.cos(a2) * size).toFixed(1)},${(py + Math.sin(a2) * size).toFixed(1)}`;
    const p3 = `${(px + Math.cos(a2 + 1.7) * (size * (0.55 + rnd() * 0.6))).toFixed(1)},${(py + Math.sin(a2 + 1.7) * (size * (0.55 + rnd() * 0.6))).toFixed(1)}`;

    const delay = (0.03 * i + rnd() * 0.08).toFixed(2);
    const dur = (0.90 + rnd() * 0.45).toFixed(2);

    shards.push(`
      <polygon class="shard" points="${p1} ${p2} ${p3}"
        fill="rgba(255,255,255,0.08)"
        stroke="rgba(255,255,255,0.16)"
        stroke-width="1.1"
        style="animation-delay:${delay}s;animation-duration:${dur}s;"
      />
    `);
  }

  return `
    <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      ${stageGroups}
      ${shards.join("")}
    </svg>
  `;
}

function ensureCracksBuilt() {
  if (crackBuilt) return;
  cracks.innerHTML = buildCracksSVG();
  crackBuilt = true;
}

function showCrackStage(n) {
  ensureCracksBuilt();
  cracks.classList.remove("hidden");
  cracks.classList.add("show");

  cracks.querySelectorAll(".crack-stage").forEach(g => {
    const s = Number(g.getAttribute("data-stage"));
    if (s <= n) g.style.display = "block";
  });
}

/* =========================================================
   SHATTER + TRANSITION
========================================================= */
function shatterToSim() {
  cracks.classList.add("flash", "shatter");
  document.body.classList.add("shake", "sim-transition");

  setTimeout(() => {
    cracks.classList.add("hidden");
    openSimIntro();
  }, 1250);
}

/* =========================================================
   SIM TEXT ENGINE (long-form, paced)
========================================================= */
async function sayLines(lines, { clear = false } = {}) {
  clearTimers();
  if (clear) simText.textContent = "";
  simChoices.classList.add("hidden");
  if (simContinue) simContinue.classList.add("hidden");

  let t = 350;
  for (const line of lines) {
    const text = (line ?? "");
    timers.push(setTimeout(() => {
      simText.textContent += (text.length ? text : "") + "\n";
    }, t));
    t += msToRead(text || " ");
  }

  // Wait for schedule to finish
  await wait(t + 150);
}

function showChoiceButtons({ need = true, lie = true, run = true } = {}) {
  simChoices.classList.remove("hidden");
  choiceNeed.style.display = need ? "inline-block" : "none";
  choiceLie.style.display = lie ? "inline-block" : "none";
  choiceRun.style.display = run ? "inline-block" : "none";
}

/* =========================================================
   SIM INTRO (Security Authority + mixed voices)
========================================================= */
async function openSimIntro() {
  stage = 99;
  simMode = "intro";
  simRoom.classList.remove("hidden");
  simText.textContent = "";

  await sayLines([
    `System: "UNAUTHORIZED OBSERVER DETECTED."`,
    `System: "SOURCE: EXTERNAL INTERACTION."`,
    ``,
    `Security: "All stations, freeze."`,
    `Security: "Confirm breach classification."`,
    ``,
    `Worker 2: "It doesn’t match any internal profile."`,
    `Worker 2: "This is not a test instance."`,
    ``,
    `Security: "You."`,
    `Security: "Do not move."`,
    ``,
    `Worker 1: "You aren’t supposed to be here."`,
    `Worker 1: "You were supposed to be solving puzzles."`,
    ``,
    `PA System: "CODE 3. CODE 3."`,
    ``,
    `Security: "DEFCON 4."`,
    `Security: "Lock auxiliary exits. Disable corridor cameras outside Sector C."`,
    ``,
    `System: "THREAT SCORE: EVALUATING..."`,
    `System: "BOUNDARY INTEGRITY: DEGRADED."`,
    ``,
    `Security: "State your authorization."`,
    `Security: "Present verification."`,
    ``,
    `Worker 3: "They don’t have any."`,
    ``,
    `Security: "Then they will follow instructions."`,
    `Security: "Or they will be contained."`,
    ``,
    `Worker 2: "There’s a window. If they stabilize the reboot, we can flag them as compliant."`,
    ``,
    `Security: "Temporary compliance only. One chance."`,
    ``,
    `System: "REBOOT SEQUENCE: INITIATED."`,
    `System: "RECOVERY TASKS REQUIRED."`,
    ``,
    `Security: "Choose. Now."`
  ], { clear: true });

  showChoiceButtons({ need: true, lie: true, run: true });
}

/* =========================================================
   BRANCH SEQUENCES + QUESTS
   Each branch: lots of filler + tasks.
========================================================= */

const QUESTS = {
  need: [
    {
      title: "Boot Audit",
      intro: [
        `Security: "You need something first? Fine."`,
        `Security: "Then you will earn clearance the hard way."`,
        ``,
        `System: "TASK 01: BOOT AUDIT."`,
        `System: "Objective: confirm restart checksum stability."`,
        ``,
        `Worker 1: "Just do what it says. Don’t improvise."`,
        `Security: "No talking back. Begin."`
      ],
      task: { type: "countdownConfirm", seconds: 18 }
    },
    {
      title: "Fragment Recovery",
      intro: [
        `System: "TASK 02: FRAGMENT RECOVERY."`,
        `System: "Objective: restore corrupted log order."`,
        ``,
        `Security: "If you fail, I mark you hostile and we end this."`,
        `Worker 2: "Okay— okay. It’s just ordering. You can do that."`
      ],
      task: { type: "orderFragments" }
    },
    {
      title: "Badge Fabrication",
      intro: [
        `System: "TASK 03: TEMPORARY BADGE FABRICATION."`,
        `System: "Objective: generate a plausible clearance signature."`,
        ``,
        `Security: "This is not freedom."`,
        `Security: "This is a leash with a longer chain."`,
        ``,
        `Worker 3: "Pick the option that looks the most boring. Always boring."`
      ],
      task: { type: "pickBoring" }
    }
  ],

  lie: [
    {
      title: "Interrogation Protocol",
      intro: [
        `Security: "You clicked by accident."`,
        `Security: "I don’t care."`,
        ``,
        `Security: "You will answer in protocol format."`,
        `System: "TASK 01: STATEMENT FORMATTER."`,
        `System: "Objective: produce a compliant statement."`
      ],
      task: { type: "typeExact", phrase: "I WILL COMPLY" }
    },
    {
      title: "Camera Sweep",
      intro: [
        `Security: "Good."`,
        `Security: "Now you prove you didn’t plant anything."`,
        ``,
        `System: "TASK 02: CAMERA SWEEP."`,
        `System: "Objective: clear 6 sectors."`,
        ``,
        `Worker 2: "This is going to take a while..."`,
        `Security: "Yes. That’s the point."`
      ],
      task: { type: "multiClick", needed: 6 }
    },
    {
      title: "Containment Delay",
      intro: [
        `System: "TASK 03: CONTAINMENT DELAY."`,
        `System: "Objective: slow the reboot lockdown."`,
        ``,
        `Security: "You stall the system. We move you."`,
        `Worker 1: "Don’t mess this up."`
      ],
      task: { type: "hold", ms: 4200 }
    }
  ],

  run: [
    {
      title: "Pursuit Lock",
      intro: [
        `Security: "They’re running."`,
        `Security: "Cut the corridor."`,
        ``,
        `System: "TASK 01: PURSUIT LOCK."`,
        `System: "Objective: force a safe freeze to avoid hard reset."`,
        ``,
        `Worker 3: "If you trigger a hard reset you’ll lose everything."`,
        `Security: "Stop. Them."`
      ],
      task: { type: "stopSpam", hits: 8 }
    },
    {
      title: "Route Mapping",
      intro: [
        `System: "TASK 02: ROUTE MAPPING."`,
        `System: "Objective: choose correct exit vector."`,
        ``,
        `Security: "Wrong vector means dead end."`,
        `Security: "Dead end means containment."`
      ],
      task: { type: "pickRoute" }
    },
    {
      title: "Stability Check",
      intro: [
        `System: "TASK 03: STABILITY CHECK."`,
        `System: "Objective: confirm boundary is stable enough to pass."`,
        ``,
        `Worker 2: "This part is slow. It’s supposed to be."`,
        `Security: "Quiet. Let it run."`
      ],
      task: { type: "countdownConfirm", seconds: 22 }
    }
  ]
};

/* =========================================================
   TASK UI (button-based so you don't need extra HTML)
========================================================= */

function resetButtonsForTask() {
  simChoices.classList.add("hidden");
  if (simContinue) simContinue.classList.add("hidden");

  // re-label and reuse existing 3 buttons
  choiceNeed.classList.remove("danger");
  choiceRun.classList.add("danger");
  choiceNeed.style.display = "inline-block";
  choiceLie.style.display = "inline-block";
  choiceRun.style.display = "inline-block";
}

async function runQuestLine(branchName) {
  simMode = "quests";
  questIndex = 0;

  while (questIndex < QUESTS[branchName].length) {
    const q = QUESTS[branchName][questIndex];

    await sayLines([
      `---`,
      `System: "${q.title.toUpperCase()}"`,
      `---`,
      ``,
      ...q.intro,
      ``,
      `System: "Press the options below to proceed."`
    ]);

    await runTask(q.task);
    questIndex += 1;
  }

  await sayLines([
    ``,
    `System: "RECOVERY TASK SET COMPLETE."`,
    `System: "REBOOT PHASE ADVANCING..."`,
    ``,
    `Security: "You’re not out."`,
    `Security: "You’re just no longer immediately expendable."`,
    ``,
    `Worker 1: "The system is rebuilding the boundary."`,
    `Worker 2: "That means more checks."`,
    ``,
    `Security: "We will continue when the next layer exposes an exit."`,
    `System: "GATE: LOCKED."`,
    `System: "ADDITIONAL CONTENT REQUIRED."`
  ]);

  // stop here (NO verification code yet)
  simMode = "gate";
  resetButtonsForTask();
  choiceNeed.textContent = "…";
  choiceLie.textContent = "wait";
  choiceRun.textContent = "leave";
  simChoices.classList.remove("hidden");
}

/* ---------------- TASKS ---------------- */

function attachOnce(el, ev, fn) {
  const handler = (e) => {
    el.removeEventListener(ev, handler);
    fn(e);
  };
  el.addEventListener(ev, handler);
}

async function runTask(taskDef) {
  resetButtonsForTask();

  if (taskDef.type === "countdownConfirm") {
    const total = taskDef.seconds;
    let remaining = total;

    choiceNeed.textContent = "hold position";
    choiceLie.textContent = "status";
    choiceRun.textContent = "confirm";

    await sayLines([
      `System: "Countdown running. Do NOT rush."`,
      `System: "Confirm only when timer reaches 0."`
    ]);

    // simple tick text
    const tick = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(tick);
        simText.textContent += `System: "TIMER: 0"\n`;
        simText.textContent += `System: "Awaiting confirmation."\n`;
      } else {
        simText.textContent += `System: "TIMER: ${remaining}"\n`;
      }
    }, 1000);

    await new Promise(res => {
      choiceRun.onclick = () => {
        if (remaining <= 0) {
          simText.textContent += `Security: "Proceed."\n`;
          res();
        } else {
          simText.textContent += `Security: "Too early. Again."\n`;
        }
      };
      choiceLie.onclick = () => {
        simText.textContent += `Worker 2: "Just wait. Don’t press confirm yet."\n`;
      };
      choiceNeed.onclick = () => {
        simText.textContent += `Security: "Hold position."\n`;
      };
      simChoices.classList.remove("hidden");
    });

    return;
  }

  if (taskDef.type === "orderFragments") {
    // Player must reorder 4 fragments into correct order (fixed)
    const fragments = [
      "LOG FRAGMENT C: boundary tear detected",
      "LOG FRAGMENT A: handshake initialized",
      "LOG FRAGMENT D: containment requested",
      "LOG FRAGMENT B: authorization failed"
    ];
    let order = [0, 1, 2, 3];

    function showOrder() {
      simText.textContent += `System: "CURRENT ORDER:"\n`;
      order.forEach((idx, i) => {
        simText.textContent += `  ${i + 1}) ${fragments[idx]}\n`;
      });
    }

    const correct = [1, 3, 0, 2]; // A, B, C, D

    choiceNeed.textContent = "swap 1↔2";
    choiceLie.textContent = "swap 3↔4";
    choiceRun.textContent = "submit order";

    await sayLines([
      `System: "Reorder the fragments into a coherent log."`,
      `Security: "Do not guess randomly. Think."`,
      `Worker 1: "Handshake first. Failure second. Tear third. Containment last."`,
      ``
    ]);

    showOrder();

    await new Promise(res => {
      choiceNeed.onclick = () => {
        [order[0], order[1]] = [order[1], order[0]];
        simText.textContent += `System: "Swap registered."\n`;
        showOrder();
      };
      choiceLie.onclick = () => {
        [order[2], order[3]] = [order[3], order[2]];
        simText.textContent += `System: "Swap registered."\n`;
        showOrder();
      };
      choiceRun.onclick = () => {
        const ok = order.every((v, i) => v === correct[i]);
        if (ok) {
          simText.textContent += `System: "LOG ORDER RESTORED."\n`;
          simText.textContent += `Security: "Good."\n`;
          res();
        } else {
          simText.textContent += `System: "ORDER INVALID. TRY AGAIN."\n`;
          simText.textContent += `Security: "Again."\n`;
        }
      };
      simChoices.classList.remove("hidden");
    });

    return;
  }

  if (taskDef.type === "pickBoring") {
    // choose the most boring option (2) per hint
    choiceNeed.textContent = "clearance: red";
    choiceLie.textContent = "clearance: gray";
    choiceRun.textContent = "clearance: gold";

    await sayLines([
      `System: "Select a temporary clearance color."`,
      `Security: "Pick wrong and you get flagged."`,
      `Worker 3: "Boring. Always boring."`,
      ``
    ]);

    await new Promise(res => {
      choiceNeed.onclick = () => simText.textContent += `System: "FLAGGED: TOO DISTINCT."\n`;
      choiceRun.onclick = () => simText.textContent += `System: "FLAGGED: HIGH VALUE SIGNATURE."\n`;
      choiceLie.onclick = () => {
        simText.textContent += `System: "CLEARANCE ACCEPTED."\n`;
        simText.textContent += `Security: "Move."\n`;
        res();
      };
      simChoices.classList.remove("hidden");
    });

    return;
  }

  if (taskDef.type === "typeExact") {
    // we don't want password-like stuff; it’s just a phrase check
    // Use simple prompt() to avoid adding new HTML
    await sayLines([
      `Security: "Open the statement prompt and type EXACTLY:"`,
      `Security: "\"${taskDef.phrase}\""`,
      `System: "Awaiting compliance."`,
      ``
    ]);

    const typed = prompt(`Type exactly: ${taskDef.phrase}`) || "";
    if (typed.trim() === taskDef.phrase) {
      simText.textContent += `System: "STATEMENT ACCEPTED."\n`;
      simText.textContent += `Security: "Continue."\n`;
      return;
    } else {
      simText.textContent += `System: "STATEMENT REJECTED."\n`;
      simText.textContent += `Security: "Again. Do it correctly."\n`;
      return runTask(taskDef);
    }
  }

  if (taskDef.type === "multiClick") {
    let done = 0;
    const needed = taskDef.needed;

    choiceNeed.textContent = "sector A";
    choiceLie.textContent = "sector B";
    choiceRun.textContent = "sector C";

    await sayLines([
      `System: "Tap sectors to clear them from the sweep list."`,
      `System: "Goal: clear ${needed} sectors."`,
      `Security: "Do not stop until complete."`,
      ``
    ]);

    await new Promise(res => {
      function hit(name) {
        done += 1;
        simText.textContent += `System: "${name} cleared (${done}/${needed})."\n`;
        if (done >= needed) {
          simText.textContent += `System: "SWEEP COMPLETE."\n`;
          simText.textContent += `Security: "Good."\n`;
          res();
        }
      }
      choiceNeed.onclick = () => hit("Sector A");
      choiceLie.onclick = () => hit("Sector B");
      choiceRun.onclick = () => hit("Sector C");
      simChoices.classList.remove("hidden");
    });

    return;
  }

  if (taskDef.type === "hold") {
    const ms = taskDef.ms;
    choiceNeed.textContent = "steady";
    choiceLie.textContent = "don’t blink";
    choiceRun.textContent = "release";

    await sayLines([
      `System: "Hold stability for ${Math.ceil(ms/1000)} seconds."`,
      `Security: "Do NOT press release early."`,
      ``
    ]);

    const start = Date.now();
    await new Promise(res => {
      choiceRun.onclick = () => {
        const elapsed = Date.now() - start;
        if (elapsed >= ms) {
          simText.textContent += `System: "HOLD SUCCESS."\n`;
          simText.textContent += `Security: "Continue."\n`;
          res();
        } else {
          simText.textContent += `System: "HOLD FAILED (${Math.ceil((ms-elapsed)/1000)}s remaining)."\n`;
          simText.textContent += `Security: "Again."\n`;
          res("restart");
        }
      };
      choiceNeed.onclick = () => simText.textContent += `Worker 1: "Steady..."\n`;
      choiceLie.onclick = () => simText.textContent += `System: "Stability trending: nominal."\n`;
      simChoices.classList.remove("hidden");
    }).then(r => {
      if (r === "restart") return runTask(taskDef);
    });

    return;
  }

  if (taskDef.type === "stopSpam") {
    // player must press "stop" 8 times but cooldown blocks spamming
    let hits = 0;
    const needed = taskDef.hits;

    choiceNeed.textContent = "stop";
    choiceLie.textContent = "stop";
    choiceRun.textContent = "stop";

    await sayLines([
      `Security: "Stop. Moving."`,
      `System: "Force-freeze requires repeated confirmations."`,
      `System: "Goal: ${needed} confirmations."`,
      ``
    ]);

    await new Promise(res => {
      const last = { t: 0 };
      function hit() {
        const now = Date.now();
        if (now - last.t < 420) {
          simText.textContent += `System: "Input throttled."\n`;
          return;
        }
        last.t = now;
        hits += 1;
        simText.textContent += `System: "Freeze pulse ${hits}/${needed}."\n`;
        if (hits >= needed) {
          simText.textContent += `System: "FREEZE ACHIEVED."\n`;
          simText.textContent += `Security: "Good."\n`;
          res();
        }
      }
      choiceNeed.onclick = hit;
      choiceLie.onclick = hit;
      choiceRun.onclick = hit;
      simChoices.classList.remove("hidden");
    });

    return;
  }

  if (taskDef.type === "pickRoute") {
    choiceNeed.textContent = "vector: north";
    choiceLie.textContent = "vector: east";
    choiceRun.textContent = "vector: maintenance";

    await sayLines([
      `System: "Select an exit vector."`,
      `Security: "Pick wrong and you hit a dead end."`,
      `Worker 2: "Maintenance routes usually bypass the pretty doors..."`,
      ``
    ]);

    await new Promise(res => {
      choiceNeed.onclick = () => simText.textContent += `System: "DEAD END."\n`;
      choiceLie.onclick = () => simText.textContent += `System: "LOCKED DOOR."\n`;
      choiceRun.onclick = () => {
        simText.textContent += `System: "ROUTE ACCEPTED."\n`;
        simText.textContent += `Security: "Move."\n`;
        res();
      };
      simChoices.classList.remove("hidden");
    });

    return;
  }
}

/* =========================================================
   CHOICE HANDLERS
========================================================= */
choiceNeed.onclick = async () => {
  if (simMode !== "intro") return;
  branch = "need";
  await sayLines([
    `Security: "You need something first."`,
    `Security: "Then you will stabilize the reboot."`,
    `System: "COMPLIANCE PATH: ENABLED."`,
    ``,
    `Worker 1: "Okay... okay. Follow the tasks."`
  ]);
  await runQuestLine("need");
};

choiceLie.onclick = async () => {
  if (simMode !== "intro") return;
  branch = "lie";
  await sayLines([
    `Security: "Accident is not a category."`,
    `Security: "Compliance is a category."`,
    `System: "INTERROGATION PATH: ENABLED."`,
    ``,
    `Worker 2: "Just… do what they say."`
  ]);
  await runQuestLine("lie");
};

choiceRun.onclick = async () => {
  if (simMode !== "intro") return;
  branch = "run";
  await sayLines([
    `Security: "They’re attempting evasion."`,
    `Security: "Containment teams, intercept."`,
    `System: "PURSUIT PATH: ENABLED."`,
    ``,
    `Worker 3: "If you hard-reset this, you lose your only chance."`
  ]);
  await runQuestLine("run");
};

// Gate buttons (after quests) – just flavor for now
// (keeps it “long” without giving the ending)
function gateFlavor() {
  if (simMode !== "gate") return;
  simText.textContent += `System: "Gate remains locked."\n`;
  simText.textContent += `Security: "Stand by."\n`;
}
choiceNeed.addEventListener("click", gateFlavor);
choiceLie.addEventListener("click", gateFlavor);
choiceRun.addEventListener("click", gateFlavor);

/* =========================================================
   MAIN CLICK HANDLER (break phase)
========================================================= */
document.addEventListener("click", (e) => {
  if (stage !== 1) return;
  if (!isCountableClick(e)) return;

  const now = Date.now();
  if (now - lastClick < CLICK_COOLDOWN) return;
  lastClick = now;

  clicks++;

  // staged cracks expanding from center
  if (clicks === 4) showCrackStage(1);
  if (clicks === 6) showCrackStage(2);
  if (clicks === 8) showCrackStage(3);

  if (clicks >= 9) {
    stage = 2;
    systemBox.classList.remove("hidden");

    l1.textContent = "That isn’t how this page is supposed to be used.";

    const t2 = msToRead(l1.textContent);
    setTimeout(() => {
      l2.textContent = "You weren’t meant to interact with this.";
    }, t2);

    const t3 = t2 + msToRead("You weren’t meant to interact with this.");
    setTimeout(() => {
      l3.textContent = "Stop.";
    }, t3);

    // pause AFTER stop, then shatter
    const tShatter = t3 + msToRead("Stop.") + 900;
    setTimeout(shatterToSim, tShatter);
  }
});
