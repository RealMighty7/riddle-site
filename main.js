// ---------------------------
// RANDOM IMAGE POOL (12 images, can repeat)
// ---------------------------
const IMAGE_POOL = Array.from({ length: 12 }, (_, i) => `/assets/img${i + 1}.jpg`);

function randomImage() {
  return IMAGE_POOL[Math.floor(Math.random() * IMAGE_POOL.length)];
}

function populateImages() {
  document.querySelectorAll(".grid img").forEach(img => {
    img.src = randomImage();
  });
}

populateImages();

// ---------------------------
// MAIN PAGE INTERACTION
// ---------------------------
const wrap = document.getElementById("wrap");
const systemBox = document.getElementById("system");
const l1 = document.getElementById("l1");
const l2 = document.getElementById("l2");
const l3 = document.getElementById("l3");

const finish = document.getElementById("finish");
const submitBtn = document.getElementById("submitBtn");
const discordName = document.getElementById("discordName");
const result = document.getElementById("result");

// Simulation room elements
const simRoom = document.getElementById("simRoom");
const simText = document.getElementById("simText");
const simChoices = document.getElementById("simChoices");
const simContinue = document.getElementById("simContinue");
const choiceNeed = document.getElementById("choiceNeed");
const choiceLie = document.getElementById("choiceLie");
const choiceRun = document.getElementById("choiceRun");
const btnProceed = document.getElementById("btnProceed");

let bgClicks = 0;
let lastClickAt = 0;
let stage = 1;            // 1 = landing, 2 = warning, 3 = personal, 4 = sim room
let postStopClicks = 0;

let timers = [];

// ---------------------------
// CRACK EFFECT (builds in stages, random positions)
// ---------------------------
const cracks = document.getElementById("cracks");

