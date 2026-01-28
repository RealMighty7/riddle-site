// tasks.js (FULL REPLACEMENT)
// Provides: window.TASKS + window.registerTaskPool
// Compatible with your existing "reg({ ... })" packs style.
// Fixes:
// - tasks never hang (every task resolves)
// - admin skip works (window.__ADMIN_FORCE_OK or "admin:skip")
// - publishes admin task + hint events ("admin:task" / "admin:hint")
// - safe cleanup of listeners per-task via scoped()

(() => {
  // ============================================================
  // ADMIN SKIP (global)
  // ============================================================
  window.__ADMIN_FORCE_OK = window.__ADMIN_FORCE_OK || false;

  document.addEventListener(
    "admin:skip",
    () => {
      window.__ADMIN_FORCE_OK = true;
    },
    { capture: true }
  );

  function consumeAdminSkip() {
    if (!window.__ADMIN_FORCE_OK) return false;
    window.__ADMIN_FORCE_OK = false;
    return true;
  }

  function publishAdminTask(taskId) {
    try {
      document.dispatchEvent(new CustomEvent("admin:task", { detail: { taskId } }));
    } catch {}
  }

  function publishAdminHint(taskId, hint) {
    try {
      document.dispatchEvent(
        new CustomEvent("admin:hint", { detail: { taskId, hint } })
      );
    } catch {}
  }

  // ============================================================
  // UTIL
  // ============================================================
  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function rndInt(a, b) {
    a |= 0;
    b |= 0;
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return (lo + Math.floor(Math.random() * (hi - lo + 1))) | 0;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function scoped() {
    const offs = [];
    const api = {
      on(target, type, fn, opts) {
        if (!target || !target.addEventListener) return;
        target.addEventListener(type, fn, opts);
        offs.push(() => {
          try {
            target.removeEventListener(type, fn, opts);
          } catch {}
        });
      },
      clear() {
        while (offs.length) {
          try {
            offs.pop()();
          } catch {}
        }
      },
    };
    return api;
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }

  function note(text) {
    return el("div", "task-note", text || "");
  }

  function makeInput(ph) {
    const i = document.createElement("input");
    i.type = "text";
    i.autocomplete = "off";
    i.spellcheck = false;
    i.placeholder = ph || "";
    return i;
  }

  // ============================================================
  // TASK FRAME HELPERS
  // ============================================================
  function clearActions(ctx) {
    try {
      ctx.taskPrimary.onclick = null;
      ctx.taskSecondary.onclick = null;
      ctx.taskPrimary.disabled = true;
      ctx.taskSecondary.disabled = true;
      ctx.taskSecondary.classList.add("hidden");
    } catch {}
  }

  function begin(ctx, title, desc) {
    publishAdminTask(title);

    ctx.showTaskUI(title, desc || "");
    ctx.taskBody.innerHTML = "";

    // reset buttons safely
    clearActions(ctx);

    // default: keep primary disabled until task enables it
    try {
      ctx.taskPrimary.textContent = "continue";
      ctx.taskPrimary.disabled = true;
    } catch {}

    // Admin skip: immediate resolve hook is set inside safeTask wrapper.
  }

  async function safeTask(taskId, fn, ctx, args) {
    // Always resolve; always cleanup.
    const L = scoped();
    let resolved = false;

    const finish = () => {
      if (resolved) return;
      resolved = true;
      L.clear();
      clearActions(ctx);
      resolveOuter?.();
    };

    // admin skip should force-complete any task instantly
    const adminSkipHandler = () => {
      if (!consumeAdminSkip()) return;
      // lightweight visual cue (don’t penalize)
      try {
        const m = note("admin override.");
        m.style.opacity = "0.65";
        ctx.taskBody.appendChild(m);
      } catch {}
      finish();
    };

    L.on(document, "admin:skip", adminSkipHandler, { capture: true });

    // also poll the flag (covers cases where skip was set before listener)
    if (consumeAdminSkip()) {
      finish();
      return;
    }

    let resolveOuter;
    const outer = new Promise((r) => (resolveOuter = r));

    try {
      // give fn a way to register scoped listeners if it wants
      ctx.__scoped = L;

      const p = fn(ctx, args || {});
      // if the task returns a promise, await it, but ensure it can’t hang forever
      // (in practice your tasks resolve on user action)
      if (p && typeof p.then === "function") {
        await Promise.race([
          p,
          outer, // admin skip
        ]);
      } else {
        // non-promise task; just finish
        finish();
      }
    } catch (e) {
      console.warn("[task] crashed:", taskId, e);
      try {
        ctx.glitch?.();
      } catch {}
      try {
        const m = note("Task failed. Continuing.");
        m.style.color = "rgba(255,190,190,.95)";
        ctx.taskBody.appendChild(m);
      } catch {}
    } finally {
      finish();
    }
  }

// ============================================================
// REGISTRY + POOLS  (PATCH: supports late pack registration)
// ============================================================
const RAW = {};      // id -> raw task fn
const WRAPPED = {};  // id -> safe wrapped task fn
const POOLS = {};    // name -> [{id,w}]

// Public TASKS object main.js reads from (keeps growing as packs load)
window.TASKS = window.TASKS || WRAPPED;

// Public pool register (packs may call this)
function registerTaskPool(name, list) {
  if (!name) return;
  POOLS[name] = Array.isArray(list) ? list.slice() : [];
}
window.registerTaskPool = registerTaskPool;
  // packs expect registerTasks(...)
window.registerTasks = window.registerTasks || reg;


// Public reg() so /packs/pack1..pack4 can register tasks
function reg(map) {
  Object.entries(map || {}).forEach(([id, fn]) => {
    if (typeof fn !== "function") return;

    RAW[id] = fn;

    // Wrap immediately so tasks added later still get safeTask behavior
    WRAPPED[id] = async (ctx, args) => safeTask(id, RAW[id], ctx, args);

    // Ensure window.TASKS points to the wrapped one
    window.TASKS[id] = WRAPPED[id];
  });
}
  

// expose reg for legacy packs
// expose reg for legacy packs (and older names)
window.reg = window.reg || reg;

// some packs used these names:
window.registerTasks = window.registerTasks || reg;
window.registerTask = window.registerTask || ((id, fn) => reg({ [id]: fn }));


// Optional: expose pool data if your "random" task needs it
window.__TASK_POOLS = POOLS;


  // ============================================================
  // PACK 5 (FULLY WIRED)
  // ============================================================
  reg({
    keypad_4: async (ctx) => {
      begin(ctx, "KEYPAD", "Enter the 4-digit access code. (Click digits.)");

      const code = String(rndInt(1000, 9999));
      publishAdminHint("KEYPAD", code);

      const display = el("div", "pill", "code: ••••");
      display.style.marginTop = "10px";
      ctx.taskBody.appendChild(display);
      ctx.taskBody.appendChild(note("Hint: It flashed in the corner. You caught it, right?"));

      const read = el("div", "pill", "input: ");
      read.style.marginTop = "10px";
      ctx.taskBody.appendChild(read);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      const flashMs = clamp(1100 - ctx.difficultyBoost() * 90, 420, 1100);
      display.textContent = `code: ${code}`;
      await wait(flashMs);
      display.textContent = "code: ••••";

      let input = "";

      const grid = el("div");
      grid.style.display = "grid";
      grid.style.gridTemplateColumns = "repeat(3, minmax(0, 1fr))";
      grid.style.gap = "10px";
      grid.style.marginTop = "12px";
      grid.style.maxWidth = "320px";

      const digits = shuffle(["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]);
      let resolve;
      const done = () => resolve?.();

      digits.forEach((d) => {
        const b = el("button", "sim-btn", d);
        b.type = "button";
        b.onclick = () => {
          if (consumeAdminSkip()) return done();

          if (input.length >= 4) return;
          input += d;
          read.textContent = `input: ${input.padEnd(4, "•")}`;
          if (input.length === 4) {
            if (input !== code) {
              msg.textContent = "Access denied.";
              ctx.glitch();
              ctx.penalize(1, "bad code");
              input = "";
              read.textContent = "input: ";
              return;
            }
            msg.style.color = "rgba(232,237,247,0.85)";
            msg.textContent = "Access granted.";
            ctx.taskPrimary.textContent = "continue";
            ctx.taskPrimary.disabled = false;
            ctx.taskPrimary.onclick = () => done();
          }
        };
        grid.appendChild(b);
      });

      const clear = el("button", "sim-btn", "clear");
      clear.type = "button";
      clear.style.gridColumn = "span 3";
      clear.onclick = () => {
        if (consumeAdminSkip()) return done();
        input = "";
        read.textContent = "input: ";
        msg.textContent = "";
      };
      grid.appendChild(clear);

      ctx.taskBody.appendChild(grid);

      return new Promise((r) => (resolve = r));
    },

    wire_cut: async (ctx) => {
      begin(ctx, "WIRES", "Cut the safe wire. One cut only.");
      const wires = shuffle(["RED", "BLUE", "GREEN", "WHITE"]);
      const safe = "WHITE";
      publishAdminHint("WIRES", safe);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const row = el("div");
      row.style.marginTop = "12px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      let resolve;
      const done = () => resolve?.();

      wires.forEach((w) => {
        const b = el("button", "sim-btn", `cut ${w}`);
        b.type = "button";
        b.onclick = () => {
          if (consumeAdminSkip()) return done();

          if (w !== safe) {
            msg.textContent = "Wrong wire. Surge detected.";
            ctx.glitch();
            ctx.penalize(1, "surge");
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Safe wire cut.";
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => done();
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      return new Promise((r) => (resolve = r));
    },

    highest_number: async (ctx) => {
      begin(ctx, "CALIBRATE", "Click the highest number.");
      const nums = shuffle([rndInt(10, 50), rndInt(51, 90), rndInt(91, 130), rndInt(131, 180)]);
      const high = Math.max(...nums);
      publishAdminHint("CALIBRATE", String(high));

      const row = el("div");
      row.style.marginTop = "12px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      let resolve;
      const done = () => resolve?.();

      nums.forEach((n) => {
        const b = el("button", "sim-btn", String(n));
        b.type = "button";
        b.onclick = () => {
          if (consumeAdminSkip()) return done();

          if (n !== high) {
            msg.textContent = "No.";
            ctx.glitch();
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Ok.";
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => done();
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      return new Promise((r) => (resolve = r));
    },

    mirror_match: async (ctx) => {
      begin(ctx, "MIRROR", "Pick the option that is the mirror (reversed) of the target.");
      const words = ["pane", "static", "echo", "buffer", "trace", "vault", "quiet", "audit"];
      const w = words[rndInt(0, words.length - 1)];
      const target = w;
      const correct = w.split("").reverse().join("");
      publishAdminHint("MIRROR", correct);

      const opts = shuffle([correct, w.toUpperCase(), w + w, w.slice(1) + w[0]]);

      ctx.taskBody.appendChild(note(`target: ${target}`));

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const row = el("div");
      row.style.marginTop = "12px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      let resolve;
      const done = () => resolve?.();

      opts.forEach((o) => {
        const b = el("button", "sim-btn", o);
        b.type = "button";
        b.onclick = () => {
          if (consumeAdminSkip()) return done();

          if (o !== correct) {
            msg.textContent = "Mismatch.";
            ctx.glitch();
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Matched.";
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => done();
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      return new Promise((r) => (resolve = r));
    },

    steady_hand: async (ctx) => {
      begin(ctx, "STEADY HAND", "Keep your cursor inside the box until the timer ends.");
      const sec = clamp(2 + Math.floor(ctx.difficultyBoost() / 2), 2, 7);
      publishAdminHint("STEADY HAND", `${sec}s`);

      const box = el("div");
      box.style.marginTop = "12px";
      box.style.width = "min(520px, 100%)";
      box.style.height = "140px";
      box.style.borderRadius = "14px";
      box.style.border = "1px solid rgba(255,255,255,0.18)";
      box.style.background = "rgba(0,0,0,0.18)";
      box.style.position = "relative";
      box.style.overflow = "hidden";

      const label = el("div", "pill", `time: ${sec}s`);
      label.style.position = "absolute";
      label.style.left = "10px";
      label.style.top = "10px";

      box.appendChild(label);
      ctx.taskBody.appendChild(box);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      let inside = false;
      const L = ctx.__scoped || scoped();
      L.on(box, "mouseenter", () => { inside = true; });
      L.on(box, "mouseleave", () => { inside = false; });

      let resolve;
      const done = () => resolve?.();

      const start = performance.now();

      const tick = () => {
        if (consumeAdminSkip()) return done();

        const t = (performance.now() - start) / 1000;
        const left = Math.max(0, Math.ceil(sec - t));
        label.textContent = `time: ${left}s`;

        if (!inside) {
          msg.textContent = "You slipped.";
          ctx.glitch();
          ctx.penalize(1, "slip");
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => done();
          return;
        }

        if (t >= sec) {
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Steady.";
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => done();
          return;
        }
        requestAnimationFrame(tick);
      };

      msg.textContent = "Move cursor into the box to start.";
      const startWatcher = () => {
        if (consumeAdminSkip()) return done();
        if (!inside) return requestAnimationFrame(startWatcher);
        msg.textContent = "";
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(startWatcher);

      return new Promise((r) => (resolve = r));
    },

    port_select: async (ctx) => {
      begin(ctx, "ROUTE", "Select the only allowed port.");
      const opts = shuffle(["22", "80", "443", "8080"]);
      const correct = "443";
      publishAdminHint("ROUTE", `:${correct}`);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const row = el("div");
      row.style.marginTop = "12px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      let resolve;
      const done = () => resolve?.();

      opts.forEach((p) => {
        const b = el("button", "sim-btn", `:${p}`);
        b.type = "button";
        b.onclick = () => {
          if (consumeAdminSkip()) return done();

          if (p !== correct) {
            msg.textContent = "Blocked.";
            ctx.glitch();
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Routed.";
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => done();
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      return new Promise((r) => (resolve = r));
    },

    click_on_zero: async (ctx) => {
      begin(ctx, "TIME SYNC", "Click when the counter hits 0.");
      const ms = clamp(1800 + ctx.difficultyBoost() * 250, 1800, 5200);
      publishAdminHint("TIME SYNC", `${ms}ms`);

      const pill = el("div", "pill", "ready…");
      pill.style.marginTop = "12px";

      const btn = el("button", "sim-btn", "click");
      btn.type = "button";
      btn.style.marginTop = "12px";

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      ctx.taskBody.appendChild(pill);
      ctx.taskBody.appendChild(btn);
      ctx.taskBody.appendChild(msg);

      const start = performance.now();
      let doneFlag = false;

      let resolve;
      const done = () => resolve?.();

      const tick = () => {
        if (doneFlag) return;
        const t = performance.now() - start;
        const left = Math.max(0, ms - t);
        pill.textContent = `t-minus: ${Math.ceil(left)}ms`;
        if (left <= 0) pill.textContent = "t-minus: 0";
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

      btn.onclick = () => {
        if (consumeAdminSkip()) return done();
        if (doneFlag) return;

        const t = performance.now() - start;
        const left = ms - t;
        doneFlag = true;

        const windowMs = clamp(170 - ctx.difficultyBoost() * 10, 90, 170);
        publishAdminHint("TIME SYNC", `window ±${windowMs}ms`);

        if (Math.abs(left) > windowMs) {
          msg.textContent = "Out of sync.";
          ctx.glitch();
          ctx.penalize(1, "timing");
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => done();
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Synced.";
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.disabled = false;
        ctx.taskPrimary.onclick = () => done();
      };

      return new Promise((r) => (resolve = r));
    },

    private_ip: async (ctx) => {
      begin(ctx, "ROUTE TABLE", "Click the only private IP address.");

      const correct = `10.${rndInt(0, 255)}.${rndInt(0, 255)}.${rndInt(1, 254)}`;
      publishAdminHint("ROUTE TABLE", correct);

      const other = [
        `${rndInt(11, 223)}.${rndInt(0,255)}.${rndInt(0,255)}.${rndInt(1,254)}`,
        `${rndInt(11, 223)}.${rndInt(0,255)}.${rndInt(0,255)}.${rndInt(1,254)}`,
        `${rndInt(11, 223)}.${rndInt(0,255)}.${rndInt(0,255)}.${rndInt(1,254)}`,
      ];
      const opts = shuffle([correct, ...other]);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      let resolve;
      const done = () => resolve?.();

      opts.forEach((o) => {
        const b = el("button", "sim-btn", o);
        b.type = "button";
        b.style.display = "block";
        b.style.width = "100%";
        b.style.textAlign = "left";
        b.style.marginTop = "10px";
        b.onclick = () => {
          if (consumeAdminSkip()) return done();

          if (o !== correct) {
            msg.textContent = "Public route.";
            ctx.glitch();
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Private route selected.";
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => done();
        };
        ctx.taskBody.appendChild(b);
      });

      ctx.taskBody.appendChild(msg);
      return new Promise((r) => (resolve = r));
    },

    sum_chunks: async (ctx) => {
      begin(ctx, "CHECKSUM", "Sum the 2-digit chunks. Type the result.");
      const n = clamp(3 + Math.floor(ctx.difficultyBoost() / 2), 3, 7);
      const chunks = [];
      let sum = 0;
      for (let i = 0; i < n; i++) {
        const c = rndInt(10, 99);
        chunks.push(String(c));
        sum += c;
      }

      publishAdminHint("CHECKSUM", String(sum));

      ctx.taskBody.appendChild(note(`chunks: ${chunks.join(" ")}`));
      const inp = makeInput("sum");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      const done = () => resolve?.();

      ctx.taskPrimary.onclick = () => {
        if (consumeAdminSkip()) return done();

        const got = (inp.value || "").trim();
        if (got !== String(sum)) {
          msg.textContent = "Rejected.";
          ctx.glitch();
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Accepted.";
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.onclick = () => done();
      };

      return new Promise((r) => (resolve = r));
    },

    devowel: async (ctx) => {
      begin(ctx, "SANITIZE", "Type the command with vowels removed (a,e,i,o,u).");
      const cmds = ["tracebuffer", "auditmirror", "vaultaccess", "quietmode", "sessionmap", "logrotate"];
      const cmd = cmds[rndInt(0, cmds.length - 1)];
      const ans = cmd.replace(/[aeiou]/g, "");

      publishAdminHint("SANITIZE", ans);

      ctx.taskBody.appendChild(note(`command: ${cmd}`));
      const inp = makeInput("no vowels…");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      const done = () => resolve?.();

      ctx.taskPrimary.onclick = () => {
        if (consumeAdminSkip()) return done();

        const got = (inp.value || "").trim().toLowerCase();
        if (got !== ans) {
          msg.textContent = "Not sanitized.";
          ctx.glitch();
          ctx.penalize(1, "dirty cmd");
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Sanitized.";
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.onclick = () => done();
      };

      return new Promise((r) => (resolve = r));
    },

    pins_3: async (ctx) => {
      begin(ctx, "LOCK PINS", "Click pins in order: 1 → 2 → 3. Any mistake resets.");
      const pins = shuffle(["1", "2", "3"]);
      let idx = 0;

      publishAdminHint("LOCK PINS", "1 → 2 → 3");

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const row = el("div");
      row.style.marginTop = "12px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      let resolve;
      const done = () => resolve?.();

      pins.forEach((p) => {
        const b = el("button", "sim-btn", `pin ${p}`);
        b.type = "button";
        b.onclick = () => {
          if (consumeAdminSkip()) return done();

          if (p !== String(idx + 1)) {
            idx = 0;
            msg.textContent = "Slip. Reset.";
            ctx.glitch();
            return;
          }
          idx++;
          msg.textContent = `set (${idx}/3)`;
          if (idx === 3) {
            msg.style.color = "rgba(232,237,247,0.85)";
            msg.textContent = "Unlocked.";
            ctx.taskPrimary.textContent = "continue";
            ctx.taskPrimary.disabled = false;
            ctx.taskPrimary.onclick = () => done();
          }
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      return new Promise((r) => (resolve = r));
    },

    has_number: async (ctx) => {
      begin(ctx, "MISMATCH", "Click the only option that contains a number.");
      const correct = "echo07";
      const opts = shuffle(["echo", correct, "static", "vault"]);

      publishAdminHint("MISMATCH", correct);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const row = el("div");
      row.style.marginTop = "12px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      let resolve;
      const done = () => resolve?.();

      opts.forEach((o) => {
        const b = el("button", "sim-btn", o);
        b.type = "button";
        b.onclick = () => {
          if (consumeAdminSkip()) return done();

          if (o !== correct) {
            msg.textContent = "No.";
            ctx.glitch();
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Found.";
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => done();
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      return new Promise((r) => (resolve = r));
    },

    retype_case: async (ctx) => {
      begin(ctx, "RETYPE", "Retype exactly (case-sensitive).");
      const parts = ["Echo", "STATIC", "VaUlT", "pane", "TrAcE", "buffer"];
      const line = `${parts[rndInt(0, 5)]}-${parts[rndInt(0, 5)]}-${rndInt(10, 99)}`;

      publishAdminHint("RETYPE", line);

      const shown = el("div", "pill", line);
      shown.style.marginTop = "12px";
      ctx.taskBody.appendChild(shown);

      const inp = makeInput("retype…");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      const done = () => resolve?.();

      ctx.taskPrimary.onclick = () => {
        if (consumeAdminSkip()) return done();

        const got = (inp.value || "").trim();
        if (got !== line) {
          msg.textContent = "Mismatch.";
          ctx.glitch();
          ctx.penalize(1, "typo");
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Exact.";
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.onclick = () => done();
      };

      return new Promise((r) => (resolve = r));
    },

    binary_8: async (ctx) => {
      begin(ctx, "BINARY", "Click the only valid 8-bit binary string.");
      const makeBin = () =>
        Array.from({ length: 8 }, () => (Math.random() < 0.5 ? "0" : "1")).join("");
      const correct = makeBin();
      const opts = shuffle([correct, makeBin().slice(0, 7), makeBin() + "2", makeBin().replace(/0/g, "O")]);

      publishAdminHint("BINARY", correct);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const row = el("div");
      row.style.marginTop = "12px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      let resolve;
      const done = () => resolve?.();

      opts.forEach((o) => {
        const b = el("button", "sim-btn", o);
        b.type = "button";
        b.onclick = () => {
          if (consumeAdminSkip()) return done();

          if (o !== correct) {
            msg.textContent = "Invalid.";
            ctx.glitch();
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Valid.";
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => done();
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      return new Promise((r) => (resolve = r));
    },

    arrow_memory: async (ctx) => {
      begin(ctx, "SEQUENCE", "Memorize the arrows. Then repeat by clicking.");
      const arrows = ["↑", "↓", "←", "→"];
      const len = clamp(4 + Math.floor(ctx.difficultyBoost() / 2), 4, 8);
      const seq = Array.from({ length: len }, () => arrows[rndInt(0, 3)]);

      publishAdminHint("SEQUENCE", seq.join(" "));

      const shown = el("div", "pill", seq.join(" "));
      shown.style.marginTop = "12px";
      shown.style.fontSize = "22px";
      shown.style.letterSpacing = ".2em";
      ctx.taskBody.appendChild(shown);

      await wait(clamp(2200 - ctx.difficultyBoost() * 120, 900, 2200));
      shown.textContent = "—";

      const row = el("div");
      row.style.marginTop = "12px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      const out = el("div", "pill", "input: ");
      out.style.marginTop = "12px";

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      let input = [];
      const render = () => {
        out.textContent = `input: ${input.join(" ")}`;
      };
      render();

      const fail = () => {
        input = [];
        render();
        msg.textContent = "Wrong. Reset.";
        ctx.glitch();
        ctx.penalize(1, "sequence fail");
      };

      let resolve;
      const done = () => resolve?.();

      arrows.forEach((a) => {
        const b = el("button", "sim-btn", a);
        b.type = "button";
        b.style.minWidth = "54px";
        b.onclick = () => {
          if (consumeAdminSkip()) return done();

          if (input.length >= seq.length) return;
          input.push(a);
          render();
          for (let i = 0; i < input.length; i++) {
            if (input[i] !== seq[i]) return fail();
          }
          if (input.length === seq.length) {
            msg.style.color = "rgba(232,237,247,0.85)";
            msg.textContent = "Matched.";
            ctx.taskPrimary.textContent = "continue";
            ctx.taskPrimary.disabled = false;
            ctx.taskPrimary.onclick = () => done();
          }
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(out);
      ctx.taskBody.appendChild(msg);

      return new Promise((r) => (resolve = r));
    },

    last_three: async (ctx) => {
      begin(ctx, "TAIL", "Type the last 3 characters of the string.");
      const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
      const len = clamp(10 + ctx.difficultyBoost() * 2, 10, 22);
      let s = "";
      for (let i = 0; i < len; i++) s += chars[rndInt(0, chars.length - 1)];
      const ans = s.slice(-3);

      publishAdminHint("TAIL", ans);

      ctx.taskBody.appendChild(note(`string: ${s}`));
      const inp = makeInput("last 3…");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      const done = () => resolve?.();

      ctx.taskPrimary.onclick = () => {
        if (consumeAdminSkip()) return done();

        const got = (inp.value || "").trim();
        if (got !== ans) {
          msg.textContent = "No.";
          ctx.glitch();
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Ok.";
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.onclick = () => done();
      };

      return new Promise((r) => (resolve = r));
    },

    ends_tmp: async (ctx) => {
      begin(ctx, "FILTER", "Click the only string that ends with .tmp");
      const correct = "logs/quiet.tmp";
      const opts = shuffle(["logs/quiet.tmpx", "logs/quiet", correct, "logs/quiet.tmp/"]);

      publishAdminHint("FILTER", correct);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      let resolve;
      const done = () => resolve?.();

      opts.forEach((o) => {
        const b = el("button", "sim-btn", o);
        b.type = "button";
        b.style.display = "block";
        b.style.width = "100%";
        b.style.textAlign = "left";
        b.style.marginTop = "10px";
        b.onclick = () => {
          if (consumeAdminSkip()) return done();

          if (o !== correct) {
            msg.textContent = "Rejected.";
            ctx.glitch();
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Ok.";
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => done();
        };
        ctx.taskBody.appendChild(b);
      });

      ctx.taskBody.appendChild(msg);
      return new Promise((r) => (resolve = r));
    },

    click_pressure: async (ctx) => {
      begin(ctx, "PRESSURE", "Click exactly N times before the timer ends.");
      const need = clamp(6 + ctx.difficultyBoost(), 6, 16);
      const ms = clamp(2200 + ctx.difficultyBoost() * 250, 2200, 5600);

      publishAdminHint("PRESSURE", `${need} clicks`);

      const pill = el("div", "pill", `target: ${need} clicks`);
      pill.style.marginTop = "12px";
      ctx.taskBody.appendChild(pill);

      const timer = el("div", "pill", `time: ${Math.ceil(ms / 1000)}s`);
      timer.style.marginTop = "10px";
      ctx.taskBody.appendChild(timer);

      const btn = el("button", "sim-btn", "click");
      btn.type = "button";
      btn.style.marginTop = "12px";
      ctx.taskBody.appendChild(btn);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      let count = 0;
      btn.onclick = () => {
        if (consumeAdminSkip()) return done();
        count++;
        btn.textContent = `click (${count})`;
        if (count > need) {
          msg.textContent = "Too many.";
          ctx.glitch();
          ctx.penalize(1, "over");
        }
      };

      const start = performance.now();
      let resolve;
      const done = () => resolve?.();

      const tick = () => {
        if (consumeAdminSkip()) return done();

        const t = performance.now() - start;
        const left = Math.max(0, ms - t);
        timer.textContent = `time: ${Math.ceil(left / 1000)}s`;

        if (t >= ms) {
          btn.disabled = true;
          if (count !== need) {
            msg.textContent = `Missed. (${count}/${need})`;
            ctx.glitch();
            ctx.penalize(1, "miss");
          } else {
            msg.style.color = "rgba(232,237,247,0.85)";
            msg.textContent = "Exact.";
          }
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => done();
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

      return new Promise((r) => (resolve = r));
    },

    escape_hint_line: async (ctx) => {
      begin(ctx, "MESSAGE", "Pick the line that helps you leave.");
      const lines = shuffle([
        "Security: Stay still.",
        "System: Mirror writes are permanent.",
        "Worker: If you can’t be brave, be boring.",
        "System: Increase retention window.",
      ]);
      const correct = "Worker: If you can’t be brave, be boring.";

      publishAdminHint("MESSAGE", correct);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      let resolve;
      const done = () => resolve?.();

      lines.forEach((t) => {
        const b = el("button", "sim-btn", t);
        b.type = "button";
        b.style.display = "block";
        b.style.width = "100%";
        b.style.textAlign = "left";
        b.style.marginTop = "10px";
        b.onclick = () => {
          if (consumeAdminSkip()) return done();

          if (t !== correct) {
            msg.textContent = "Wrong read.";
            ctx.glitch();
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "You heard it.";
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => done();
        };
        ctx.taskBody.appendChild(b);
      });
      ctx.taskBody.appendChild(msg);

      return new Promise((r) => (resolve = r));
    },

    toggles_3: async (ctx) => {
      begin(ctx, "SWITCHES", "Flip all switches to ON.");
      const n = 3;
      const state = Array.from({ length: n }, () => Math.random() < 0.5);

      publishAdminHint("SWITCHES", "all ON");

      const row = el("div");
      row.style.marginTop = "12px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      const msg = note("");
      msg.style.color = "rgba(232,237,247,0.82)";
      const out = el("div", "pill", "");
      out.style.marginTop = "12px";

      const render = () => {
        out.textContent = `state: ${state.map((s) => (s ? "ON" : "OFF")).join("  ")}`;
        const ok = state.every(Boolean);
        ctx.taskPrimary.disabled = !ok;
        if (ok) {
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Ready.";
        } else {
          msg.style.color = "rgba(232,237,247,0.82)";
          msg.textContent = "Flip them all. Quietly.";
        }
      };

      let resolve;
      const done = () => resolve?.();

      for (let i = 0; i < n; i++) {
        const b = el("button", "sim-btn", `switch ${i + 1}`);
        b.type = "button";
        b.onclick = () => {
          if (consumeAdminSkip()) return done();
          state[i] = !state[i];
          render();
        };
        row.appendChild(b);
      }

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(out);
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "continue";
      ctx.taskPrimary.disabled = true;
      ctx.taskPrimary.onclick = () => done();

      render();
      return new Promise((r) => (resolve = r));
    },
  });

  // Pool used by your dialogue steps if you reference it
  registerTaskPool("pack5", [
    { id: "keypad_4", w: 1 },
    { id: "wire_cut", w: 1 },
    { id: "highest_number", w: 1 },
    { id: "mirror_match", w: 1 },
    { id: "steady_hand", w: 1 },
    { id: "port_select", w: 1 },
    { id: "click_on_zero", w: 1 },
    { id: "private_ip", w: 1 },
    { id: "sum_chunks", w: 1 },
    { id: "devowel", w: 1 },
    { id: "pins_3", w: 1 },
    { id: "has_number", w: 1 },
    { id: "retype_case", w: 1 },
    { id: "binary_8", w: 1 },
    { id: "arrow_memory", w: 1 },
    { id: "last_three", w: 1 },
    { id: "ends_tmp", w: 1 },
    { id: "click_pressure", w: 1 },
    { id: "escape_hint_line", w: 1 },
    { id: "toggles_3", w: 1 },
  ]);
// ============================================================
// COMPAT TASKS USED BY DIALOGUE
// - random: picks a task from a pool (supports weights)
// - checksum: alias -> sum_chunks (or whatever you prefer)
// ============================================================
reg({
  // DIALOGUE uses: { task:"random", args:{ pool:"pack5" } } or { pool:"AUTO" }
  random: async (ctx, args = {}) => {
    const poolName = String(args.pool || args.poolName || "pack5");
    const pools = window.__TASK_POOLS || {};
    let list = pools[poolName];
    
    // ✅ fallback: if DIALOGUE asks for "core" but it's not registered,
    // use pack5, then any first available pool.
    if (!Array.isArray(list) || !list.length) {
      list = pools.pack5;
    
      if (!Array.isArray(list) || !list.length) {
        const firstPool = Object.keys(pools).find((k) => Array.isArray(pools[k]) && pools[k].length);
        if (firstPool) list = pools[firstPool];
      }
    }


    // weighted pick
    const total = list.reduce((a, it) => a + Math.max(0, Number(it.w || 1)), 0) || list.length;
    let roll = Math.random() * total;

    let picked = list[0]?.id;
    for (const it of list) {
      roll -= Math.max(0, Number(it.w || 1));
      if (roll <= 0) { picked = it.id; break; }
    }

    const fn = (window.TASKS || {})[picked];
    if (!fn) {
      ctx.showTaskUI("PROCEDURE", `Missing task: ${picked}`);
      ctx.taskBody.textContent = `task "${picked}" not registered.`;
      ctx.taskPrimary.textContent = "continue";
      ctx.taskPrimary.disabled = false;
      await new Promise((r) => (ctx.taskPrimary.onclick = r));
      return;
    }

    await fn(ctx, args.innerArgs || args.args || {});
  },

  // if your dialogue references "checksum"
  checksum: async (ctx, args) => {
    const fn = (window.TASKS || {}).sum_chunks;
    if (fn) return fn(ctx, args);
    // fallback: don't hang
    ctx.showTaskUI("CHECKSUM", "Procedure missing. Continuing.");
    ctx.taskPrimary.textContent = "continue";
    ctx.taskPrimary.disabled = false;
    await new Promise((r) => (ctx.taskPrimary.onclick = r));
  },
  // If your dialogue expects a "core" pool, point it at pack5 for now.
registerTaskPool("core", (window.__TASK_POOLS?.pack5 || []).slice());
});
})();
