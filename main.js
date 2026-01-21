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

/* compliance:
   + = compliant, - = resistant
   too high => reset (too compliant)
*/
let compliance = 0;
const TOO_COMPLIANT = 5;

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

const resetOverlay = document.getElementById("resetOverlay");
const resetTitle = document.getElementById("resetTitle");
const resetBody = document.getElementById("resetBody");

/* ======================
   TIMING (225 WPM + padding)
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
   CLICK FILTER
====================== */
function isCountableClick(e) {
  const t = e.target;
  if (!t) return true;
  if (t.closest("button, input, textarea, select, label, a, pre, img")) return false;
  return true;
}

/* ======================
   DIALOGUE HELPERS
====================== */
function appendSimLine(line) {
  simText.textContent += (line ? line : "") + "\n";
  // auto-scroll
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
  taskPrimary.disabled = false;
}

/* ======================
   RESET (too compliant)
====================== */
function doReset(reasonTitle, reasonBody) {
  resetTitle.textContent = reasonTitle;
  resetBody.textContent = reasonBody;
  resetOverlay.classList.remove("hidden");

  // pause a moment so they SEE it, then hard reset
  setTimeout(() => location.reload(), 1800);
}

/* ======================
   DIFFICULTY SCALING
   more resistant (negative compliance) => harder tasks
====================== */
function difficultyBoost() {
  // compliance negative => harder
  // example: compliance -2 => boost +2
  return Math.max(0, -compliance);
}

/* ======================
   TASKS
====================== */

function task_Anchors({ base = 5 }) {
  return new Promise(resolve => {
    const boost = difficultyBoost();
    const count = base + boost;

    showTaskUI("RESTART // ANCHOR SYNC", `Stabilize boundary. Locate and click ${count} anchors.`);
    let remaining = count;
    const anchors = [];

    const spawnAnchor = () => {
      const a = document.createElement("div");
      a.className = "anchor";
      a.style.left = `${10 + Math.random() * 80}vw`;
      a.style.top = `${12 + Math.random() * 72}vh`;

      a.addEventListener("click", () => {
        remaining--;
        a.remove();
        if (remaining <= 0) {
          anchors.forEach(el => el.remove());
          taskPrimary.disabled = false;
        }
      });

      document.body.appendChild(a);
      anchors.push(a);
    };

    for (let i = 0; i < count; i++) spawnAnchor();

    taskBody.innerHTML = `<div class="pill">Anchors remaining: <b id="remain">${remaining}</b></div>`;
    const remainEl = taskBody.querySelector("#remain");

    const tick = setInterval(() => {
      if (!remainEl.isConnected) { clearInterval(tick); return; }
      remainEl.textContent = String(remaining);
      if (remaining <= 0) clearInterval(tick);
    }, 120);

    taskPrimary.textContent = "continue";
    taskPrimary.disabled = true;
    taskPrimary.onclick = () => {
      anchors.forEach(el => el.remove());
      resolve();
    };
  });
}

function task_Reorder({ items, correct }) {
  return new Promise(resolve => {
    showTaskUI("RESTART // LOG RECONSTRUCTION", "Reorder fragments to rebuild the event timeline.");

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
    };

    render();

    taskPrimary.textContent = "confirm order";
    taskPrimary.disabled = true;
    taskPrimary.onclick = () => resolve();
  });
}

