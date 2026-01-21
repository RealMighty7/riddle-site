/* ======================
   RANDOM IMAGES
====================== */
const IMAGE_POOL = Array.from({ length: 12 }, (_, i) => `/assets/img${i + 1}.jpg`);
document.querySelectorAll(".grid img").forEach(img => {
  img.src = IMAGE_POOL[Math.floor(Math.random() * IMAGE_POOL.length)];
});

/* ======================
   STATE
====================== */
let stage = 1;         // 1 = break phase, 2 = warning phase, 99 = sim opened
let clicks = 0;
let lastClick = 0;
const CLICK_COOLDOWN = 650;

let timers = [];
function clearTimers() { timers.forEach(t => clearTimeout(t)); timers = []; }

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
const choiceNeed = document.getElementById("choiceNeed");
const choiceLie = document.getElementById("choiceLie");
const choiceRun = document.getElementById("choiceRun");

const taskUI = document.getElementById("taskUI");
const taskTitle = document.getElementById("taskTitle");
const taskDesc = document.getElementById("taskDesc");
const taskBody = document.getElementById("taskBody");
const taskPrimary = document.getElementById("taskPrimary");
const taskSecondary = document.getElementById("taskSecondary");

/* completion exists but we are NOT going there yet */
const finish = document.getElementById("finish");

/* ======================
   TIMING (225 WPM + padding)
====================== */
const WPM = 225;
const MS_PER_WORD = 60000 / WPM; // ~266ms

function wordsCount(s) {
  return String(s || "").trim().split(/\s+/).filter(Boolean).length;
}

function msToRead(line) {
  const w = wordsCount(line);
  if (!w) return 850;
  const base = w * MS_PER_WORD;
  // readable, but not sluggish
  return Math.max(1450, base + 850);
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

/* ======================
   CRACKS (CENTER-ONLY EXPAND IN STAGES)
   - Not perfect rays
   - Each stage adds longer, branching fractures
====================== */
let crackBuilt = false;

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

    // wander grows with distance from center
    a += (rnd() - 0.5) * (0.16 + wanderScale * t);

    const step = length / segments;
    const jitter = (rnd() - 0.5) * (8 + 28 * t);

    const dx = Math.cos(a) * step + Math.cos(a + Math.PI / 2) * jitter;
    const dy = Math.sin(a) * step + Math.sin(a + Math.PI / 2) * jitter;

    x += dx; y += dy;
    d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }

  return d;
}

