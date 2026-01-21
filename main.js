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

  if (bgClicks === 4) {
    // single-frame-ish micro flicker
    document.body.style.transform = "translateX(1px)";
    setTimeout(() => (document.body.style.transform = ""), 50);
  }

  if (bgClicks >= 7) {
    triggered = true;
    systemBox.classList.remove("hidden");
    l1.textContent = "That isn’t how this page is supposed to be used.";
    setTimeout(() => (l2.textContent = "You weren’t meant to interact with this."), 2000);
    setTimeout(() => (l3.textContent = "Stop."), 3600);

    // Reveal completion area after a short pause (later this becomes your next “phase”)
    setTimeout(() => {
      finish.classList.remove("hidden");
      finish.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 5200);
  }
});

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

