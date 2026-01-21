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
// INTERACTION + PERSONAL ESCALATION
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

let bgClicks = 0;
let lastClickAt = 0;
let stage = 1;
let postStopClicks = 0;
let timers = [];

function clearTimers() {
  timers.forEach(t => clearTimeout(t));
  timers = [];
}

function isEmptyClick(e) {
  const tag = e.target?.tagName?.toLowerCase();
  return !["img", "p", "h1", "h2", "input", "button", "label", "pre"].includes(tag);
}

wrap.addEventListener("click", e => {
  if (!isEmptyClick(e)) return;

  const now = Date.now();
  if (now - lastClickAt < 180) return;
  lastClickAt = now;

  // -------- STAGE 1 --------
  if (stage === 1) {
    bgClicks++;

    if (bgClicks === 3) {
      document.body.style.transform = "translateX(1px)";
      setTimeout(() => document.body.style.transform = "", 50);
    }

    if (bgClicks >= 5) {
      stage = 2;
      systemBox.classList.remove("hidden");
      clearTimers();

      l1.textContent = "That isn’t how this page is supposed to be used.";
      timers.push(setTimeout(() => l2.textContent = "You weren’t meant to interact with this.", 1800));
      timers.push(setTimeout(() => l3.textContent = "Stop.", 3200));

      timers.push(setTimeout(() => {
        finish.classList.remove("hidden");
        finish.scrollIntoView({ behavior: "smooth" });
      }, 5200));
    }
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
      if (systemBox.querySelector("button")) return;

      const btn = document.createElement("button");
      btn.textContent = "fine. come here.";
      btn.style.marginTop = "12px";

      btn.onclick = () => {
        l1.textContent = "…okay. don’t touch anything.";
        l2.textContent = "if someone asks, you were never here.";
        l3.textContent = "";
        btn.remove();
      };

      systemBox.appendChild(btn);
    }, 4300));
  }
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
`You escaped the simulation and may proceed.

verification:
${data.token}`;
    result.classList.remove("hidden");
  } catch (err) {
    result.textContent = `error: ${err.message}`;
    result.classList.remove("hidden");
  } finally {
    submitBtn.disabled = false;
  }
});