let crackStage = 0; // 0..3
let crackSeed = Math.random();

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function makeCrackSVG() {
  // Simple hand-drawn crack lines (SVG)
  const stroke = "rgba(255,255,255,0.65)";
  const stroke2 = "rgba(0,0,0,0.25)";
  return `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <path d="M105 10 L90 40 L110 70 L80 100 L120 140 L95 180"
        fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M105 10 L92 38 L112 72 L82 102 L118 142 L97 182"
        fill="none" stroke="${stroke2}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.35"/>

  <path d="M90 40 L55 55 L70 80"
        fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M110 70 L150 85 L135 105"
        fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M80 100 L45 120 L70 140"
        fill="none" stroke="${stroke}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M120 140 L155 155 L135 175"
        fill="none" stroke="${stroke}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

function addCrackPiece() {
  cracks.classList.remove("hidden");
  cracks.classList.add("show");

  const holder = document.createElement("div");
  holder.className = "crack-pop";
  holder.innerHTML = makeCrackSVG();

  // random-ish placement, not where user clicks
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const x = rand(vw * 0.15, vw * 0.75);
  const y = rand(vh * 0.12, vh * 0.70);
  const rot = rand(-25, 25);
  const scale = rand(0.75, 1.15);

  const svg = holder.querySelector("svg");
  svg.style.left = `${x}px`;
  svg.style.top = `${y}px`;
  svg.style.transform = `translate(-50%, -50%) rotate(${rot}deg) scale(${scale})`;

  cracks.appendChild(svg);

  // prevent infinite buildup
  if (cracks.childElementCount > 7) {
    cracks.removeChild(cracks.firstElementChild);
  }
}

function advanceCracks() {
  crackStage++;
  // add 1–2 pieces each stage
  addCrackPiece();
  if (Math.random() < 0.55) addCrackPiece();
}


function clearTimers() {
  timers.forEach(t => clearTimeout(t));
  timers = [];
}

function isEmptyClick(e) {
  const t = e.target;
  if (!t) return true;

  // Ignore clicks on actual interactive elements / typing areas / images
  if (t.closest("button, input, textarea, select, label, a, pre, img")) return false;

  // Everything else counts (cards, backgrounds, margins, etc.)
  return true;
}


function typeLineAppend(text, delay = 0) {
  timers.push(setTimeout(() => {
    simText.textContent += text + "\n";
  }, delay));
}

function openSimRoom() {
  // hide cracks once we leave the normal page
  cracks.classList.add("hidden");
  cracks.classList.remove("show");
  cracks.innerHTML = "";
  stage = 4;
  simRoom.classList.remove("hidden");
  simText.textContent = "";
  simChoices.classList.add("hidden");
  simContinue.classList.add("hidden");
  simRoom.classList.remove("alerting");

  // Cutscene script (personal)
  typeLineAppend("...", 200);
  typeLineAppend("hey—", 900);
  typeLineAppend("you aren’t supposed to be here.", 1500);
  typeLineAppend("this isn’t part of the puzzle.", 2200);
  typeLineAppend("", 2500);
  typeLineAppend("wait.", 2900);
  typeLineAppend("how did you even get through?", 3400);

  // Alarm escalation (still personal, but panicking)
  timers.push(setTimeout(() => { simRoom.classList.add("alerting"); }, 4200));
  typeLineAppend("", 4300);
  typeLineAppend("code 3. CODE 3.", 4600);
  typeLineAppend("no— don’t say it like that.", 5100);
  typeLineAppend("stop calling it a code.", 5600);
  typeLineAppend("…they’re going to hear you.", 6200);
  typeLineAppend("", 6600);
  typeLineAppend("listen.", 7000);
  typeLineAppend("if you try to leave now, they’ll lock it.", 7500);
  typeLineAppend("you need something first.", 8100);
  typeLineAppend("something you can show them so they let you pass.", 8700);

  // Stop flashing and show choices
  timers.push(setTimeout(() => {
    simRoom.classList.remove("alerting");
    simChoices.classList.remove("hidden");
  }, 9400));
}

document.addEventListener("click", (e) => {
  if (!isEmptyClick(e)) return;

  const now = Date.now();
  const CLICK_COOLDOWN_MS = 650;
  if (now - lastClickAt < CLICK_COOLDOWN_MS) return;
  lastClickAt = now;

  // -------- STAGE 1 --------
if (stage === 1) {
  bgClicks++;

  // crack stages (not on every click)
  // happens BEFORE the warning text, so it feels like they are "damaging" the page
  if (bgClicks === 4) advanceCracks();
  if (bgClicks === 6) advanceCracks();
  if (bgClicks === 8) advanceCracks();

  if (bgClicks === 3) {
    document.body.style.transform = "translateX(1px)";
    setTimeout(() => document.body.style.transform = "", 50);
  }

  if (bgClicks >= 9) {
    // Now show the Stage 2 warning and keep it as the last normal-page thing
    stage = 2;
    systemBox.classList.remove("hidden");
    clearTimers();

    l1.textContent = "That isn’t how this page is supposed to be used.";
    timers.push(setTimeout(() => { l2.textContent = "You weren’t meant to interact with this."; }, 2600));
    timers.push(setTimeout(() => { l3.textContent = "Stop."; }, 5200));
    
    // After "Stop.", final crack spike then break into sim room
  timers.push(setTimeout(() => {
    advanceCracks();
    setTimeout(() => openSimRoom(), 600);
  }, 6100));

  

    return;
  }

  return;
}


if (bgClicks >= 5) {
  stage = 2;
  systemBox.classList.remove("hidden");
  clearTimers();

  l1.textContent = "That isn’t how this page is supposed to be used.";
  timers.push(setTimeout(() => {
    l2.textContent = "You weren’t meant to interact with this.";
  }, 1800));

  timers.push(setTimeout(() => {
    l3.textContent = "Stop.";
  }, 3200));

  // IMPORTANT: Stage 2 is the LAST thing on this page.
  // After a short pause, transition into the simulation room (personal scene).
  timers.push(setTimeout(() => {
    openSimRoom(); // <-- your overlay cutscene starts here
  }, 4200));

  return;
}


  // -------- STAGE 2 → 3 --------
  if (stage === 2 && l3.textContent.trim()) {
    postStopClicks++;
    if (postStopClicks < 1) return;

    stage = 3;
    clearTimers();

    l1.textContent = "...";
    l2.textContent = "";
    l3.textContent = "";

    timers.push(setTimeout(() => l1.textContent = "Hey.", 900));
    timers.push(setTimeout(() => l2.textContent = "Why are you still clicking?", 1800));
    timers.push(setTimeout(() => l3.textContent = "You can’t be here.", 2700));
    timers.push(setTimeout(() => l3.textContent = "Don’t make me report this.", 3600));

    timers.push(setTimeout(() => {
      if (systemBox.querySelector("button[data-come-here='1']")) return;

      const btn = document.createElement("button");
      btn.textContent = "fine. come here.";
      btn.dataset.comeHere = "1";
      btn.style.marginTop = "12px";

      btn.onclick = () => {
        // Transition into simulation room
        l1.textContent = "";
        l2.textContent = "";
        l3.textContent = "";
        btn.remove();

        openSimRoom();
      };

      systemBox.appendChild(btn);
    }, 4300));
  }
});

// ---------------------------
// SIM ROOM CHOICES
// ---------------------------
choiceNeed.addEventListener("click", () => {
  simChoices.classList.add("hidden");
  simText.textContent += "\n";
  simText.textContent += "good.\n";
  simText.textContent += "say it like you mean it.\n";
  simText.textContent += "you were looking for answers, not trouble.\n";
  simText.textContent += "\n";
  simText.textContent += "take this. it’s proof you were sent.\n";
  simText.textContent += "once you have it, they’ll let you slip out.\n";

  simContinue.classList.remove("hidden");
});

choiceLie.addEventListener("click", () => {
  simChoices.classList.add("hidden");
  simText.textContent += "\n";
  simText.textContent += "no.\n";
  simText.textContent += "you don’t ‘accidentally’ push on a wall until it opens.\n";
  simText.textContent += "don’t insult me.\n";

  simContinue.classList.remove("hidden");
});

choiceRun.addEventListener("click", () => {
  simChoices.classList.add("hidden");
  simText.textContent += "\n";
  simText.textContent += "don’t.\n";
  simText.textContent += "if you run now, you’ll get reset.\n";
  simText.textContent += "and i won’t remember you.\n";

  simContinue.classList.remove("hidden");
});

// Proceed button: reveal completion panel in-universe
btnProceed.addEventListener("click", () => {
  simText.textContent += "\n";
  simText.textContent += "you escaped the simulation and may proceed.\n";
  simText.textContent += "enter your discord username below.\n";

  // Scroll the old completion panel into view (still on main page)
  simRoom.classList.add("hidden");
  finish.classList.remove("hidden");
  finish.scrollIntoView({ behavior: "smooth" });
});

// ---------------------------
// COMPLETION SUBMIT → BACKEND
// ---------------------------
submitBtn.addEventListener("click", async () => {
  const name = discordName.value.trim();
  if (!name) return;

  submitBtn.disabled = true;
  result.classList.add("hidden");

  try {
    const res = await fetch("/api/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discord: name })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed");

    result.textContent =
`verification:
${data.token}`;
    result.classList.remove("hidden");
  } catch (err) {
    result.textContent = `error: ${err.message}`;
    result.classList.remove("hidden");
  } finally {
    submitBtn.disabled = false;
  }
});
