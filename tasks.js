// tasks.js
// Core task library + final hack task.
// All tasks call ctx.success() on correct completion; wrong attempts call ctx.penalize().

(() => {
  const TASKS = (window.TASKS = window.TASKS || {});

  // Packs may register tasks before this loads.
  window.registerTasks = function registerTasks(payload) {
    if (!payload) return;
    if (Array.isArray(payload)) return payload.forEach(registerTasks);
    for (const [k, v] of Object.entries(payload)) {
      if (typeof v === "function") TASKS[k] = v;
    }
  };

  // Flush queued registrations.
  try {
    const q = window.__TASK_QUEUE__ || [];
    while (q.length) window.registerTasks(q.shift());
  } catch {}

  // Pools: ensure 10 core procedures.
  window.TASK_POOLS = window.TASK_POOLS || {};
  window.TASK_POOLS.core = [
    "checksum",
    "pulse",
    "align",
    "mirror",
    "hold",
    "scrub",
    "splice",
    "trace",
    "offset",
    "mask",
  ];

  function el(tag, attrs = {}, children = []) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k === "html") n.innerHTML = v;
      else n.setAttribute(k, String(v));
    }
    for (const c of children) n.appendChild(c);
    return n;
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* =========================
     Random wrapper
  ========================= */
  TASKS.random = async (ctx, args = {}) => {
    const pools = Array.isArray(args.pool) ? args.pool : [args.pool || "core"];
    const POOLS = window.TASK_POOLS || {};

    let candidates = [];
    for (const p of pools) {
      if (Array.isArray(POOLS[p])) candidates.push(...POOLS[p]);
    }
    candidates = candidates.filter((k) => typeof TASKS[k] === "function" && k !== "random");
    if (!candidates.length) candidates = Object.keys(TASKS).filter((k) => k !== "random");

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    try { ctx.onTaskPick?.(pick); } catch {}
    return TASKS[pick](ctx, args.args || {});
  };

  /* =========================
     10 core tasks
  ========================= */

  TASKS.checksum = async (ctx, args = {}) => {
    const phrase = String(args.phrase || "").trim() || "checksum";
    ctx.showTaskUI?.("checksum", "enter checksum phrase");

    const inp = el("input", { type: "text", placeholder: "checksum" });
    inp.autocomplete = "off";
    inp.spellcheck = false;

    const hint = el("div", { class: "muted", text: "exact match required." });
    ctx.taskBody.appendChild(inp);
    ctx.taskBody.appendChild(hint);

    const submit = () => {
      const v = String(inp.value || "").trim();
      if (v === phrase) return ctx.success?.("accepted");
      ctx.penalize?.();
      hint.textContent = "incorrect.";
    };

    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.onclick = submit;
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    try { ctx.setAnswer?.(phrase); } catch {}
  };

  TASKS.pulse = async (ctx) => {
    ctx.showTaskUI?.("pulse", "click the pulse 5 times" );
    let count = 0;
    const btn = el("button", { type: "button", class: "taskBtn", text: "PULSE" });
    const msg = el("div", { class: "muted", text: "0/5" });
    ctx.taskBody.appendChild(btn);
    ctx.taskBody.appendChild(msg);

    btn.onclick = () => {
      count++;
      msg.textContent = `${count}/5`;
      if (count >= 5) ctx.success?.("ok");
    };
  };

  TASKS.align = async (ctx) => {
    ctx.showTaskUI?.("align", "set all sliders to the center" );
    const wrap = el("div", { class: "sliderWrap" });
    const msg = el("div", { class: "muted", text: "targets: 50" });
    const sliders = [];
    for (let i = 0; i < 3; i++) {
      const s = el("input", { type: "range", min: "0", max: "100", value: String(Math.floor(Math.random() * 101)) });
      sliders.push(s);
      wrap.appendChild(s);
    }
    ctx.taskBody.appendChild(wrap);
    ctx.taskBody.appendChild(msg);

    const check = () => {
      const ok = sliders.every((s) => Math.abs(Number(s.value) - 50) <= 2);
      if (ok) ctx.success?.("aligned");
    };

    sliders.forEach((s) => s.addEventListener("input", check));
    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.onclick = () => {
      const ok = sliders.every((s) => Math.abs(Number(s.value) - 50) <= 2);
      if (ok) return ctx.success?.("aligned");
      ctx.penalize?.();
      msg.textContent = "misaligned.";
    };
  };

  TASKS.mirror = async (ctx) => {
    ctx.showTaskUI?.("mirror", "repeat the pattern" );
    const seq = Array.from({ length: 4 }, () => (Math.random() < 0.5 ? "L" : "R"));
    let idx = 0;

    const row = el("div", { class: "btnRow" });
    const l = el("button", { type: "button", class: "taskBtn", text: "L" });
    const r = el("button", { type: "button", class: "taskBtn", text: "R" });
    const msg = el("div", { class: "muted", text: `pattern: ${seq.join(" ")}` });
    row.appendChild(l);
    row.appendChild(r);
    ctx.taskBody.appendChild(msg);
    ctx.taskBody.appendChild(row);

    const press = (v) => {
      if (seq[idx] !== v) {
        idx = 0;
        ctx.penalize?.();
        msg.textContent = `pattern: ${seq.join(" ")} (reset)`;
        return;
      }
      idx++;
      if (idx >= seq.length) ctx.success?.("mirrored");
    };

    l.onclick = () => press("L");
    r.onclick = () => press("R");
  };

  TASKS.hold = async (ctx) => {
    ctx.showTaskUI?.("hold", "hold the button for 2 seconds" );
    const btn = el("button", { type: "button", class: "taskBtn", text: "HOLD" });
    const msg = el("div", { class: "muted", text: "press and hold" });
    ctx.taskBody.appendChild(btn);
    ctx.taskBody.appendChild(msg);

    let t0 = 0;
    const down = () => { t0 = Date.now(); msg.textContent = "holding…"; };
    const up = () => {
      if (!t0) return;
      const dt = Date.now() - t0;
      t0 = 0;
      if (dt >= 2000) return ctx.success?.("held");
      ctx.penalize?.();
      msg.textContent = "released too early";
    };
    btn.addEventListener("pointerdown", down);
    btn.addEventListener("pointerup", up);
    btn.addEventListener("pointerleave", up);
  };

  TASKS.scrub = async (ctx) => {
    ctx.showTaskUI?.("scrub", "toggle all switches on" );
    const wrap = el("div", { class: "chkRow" });
    const boxes = [];
    for (let i = 0; i < 5; i++) {
      const cb = el("input", { type: "checkbox" });
      boxes.push(cb);
      wrap.appendChild(cb);
    }
    const msg = el("div", { class: "muted", text: "all must be ON" });
    ctx.taskBody.appendChild(wrap);
    ctx.taskBody.appendChild(msg);

    const check = () => {
      if (boxes.every((b) => b.checked)) ctx.success?.("clean");
    };
    boxes.forEach((b) => b.addEventListener("change", check));
    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.onclick = () => {
      if (boxes.every((b) => b.checked)) return ctx.success?.("clean");
      ctx.penalize?.();
      msg.textContent = "incomplete";
    };
  };

  TASKS.splice = async (ctx) => {
    ctx.showTaskUI?.("splice", "type the highlighted token" );
    const token = Math.random().toString(36).slice(2, 6).toUpperCase();
    const code = el("div", { class: "token", text: token });
    const inp = el("input", { type: "text", placeholder: "token" });
    inp.autocomplete = "off";
    inp.spellcheck = false;
    const msg = el("div", { class: "muted", text: "case-sensitive" });
    ctx.taskBody.appendChild(code);
    ctx.taskBody.appendChild(inp);
    ctx.taskBody.appendChild(msg);

    const submit = () => {
      const v = String(inp.value || "").trim();
      if (v === token) return ctx.success?.("spliced");
      ctx.penalize?.();
      msg.textContent = "wrong token";
    };
    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.onclick = submit;
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    try { ctx.setAnswer?.(token); } catch {}
  };

  TASKS.trace = async (ctx) => {
    ctx.showTaskUI?.("trace", "click the nodes in order" );
    const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    let idx = 0;
    const row = el("div", { class: "nodeRow" });
    const msg = el("div", { class: "muted", text: `order: ${order.map((n) => n + 1).join("-")}` });
    ctx.taskBody.appendChild(msg);
    ctx.taskBody.appendChild(row);

    for (let i = 0; i < 4; i++) {
      const b = el("button", { type: "button", class: "nodeBtn", text: String(i + 1) });
      b.onclick = () => {
        if (order[idx] !== i) {
          idx = 0;
          ctx.penalize?.();
          msg.textContent = `order: ${order.map((n) => n + 1).join("-")} (reset)`;
          return;
        }
        idx++;
        b.disabled = true;
        if (idx >= order.length) ctx.success?.("traced");
      };
      row.appendChild(b);
    }
  };

  TASKS.offset = async (ctx) => {
    ctx.showTaskUI?.("offset", "solve: (A+B) mod 10" );
    const A = Math.floor(Math.random() * 10);
    const B = Math.floor(Math.random() * 10);
    const ans = String((A + B) % 10);
    const q = el("div", { class: "muted", text: `A=${A}  B=${B}` });
    const inp = el("input", { type: "text", placeholder: "0-9" });
    inp.maxLength = 1;
    inp.autocomplete = "off";
    const msg = el("div", { class: "muted", text: "" });
    ctx.taskBody.appendChild(q);
    ctx.taskBody.appendChild(inp);
    ctx.taskBody.appendChild(msg);

    const submit = () => {
      if (String(inp.value || "").trim() === ans) return ctx.success?.("ok");
      ctx.penalize?.();
      msg.textContent = "wrong";
    };
    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.onclick = submit;
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    try { ctx.setAnswer?.(ans); } catch {}
  };

  TASKS.mask = async (ctx) => {
    ctx.showTaskUI?.("mask", "choose the correct mask" );
    const opts = ["alpha", "beta", "delta", "gamma"].sort(() => Math.random() - 0.5);
    const correct = opts[Math.floor(Math.random() * opts.length)];
    const msg = el("div", { class: "muted", text: "one is valid" });
    const row = el("div", { class: "btnRow" });
    ctx.taskBody.appendChild(msg);
    ctx.taskBody.appendChild(row);

    opts.forEach((name) => {
      const b = el("button", { type: "button", class: "taskBtn", text: name });
      b.onclick = () => {
        if (name === correct) return ctx.success?.("accepted");
        ctx.penalize?.();
        msg.textContent = "rejected";
      };
      row.appendChild(b);
    });
    try { ctx.setAnswer?.(correct); } catch {}
  };

  /* =========================
     Final hack task
     - login -> boot -> files -> forced downward feed
     - base: 1 line / 2 seconds
     - speed increases by 2% per resistance point
     - if a DELETE THIS line leaves the UI, wait 3s and fail if it wasn't deleted
  ========================= */

  TASKS.hack_final = async (ctx, args = {}) => {
    const room = document.getElementById("hackRoom");
    const userInput = document.getElementById("hackUser");
    const status = document.getElementById("hackStatus");
    const delBtn = document.getElementById("hackDelete");
    const resetBtn = document.getElementById("hackReset");
    const targets = document.getElementById("hackTargets");
    const filename = document.getElementById("hackFilename");
    const linesBox = document.getElementById("hackLines");

    let view = document.getElementById("hackView");
    if (!view) {
      view = document.createElement("div");
      view.id = "hackView";
      view.className = "hackView";
      linesBox?.parentNode?.insertBefore(view, linesBox);
      if (linesBox) linesBox.classList.add("hidden");
    }

    // Prevent scrolling back.
    view.style.overflow = "hidden";
    const stopScroll = (e) => { try { e.preventDefault(); } catch {} };
    view.addEventListener("wheel", stopScroll, { passive: false });
    view.addEventListener("touchmove", stopScroll, { passive: false });

    const setStatus = (s) => { if (status) status.textContent = String(s || ""); };

    const validUser = (u) => {
      const x = String(u || "").trim();
      return x.length >= 2 && x.length <= 32 && /^[a-zA-Z0-9_.-]+$/.test(x);
    };

    const clearView = () => { view.innerHTML = ""; view.scrollTop = view.scrollHeight; };

    const addDomLine = (text, isRed = false, key = "") => {
      const eln = document.createElement("div");
      eln.className = "hackLine" + (isRed ? " red" : "");
      eln.textContent = text;
      eln.dataset.red = isRed ? "1" : "0";
      eln.dataset.key = key;
      eln.dataset.selected = "0";
      eln.addEventListener("click", () => {
        const on = eln.dataset.selected === "1";
        eln.dataset.selected = on ? "0" : "1";
        eln.classList.toggle("sel", !on);
      });
      view.appendChild(eln);
      view.scrollTop = view.scrollHeight;
      return eln;
    };

    const state = {
      done: false,
      timer: 0,
      removedNeeded: Math.max(14, Number(args.removedNeeded) || 18),
      removedCount: 0,
      lineIndex: 0,
      maxLines: 28,
      redMap: new Map(), // key -> { deleted: bool }
    };

    const fail = (reason) => {
      if (state.done) return;
      state.done = true;
      try { clearInterval(state.timer); } catch {}
      setStatus(reason || "failed");
      ctx.doReset?.("LOCKDOWN", `${reason || "failed"}\n\nReinitializing…`);
    };

    const succeed = () => {
      if (state.done) return;
      state.done = true;
      try { clearInterval(state.timer); } catch {}
      try {
        if (window.__TNR_SPECIAL_MUSIC__) {
          window.__TNR_SPECIAL_MUSIC__.pause();
          window.__TNR_SPECIAL_MUSIC__.src = "";
          window.__TNR_SPECIAL_MUSIC__ = null;
        }
      } catch {}
      setStatus("record removed");
      setTimeout(() => {
        sessionStorage.setItem("tnr_escape_ok", "1");
        window.location.href = "/escaped.html";
      }, 650);
    };

    const removeSelected = () => {
      const selected = Array.from(view.querySelectorAll(".hackLine.sel"));
      if (!selected.length) return 0;
      let removedRed = 0;
      for (const eln of selected) {
        if (eln.dataset.red === "1") {
          removedRed++;
          const k = eln.dataset.key;
          if (k && state.redMap.has(k)) state.redMap.get(k).deleted = true;
        }
        eln.remove();
      }
      return removedRed;
    };

    const mkLine = (i) => {
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
      return `// ${String(i).padStart(3, "0")}  ${patterns[i % patterns.length]}`;
    };

    const mkRedLine = (i, user) => {
      const patterns = [
        `USER=\"${user}\"`,
        `FILES.delete(\"/users/${user}\")`,
        `SIM.pin(\"${user}\")`,
        `LOCK.append(\"${user}\")`,
        `DENY.exit(\"${user}\")`,
        `TRAP.bind(\"${user}\")`,
      ];
      return `!! ${patterns[i % patterns.length]}  // DELETE THIS`;
    };

    // Show room
    room?.classList.remove("hidden");
    ctx.showTaskUI?.("LOGIN", "enter your discord username (this is the login)");
    if (targets) targets.textContent = "login: username required";
    if (filename) filename.textContent = "file: —";

    const prior = (sessionStorage.getItem("tnr_discord") || "").trim();
    if (userInput) {
      userInput.value = prior;
      userInput.placeholder = "discord username (login)";
      userInput.autocomplete = "off";
      userInput.spellcheck = false;
    }

    clearView();
    addDomLine("> login required");
    addDomLine("> press ENTER to continue");

    const boot = async (u) => {
      setStatus("booting…");
      clearView();
      for (let i = 0; i < 12; i++) {
        addDomLine(`> loading${".".repeat((i % 4) + 1)}`);
        await sleep(200);
      }
      addDomLine("> please wait…");
      await sleep(450);
      addDomLine(`> welcome ${u}`);
      await sleep(380);
    };

    const fileChooser = async (u) => {
      ctx.showTaskUI?.("FILES", "select your file");
      if (targets) targets.textContent = "files:";
      if (filename) filename.textContent = "file: /sim/lock/registry.lua";

      const bar = document.createElement("div");
      bar.className = "fileBar";
      const label = document.createElement("div");
      label.className = "muted";
      label.textContent = "choose your username:";
      const row = document.createElement("div");
      row.className = "fileRow";

      const decoys = ["guest_01", "temp_user", "cachewrap", "anon", "node_07"]; 
      const all = [u, ...decoys].sort(() => Math.random() - 0.5);

      all.forEach((name) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "fileBtn";
        b.textContent = name;
        b.addEventListener("click", async () => {
          if (state.done) return;
          if (name !== u) {
            setStatus("wrong file");
            ctx.penalize?.();
            b.classList.add("bad");
            await sleep(220);
            b.classList.remove("bad");
            return;
          }
          bar.remove();
          ctx.showTaskUI?.("FINAL PROCEDURE", "delete flagged lines before they leave the screen");
          startFinal(u);
        });
        row.appendChild(b);
      });

      bar.appendChild(label);
      bar.appendChild(row);
      view.parentNode?.insertBefore(bar, view);
      setStatus("select file");
    };

    const doLogin = async () => {
      const u = (userInput?.value || "").trim();
      if (!validUser(u)) {
        setStatus("invalid username");
        addDomLine("> invalid username", true);
        ctx.penalize?.();
        return;
      }
      sessionStorage.setItem("tnr_discord", u);
      await boot(u);
      await fileChooser(u);
    };

    ctx.taskPrimary.textContent = "login";
    ctx.taskPrimary.onclick = doLogin;
    userInput?.addEventListener("keydown", (e) => { if (e.key === "Enter") doLogin(); });

    if (delBtn) {
      delBtn.onclick = () => {
        if (state.done) return;
        const removedRed = removeSelected();
        if (removedRed) {
          state.removedCount += removedRed;
          setStatus(`deleted: ${state.removedCount}/${state.removedNeeded}`);
          if (state.removedCount >= state.removedNeeded) succeed();
        }
      };
    }

    if (resetBtn) resetBtn.onclick = () => fail("user reset");

    // music: final hack should use FinalHack.WAV if present.
    // If missing, fall back to stem mixer final scene.
    const tryFinalHackMusic = () => {
      try {
        const a = new Audio("/music/FinalHack.WAV");
        a.loop = true;
        a.volume = 0.85;
        a.play().then(() => {
          window.__TNR_SPECIAL_MUSIC__ = a;
          try { window.Music?.setScene?.("final"); } catch {}
        }).catch(() => {
          try { window.Music?.setScene?.("final"); } catch {}
        });
      } catch {
        try { window.Music?.setScene?.("final"); } catch {}
      }
    };

    const stopSpecialMusic = () => {
      try {
        if (window.__TNR_SPECIAL_MUSIC__) {
          window.__TNR_SPECIAL_MUSIC__.pause();
          window.__TNR_SPECIAL_MUSIC__.src = "";
          window.__TNR_SPECIAL_MUSIC__ = null;
        }
      } catch {}
    };

    const startFinal = (u) => {
      stopSpecialMusic();
      tryFinalHackMusic();
      clearView();
      state.lineIndex = 0;
      state.removedCount = 0;
      state.redMap.clear();
      setStatus("running…");

      // seed
      for (let i = 0; i < 10; i++) addDomLine(mkLine(i), false);

      const baseIntervalMs = 2000; // 1 line / 2 seconds
      const maxDurationMs = Math.max(110000, Math.min(260000, Number(args.durationMs) || 170000));
      const startT = Date.now();

      const tick = () => {
        if (state.done) return;
        const elapsed = Date.now() - startT;
        if (elapsed > maxDurationMs) {
          if (state.removedCount >= state.removedNeeded) return succeed();
          return fail("timeout: record still present");
        }

        state.lineIndex += 1;
        const isRed = (state.lineIndex % 6 === 0) || (Math.random() < 0.08);
        const key = isRed ? `${Date.now()}_${state.lineIndex}_${Math.random().toString(16).slice(2)}` : "";
        if (isRed) state.redMap.set(key, { deleted: false });
        const txt = isRed ? mkRedLine(state.lineIndex, u) : mkLine(state.lineIndex);
        addDomLine(txt, isRed, key);

        // prune top; if a red line leaves the UI, wait 3s then fail if not deleted
        while (view.children.length > state.maxLines) {
          const first = view.children[0];
          const wasRed = first?.dataset?.red === "1";
          const k = first?.dataset?.key || "";
          first.remove();
          if (wasRed && k) {
            setStatus("verifying…");
            setTimeout(() => {
              if (state.done) return;
              const rec = state.redMap.get(k);
              if (!rec || rec.deleted !== true) fail("missed a flagged line");
            }, 3000);
          }
        }

        // compute dynamic interval from resistance
        const r = Number(ctx.getResistancePoints?.() || 0);
        const speedMult = 1 + 0.02 * Math.max(0, r);
        const nextIn = Math.max(220, Math.floor(baseIntervalMs / speedMult));
        clearTimeout(state.timer);
        state.timer = setTimeout(tick, nextIn);
      };

      // start tick
      clearTimeout(state.timer);
      state.timer = setTimeout(tick, 800);
    };

    // Keep task alive until reset/redirect.
    await new Promise(() => {});
  };
})();
