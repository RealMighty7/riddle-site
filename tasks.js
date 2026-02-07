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

  // Phase 2: harder, more interactive puzzles
  window.TASK_POOLS.hard = [
    "wires",
    "jigsaw",
    "patternlock",
    "router",
    "freq_match",
    "grid_memory",
    "cipherpad",
    "calibration",
    "diff_merge",
    "ports",
  ];

  // Pack 6 + 7: additional interactive puzzles (second 10)
  window.TASK_POOLS.pack6 = [
    "p6_rotors",
    "p6_wordsplice",
    "p6_freqdial",
    "p6_morse",
    "p6_gridtap",
    "p6_switchboard",
    "p6_checksum2",
    "p6_sequence",
    "p6_matchpairs",
    "p6_hexpad",
  ];

  window.TASK_POOLS.pack7 = [
    "p7_minisudoku",
    "p7_memoryflash",
    "p7_sortstack",
    "p7_ciphershift",
    "p7_parity",
    "p7_patternflip",
    "p7_keymaze",
    "p7_anagram",
    "p7_gridroute",
    "p7_timerlock",
  ];

  /* =========================
     Packs 1–5: 100 intro variants
     (20 per pack)
  ========================= */

  const INTRO_PACKS = (window.TASK_POOLS.introPacks = window.TASK_POOLS.introPacks || {});
  for (let p = 1; p <= 5; p++) INTRO_PACKS[p] = [];
  window.TASK_POOLS.pack1 = INTRO_PACKS[1];
  window.TASK_POOLS.pack2 = INTRO_PACKS[2];
  window.TASK_POOLS.pack3 = INTRO_PACKS[3];
  window.TASK_POOLS.pack4 = INTRO_PACKS[4];
  window.TASK_POOLS.pack5 = INTRO_PACKS[5];

  function makeId(pack, base, i) {
    const n = String(i).padStart(2, "0");
    return `p${pack}_${base}_${n}`;
  }

  function addVariant(pack, base, i, buildArgs, answerText) {
    const id = makeId(pack, base, i);
    INTRO_PACKS[pack].push(id);
    TASKS[id] = async (ctx) => {
      // Provide admin-visible “answer” even for non-input tasks.
      try {
        const a = typeof answerText === "function" ? answerText() : answerText;
        if (a) ctx.setAnswer?.(String(a), { pack, variant: id, base });
      } catch {}
      const args = typeof buildArgs === "function" ? buildArgs() : (buildArgs || {});
      return TASKS[base](ctx, args);
    };
  }

  // Generate 20 variants per pack (100 total). These stay “light” by default;
  // the guide path (sys/emma/liam) and scoring/timer scaling provides the real pressure.
  const PHRASE_ALPH = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const mkPhrase = (pack, i) => {
    let s = "";
    let x = (pack * 1315423911) ^ (i * 2654435761);
    x >>>= 0;
    for (let k = 0; k < 6; k++) {
      x = (x * 1664525 + 1013904223) >>> 0;
      s += PHRASE_ALPH[x % PHRASE_ALPH.length];
    }
    return `${pack}${s}`;
  };

  // Pack 1: checksum + pulse
  for (let i = 1; i <= 10; i++) {
    const phrase = mkPhrase(1, i);
    addVariant(1, "checksum", i, { phrase }, () => phrase);
  }
  for (let i = 11; i <= 20; i++) {
    const count = 3 + ((i - 11) % 6); // 3..8
    addVariant(1, "pulse", i - 10, { count }, () => `clicks:${count}`);
  }

  // Pack 2: align + mirror
  for (let i = 1; i <= 10; i++) {
    const target = 42 + ((i * 3) % 17); // 42..58
    addVariant(2, "align", i, { target, tol: 2 }, () => `target:${target}±2`);
  }
  for (let i = 11; i <= 20; i++) {
    const len = 3 + ((i - 11) % 3); // 3..5
    addVariant(2, "mirror", i - 10, { len }, () => `len:${len}`);
  }

  // Pack 3: hold + scrub
  for (let i = 1; i <= 10; i++) {
    const ms = 1400 + ((i * 137) % 900); // ~1.4s..2.3s
    addVariant(3, "hold", i, { durationMs: ms }, () => `hold:${Math.round(ms / 100) / 10}s`);
  }
  for (let i = 11; i <= 20; i++) {
    const n = 4 + ((i - 11) % 4); // 4..7
    addVariant(3, "scrub", i - 10, { nBoxes: n }, () => `switches:${n}`);
  }

  // Pack 4: splice + trace
  for (let i = 1; i <= 10; i++) {
    const len = 3 + ((i * 7) % 3); // 3..5
    addVariant(4, "splice", i, { tokenLen: len }, () => `token:${len} chars`);
  }
  for (let i = 11; i <= 20; i++) {
    const n = 4 + ((i - 11) % 3); // 4..6
    addVariant(4, "trace", i - 10, { nodes: n }, () => `nodes:${n}`);
  }

  // Pack 5: offset + mask
  for (let i = 1; i <= 10; i++) {
    const A = (i * 7) % 10;
    const B = (i * 3) % 10;
    addVariant(5, "offset", i, { A, B }, () => `(${A}+${B}) mod 10`);
  }
  for (let i = 11; i <= 20; i++) {
    const size = 4;
    addVariant(5, "mask", i - 10, { size }, () => `options:${size}`);
  }

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

  function clamp(n, a, b) {
    const x = Number(n);
    return Math.max(a, Math.min(b, Number.isFinite(x) ? x : a));
  }

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
    // First time: require the special phrase. If checksum appears again, fall back to stored answer.
    ctx.state = ctx.state || {};
    const first = ctx.state.__checksumFirstDone !== true;
    const required = first ? "echostatic07vault" : String(ctx.state.storedAnswer || "checksum");
    const phrase = String(args.phrase || "").trim() || required;
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

  TASKS.pulse = async (ctx, args = {}) => {
    const target = Math.max(1, Math.floor(Number(args.count || 5)));
    ctx.showTaskUI?.("pulse", `click the pulse ${target} times` );
    let count = 0;
    const btn = el("button", { type: "button", class: "taskBtn", text: "PULSE" });
    const msg = el("div", { class: "muted", text: `0/${target}` });
    ctx.taskBody.appendChild(btn);
    ctx.taskBody.appendChild(msg);

    btn.onclick = () => {
      count++;
      msg.textContent = `${count}/${target}`;
      if (count >= target) ctx.success?.("ok");
    };
  };

  TASKS.align = async (ctx, args = {}) => {
    const target = clamp(Math.floor(Number(args.target ?? 50)), 0, 100);
    const tol = clamp(Math.floor(Number(args.tol ?? 2)), 0, 10);
    ctx.showTaskUI?.("align", `set all sliders to ${target}` );
    const wrap = el("div", { class: "sliderWrap" });
    const msg = el("div", { class: "muted", text: `target: ${target}±${tol}` });
    const sliders = [];
    for (let i = 0; i < 3; i++) {
      const s = el("input", { type: "range", min: "0", max: "100", value: String(Math.floor(Math.random() * 101)) });
      sliders.push(s);
      wrap.appendChild(s);
    }
    ctx.taskBody.appendChild(wrap);
    ctx.taskBody.appendChild(msg);

    const check = () => {
      const ok = sliders.every((s) => Math.abs(Number(s.value) - target) <= tol);
      if (ok) ctx.success?.("aligned");
    };

    sliders.forEach((s) => s.addEventListener("input", check));
    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.onclick = () => {
      const ok = sliders.every((s) => Math.abs(Number(s.value) - target) <= tol);
      if (ok) return ctx.success?.("aligned");
      ctx.penalize?.();
      msg.textContent = "misaligned.";
    };
  };

  TASKS.mirror = async (ctx, args = {}) => {
    const len = Math.max(2, Math.floor(Number(args.len || 4)));
    ctx.showTaskUI?.("mirror", "repeat the pattern" );
    const seq = Array.from({ length: len }, () => (Math.random() < 0.5 ? "L" : "R"));
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

  TASKS.hold = async (ctx, args = {}) => {
    const durationMs = Math.max(500, Math.floor(Number(args.durationMs || 2000)));
    const s = Math.round(durationMs / 100) / 10;
    ctx.showTaskUI?.("hold", `hold the button for ${s} seconds` );
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
      if (dt >= durationMs) return ctx.success?.("held");
      ctx.penalize?.();
      msg.textContent = "released too early";
    };
    btn.addEventListener("pointerdown", down);
    btn.addEventListener("pointerup", up);
    btn.addEventListener("pointerleave", up);
  };

  TASKS.scrub = async (ctx, args = {}) => {
    const nBoxes = clamp(Math.floor(Number(args.nBoxes || 5)), 2, 10);
    ctx.showTaskUI?.("scrub", "toggle all switches on" );
    const wrap = el("div", { class: "chkRow" });
    const boxes = [];
    for (let i = 0; i < nBoxes; i++) {
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

  TASKS.splice = async (ctx, args = {}) => {
    const tokenLen = clamp(Math.floor(Number(args.tokenLen || 4)), 2, 8);
    ctx.showTaskUI?.("splice", "type the highlighted token" );
    const token = Math.random().toString(36).slice(2, 2 + tokenLen).toUpperCase();
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

  TASKS.trace = async (ctx, args = {}) => {
    const nodes = clamp(Math.floor(Number(args.nodes || 4)), 3, 8);
    ctx.showTaskUI?.("trace", "click the nodes in order" );
    const order = Array.from({ length: nodes }, (_, i) => i).sort(() => Math.random() - 0.5);
    let idx = 0;
    const row = el("div", { class: "nodeRow" });
    const msg = el("div", { class: "muted", text: `order: ${order.map((n) => n + 1).join("-")}` });
    ctx.taskBody.appendChild(msg);
    ctx.taskBody.appendChild(row);

    for (let i = 0; i < nodes; i++) {
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

  TASKS.offset = async (ctx, args = {}) => {
    ctx.showTaskUI?.("offset", "solve: (A+B) mod 10" );
    const A = Number.isFinite(Number(args.A)) ? clamp(Math.floor(Number(args.A)), 0, 9) : Math.floor(Math.random() * 10);
    const B = Number.isFinite(Number(args.B)) ? clamp(Math.floor(Number(args.B)), 0, 9) : Math.floor(Math.random() * 10);
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

  TASKS.mask = async (ctx, args = {}) => {
    ctx.showTaskUI?.("mask", "select the valid mask (use the rule below)");
    // Rule (hard but solvable): score = (vowels*3 + consonants) mod 4 must equal the gate value.
    const words = ["alpha","beta","gamma","delta","sigma","kappa"];
    const size = clamp(Math.floor(Number(args.size || 4)), 3, 6);
    const opts = words.sort(() => Math.random() - 0.5).slice(0, size);

    const vowels = new Set(["a","e","i","o","u"]);
    const scoreOf = (w) => {
      let v = 0, c = 0;
      for (const ch of String(w)) {
        if (/[a-z]/i.test(ch)) (vowels.has(ch.toLowerCase()) ? v++ : c++);
      }
      return (v * 3 + c) % 4;
    };

    // Choose a target that matches exactly ONE option (so it's not guessy)
    let target = 0;
    for (let tries = 0; tries < 20; tries++) {
      const t = Math.floor(Math.random() * 4);
      const matches = opts.filter(o => scoreOf(o) === t);
      if (matches.length === 1) { target = t; break; }
    }

    const rule = el("div", { class: "muted", text: `rule: (vowels×3 + consonants) mod 4 = gate` });
    const gate = el("div", { class: "muted", text: `gate: ${target}` });

    const table = el("div", { class: "maskTable" });
    const row = el("div", { class: "btnRow" });
    const msg = el("div", { class: "muted", text: "choose carefully." });

    opts.forEach((name) => {
      const sc = scoreOf(name);
      const line = el("div", { class: "maskRow" });
      const tag = el("span", { class: "maskTag", text: `${name}` });
      const sig = el("span", { class: "maskSig", text: `sig:${sc}` });
      const b = el("button", { type: "button", class: "taskBtn", text: "select" });
      b.onclick = () => {
        if (sc === target) return ctx.success?.("mask accepted");
        ctx.penalize?.();
        msg.textContent = "rejected. recalculating…";
      };
      line.append(tag, sig, b);
      table.appendChild(line);
    });

    ctx.taskBody.append(rule, gate, msg, table);
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

    // User request: background music only in the simulation room.
    const startFinal = (u) => {
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
  /* =========================
     HARD TASK PACK (PHASE 2)
     ========================= */

  TASKS.wires = async (ctx) => {
    ctx.showTaskUI?.("wires", "connect each color to its matching port");
    const wrap = el("div", { class: "wireWrap" });
    const cols = ["red","blue","green","yellow"];
    const portsL = cols.map(c => el("button",{type:"button",class:`wirePort left ${c}`,text:c.toUpperCase()}));
    const portsR = cols.map(c => el("button",{type:"button",class:`wirePort right ${c}`,text:c.toUpperCase()}));
    // shuffle right side
    for (let i = portsR.length-1; i>0; i--) {
      const j = Math.floor(Math.random()*(i+1));
      [portsR[i], portsR[j]] = [portsR[j], portsR[i]];
    }
    const leftCol = el("div",{class:"wireCol"},portsL);
    const rightCol= el("div",{class:"wireCol"},portsR);
    const msg = el("div",{class:"muted",text:"tap a left port then a right port to link. mismatches reset."});
    wrap.append(leftCol,rightCol);
    ctx.taskBody.append(msg,wrap);

    let pending=null;
    const links=new Map(); // leftColor -> rightColor
    function resetAll(bad){
      links.clear();
      pending=null;
      portsL.forEach(b=>b.classList.remove("sel","ok"));
      portsR.forEach(b=>b.classList.remove("sel","ok"));
      if (bad) ctx.penalize?.();
    }
    function checkDone(){
      if (links.size!==cols.length) return;
      for (const c of cols) if (links.get(c)!==c) return;
      ctx.success?.("wired");
    }
    portsL.forEach((b)=>{
      b.onclick=()=>{
        portsL.forEach(x=>x.classList.remove("sel"));
        b.classList.add("sel");
        pending=b.classList.contains("red")?"red":b.classList.contains("blue")?"blue":b.classList.contains("green")?"green":"yellow";
      };
    });
    portsR.forEach((b)=>{
      b.onclick=()=>{
        if (!pending) return;
        const rc=b.classList.contains("red")?"red":b.classList.contains("blue")?"blue":b.classList.contains("green")?"green":"yellow";
        // set link
        links.set(pending, rc);
        // mark ok for now
        portsL.forEach(x=>x.classList.toggle("ok", links.get(x.classList.contains("red")?"red":x.classList.contains("blue")?"blue":x.classList.contains("green")?"green":"yellow")!=null));
        portsR.forEach(x=>x.classList.remove("sel"));
        b.classList.add("sel");
        // if mismatch on any completed pair early, penalize + reset
        if (pending!==rc) {
          resetAll(true);
          msg.textContent="mismatch detected. links purged.";
          return;
        }
        portsL.forEach(x=>x.classList.remove("sel"));
        pending=null;
        msg.textContent="stable.";
        checkDone();
      };
    });
  };

  TASKS.jigsaw = async (ctx) => {
    ctx.showTaskUI?.("jigsaw", "rebuild the image by swapping tiles");
    const size = 3;
    const board = el("div",{class:"jigBoard"});
    const msg = el("div",{class:"muted",text:"click two tiles to swap. restore correct order."});
    ctx.taskBody.append(msg, board);

    const order = Array.from({length:size*size},(_,i)=>i);
    const shuffled = order.slice();
    // shuffle but keep solvable-ish; just random swaps
    for (let i=0;i<20;i++){
      const a=Math.floor(Math.random()*shuffled.length);
      const b=Math.floor(Math.random()*shuffled.length);
      [shuffled[a],shuffled[b]]=[shuffled[b],shuffled[a]];
    }

    let first=null;
    function render(){
      board.innerHTML="";
      shuffled.forEach((n,idx)=>{
        const tile=el("button",{type:"button",class:"jigTile",text:String(n+1)});
        tile.dataset.idx=String(idx);
        tile.dataset.val=String(n);
        if (first===idx) tile.classList.add("sel");
        tile.onclick=()=>{
          if (first===null){ first=idx; render(); return; }
          if (first===idx){ first=null; render(); return; }
          [shuffled[first],shuffled[idx]]=[shuffled[idx],shuffled[first]];
          first=null;
          if (shuffled.every((v,i)=>v===i)) return ctx.success?.("rebuilt");
          render();
        };
        board.appendChild(tile);
      });
    }
    render();
  };

  TASKS.patternlock = async (ctx) => {
    ctx.showTaskUI?.("pattern", "trace the pattern (repeat exactly)");
    const msg = el("div",{class:"muted",text:"tap nodes in order. wrong resets."});
    const grid = el("div",{class:"patGrid"});
    ctx.taskBody.append(msg, grid);

    const nodes = Array.from({length:9},(_,i)=>el("button",{type:"button",class:"patNode",text:""}));
    nodes.forEach((n,i)=>{ n.dataset.i=String(i); grid.appendChild(n); });

    const target = [];
    let cur = Math.floor(Math.random()*9);
    for (let k=0;k<5;k++){
      target.push(cur);
      cur = (cur + [1,2,3,4][Math.floor(Math.random()*4)])%9;
    }
    msg.textContent = `pattern: ${target.map(n=>n+1).join("-")}`;

    let idx=0;
    nodes.forEach((n)=>{
      n.onclick=()=>{
        const i=Number(n.dataset.i);
        if (i!==target[idx]){
          idx=0;
          ctx.penalize?.();
          nodes.forEach(x=>x.classList.remove("on"));
          return;
        }
        n.classList.add("on");
        idx++;
        if (idx>=target.length) ctx.success?.("ok");
      };
    });
  };

  TASKS.router = async (ctx) => {
    ctx.showTaskUI?.("router", "route packets without crossing");
    const msg = el("div",{class:"muted",text:"toggle cells to create a single path from S to E. no branches."});
    const grid = el("div",{class:"routeGrid"});
    ctx.taskBody.append(msg, grid);

    const W=6,H=4;
    const start=0, end=W*H-1;
    const active=new Set([start,end]);
    function cell(i){
      const b=el("button",{type:"button",class:"routeCell",text:""});
      b.dataset.i=String(i);
      if (i===start) b.textContent="S";
      if (i===end) b.textContent="E";
      b.onclick=()=>{
        if (i===start||i===end) return;
        if (active.has(i)) active.delete(i); else active.add(i);
        draw();
        check();
      };
      return b;
    }
    const cells=Array.from({length:W*H},(_,i)=>cell(i));
    cells.forEach(c=>grid.appendChild(c));

    function draw(){
      cells.forEach((c)=>{
        const i=Number(c.dataset.i);
        c.classList.toggle("on", active.has(i));
      });
    }
    function neighbors(i){
      const x=i%W,y=Math.floor(i/W);
      const out=[];
      if (x>0) out.push(i-1);
      if (x<W-1) out.push(i+1);
      if (y>0) out.push(i-W);
      if (y<H-1) out.push(i+W);
      return out;
    }
    function check(){
      // BFS path using active cells
      const q=[start];
      const seen=new Set([start]);
      while(q.length){
        const u=q.shift();
        if (u===end) break;
        for(const v of neighbors(u)){
          if (!active.has(v) || seen.has(v)) continue;
          seen.add(v); q.push(v);
        }
      }
      if (!seen.has(end)) return;

      // no branches: each active cell (except endpoints) must have degree 2 in active graph; endpoints degree 1
      for (const i of active){
        const deg=neighbors(i).filter(n=>active.has(n)).length;
        if (i===start||i===end){
          if (deg!==1) return;
        } else {
          if (deg!==2) return;
        }
      }
      ctx.success?.("routed");
    }
    draw();
  };

  TASKS.freq_match = async (ctx) => {
    ctx.showTaskUI?.("freq", "match the frequency window");
    const msg = el("div",{class:"muted",text:"drag the knob until the needle sits in the band for 1 second."});
    const wrap=el("div",{class:"freqWrap"});
    const slider=el("input",{type:"range",min:"0",max:"100",value:"0",class:"freqSlider"});
    const bandStart=30+Math.floor(Math.random()*35);
    const bandEnd=bandStart+12+Math.floor(Math.random()*10);
    const read=el("div",{class:"mono",text:"0"});
    wrap.append(read,slider);
    ctx.taskBody.append(msg,wrap);

    let okT=0, last=Date.now();
    function tick(){
      const v=Number(slider.value);
      read.textContent=`${v}`;
      const now=Date.now();
      const dt=now-last; last=now;
      if (v>=bandStart && v<=bandEnd) okT+=dt; else okT=0;
      if (okT>=1000) return ctx.success?.("locked");
      requestAnimationFrame(tick);
    }
    tick();
  };

  TASKS.grid_memory = async (ctx) => {
    ctx.showTaskUI?.("memory", "repeat the highlighted cells");
    const msg=el("div",{class:"muted",text:"watch then repeat. one mistake resets."});
    const grid=el("div",{class:"memGrid"});
    ctx.taskBody.append(msg,grid);

    const N=4;
    const cells=[];
    for(let i=0;i<N*N;i++){
      const b=el("button",{type:"button",class:"memCell",text:""});
      b.dataset.i=String(i);
      grid.appendChild(b); cells.push(b);
    }
    const seq=[];
    let len=5;
    for(let i=0;i<len;i++) seq.push(Math.floor(Math.random()*N*N));
    let phase="show";
    let idx=0;

    async function flash(){
      for(const s of seq){
        cells[s].classList.add("on");
        await new Promise(r=>setTimeout(r,320));
        cells[s].classList.remove("on");
        await new Promise(r=>setTimeout(r,180));
      }
      phase="input";
      msg.textContent="your turn.";
      idx=0;
    }
    cells.forEach((c)=>{
      c.onclick=()=>{
        if (phase!=="input") return;
        const i=Number(c.dataset.i);
        if (i!==seq[idx]){
          idx=0;
          ctx.penalize?.();
          msg.textContent="wrong. watch again.";
          phase="show";
          flash();
          return;
        }
        c.classList.add("hit");
        setTimeout(()=>c.classList.remove("hit"),120);
        idx++;
        if (idx>=seq.length) ctx.success?.("ok");
      };
    });
    flash();
  };

  TASKS.cipherpad = async (ctx) => {
    ctx.showTaskUI?.("cipher", "decode the keypad phrase");
    const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const plain="SAFE EXIT";
    const shift=2+Math.floor(Math.random()*5);
    const enc = plain.replace(/[A-Z]/g, ch => {
      const code=ch.charCodeAt(0)-65;
      return String.fromCharCode(65+(code+shift)%26);
    });
    const msg=el("div",{class:"muted",text:`decode: ${enc} (caesar shift unknown)`});
    const inp=el("input",{type:"text",placeholder:"type decoded phrase"});
    const btn=el("button",{type:"button",class:"taskBtn",text:"submit"});
    ctx.taskBody.append(msg,inp,btn);
    btn.onclick=()=>{
      const v=String(inp.value||"").trim().toUpperCase();
      if (v===plain) return ctx.success?.("ok");
      ctx.penalize?.();
    };
  };

  TASKS.calibration = async (ctx) => {
    ctx.showTaskUI?.("calibration", "stabilize: keep cursor inside the box for 2 seconds");
    const msg=el("div",{class:"muted",text:"do not leave the box."});
    const box=el("div",{class:"calBox"});
    const dot=el("div",{class:"calDot"});
    box.appendChild(dot);
    ctx.taskBody.append(msg,box);

    let inside=false;
    let t0=null;
    box.onpointerenter=()=>{ inside=true; if (!t0) t0=Date.now(); };
    box.onpointerleave=()=>{ inside=false; t0=null; ctx.penalize?.(); msg.textContent="deviation detected."; };
    const loop=()=>{
      if (t0 && inside && Date.now()-t0>=2000) return ctx.success?.("stable");
      requestAnimationFrame(loop);
    };
    loop();
  };

  TASKS.diff_merge = async (ctx) => {
    ctx.showTaskUI?.("merge", "merge the diff (choose correct output)");
    const a="ACCT-7F2C";
    const b="ACCT-7F3C";
    const correct=Math.random()<0.5?a:b;
    const msg=el("div",{class:"muted",text:`resolve conflict: <<<<<<< HEAD ${a} ======= ${b} >>>>>>>`});
    const btnA=el("button",{type:"button",class:"taskBtn",text:a});
    const btnB=el("button",{type:"button",class:"taskBtn",text:b});
    ctx.taskBody.append(msg,btnA,btnB);
    btnA.onclick=()=>{ if (a===correct) ctx.success?.("ok"); else ctx.penalize?.(); };
    btnB.onclick=()=>{ if (b===correct) ctx.success?.("ok"); else ctx.penalize?.(); };
  };

  TASKS.ports = async (ctx) => {
    ctx.showTaskUI?.("ports", "open the correct ports (match labels)");
    const msg=el("div",{class:"muted",text:"toggle only the ports referenced by the rule."});
    const topics = ["HTTP","SSH","SMTP","DNS","RDP","NTP"];
    const rule = ["HTTP+DNS","SSH+RDP","SMTP+NTP"][Math.floor(Math.random()*3)];
    const need = new Set(rule.split("+"));
    const wrap=el("div",{class:"portWrap"});
    const togg=new Map();
        topics.forEach(t=>{
      const b=el("button",{type:"button",class:"portBtn",text:t});
      togg.set(t,false);
      b.onclick=()=>{
        togg.set(t,!togg.get(t));
        b.classList.toggle("on", togg.get(t));
        check();
      };
      wrap.appendChild(b);
    });
    const ruleEl=el("div",{class:"mono",text:`rule: enable ${rule}`});
    ctx.taskBody.append(msg,ruleEl,wrap);

    function check(){
            for(const t of topics){
        if (togg.get(t) !== need.has(t)) return;
      }
      ctx.success?.("ok");
    }
  };

  /* =========================
     PACK 6 (10 interactive puzzles)
  ========================= */

  TASKS.p6_rotors = async (ctx) => {
    ctx.showTaskUI?.("rotors", "set the rotors to match the target" );
    const target = Array.from({ length: 3 }, () => Math.floor(Math.random() * 10));
    const wrap = el("div", { class: "rotorWrap" });
    const msg = el("div", { class: "muted", text: `target: ${target.join("-")}` });
    const rotors = target.map(() => el("input", { type: "range", min: "0", max: "9", value: String(Math.floor(Math.random() * 10)) }));
    rotors.forEach(r => wrap.appendChild(r));
    ctx.taskBody.append(msg, wrap);
    const check = () => {
      const ok = rotors.every((r, i) => Number(r.value) === target[i]);
      if (ok) ctx.success?.("ok");
    };
    rotors.forEach(r => r.addEventListener("input", check));
    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.onclick = () => {
      if (rotors.every((r, i) => Number(r.value) === target[i])) return ctx.success?.("ok");
      ctx.penalize?.();
    };
    try { ctx.setAnswer?.(target.join("-")); } catch {}
  };

  TASKS.p6_wordsplice = async (ctx) => {
    ctx.showTaskUI?.("wordsplice", "reorder the tiles to form the word" );
    const words = ["CIRCUIT", "REFRACT", "SIGNAL", "SANDBOX", "MONITOR", "PROTOCOL"];
    const word = words[Math.floor(Math.random() * words.length)];
    const tiles = word.split("").sort(() => Math.random() - 0.5);
    const wrap = el("div", { class: "tileWrap" });
    const out = el("div", { class: "mono", text: tiles.join(" ") });
    const inp = el("input", { type: "text", placeholder: "type the correct word" });
    const msg = el("div", { class: "muted", text: "" });
    ctx.taskBody.append(out, inp, msg);
    const submit = () => {
      const v = String(inp.value || "").trim().toUpperCase();
      if (v === word) return ctx.success?.("ok");
      ctx.penalize?.();
      msg.textContent = "wrong";
    };
    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.onclick = submit;
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    try { ctx.setAnswer?.(word); } catch {}
  };

  TASKS.p6_freqdial = async (ctx) => {
    ctx.showTaskUI?.("freq dial", "tune to the target frequency" );
    const target = 120 + Math.floor(Math.random() * 480); // 120..599
    const tol = 6;
    const dial = el("input", { type: "range", min: "100", max: "650", value: String(100 + Math.floor(Math.random() * 550)) });
    const read = el("div", { class: "mono", text: `hz: ${dial.value}` });
    const msg = el("div", { class: "muted", text: `target: ${target} ±${tol}` });
    ctx.taskBody.append(read, dial, msg);
    dial.addEventListener("input", () => { read.textContent = `hz: ${dial.value}`; });
    ctx.taskPrimary.textContent = "lock";
    ctx.taskPrimary.onclick = () => {
      const v = Number(dial.value);
      if (Math.abs(v - target) <= tol) return ctx.success?.("locked");
      ctx.penalize?.();
    };
    try { ctx.setAnswer?.(String(target)); } catch {}
  };

  TASKS.p6_morse = async (ctx) => {
    ctx.showTaskUI?.("morse", "decode the signal" );
    const map = { A: ".-", S: "...", O: "---", T: "-", N: "-." };
    const words = ["AS", "SON", "TO", "SAT", "NOT", "SO"];
    const w = words[Math.floor(Math.random() * words.length)];
    const code = w.split("").map(ch => map[ch]).join(" ");
    const codeEl = el("div", { class: "mono", text: code });
    const inp = el("input", { type: "text", placeholder: "letters" });
    const msg = el("div", { class: "muted", text: "" });
    ctx.taskBody.append(codeEl, inp, msg);
    const submit = () => {
      const v = String(inp.value || "").trim().toUpperCase();
      if (v === w) return ctx.success?.("ok");
      ctx.penalize?.();
      msg.textContent = "wrong";
    };
    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.onclick = submit;
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    try { ctx.setAnswer?.(w); } catch {}
  };

  TASKS.p6_gridtap = async (ctx) => {
    ctx.showTaskUI?.("grid tap", "tap the lit cells" );
    const need = new Set();
    while (need.size < 4) need.add(Math.floor(Math.random() * 9));
    const wrap = el("div", { class: "grid3" });
    const msg = el("div", { class: "muted", text: "tap all highlighted" });
    const hit = new Set();
    for (let i = 0; i < 9; i++) {
      const b = el("button", { type: "button", class: "gridCell", text: "" });
      if (need.has(i)) b.classList.add("hot");
      b.onclick = () => {
        b.classList.toggle("on");
        if (b.classList.contains("on")) hit.add(i); else hit.delete(i);
        if (hit.size === need.size && [...hit].every(x => need.has(x))) ctx.success?.("ok");
      };
      wrap.appendChild(b);
    }
    ctx.taskBody.append(msg, wrap);
    try { ctx.setAnswer?.([...need].map(n => n + 1).join(",")); } catch {}
  };

  TASKS.p6_switchboard = async (ctx) => {
    ctx.showTaskUI?.("switchboard", "match the pattern" );
    const n = 6;
    const target = Array.from({ length: n }, () => (Math.random() < 0.5 ? 0 : 1));
    const wrap = el("div", { class: "switchRow" });
    const state = Array.from({ length: n }, () => 0);
    const msg = el("div", { class: "muted", text: `target: ${target.map(v => (v ? "1" : "0")).join("")}` });
    for (let i = 0; i < n; i++) {
      const b = el("button", { type: "button", class: "switchBtn", text: "0" });
      b.onclick = () => {
        state[i] = state[i] ? 0 : 1;
        b.textContent = String(state[i]);
        b.classList.toggle("on", !!state[i]);
        if (state.every((v, j) => v === target[j])) ctx.success?.("ok");
      };
      wrap.appendChild(b);
    }
    ctx.taskBody.append(msg, wrap);
    try { ctx.setAnswer?.(target.join("")); } catch {}
  };

  TASKS.p6_checksum2 = async (ctx) => {
    ctx.showTaskUI?.("checksum2", "enter the 2-digit checksum" );
    const n = 1000 + Math.floor(Math.random() * 9000);
    const sum = String(n).split("").reduce((a, d) => a + Number(d), 0);
    const ans = String(sum % 97).padStart(2, "0");
    const q = el("div", { class: "mono", text: `id: ${n}` });
    const inp = el("input", { type: "text", placeholder: "00" });
    inp.maxLength = 2;
    const msg = el("div", { class: "muted", text: "rule: (sum of digits) mod 97" });
    ctx.taskBody.append(q, inp, msg);
    const submit = () => {
      const v = String(inp.value || "").trim();
      if (v === ans) return ctx.success?.("ok");
      ctx.penalize?.();
    };
    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.onclick = submit;
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    try { ctx.setAnswer?.(ans); } catch {}
  };

  TASKS.p6_sequence = async (ctx) => {
    ctx.showTaskUI?.("sequence", "continue the sequence" );
    const a = 1 + Math.floor(Math.random() * 4);
    const b = 2 + Math.floor(Math.random() * 6);
    const seq = [a, a + b, a + 2 * b, a + 3 * b];
    const ans = String(a + 4 * b);
    const q = el("div", { class: "mono", text: seq.join("  ") + "  ?" });
    const inp = el("input", { type: "text", placeholder: "next" });
    const msg = el("div", { class: "muted", text: "" });
    ctx.taskBody.append(q, inp, msg);
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

  TASKS.p6_matchpairs = async (ctx) => {
    ctx.showTaskUI?.("match pairs", "reveal and match all pairs" );
    const vals = ["A","A","B","B","C","C","D","D"].sort(() => Math.random() - 0.5);
    const wrap = el("div", { class: "pairGrid" });
    let first = null;
    let matched = 0;
    vals.forEach((v, i) => {
      const b = el("button", { type: "button", class: "pairCard", text: "?" });
      b.onclick = () => {
        if (b.disabled || b.classList.contains("open")) return;
        b.classList.add("open");
        b.textContent = v;
        if (!first) { first = b; return; }
        const a = first;
        first = null;
        if (a.textContent === b.textContent) {
          a.disabled = b.disabled = true;
          matched += 2;
          if (matched >= vals.length) ctx.success?.("ok");
        } else {
          setTimeout(() => {
            a.classList.remove("open");
            b.classList.remove("open");
            a.textContent = "?";
            b.textContent = "?";
          }, 450);
          ctx.penalize?.();
        }
      };
      wrap.appendChild(b);
    });
    ctx.taskBody.append(wrap);
  };

  TASKS.p6_hexpad = async (ctx) => {
    ctx.showTaskUI?.("hexpad", "enter the hex for the displayed number" );
    const n = 16 + Math.floor(Math.random() * 240);
    const ans = n.toString(16).toUpperCase();
    const q = el("div", { class: "mono", text: `dec: ${n}` });
    const inp = el("input", { type: "text", placeholder: "HEX" });
    const msg = el("div", { class: "muted", text: "" });
    ctx.taskBody.append(q, inp, msg);
    const submit = () => {
      const v = String(inp.value || "").trim().toUpperCase();
      if (v === ans) return ctx.success?.("ok");
      ctx.penalize?.();
      msg.textContent = "wrong";
    };
    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.onclick = submit;
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    try { ctx.setAnswer?.(ans); } catch {}
  };

  /* =========================
     PACK 7 (10 interactive puzzles)
  ========================= */

  TASKS.p7_minisudoku = async (ctx) => {
    ctx.showTaskUI?.("minisudoku", "fill the blanks (digits 1-4)" );
    // 2x2 blocks in 4x4
    const solution = [
      [1,2,3,4],
      [3,4,1,2],
      [2,1,4,3],
      [4,3,2,1],
    ];
    const blanks = new Set();
    while (blanks.size < 6) blanks.add(Math.floor(Math.random() * 16));
    const grid = el("div", { class: "sudoku4" });
    const inputs = [];
    for (let i = 0; i < 16; i++) {
      const r = Math.floor(i / 4), c = i % 4;
      if (!blanks.has(i)) {
        const d = el("div", { class: "sudokuCell fixed", text: String(solution[r][c]) });
        grid.appendChild(d);
      } else {
        const inp = el("input", { class: "sudokuCell", type: "text" });
        inp.maxLength = 1;
        inputs.push({ inp, r, c });
        grid.appendChild(inp);
      }
    }
    ctx.taskBody.append(grid);
    const check = () => {
      const ok = inputs.every(({ inp, r, c }) => String(inp.value || "").trim() === String(solution[r][c]));
      if (ok) ctx.success?.("ok");
    };
    inputs.forEach(({ inp }) => inp.addEventListener("input", check));
    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.onclick = () => {
      if (inputs.every(({ inp, r, c }) => String(inp.value || "").trim() === String(solution[r][c]))) return ctx.success?.("ok");
      ctx.penalize?.();
    };
    try { ctx.setAnswer?.("4x4 fixed"); } catch {}
  };

  TASKS.p7_memoryflash = async (ctx) => {
    ctx.showTaskUI?.("memoryflash", "repeat the flash pattern" );
    const seq = Array.from({ length: 4 }, () => Math.floor(Math.random() * 4));
    const wrap = el("div", { class: "flashRow" });
    const btns = Array.from({ length: 4 }, (_, i) => el("button", { type: "button", class: "flashBtn", text: String(i + 1) }));
    btns.forEach(b => wrap.appendChild(b));
    const msg = el("div", { class: "muted", text: "watch…" });
    ctx.taskBody.append(msg, wrap);
    let idx = 0;
    const flash = async () => {
      for (const i of seq) {
        btns[i].classList.add("on");
        await sleep(240);
        btns[i].classList.remove("on");
        await sleep(140);
      }
      msg.textContent = "your turn";
    };
    await flash();
    btns.forEach((b, i) => {
      b.onclick = () => {
        if (seq[idx] !== i) {
          idx = 0;
          ctx.penalize?.();
          msg.textContent = "reset";
          return;
        }
        idx++;
        if (idx >= seq.length) ctx.success?.("ok");
      };
    });
    try { ctx.setAnswer?.(seq.map(n => n + 1).join("-")); } catch {}
  };

  TASKS.p7_sortstack = async (ctx) => {
    ctx.showTaskUI?.("sortstack", "type the numbers in ascending order" );
    const nums = Array.from({ length: 5 }, () => 10 + Math.floor(Math.random() * 90));
    const ans = nums.slice().sort((a, b) => a - b).join(" ");
    const q = el("div", { class: "mono", text: nums.join(" ") });
    const inp = el("input", { type: "text", placeholder: "sorted" });
    const msg = el("div", { class: "muted", text: "" });
    ctx.taskBody.append(q, inp, msg);
    const submit = () => {
      const v = String(inp.value || "").trim().replace(/\s+/g, " ");
      if (v === ans) return ctx.success?.("ok");
      ctx.penalize?.();
      msg.textContent = "wrong";
    };
    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.onclick = submit;
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    try { ctx.setAnswer?.(ans); } catch {}
  };

  TASKS.p7_ciphershift = async (ctx) => {
    ctx.showTaskUI?.("ciphershift", "decode the Caesar shift" );
    const words = ["ESCAPE", "TRUST", "SIGNAL", "VECTOR", "WINDOW"];
    const plain = words[Math.floor(Math.random() * words.length)];
    const shift = 1 + Math.floor(Math.random() * 5);
    const enc = plain.replace(/[A-Z]/g, (ch) => String.fromCharCode(((ch.charCodeAt(0) - 65 + shift) % 26) + 65));
    const q = el("div", { class: "mono", text: `shift: +${shift}  msg: ${enc}` });
    const inp = el("input", { type: "text", placeholder: "decoded" });
    const msg = el("div", { class: "muted", text: "" });
    ctx.taskBody.append(q, inp, msg);
    const submit = () => {
      const v = String(inp.value || "").trim().toUpperCase();
      if (v === plain) return ctx.success?.("ok");
      ctx.penalize?.();
      msg.textContent = "wrong";
    };
    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.onclick = submit;
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    try { ctx.setAnswer?.(plain); } catch {}
  };

  TASKS.p7_parity = async (ctx) => {
    ctx.showTaskUI?.("parity", "choose the even-parity line" );
    const lines = Array.from({ length: 4 }, () => Array.from({ length: 7 }, () => (Math.random() < 0.5 ? 0 : 1)));
    const parity = (arr) => arr.reduce((a, b) => a + b, 0) % 2;
    let correct = 0;
    for (let i = 0; i < 4; i++) {
      if (parity(lines[i]) === 0) { correct = i; break; }
    }
    const wrap = el("div", { class: "parityList" });
    const msg = el("div", { class: "muted", text: "even parity = even number of 1s" });
    ctx.taskBody.append(msg, wrap);
    lines.forEach((arr, i) => {
      const b = el("button", { type: "button", class: "parityBtn", text: arr.join("") });
      b.onclick = () => {
        if (i === correct) return ctx.success?.("ok");
        ctx.penalize?.();
      };
      wrap.appendChild(b);
    });
    try { ctx.setAnswer?.(`line:${correct + 1}`); } catch {}
  };

  TASKS.p7_patternflip = async (ctx) => {
    ctx.showTaskUI?.("patternflip", "toggle until the board is all on" );
    const wrap = el("div", { class: "grid3" });
    const st = Array.from({ length: 9 }, () => (Math.random() < 0.5 ? 0 : 1));
    const btns = [];
    const toggle = (i) => {
      const coords = [i, i - 1, i + 1, i - 3, i + 3].filter(j => j >= 0 && j < 9);
      coords.forEach(j => st[j] = st[j] ? 0 : 1);
      render();
      if (st.every(v => v === 1)) ctx.success?.("ok");
    };
    const render = () => {
      btns.forEach((b, i) => {
        b.classList.toggle("on", !!st[i]);
      });
    };
    for (let i = 0; i < 9; i++) {
      const b = el("button", { type: "button", class: "gridCell", text: "" });
      b.onclick = () => toggle(i);
      btns.push(b);
      wrap.appendChild(b);
    }
    ctx.taskBody.append(wrap);
    render();
  };

  TASKS.p7_keymaze = async (ctx) => {
    ctx.showTaskUI?.("keymaze", "use arrow keys to reach the exit" );
    const size = 5;
    let x = 0, y = 0;
    const exit = { x: 4, y: 4 };
    const grid = el("div", { class: "maze" });
    const cells = [];
    for (let i = 0; i < size * size; i++) {
      const c = el("div", { class: "mazeCell" });
      cells.push(c);
      grid.appendChild(c);
    }
    const msg = el("div", { class: "muted", text: "" });
    ctx.taskBody.append(msg, grid);
    const idx = (x, y) => y * size + x;
    const render = () => {
      cells.forEach(c => c.className = "mazeCell");
      cells[idx(exit.x, exit.y)].classList.add("exit");
      cells[idx(x, y)].classList.add("you");
    };
    render();
    const onKey = (e) => {
      const k = e.key;
      if (!["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(k)) return;
      e.preventDefault();
      if (k === "ArrowUp") y = Math.max(0, y - 1);
      if (k === "ArrowDown") y = Math.min(size - 1, y + 1);
      if (k === "ArrowLeft") x = Math.max(0, x - 1);
      if (k === "ArrowRight") x = Math.min(size - 1, x + 1);
      render();
      if (x === exit.x && y === exit.y) {
        window.removeEventListener("keydown", onKey, true);
        ctx.success?.("ok");
      }
    };
    window.addEventListener("keydown", onKey, true);
  };

  TASKS.p7_anagram = async (ctx) => {
    ctx.showTaskUI?.("anagram", "unscramble" );
    const words = ["WORKER","SECURITY","SYSTEM","GLASS","STATIC"];
    const w = words[Math.floor(Math.random() * words.length)];
    const scr = w.split("").sort(() => Math.random() - 0.5).join("");
    const q = el("div", { class: "mono", text: scr });
    const inp = el("input", { type: "text", placeholder: "word" });
    const msg = el("div", { class: "muted", text: "" });
    ctx.taskBody.append(q, inp, msg);
    const submit = () => {
      const v = String(inp.value || "").trim().toUpperCase();
      if (v === w) return ctx.success?.("ok");
      ctx.penalize?.();
      msg.textContent = "wrong";
    };
    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.onclick = submit;
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    try { ctx.setAnswer?.(w); } catch {}
  };

  TASKS.p7_gridroute = async (ctx) => {
    ctx.showTaskUI?.("gridroute", "click a path from S to E" );
    const msg = el("div", { class: "muted", text: "S = start, E = exit. click a connected path." });
    const wrap = el("div", { class: "grid3" });
    const start = 0;
    const end = 8;
    const path = new Set([start]);
    const btns = [];
    const neighbors = (i) => {
      const r = Math.floor(i / 3), c = i % 3;
      const out = [];
      if (r > 0) out.push(i - 3);
      if (r < 2) out.push(i + 3);
      if (c > 0) out.push(i - 1);
      if (c < 2) out.push(i + 1);
      return out;
    };
    const render = () => {
      btns.forEach((b, i) => {
        b.classList.toggle("on", path.has(i));
        b.textContent = i === start ? "S" : i === end ? "E" : "";
      });
    };
    for (let i = 0; i < 9; i++) {
      const b = el("button", { type: "button", class: "gridCell", text: "" });
      b.onclick = () => {
        if (i === start) return;
        const ok = [...path].some(p => neighbors(p).includes(i));
        if (!ok) { ctx.penalize?.(); return; }
        path.add(i);
        render();
        if (path.has(end)) ctx.success?.("ok");
      };
      btns.push(b);
      wrap.appendChild(b);
    }
    ctx.taskBody.append(msg, wrap);
    render();
  };

  TASKS.p7_timerlock = async (ctx) => {
    ctx.showTaskUI?.("timerlock", "wait for the correct beat then press" );
    const windowMs = 260;
    const period = 1200;
    const start = performance.now();
    const msg = el("div", { class: "muted", text: "press when the indicator is ON" });
    const ind = el("div", { class: "lockIndicator" });
    const btn = el("button", { type: "button", class: "taskBtn", text: "PRESS" });
    ctx.taskBody.append(msg, ind, btn);
    const tick = () => {
      const t = (performance.now() - start) % period;
      ind.classList.toggle("on", t < windowMs);
      if (!ctx.__done__) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    btn.onclick = () => {
      const t = (performance.now() - start) % period;
      if (t < windowMs) return ctx.success?.("ok");
      ctx.penalize?.();
    };
  };

})();