function buildCrackSVG() {
  const rnd = seededRandFactory();
  const cx = 500, cy = 500;

  const startJitter = 12;
  const sx = cx + (rnd() - 0.5) * startJitter;
  const sy = cy + (rnd() - 0.5) * startJitter;

  // 3 stages: short center hairlines -> mid -> long + more branches
  const stages = [
    { id: 1, main: 3, branchChance: 0.35, len: [110, 190], seg: [4, 6], wander: 0.20 },
    { id: 2, main: 5, branchChance: 0.55, len: [170, 280], seg: [5, 8], wander: 0.28 },
    { id: 3, main: 7, branchChance: 0.75, len: [240, 420], seg: [6, 10], wander: 0.36 },
  ];

  const pair = (d) => {
    const dash = 999;
    return `
      <path class="crack-under crack-path" d="${d}" stroke-dasharray="${dash}" stroke-dashoffset="${dash}"></path>
      <path class="crack-line crack-path" d="${d}" stroke-dasharray="${dash}" stroke-dashoffset="${dash}"></path>
    `;
  };

  const stageMarkup = stages.map(cfg => {
    const parts = [];

    for (let i = 0; i < cfg.main; i++) {
      // IMPORTANT: originate from the center region
      const baseAngle = (rnd() * Math.PI * 2);
      const len = cfg.len[0] + rnd() * (cfg.len[1] - cfg.len[0]);
      const seg = cfg.seg[0] + Math.floor(rnd() * (cfg.seg[1] - cfg.seg[0] + 1));

      const d = makeWobblyPath(rnd, sx, sy, baseAngle, len, seg, cfg.wander);
      parts.push(pair(d));

      // branches off main crack: start somewhere near the first half (still "center expanding")
      if (rnd() < cfg.branchChance) {
        const bAngle = baseAngle + (rnd() < 0.5 ? -1 : 1) * (0.55 + rnd() * 0.60);
        const bLen = 60 + rnd() * (120 + cfg.id * 40);
        const bSeg = 3 + Math.floor(rnd() * 5);

        // branch anchor is close to center, not far out
        const anchorDist = len * (0.28 + rnd() * 0.22);
        const bx = sx + Math.cos(baseAngle) * anchorDist;
        const by = sy + Math.sin(baseAngle) * anchorDist;

        const bd = makeWobblyPath(rnd, bx, by, bAngle, bLen, bSeg, cfg.wander + 0.12);
        parts.push(pair(bd));
      }
    }

    return `<g class="crack-stage" data-stage="${cfg.id}" style="display:none">${parts.join("")}</g>`;
  }).join("");

  // shards (only on shatter)
  const shards = [];
  for (let i = 0; i < 20; i++) {
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

    shards.push(
      `<polygon class="shard" points="${p1} ${p2} ${p3}"
        fill="rgba(255,255,255,0.08)"
        stroke="rgba(255,255,255,0.16)"
        stroke-width="1.1"
        style="animation-delay:${delay}s;animation-duration:${dur}s;"
      />`
    );
  }

  return `
    <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      ${stageMarkup}
      ${shards.join("")}
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

function shatterToSim() {
  cracks.classList.add("flash", "shatter");
  document.body.classList.add("shake", "sim-transition");

  setTimeout(() => {
    cracks.classList.add("hidden");
    openSimRoom();
  }, 1250);
}

/* ======================
   SIM ROOM: Dialogue + Quest Engine
====================== */
function appendSimLine(line) {
  simText.textContent += (line ? line : "") + "\n";
  simText.scrollTop = simText.scrollHeight;
}

function playLines(lines, onDone) {
  clearTimers();
  let t = 350;
  for (const line of lines) {
    timers.push(setTimeout(() => appendSimLine(line), t));
    t += msToRead(line || " ");
  }
  timers.push(setTimeout(() => onDone && onDone(), t + 250));
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
}

/* ----------------------
   QUEST TASKS (filler)
   These are intentionally "system reboot" chores:
   - anchors (click floating nodes)
   - reorder (drag-free ordering)
   - checksum phrase entry
   - timed "stabilize" hold
---------------------- */

function task_ClickAnchors({ count = 5 }) {
  return new Promise(resolve => {
    showTaskUI("RESTART SEQUENCE // ANCHOR SYNC", `Stabilize the boundary. Locate and click ${count} anchors.`);

    let remaining = count;
    const anchors = [];

    const spawnAnchor = () => {
      const a = document.createElement("div");
      a.className = "anchor";

      // keep away from edges and UI center area slightly
      const x = 10 + Math.random() * 80;
      const y = 12 + Math.random() * 72;

      a.style.left = `${x}vw`;
      a.style.top = `${y}vh`;

      a.addEventListener("click", () => {
        remaining--;
        a.remove();
        if (remaining <= 0) {
          anchors.forEach(el => el.remove());
          resolve();
        }
      });

      document.body.appendChild(a);
      anchors.push(a);
    };

    for (let i = 0; i < count; i++) spawnAnchor();

    taskBody.innerHTML = `<div class="pill">Anchors remaining: <b id="remain">${remaining}</b></div>`;
    const remainEl = taskBody.querySelector("#remain");

    const tick = setInterval(() => {
      if (!document.body.contains(remainEl)) return;
      remainEl.textContent = String(remaining);
      if (remaining <= 0) clearInterval(tick);
    }, 120);

    taskPrimary.textContent = "continue";
    taskPrimary.onclick = () => {}; // locked; must complete anchors
    taskPrimary.disabled = true;

    const unlockCheck = setInterval(() => {
      if (remaining <= 0) {
        taskPrimary.disabled = false;
        clearInterval(unlockCheck);
      }
    }, 100);

    taskPrimary.onclick = () => resolve();
  });
}

function task_ReorderPills({ items, correct }) {
  return new Promise(resolve => {
    showTaskUI("RESTART SEQUENCE // LOG RECONSTRUCTION", "Reorder the fragments to rebuild the event timeline.");

    const state = [...items];

    const render = () => {
      taskBody.innerHTML = `<div style="opacity:.85;margin-bottom:8px">Click two items to swap them.</div>`;
      const wrap = document.createElement("div");
      let first = null;

      state.forEach((txt, idx) => {
        const pill = document.createElement("span");
        pill.className = "pill";
        pill.textContent = txt;
        pill.style.cursor = "pointer";
        pill.onclick = () => {
          if (first === null) {
            first = idx;
            pill.style.outline = "2px solid rgba(120,180,255,0.55)";
          } else {
            const tmp = state[first];
            state[first] = state[idx];
            state[idx] = tmp;
            render();
          }
        };
        wrap.appendChild(pill);
      });

      taskBody.appendChild(wrap);

      const ok = state.join("|") === correct.join("|");
      taskPrimary.disabled = !ok;
      taskPrimary.textContent = ok ? "confirm order" : "confirm order";
    };

    render();

    taskPrimary.textContent = "confirm order";
    taskPrimary.disabled = true;
    taskPrimary.onclick = () => resolve();
  });
}

function task_EnterChecksum({ phrase }) {
  return new Promise(resolve => {
    showTaskUI("RESTART SEQUENCE // CHECKSUM", "Enter the checksum phrase exactly to verify memory integrity.");

    taskBody.innerHTML = `
      <div style="opacity:.85;margin-bottom:8px">Checksum required:</div>
      <div class="pill" style="opacity:.9">Format: WORDWORD-WORD</div>
      <div style="margin-top:10px">
        <input id="chk" placeholder="enter checksum..." style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.18);background:rgba(0,0,0,0.25);color:#e5e7eb;">
      </div>
      <div id="msg" style="margin-top:8px;opacity:.85"></div>
    `;

    const inp = taskBody.querySelector("#chk");
    const msg = taskBody.querySelector("#msg");

    const validate = () => {
      const v = (inp.value || "").trim();
      const ok = v.toLowerCase() === phrase.toLowerCase();
      taskPrimary.disabled = !ok;
      msg.textContent = ok ? "checksum accepted." : "";
    };

    inp.addEventListener("input", validate);

    taskPrimary.textContent = "verify";
    taskPrimary.disabled = true;
    taskPrimary.onclick = () => resolve();
  });
}

function task_HoldStabilize({ ms = 3000 }) {
  return new Promise(resolve => {
    showTaskUI("RESTART SEQUENCE // STABILIZE", "Hold to stabilize the boundary. Releasing resets the cycle.");

    taskBody.innerHTML = `
      <div style="opacity:.85;margin-bottom:10px">Hold the button until the bar completes.</div>
      <div style="height:10px;border-radius:999px;border:1px solid rgba(255,255,255,0.18);overflow:hidden;background:rgba(0,0,0,0.25)">
        <div id="bar" style="height:100%;width:0%"></div>
      </div>
      <div style="margin-top:12px">
        <button id="hold" class="sim-btn">hold</button>
      </div>
      <div id="hint" style="margin-top:8px;opacity:.8"></div>
    `;

    const holdBtn = taskBody.querySelector("#hold");
    const bar = taskBody.querySelector("#bar");
    const hint = taskBody.querySelector("#hint");

    let start = null;
    let raf = null;
    let holding = false;

    const step = (ts) => {
      if (!holding) return;
      if (start === null) start = ts;
      const elapsed = ts - start;
      const pct = Math.min(1, elapsed / ms);
      bar.style.width = `${(pct * 100).toFixed(1)}%`;
      bar.style.background = "rgba(120,180,255,0.45)";

      if (pct >= 1) {
        holding = false;
        hint.textContent = "stabilized.";
        taskPrimary.disabled = false;
        cancelAnimationFrame(raf);
        return;
      }
      raf = requestAnimationFrame(step);
    };

    const reset = () => {
      start = null;
      bar.style.width = "0%";
      hint.textContent = "holding interrupted.";
      taskPrimary.disabled = true;
    };

    holdBtn.addEventListener("mousedown", () => { holding = true; hint.textContent = ""; raf = requestAnimationFrame(step); });
    window.addEventListener("mouseup", () => { if (holding) { holding = false; reset(); } });

    // touch support
    holdBtn.addEventListener("touchstart", (e) => { e.preventDefault(); holding = true; hint.textContent = ""; raf = requestAnimationFrame(step); }, { passive: false });
    window.addEventListener("touchend", () => { if (holding) { holding = false; reset(); } });

    taskPrimary.textContent = "continue";
    taskPrimary.disabled = true;
    taskPrimary.onclick = () => resolve();
  });
}

/* ----------------------
   Quest Chains (per choice)
---------------------- */
async function runQuestChain(chainName) {
  hideChoices();
  taskUI.classList.add("hidden");

  // filler “reboot” narration between tasks
  const say = async (lines) => new Promise(res => playLines(lines, res));

  if (chainName === "need") {
    await say([
      `Security: "Good. You understand procedure."`,
      `Security: "You will comply with restart protocol until containment stabilizes."`,
      `System: "RESTART TRIGGERED BY BOUNDARY DAMAGE."`,
      `System: "RECOVERY MODE: MANUAL."`,
      `Worker 2: "We can still salvage this if they follow instructions."`,
      `Security: "No commentary. Keep it clinical."`,
      `Security: "Begin: Anchor Sync."`
    ]);

    await task_ClickAnchors({ count: 6 });

    await say([
      `System: "ANCHOR SYNC: PARTIAL."`,
      `Security: "Not enough. Continue."`,
      `Security: "Reconstruct the event timeline."`
    ]);

    await task_ReorderPills({
      items: ["impact", "fracture", "alarm", "lockdown", "observer"],
      correct: ["observer", "impact", "fracture", "alarm", "lockdown"]
    });

    await say([
      `Worker 1: "If the order is wrong, the system loops the same failure."`,
      `Security: "Then don’t be wrong."`,
      `Security: "Checksum next."`
    ]);

    await task_EnterChecksum({ phrase: "ECHOECHO-VAULT" });

    await say([
      `System: "MEMORY INTEGRITY: ACCEPTABLE."`,
      `Security: "Hold stabilization."`,
      `PA System: "Containment sweep continuing."`
    ]);

    await task_HoldStabilize({ ms: 3200 });

    await say([
      `Security: "Good."`,
      `Security: "You’re earning temporary compliance."`,
      `System: "RESTART PHASE 1 COMPLETE."`,
      `Worker 3: "Phase 2 is longer…"`,
      `Security: "We will not say 'longer' where the observer can hear it."`,
      `Security: "Proceed."`
    ]);

    showChoices();
    return;
  }

  if (chainName === "lie") {
    await say([
      `Security: "No. That is not an accident."`,
      `Security: "You forced the boundary to respond."`,
      `System: "BEHAVIORAL FLAG: DECEPTIVE."`,
      `Security: "You will correct that."`,
      `Security: "Manual restart chores. Now."`
    ]);

    await task_ClickAnchors({ count: 5 });

    await say([
      `Worker 2: "They’re… actually doing it."`,
      `Security: "Of course they are. They want out."`,
      `Security: "Reorder the fragments."`
    ]);

    await task_ReorderPills({
      items: ["deny", "contact", "observe", "contain", "comply"],
      correct: ["observe", "contact", "deny", "contain", "comply"]
    });

    await say([
      `Security: "Checksum verification."`,
      `System: "REQUIRED: PHRASE MATCH."`
    ]);

    await task_EnterChecksum({ phrase: "ECHOECHO-VAULT" });

    await say([
      `Security: "Stabilize."`,
      `Security: "Hold it. Don’t let go."`
    ]);

    await task_HoldStabilize({ ms: 3600 });

    await say([
      `Security: "Better."`,
      `Security: "You can lie later. Right now you work."`,
      `System: "RESTART PHASE 1 COMPLETE."`
    ]);

    showChoices();
    return;
  }

  if (chainName === "run") {
    await say([
      `Security: "Stop."`,
      `Security: "Running is classified as escalation."`,
      `System: "THREAT SCORE: INCREASING."`,
      `Worker 1: "If they panic, it collapses the corridor."`,
      `Security: "Then we keep them busy."`,
      `Security: "Manual restart tasks. Immediate."`
    ]);

    await task_ClickAnchors({ count: 7 });

    await say([
      `Security: "Again."`,
      `System: "BOUNDARY STILL UNSTABLE."`
    ]);

    await task_HoldStabilize({ ms: 3400 });

    await say([
      `Security: "Timeline reconstruction."`,
      `Worker 3: "Make it clean or it loops."`
    ]);

    await task_ReorderPills({
      items: ["panic", "push", "crack", "alarm", "seal"],
      correct: ["push", "crack", "alarm", "seal", "panic"]
    });

    await say([
      `Security: "Checksum."`,
      `System: "REQUIRED."`
    ]);

    await task_EnterChecksum({ phrase: "ECHOECHO-VAULT" });

    await say([
      `Security: "Fine."`,
      `Security: "You’re not stable, but you’re functional."`,
      `System: "RESTART PHASE 1 COMPLETE."`
    ]);

    showChoices();
    return;
  }
}

/* ----------------------
   SIM ENTRY (dialogue + first choice)
---------------------- */
function openSimRoom() {
  stage = 99;

  // Never show completion yet
  finish.classList.add("hidden");

  simRoom.classList.remove("hidden");
  simChoices.classList.add("hidden");
  taskUI.classList.add("hidden");
  simText.textContent = "";

  const intro = [
    `Security: "All stations, freeze."`,
    `Security: "Confirm breach classification."`,
    `System: "UNAUTHORIZED OBSERVER DETECTED."`,
    `System: "SOURCE: EXTERNAL INTERACTION."`,
    ``,
    `Worker 2: "It doesn’t match any internal profile."`,
    `Security: "Then treat it as unknown."`,
    `Security: "You. Do not move."`,
    ``,
    `PA System: "CODE 3. CODE 3."`,
    `PA System: "Initiating containment protocols."`,
    ``,
    `Security: "DEFCON 4."`,
    `Security: "Lock auxiliary exits. Disable corridor cameras."`,
    ``,
    `Worker 1: "You’re not supposed to be here."`,
    `Worker 1: "You were meant to be solving puzzles."`,
    ``,
    `Security: "This is your only warning."`,
    `Security: "Further interaction will be classified as hostile."`,
    ``,
    `Worker 3: "If they leave right now, it seals."`,
    `Security: "Then they won’t leave right now."`,
    ``,
    `Security: "Choose your statement."`,
    `Security: "We are listening."`
  ];

  playLines(intro, () => {
    simChoices.classList.remove("hidden");
  });
}

/* ----------------------
   Choices -> branch
---------------------- */
choiceNeed.addEventListener("click", async () => {
  simChoices.classList.add("hidden");
  playLines(
    [
      `You: "I need something first."`,
      `Security: "Correct."`,
      `Security: "Compliance is the only language this corridor recognizes."`
    ],
    async () => {
      await runQuestChain("need");
    }
  );
});

choiceLie.addEventListener("click", async () => {
  simChoices.classList.add("hidden");
  playLines(
    [
      `You: "I clicked by accident."`,
      `Security: "No."`,
      `Security: "Accidents do not produce controlled fractures."`
    ],
    async () => {
      await runQuestChain("lie");
    }
  );
});

choiceRun.addEventListener("click", async () => {
  simChoices.classList.add("hidden");
  playLines(
    [
      `You: "Run."`,
      `Security: "Stop."`,
      `Security: "Escalation noted."`
    ],
    async () => {
      await runQuestChain("run");
    }
  );
});

/* ======================
   MAIN PAGE CLICK PUZZLE
====================== */
document.addEventListener("click", (e) => {
  if (stage !== 1) return;
  if (!isCountableClick(e)) return;

  const now = Date.now();
  if (now - lastClick < CLICK_COOLDOWN) return;
  lastClick = now;

  clicks++;

  // staged cracking (center expands outward)
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

    const tShatter = t3 + msToRead("Stop.") + 850;
    setTimeout(shatterToSim, tShatter);
  }
});
