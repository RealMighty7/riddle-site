// ---------------------------
// STATE 1: "Wrong place" page
// Option 3: clicking empty space 7 times
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
let triggered = false;
let lastClickAt = 0;

let stage = 1;            // 1 = landing, 2 = warning shown, 3 = personal mode
let postStopClicks = 0;   // clicks after "Stop."
let personalTimeouts = [];

function clearPersonalTimers() {
  for (const t of personalTimeouts) clearTimeout(t);
  personalTimeouts = [];
}

function isClickOnEmptySpace(e) {
  // Treat clicks on images/text/inputs/buttons as NOT empty space
  const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
  if (["img", "p", "h1", "h2", "input", "button", "label", "pre"].includes(tag)) return false;
  // also treat clicks inside cards as allowed, as long as not on interactive elements
  return true;
}

wrap.addEventListener("click", (e) => {
  if (triggered) return;
  if (!isClickOnEmptySpace(e)) return;

  const now = Date.now();
  if (now - lastClickAt < 180) return; // mild debounce
  lastClickAt = now;

  bgClicks += 1;

if (bgClicks === 3) {
  // subtle flicker to make them question it
  document.body.style.transform = "translateX(1px)";
  setTimeout(() => (document.body.style.transform = ""), 50);
}

if (bgClicks === 3) {
  // subtle flicker to make them question it
  document.body.style.transform = "translateX(1px)";
  setTimeout(() => (document.body.style.transform = ""), 50);
}

if (!triggered && bgClicks >= 5) {
  triggered = true;
  stage = 2;

  systemBox.classList.remove("hidden");
  l1.textContent = "That isn’t how this page is supposed to be used.";
  personalTimeouts.push(setTimeout(() => { l2.textContent = "You weren’t meant to interact with this."; }, 1800));
  personalTimeouts.push(setTimeout(() => { l3.textContent = "Stop."; }, 3200));

  // Reveal completion area later (keep this for now)
  personalTimeouts.push(setTimeout(() => {
    finish.classList.remove("hidden");
    finish.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 5200));

  return;
}

// ---------------------------
// STATE 3: Personal reaction
// After "Stop.", one more empty click triggers "someone is watching" mode
// ---------------------------
if (stage === 2) {
  postStopClicks += 1;

  // Wait until the "Stop." line has appeared before reacting personally
  const stopIsVisible = (l3.textContent || "").trim().length > 0;
  if (!stopIsVisible) return;

  if (postStopClicks >= 1) {
    stage = 3;
    clearPersonalTimers();

    // Replace lines with personal dialogue
    l1.textContent = "...";
    l2.textContent = "";
    l3.textContent = "";

    personalTimeouts.push(setTimeout(() => { l1.textContent = "Hey."; }, 900));
    personalTimeouts.push(setTimeout(() => { l2.textContent = "Why are you still clicking?"; }, 1800));
    personalTimeouts.push(setTimeout(() => { l3.textContent = "You can’t be here."; }, 2700));
    personalTimeouts.push(setTimeout(() => { l3.textContent = "Don’t make me report this."; }, 3600));

    // Add a single "come here" button after the last line
    personalTimeouts.push(setTimeout(() => {
      const btn = document.createElement("button");
      btn.textContent = "fine. come here.";
      btn.style.marginTop = "12px";

      btn.addEventListener("click", () => {
        // Next chapter placeholder
        l1.textContent = "…okay. don’t touch anything.";
        l2.textContent = "if someone asks, you were never here.";
        l3.textContent = "";
        btn.remove();
      });

      systemBox.appendChild(btn);
    }, 4300));
  }
}


// ---------------------------
// Completion submit -> calls /api/complete (hosted on Vercel)
// ---------------------------
submitBtn.addEventListener("click", async () => {
  const name = (discordName.value || "").trim();
  if (!name) return;

  submitBtn.disabled = true;
  result.classList.add("hidden");
  result.textContent = "";

  try {
    const res = await fetch("/api/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ discord: name })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Request failed");

    result.textContent =
`You escaped the simulation and may proceed.

verification:
${data.token}`;
    result.classList.remove("hidden");
  } catch (err) {
    result.textContent = `error: ${String(err.message || err)}`;
    result.classList.remove("hidden");
  } finally {
    submitBtn.disabled = false;
  }
});

