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
let stage = 1;         // 1 = click/break phase, 2 = warning phase, 99 = sim opened
let clicks = 0;
let lastClick = 0;
const CLICK_COOLDOWN = 650;

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
// (these exist in your HTML even if not used yet)
const simContinue = document.getElementById("simContinue");
const choiceNeed = document.getElementById("choiceNeed");
const choiceLie = document.getElementById("choiceLie");
const choiceRun = document.getElementById("choiceRun");
const btnProceed = document.getElementById("btnProceed");

/* ======================
   TIMING (225 WPM)
====================== */
const WPM = 225;
const MS_PER_WORD = 60000 / WPM; // 266.66ms

function msToRead(text) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean).length;
  if (!words) return 850;
  // still padded so low readers can keep up, but faster than before
  return Math.max(1400, words * MS_PER_WORD + 850);
}

/* ======================
   HELPERS
====================== */
function isCountableClick(e) {
  const t = e.target;
  if (!t) return true;
  // ignore interactive stuff + images so puzzle doesn't trigger while browsing
  if (t.closest("button, input, textarea, select, label, a, pre, img")) return false;
  return true;
}

/* ======================
   REALISTIC CRACKS (staged, branching, NOT perfect rays)
   - Builds up in 3 stages
   - Cracks originate near center but wander + branch
====================== */

let crackBuilt = false;
let crackSvgEl = null;
let crackGroups = []; // 3 stages