function task_Checksum({ phrase }) {
  return new Promise(resolve => {
    showTaskUI("RESTART // CHECKSUM", "Enter the checksum phrase exactly to verify memory integrity.");

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

function task_Hold({ baseMs = 3000 }) {
  return new Promise(resolve => {
    const boost = difficultyBoost();
    const ms = baseMs + boost * 550;

    showTaskUI("RESTART // STABILIZE", "Hold to stabilize the boundary. Releasing resets the cycle.");

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

    holdBtn.addEventListener("touchstart", (e) => { e.preventDefault(); holding = true; hint.textContent = ""; raf = requestAnimationFrame(step); }, { passive: false });
    window.addEventListener("touchend", () => { if (holding) { holding = false; reset(); } });

    taskPrimary.textContent = "continue";
    taskPrimary.disabled = true;
    taskPrimary.onclick = () => resolve();
  });
}

/* new tasks: pattern + mismatch */

function task_Pattern({ base = 5 }) {
  return new Promise(resolve => {
    const boost = difficultyBoost();
    const count = base + boost;

    showTaskUI("RESTART // PATTERN LOCK", "Match the pattern fragments in the correct order.");

    // generate a short sequence
    const symbols = ["▲","■","●","◆","✚","✖","◈"];
    const sequence = Array.from({ length: count }, () => symbols[Math.floor(Math.random()*symbols.length)]);
    let input = [];

    taskBody.innerHTML = `
      <div style="opacity:.85;margin-bottom:8px">Memorize this sequence:</div>
      <div id="seq" style="font-size:22px;letter-spacing:.25em;margin-bottom:10px">${sequence.join(" ")}</div>
      <div style="opacity:.85;margin:10px 0 8px">Now enter it:</div>
      <div id="buttons"></div>
      <div id="in" style="margin-top:10px;opacity:.9"></div>
      <div id="msg" style="margin-top:8px;opacity:.85"></div>
    `;

    const seqEl = taskBody.querySelector("#seq");
    const btns = taskBody.querySelector("#buttons");
    const inEl = taskBody.querySelector("#in");
    const msg = taskBody.querySelector("#msg");

    // hide after a moment (harder if resistant)
    const showMs = 1400 + Math.max(0, compliance) * 250 - difficultyBoost() * 150;
    setTimeout(() => { seqEl.textContent = "— — — — —"; seqEl.style.opacity = "0.6"; }, Math.max(900, showMs));

    const pool = symbols.slice(0, 5 + Math.min(2, boost));
    pool.forEach(s => {
      const b = document.createElement("button");
      b.className = "sim-btn";
      b.textContent = s;
      b.style.minWidth = "44px";
      b.onclick = () => {
        if (input.length >= sequence.length) return;
        input.push(s);
        inEl.textContent = input.join(" ");
        if (input.length === sequence.length) {
          const ok = input.join("|") === sequence.join("|");
          msg.textContent = ok ? "pattern accepted." : "pattern rejected.";
          taskPrimary.disabled = !ok;
        }
      };
      btns.appendChild(b);
    });

    const resetBtn = document.createElement("button");
    resetBtn.className = "sim-btn";
    resetBtn.textContent = "reset";
    resetBtn.onclick = () => { input = []; inEl.textContent = ""; msg.textContent = ""; taskPrimary.disabled = true; };
    btns.appendChild(resetBtn);

    taskPrimary.textContent = "continue";
    taskPrimary.disabled = true;
    taskPrimary.onclick = () => resolve();
  });
}

function task_Mismatch({ base = 7 }) {
  return new Promise(resolve => {
    const boost = difficultyBoost();
    const count = base + boost + 2;

    showTaskUI("RESTART // MISMATCH SCAN", "Find the corrupted fragment. Only one does not match.");

    const shapes = ["◻","◼","◯","⬡","△","◇","○","□","◊"];
    const good = shapes[Math.floor(Math.random()*shapes.length)];
    const bad = shapes.filter(x=>x!==good)[Math.floor(Math.random()*(shapes.length-1))];

    const slots = [];
    const badIndex = Math.floor(Math.random()*count);

    taskBody.innerHTML = `<div style="opacity:.85;margin-bottom:10px">Click the one that does not match.</div>`;

    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.flexWrap = "wrap";
    wrap.style.gap = "10px";

    for (let i=0;i<count;i++){
      const b = document.createElement("button");
      b.className = "sim-btn";
      b.textContent = (i===badIndex)?bad:good;
      b.style.minWidth = "46px";
      b.onclick = () => {
        if (i===badIndex) {
          b.textContent = "✓";
          taskPrimary.disabled = false;
        } else {
          b.textContent = "✖";
          // resistant players get punished: resets if wrong too much
          if (difficultyBoost() >= 3) {
            doReset("TOO ERRATIC", "Your behavior destabilized the reboot window.\n\nRestart required.");
          }
        }
      };
      wrap.appendChild(b);
      slots.push(b);
    }
    taskBody.appendChild(wrap);

    taskPrimary.textContent = "continue";
    taskPrimary.disabled = true;
    taskPrimary.onclick = () => resolve();
  });
}

/* ======================
   QUEST RUNNER (from dialogue.js)
====================== */
const D = window.DIALOGUE;

async function runSteps(steps) {
  for (const step of steps) {
    if (step.say) {
      await new Promise(res => playLines(step.say, res));
      continue;
    }

    if (step.task) {
      const t = step.task;
      const a = step.args || {};

      if (t === "anchors") await task_Anchors(a);
      else if (t === "reorder") await task_Reorder(a);
      else if (t === "checksum") await task_Checksum(a);
      else if (t === "hold") await task_Hold(a);
      else if (t === "pattern") await task_Pattern(a);
      else if (t === "mismatch") await task_Mismatch(a);
    }
  }
}

/* ======================
   SIM ENTRY
====================== */
function openSimRoom() {
  stage = 99;
  simRoom.classList.remove("hidden");
  hideChoices();
  taskUI.classList.add("hidden");
  simText.textContent = "";

  playLines(D.intro, () => showChoices());
}

/* ======================
   CHOICES -> compliance + branch
====================== */
choiceNeed.addEventListener("click", async () => {
  compliance += 2; // very compliant
  if (compliance >= TOO_COMPLIANT) {
    doReset("TOO COMPLIANT", "You complied too perfectly.\n\nThe system classifies you as a scripted actor.\nReinitializing simulation…");
    return;
  }

  hideChoices();
  await new Promise(res => playLines(D.branches.need.preface, res));
  await runSteps(D.branches.need.quest);
  showChoices();
});

choiceLie.addEventListener("click", async () => {
  compliance += 1; // mildly compliant (trying to talk out of it)
  if (compliance >= TOO_COMPLIANT) {
    doReset("TOO COMPLIANT", "You complied too perfectly.\n\nThe system classifies you as a scripted actor.\nReinitializing simulation…");
    return;
  }

  hideChoices();
  await new Promise(res => playLines(D.branches.lie.preface, res));
  await runSteps(D.branches.lie.quest);
  showChoices();
});

choiceRun.addEventListener("click", async () => {
  compliance -= 2; // resistant
  hideChoices();
  await new Promise(res => playLines(D.branches.run.preface, res));
  await runSteps(D.branches.run.quest);
  showChoices();
});

/* ======================
   CRACKS (3 layer per path: under + line + glint)
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
      <path class="crack-under crack-path" d="${d}" stroke-dasharray="${dash}" stroke-dashoffset="${dash}"></path>
      <path class="crack-line crack-path"  d="${d}" stroke-dasharray="${dash}" stroke-dashoffset="${dash}"></path>
      <path class="crack-glint crack-path" d="${d}" stroke-dasharray="${dash}" stroke-dashoffset="${dash}"></path>
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

  // transparent shards (outline only)
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

    shards.push(`<polygon class="shard" points="${p1} ${p2} ${p3}" style="animation-delay:${delay}s;animation-duration:${dur}s;" />`);
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
   MAIN PAGE CLICK PUZZLE
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
