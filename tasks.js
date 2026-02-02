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
    pack1: ["pulse"],
    pack2: ["align"],
    pack3: ["mirror"],
    pack4: ["hold"],
    pack5: ["scrub"],
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


  /* ======================
     CORE TASKS (simple)
  ====================== */
  // pulse: click N times
  TASKS.pulse = async (ctx, args = {}) => {
    const need = Math.max(6, Math.min(18, Number(args.need) || 10));
    let n = 0;

    ctx.showTaskUI?.("pulse", `click ${need} times`);

    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.gap = "10px";
    row.style.alignItems = "center";
    row.style.flexWrap = "wrap";

    const btn = document.createElement("button");
    btn.className = "sim-btn";
    btn.type = "button";
    btn.textContent = "pulse";

    const stat = document.createElement("div");
    stat.className = "muted";
    stat.textContent = `0 / ${need}`;

    row.appendChild(btn);
    row.appendChild(stat);
    ctx.taskBody.appendChild(row);

    btn.onclick = () => {
      n += 1;
      stat.textContent = `${n} / ${need}`;
      if (n >= need) ctx.success?.("Ok.");
    };

    ctx.taskPrimary.textContent = "reset";
    ctx.taskPrimary.onclick = () => { n = 0; stat.textContent = `0 / ${need}`; };
  };

  // align: set slider to target band
  TASKS.align = async (ctx, args = {}) => {
    const target = Math.max(15, Math.min(85, Number(args.target) || (25 + Math.floor(Math.random()*50))));
    const tol = Math.max(2, Math.min(10, Number(args.tol) || 5));

    ctx.showTaskUI?.("align", "set the slider into the band");

    const wrap = document.createElement("div");
    wrap.style.display = "grid";
    wrap.style.gap = "10px";

    const info = document.createElement("div");
    info.className = "muted";
    info.textContent = `target: ${target} ± ${tol}`;

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = "100";
    slider.value = String(Math.floor(Math.random()*100));

    const readout = document.createElement("div");
    readout.textContent = `value: ${slider.value}`;

    wrap.appendChild(info);
    wrap.appendChild(slider);
    wrap.appendChild(readout);
    ctx.taskBody.appendChild(wrap);

    const check = () => {
      const v = Number(slider.value);
      readout.textContent = `value: ${v}`;
      if (Math.abs(v - target) <= tol) ctx.success?.("Aligned.");
    };

    slider.addEventListener("input", check);
    check();

    ctx.taskPrimary.textContent = "confirm";
    ctx.taskPrimary.onclick = check;
  };

  // mirror: type reversed token
  TASKS.mirror = async (ctx, args = {}) => {
    const token = String(args.token || "mirror").trim();
    const answer = token.split("").reverse().join("");

    ctx.showTaskUI?.("mirror", "type the reflected token");

    const line = document.createElement("div");
    line.className = "muted";
    line.textContent = `token: ${token}`;

    const inp = document.createElement("input");
    inp.type = "text";
    inp.placeholder = "reflected token";
    inp.autocomplete = "off";
    inp.spellcheck = false;

    const msg = document.createElement("div");
    msg.className = "muted";

    ctx.taskBody.appendChild(line);
    ctx.taskBody.appendChild(inp);
    ctx.taskBody.appendChild(msg);

    const submit = () => {
      const v = String(inp.value || "").trim();
      if (v === answer) return ctx.success?.("Ok.");
      msg.textContent = "not reflected";
      ctx.penalize?.(1, "mirror failed");
      inp.focus();
      inp.select?.();
    };

    ctx.taskPrimary.textContent = "submit";
    ctx.taskPrimary.onclick = submit;
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    inp.focus();
  };

  // hold: press and hold a button for ms
  TASKS.hold = async (ctx, args = {}) => {
    const needMs = Math.max(900, Math.min(3000, Number(args.ms) || 1600));

    ctx.showTaskUI?.("hold", "press and hold");

    const btn = document.createElement("button");
    btn.className = "sim-btn";
    btn.type = "button";
    btn.textContent = "hold";

    const stat = document.createElement("div");
    stat.className = "muted";
    stat.textContent = `0 / ${needMs}ms`;

    ctx.taskBody.appendChild(btn);
    ctx.taskBody.appendChild(stat);

    let t0 = 0;
    let raf = 0;

    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      t0 = 0;
    };

    const tick = () => {
      if (!t0) return;
      const d = Date.now() - t0;
      stat.textContent = `${d} / ${needMs}ms`;
      if (d >= needMs) {
        stop();
        return ctx.success?.("Ok.");
      }
      raf = requestAnimationFrame(tick);
    };

    btn.addEventListener("pointerdown", () => {
      t0 = Date.now();
      stat.textContent = `0 / ${needMs}ms`;
      tick();
    });
    const end = () => stop();
    btn.addEventListener("pointerup", end);
    btn.addEventListener("pointercancel", end);
    btn.addEventListener("pointerleave", end);

    ctx.taskPrimary.textContent = "cancel";
    ctx.taskPrimary.onclick = () => { stop(); stat.textContent = `0 / ${needMs}ms`; };
  };

  // scrub: check all boxes
  TASKS.scrub = async (ctx, args = {}) => {
    ctx.showTaskUI?.("scrub", "clear all flags");

    const count = Math.max(3, Math.min(7, Number(args.count) || 5));
    const wrap = document.createElement("div");
    wrap.style.display = "grid";
    wrap.style.gap = "8px";

    const boxes = [];
    for (let i=0;i<count;i++){
      const row=document.createElement("label");
      row.style.display="flex";
      row.style.gap="8px";
      row.style.alignItems="center";

      const cb=document.createElement("input");
      cb.type="checkbox";
      cb.checked=false;

      const t=document.createElement("span");
      t.textContent=`flag_${String(i+1).padStart(2,"0")}`;

      row.appendChild(cb);
      row.appendChild(t);
      wrap.appendChild(row);
      boxes.push(cb);
    }

    ctx.taskBody.appendChild(wrap);

    const check=()=>{
      if (boxes.every(b=>b.checked)) ctx.success?.("Ok.");
    };
    boxes.forEach(b=>b.addEventListener("change", check));

    ctx.taskPrimary.textContent="verify";
    ctx.taskPrimary.onclick=check;
  };

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

  // swap textarea into a non-scrollable live view (keep hackLines for compatibility)
  let view = document.getElementById("hackView");
  if (!view) {
    view = document.createElement("div");
    view.id = "hackView";
    view.className = "hackView";
    linesBox?.parentNode?.insertBefore(view, linesBox);
    if (linesBox) linesBox.classList.add("hidden");
  }

  // hard-disable user scrolling back
  view.style.overflow = "hidden";
  const stopScroll = (e) => { try { e.preventDefault(); } catch {} };
  view.addEventListener("wheel", stopScroll, { passive: false });
  view.addEventListener("touchmove", stopScroll, { passive: false });

  function setStatus(s) { if (status) status.textContent = String(s || ""); }
  function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

  function validUser(u) {
    const x = String(u || "").trim();
    return x.length >= 2 && x.length <= 32 && /^[a-zA-Z0-9_.-]+$/.test(x);
  }

  function addDomLine(text, isRed=false) {
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
    // always stay at the bottom visually (even though overflow is hidden)
    view.scrollTop = view.scrollHeight;
    return el;
  }

  function clearView() { view.innerHTML = ""; view.scrollTop = view.scrollHeight; }

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

  // ---------- state ----------
  room?.classList.remove("hidden");
  ctx.showTaskUI("LOGIN", "enter your discord username (this is the login)");

  let done = false;
  let tickTimer = 0;
  let removedNeeded = 10;
  let removedCount = 0;
  let lineIndex = 0;
  const maxLines = 28;
  const durationMs = Math.max(35000, Math.min(140000, Number(args.durationMs) || 70000));

  function fail(reason) {
    if (done) return;
    done = true;
    try { clearInterval(tickTimer); } catch {}
    setStatus(reason || "failed");
    ctx.doReset("LOCKDOWN", `${reason || "failed"}\n\nReinitializing…`);
  }

  function succeed() {
    if (done) return;
    done = true;
    try { clearInterval(tickTimer); } catch {}
    setStatus("record removed");
    setTimeout(() => {
      sessionStorage.setItem("tnr_escape_ok", "1");
      window.location.href = "/escaped.html";
    }, 650);
  }

  // ---------- login UI ----------
  const user = (sessionStorage.getItem("tnr_discord") || "").trim();
  if (userInput) {
    userInput.value = user;
    userInput.placeholder = "discord username (login)";
    userInput.autocomplete = "off";
    userInput.spellcheck = false;
  }
  if (targets) targets.textContent = "login: username required";
  if (filename) filename.textContent = "file: —";
  clearView();
  addDomLine("> login required");
  addDomLine("> press ENTER to continue");

  const doLogin = async () => {
    const u = (userInput?.value || "").trim();
    if (!validUser(u)) {
      setStatus("invalid username");
      addDomLine("> invalid username", true);
      ctx.penalize?.(1, "invalid login");
      return;
    }

    sessionStorage.setItem("tnr_discord", u);
    setStatus("booting…");

    // boot animation
    clearView();
    for (let i = 0; i < 10; i++) {
      const dots = ".".repeat((i % 4) + 1);
      addDomLine(`> loading${dots}`);
      await sleep(220);
    }
    addDomLine("> please wait…");
    await sleep(550);
    addDomLine(`> welcome ${u}`);
    await sleep(450);

    // file choices
    ctx.showTaskUI("FILES", "select your file");
    if (targets) targets.textContent = "files:";
    if (filename) filename.textContent = "file: /sim/lock/registry.lua";

    const bar = document.createElement("div");
    bar.className = "fileBar";

    const decoys = ["guest_01", "temp_user", "cachewrap", "anon"];
    const all = [u, ...decoys].sort(() => Math.random() - 0.5);

    const label = document.createElement("div");
    label.className = "muted";
    label.textContent = "choose your username:";
    bar.appendChild(label);

    const row = document.createElement("div");
    row.className = "fileRow";

    all.forEach((name) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "fileBtn";
      b.textContent = name;
      b.addEventListener("click", async () => {
        if (done) return;
        if (name !== u) {
          setStatus("wrong file");
          ctx.penalize?.(1, "wrong file");
          b.classList.add("bad");
          await sleep(250);
          b.classList.remove("bad");
          return;
        }

        // correct: open file (start scroll)
        bar.remove();
        ctx.showTaskUI("FINAL PROCEDURE", "delete flagged lines before they leave the screen");
        beginScroll(u);
      });
      row.appendChild(b);
    });

    bar.appendChild(row);

    // mount bar above view
    view.parentNode?.insertBefore(bar, view);
    setStatus("select file");
  };

  // bind login
  ctx.taskPrimary.textContent = "login";
  ctx.taskPrimary.onclick = doLogin;
  userInput?.addEventListener("keydown", (e) => { if (e.key === "Enter") doLogin(); });

  // delete / reset buttons
  if (delBtn) {
    delBtn.onclick = () => {
      if (done) return;
      const removedRed = removeSelected();
      if (removedRed) {
        removedCount += removedRed;
        setStatus(`deleted: ${removedCount}/${removedNeeded}`);
        if (removedCount >= removedNeeded) return succeed();
      }
    };
  }
  if (resetBtn) resetBtn.onclick = () => fail("user reset");

  function beginScroll(u) {
    clearView();
    lineIndex = 0;
    removedCount = 0;
    setStatus("running…");

    // seed
    for (let i = 0; i < 12; i++) addDomLine(mkLine(i), false);

    const startT = Date.now();

    // 2 lines / second: 1 per 500ms tick
    tickTimer = setInterval(() => {
      const elapsed = Date.now() - startT;
      if (elapsed > durationMs) {
        if (removedCount >= removedNeeded) return succeed();
        return fail("timeout: record still present");
      }

      lineIndex += 1;
      const isRed = (lineIndex % 7 === 0) || (Math.random() < 0.10);
      const txt = isRed ? mkRedLine(lineIndex, u) : mkLine(lineIndex);
      addDomLine(txt, isRed);

      // prune top; if a red line leaves the UI, wait 3s then fail
      while (view.children.length > maxLines) {
        const first = view.children[0];
        const wasRed = first?.dataset?.red === "1";
        first.remove();

        if (wasRed) {
          setStatus("verifying…");
          setTimeout(() => {
            if (!done) fail("missed a flagged line");
          }, 3000);
          return;
        }
      }

      // keep at bottom
      view.scrollTop = view.scrollHeight;
    }, 500);
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