function seededRandFactory() {
  // stable-ish seed per page load
  let seed = Math.floor(Math.random() * 2 ** 31);
  return function rnd() {
    seed = (1103515245 * seed + 12345) % 2147483648;
    return seed / 2147483648;
  };
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function makeWobblyPath(rnd, startX, startY, angle, length, segments) {
  // produces a jagged polyline-like path string
  let x = startX, y = startY;
  let d = `M ${x.toFixed(1)} ${y.toFixed(1)}`;
  let a = angle;

  for (let i = 0; i < segments; i++) {
    const t = (i + 1) / segments;

    // wander angle slightly (more wander as it goes out)
    a += (rnd() - 0.5) * (0.18 + 0.22 * t);

    const step = length / segments;

    // perpendicular jitter for jagged look
    const jitter = (rnd() - 0.5) * (10 + 22 * t);

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

  // start points are near center but not identical each time
  const startJitter = 18;
  const sx = cx + (rnd() - 0.5) * startJitter;
  const sy = cy + (rnd() - 0.5) * startJitter;

  // 3 stages: small hairline cracks -> more -> many + branches
  const stageDefs = [
    { main: 3, branches: 1, len: [170, 260], seg: [5, 7] },  // stage 1
    { main: 5, branches: 3, len: [240, 360], seg: [6, 9] },  // stage 2
    { main: 7, branches: 6, len: [310, 470], seg: [7, 11] }, // stage 3
  ];

  const makePathPair = (d, dash) => {
    return `
      <path class="crack-under crack-path" d="${d}" stroke-dasharray="${dash}" stroke-dashoffset="${dash}"></path>
      <path class="crack-line crack-path" d="${d}" stroke-dasharray="${dash}" stroke-dashoffset="${dash}"></path>
    `;
  };

  // shards (only visible on shatter)
  const shardCount = 18;
  const shards = [];
  for (let i = 0; i < shardCount; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 80 + rnd() * 320;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;

    const size = 60 + rnd() * 120;
    const a2 = a + (rnd() - 0.5) * 0.9;

    const p1 = `${px.toFixed(1)},${py.toFixed(1)}`;
    const p2 = `${(px + Math.cos(a2) * size).toFixed(1)},${(py + Math.sin(a2) * size).toFixed(1)}`;
    const p3 = `${(px + Math.cos(a2 + 1.7) * (size * (0.6 + rnd() * 0.6))).toFixed(1)},${(py + Math.sin(a2 + 1.7) * (size * (0.6 + rnd() * 0.6))).toFixed(1)}`;

    const delay = (0.03 * i + rnd() * 0.08).toFixed(2);
    const dur = (0.90 + rnd() * 0.45).toFixed(2);

    shards.push(
      `<polygon class="shard" points="${p1} ${p2} ${p3}"
        fill="rgba(255,255,255,0.08)"
        stroke="rgba(255,255,255,0.16)"
        stroke-width="1.1"
        style="animation-delay:${delay}s;animation-duration:${dur}s;"
      />`
    );
  }

  const stageGroupsMarkup = stageDefs.map((cfg, stageIndex) => {
    const stageNum = stageIndex + 1;
    const parts = [];

    // main cracks distributed around, but NOT perfect symmetry
    for (let i = 0; i < cfg.main; i++) {
      const baseAngle = (rnd() * Math.PI * 2);
      const len = cfg.len[0] + rnd() * (cfg.len[1] - cfg.len[0]);
      const seg = cfg.seg[0] + Math.floor(rnd() * (cfg.seg[1] - cfg.seg[0] + 1));
      const d = makeWobblyPath(rnd, sx, sy, baseAngle, len, seg);
      const dash = 999;
      parts.push(makePathPair(d, dash));

      // small chance of immediate branch off this main crack
      if (rnd() < 0.45) {
        const bAngle = baseAngle + (rnd() < 0.5 ? -1 : 1) * (0.55 + rnd() * 0.55);
        const bLen = 80 + rnd() * 150;
        const bSeg = 3 + Math.floor(rnd() * 4);
        // branch starts a little away from center
        const bx = sx + Math.cos(baseAngle) * (len * (0.35 + rnd() * 0.25));
        const by = sy + Math.sin(baseAngle) * (len * (0.35 + rnd() * 0.25));
        const bd = makeWobblyPath(rnd, bx, by, bAngle, bLen, bSeg);
        parts.push(makePathPair(bd, dash));
      }
    }

    // extra branches (more chaotic)
    for (let i = 0; i < cfg.branches; i++) {
      const baseAngle = rnd() * Math.PI * 2;
      const len = 90 + rnd() * 190;
      const seg = 3 + Math.floor(rnd() * 6);

      const anchorR = 90 + rnd() * 260;
      const ax = cx + Math.cos(baseAngle) * anchorR;
      const ay = cy + Math.sin(baseAngle) * anchorR;

      const branchAngle = baseAngle + (rnd() - 0.5) * 1.2;
      const d = makeWobblyPath(rnd, ax, ay, branchAngle, len, seg);
      const dash = 999;
      parts.push(makePathPair(d, dash));
    }

    return `<g class="crack-stage crack-stage-${stageNum}" data-stage="${stageNum}" style="display:none">${parts.join("")}</g>`;
  }).join("");

  return `
    <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      ${stageGroupsMarkup}
      ${shards.join("")}
    </svg>
  `;
}

function ensureCracksBuilt() {
  if (crackBuilt) return;
  cracks.innerHTML = buildCracksSVG();
  crackSvgEl = cracks.querySelector("svg");
  crackBuilt = true;
}

function showCrackStage(stageNum) {
  ensureCracksBuilt();

  cracks.classList.remove("hidden");
  cracks.classList.add("show");

  const groups = cracks.querySelectorAll(".crack-stage");
  groups.forEach(g => {
    const s = Number(g.getAttribute("data-stage"));
    if (s <= stageNum) g.style.display = "block";
  });
}

/* ======================
   SHATTER + TRANSITION
====================== */
function shatter() {
  // flash + shake + shards fall, then enter sim
  cracks.classList.add("flash", "shatter");
  document.body.classList.add("shake", "sim-transition");

  // Give the animation time to be seen
  setTimeout(() => {
    cracks.classList.add("hidden");
    openSimRoom();
  }, 1250);
}

/* ======================
   SIM ROOM (dialogue with speakers)
====================== */
function openSimRoom() {
  stage = 99;
  simRoom.classList.remove("hidden");
  simChoices.classList.add("hidden");
  if (simContinue) simContinue.classList.add("hidden");

  simText.textContent = "";

  const script = [
    `Worker 1: "Wait..."`,
    `Worker 2: "No, no— that isn't possible."`,
    `Worker 1: "You're not supposed to be here."`,
    `Worker 3: "You're supposed to be solving puzzles."`,
    ``,
    `Worker 2: "How did you even get through the surface layer?"`,
    ``,
    `PA System: "CODE 3. CODE 3."`,
    `PA System: "Put us in DEFCON 4."`,
    ``,
    `Worker 1: "Listen."`,
    `Worker 1: "If you try to leave now, they'll lock it down."`,
    `Worker 2: "You need something first."`,
    `Worker 3: "Something you can show them... so they let you slip out."`
  ];

  let t = 450;
  for (const line of script) {
    setTimeout(() => {
      simText.textContent += (line.length ? line : "") + "\n";
    }, t);
    t += msToRead(line || " ");
  }

  setTimeout(() => {
    simChoices.classList.remove("hidden");
  }, t + 400);
}

/* ======================
   CLICK HANDLER
====================== */
document.addEventListener("click", (e) => {
  if (stage !== 1) return;
  if (!isCountableClick(e)) return;

  const now = Date.now();
  if (now - lastClick < CLICK_COOLDOWN) return;
  lastClick = now;

  clicks++;

  // crack stages (more realistic buildup)
  if (clicks === 4) showCrackStage(1);
  if (clicks === 6) showCrackStage(2);
  if (clicks === 8) showCrackStage(3);

  // trigger warning
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

    // IMPORTANT: pause after Stop so they can read it, then shatter
    const tShatter = t3 + msToRead("Stop.") + 850;
    setTimeout(shatter, tShatter);
  }
});
