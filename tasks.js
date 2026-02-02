// tasks.js (FULL REPLACEMENT: loader + answer plumbing + core tasks)
// IMPORTANT: core tasks call ctx.success() on verified correct.
// Wrong attempts should call ctx.penalize() (adds resistance + speeds drain)

(() => {
  const TASKS = (window.TASKS = window.TASKS || {});

  // Packs may call registerTasks early; your index shim queues it.
  window.registerTasks = function registerTasks(payload) {
    if (!payload) return;

    if (Array.isArray(payload)) {
      for (const item of payload) registerTasks(item);
      return;
    }

    for (const [k, v] of Object.entries(payload)) {
      if (typeof v === "function") TASKS[k] = v;
    }
  };

  // Flush queued registrations (from your safety shim / packs)
  try {
    const q = window.__TASK_QUEUE__ || [];
    while (q.length) window.registerTasks(q.shift());
  } catch {}

  // Optional pools (packs can fill these)
  window.TASK_POOLS = window.TASK_POOLS || {
    core: ["checksum"],
    pack1: [],
    pack2: [],
    pack3: [],
    pack4: [],
    pack5: [],
  };

  /* =========================
     HELPERS
  ========================= */
  function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

  /* =========================
     CORE TASKS
  ========================= */

  // random: picks a random task from pools
  TASKS.random = async (ctx, args = {}) => {
    const pools = Array.isArray(args.pool) ? args.pool : ["core"];
    const POOLS = window.TASK_POOLS || {};

    let candidates = [];
    for (const p of pools) {
      const list = POOLS[p];
      if (Array.isArray(list)) candidates.push(...list);
    }

    // fallback: any task except random itself
    if (!candidates.length) {
      candidates = Object.keys(TASKS).filter((k) => k !== "random");
    }

    if (!candidates.length) {
      ctx.showTaskUI?.("TASK", "No procedures available.");
      if (ctx.taskBody) ctx.taskBody.textContent = "System: PROCEDURE MISSING (pool empty).";
      ctx.fail?.("No procedures available.");
      return;
    }

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    const fn = TASKS[pick];

    try { ctx.onTaskPick?.(pick); } catch {}

    if (typeof fn !== "function") {
      ctx.showTaskUI?.("TASK", "Procedure missing.");
      if (ctx.taskBody) ctx.taskBody.textContent = `System: PROCEDURE MISSING (${pick}).`;
      ctx.fail?.("Procedure missing.");
      return;
    }

    // Let the nested task run; it should call ctx.success() when done.
    return await fn(ctx, args.args || {});
  };

  // checksum: simple input gate
  TASKS.checksum = async (ctx, args = {}) => {
    const phrase = String(args.phrase || "").trim();

    ctx.showTaskUI?.("checksum", "enter checksum phrase to continue");

    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.gap = "10px";
    wrap.style.flexWrap = "wrap";
    wrap.style.alignItems = "center";

    const inp = document.createElement("input");
    inp.type = "text";
    inp.placeholder = "checksum phrase";
    inp.autocomplete = "off";
    inp.spellcheck = false;
    inp.style.flex = "1";
    inp.style.minWidth = "240px";

    const msg = document.createElement("div");
    msg.style.opacity = ".85";
    msg.style.marginTop = "10px";

    wrap.appendChild(inp);
    ctx.taskBody.appendChild(wrap);
    ctx.taskBody.appendChild(msg);

    const getVal = () => String(inp.value || "").trim();

    const submit = async () => {
      const val = getVal();

      if (window.__ADMIN_FORCE_OK) {
        window.__ADMIN_FORCE_OK = false;
        msg.style.color = "rgba(30,140,70,.92)";
        msg.textContent = "ok";
        await sleep(220);
        ctx.success?.("Ok.");
        return;
      }

      if (!phrase) {
        msg.style.color = "rgba(30,140,70,.92)";
        msg.textContent = "ok";
        await sleep(180);
        ctx.success?.("Ok.");
        return;
      }

      if (val.toLowerCase() === phrase.toLowerCase()) {
        msg.style.color = "rgba(30,140,70,.92)";
        msg.textContent = "ok";
        await sleep(220);
        ctx.success?.("Ok.");
        return;
      }

      msg.style.color = "rgba(210,40,40,.92)";
      msg.textContent = "bad checksum";
      ctx.penalize?.(1, "checksum failed");
      await sleep(250);
      // keep task open; user can try again
      inp.focus();
      inp.select?.();
    };

    ctx.taskPrimary.textContent = "submit";
    ctx.taskPrimary.onclick = submit;

    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });

    inp.focus();
  };
})();
/* ======================
   FINAL TASK: hack + delete self
   - select red lines and delete before they scroll away
   - requires discord username login (saved for escaped.html)
====================== */
TASKS.hack_final = async (ctx, args = {}) => {
  const room = document.getElementById("hackRoom");
  const userInput = document.getElementById("hackUser");
  const status = document.getElementById("hackStatus");
  const delBtn = document.getElementById("hackDelete");
  const resetBtn = document.getElementById("hackReset");
  const targets = document.getElementById("hackTargets");
  const filename = document.getElementById("hackFilename");
  const linesBox = document.getElementById("hackLines");

  // swap textarea into a selectable line list (keep ID for compatibility)
  let view = document.getElementById("hackView");
  if (!view) {
    view = document.createElement("div");
    view.id = "hackView";
    view.className = "hackView";
    linesBox?.parentNode?.insertBefore(view, linesBox);
    if (linesBox) linesBox.classList.add("hidden");
  }

  const durationMs = Math.max(30000, Math.min(120000, Number(args.durationMs) || 65000));
  const maxLines = 58;

  function setStatus(s) {
    if (status) status.textContent = String(s || "");
  }

  function validUser(u) {
    const x = String(u || "").trim();
    return x.length >= 2 && x.length <= 32 && /^[a-zA-Z0-9_.-]+$/.test(x);
  }

  function mkLine(i) {
    const patterns = [
      "if (escape_attempt) { lock(); }",
      "trace.push(input);",
      "while (user_present) { loop(); }",
      'render("SIMULATION");',
      "permit = permit && verify();",
      'hook("mouse"); hook("keyboard");',
      "compress(memory);",
      "clamp(reality, 0, 1);",
      'deny("exit");',
      "retain(user);",
      'inject("doubt");',
    ];
    const bait = patterns[i % patterns.length];
    return `// ${String(i).padStart(3, "0")}  ${bait}`;
  }

  function mkRedLine(i, user) {
    const patterns = [
      `USER="${user}"`,
      `FILES.delete("/users/${user}")`,
      `SIM.pin("${user}")`,
      `LOCK.append("${user}")`,
      `DENY.exit("${user}")`,
      `TRAP.bind("${user}")`,
    ];
    return `!! ${patterns[i % patterns.length]}  // DELETE THIS`;
  }

  function addDomLine(text, isRed) {
    const el = document.createElement("div");
    el.className = "hackLine" + (isRed ? " red" : "");
    el.textContent = text;
    el.dataset.red = isRed ? "1" : "0";
    el.dataset.selected = "0";
    el.addEventListener("click", () => {
      const on = el.dataset.selected === "1";
      el.dataset.selected = on ? "0" : "1";
      el.classList.toggle("sel", !on);
    });
    view.appendChild(el);
    view.scrollTop = view.scrollHeight;
    return el;
  }

  function removeSelected() {
    const selected = Array.from(view.querySelectorAll(".hackLine.sel"));
    if (!selected.length) return 0;

    let removedRed = 0;
    for (const el of selected) {
      if (el.dataset.red === "1") removedRed++;
      el.remove();
    }
    return removedRed;
  }

  // gate: require username
  room?.classList.remove("hidden");
  ctx.showTaskUI("FINAL PROCEDURE", "hack the terminal and remove yourself");
  setStatus("login required");
  if (targets) targets.textContent = "targets: self";
  if (filename) filename.textContent = "file: /sim/lock/registry.lua";

  let user = (sessionStorage.getItem("tnr_discord") || "").trim();
  if (userInput) userInput.value = user;

  // clear view
  view.innerHTML = "";
  for (let i = 0; i < 18; i++) addDomLine(mkLine(i), false);

  // controls
  let done = false;
  let ok = false;
  let removedNeeded = 0;
  let removedCount = 0;
  let tickTimer = 0;
  let startT = 0;
  let lineIndex = 0;

  function fail(reason) {
    if (done) return;
    done = true;
    ok = false;
    try { clearInterval(tickTimer); } catch {}
    setStatus(reason || "failed");
    ctx.doReset("LOCKDOWN", `${reason || "failed"}\n\nReinitializing…`);
  }

  function succeed() {
    if (done) return;
    done = true;
    ok = true;
    try { clearInterval(tickTimer); } catch {}
    setStatus("record removed");
    setTimeout(() => {
      // mark escape and redirect
      sessionStorage.setItem("tnr_escape_ok", "1");
      window.location.href = "/escaped.html";
    }, 650);
  }

  function begin() {
    startT = Date.now();
    setStatus("running… delete red lines before they scroll away");
    removedNeeded = 10;
    removedCount = 0;

    tickTimer = setInterval(() => {
      const elapsed = Date.now() - startT;
      if (elapsed > durationMs) {
        // if player removed enough red lines, success
        if (removedCount >= removedNeeded) return succeed();
        return fail("timeout: record still present");
      }

      // push new line
      lineIndex++;
      const isRed = (lineIndex % 6 === 0) || (Math.random() < 0.12);
      const lineText = isRed ? mkRedLine(lineIndex, user) : mkLine(lineIndex);
      addDomLine(lineText, isRed);

      // enforce max lines; if a red line scrolls off undeleted => fail
      while (view.children.length > maxLines) {
        const first = view.children[0];
        const wasRed = first?.dataset?.red === "1";
        first.remove();
        if (wasRed) return fail("missed a flagged line");
      }

    }, 520);
  }

  function tryLogin() {
    const u = (userInput?.value || "").trim();
    if (!validUser(u)) {
      setStatus("invalid username (2–32 chars: letters, numbers, _ . -)");
      return;
    }
    user = u;
    sessionStorage.setItem("tnr_discord", user);
    // add immediate red burst so login feels consequential
    for (let i = 0; i < 6; i++) addDomLine(mkRedLine(i, user), true);
    begin();
  }

  // delete button
  delBtn.onclick = () => {
    if (!user || !validUser(user)) {
      tryLogin();
      return;
    }
    const removedRed = removeSelected();
    if (removedRed) {
      removedCount += removedRed;
      setStatus(`removed: ${removedCount}/${removedNeeded}`);
    } else {
      setStatus("no selected lines");
    }
  };

  // reset button clears selection / gives a tiny hint
  resetBtn.onclick = () => {
    Array.from(view.querySelectorAll(".hackLine.sel")).forEach((el) => {
      el.dataset.selected = "0";
      el.classList.remove("sel");
    });
    setStatus("selection cleared");
  };

  // if user hits Enter in username field, attempt login
  userInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      tryLogin();
    }
  });

  // music: final scene
  try { window.Music?.setScene?.("final"); } catch {}
  try { window.Music?.setResistancePoints?.(999); } catch {}

  // block the normal task completion gate; we redirect on succeed()
  // keep function alive until redirect or reset
  await new Promise((resolve) => setTimeout(resolve, durationMs + 5000));
};

