// packs/pack1.js
// Registers tasks into window.TASKS via window.registerTasks()
// Also registers TASK_POOLS.pack1 for the random router.
// --- pack safety shim (must be FIRST) ---
(() => {
  window.TASKS = window.TASKS || {};
  window.TASK_POOLS = window.TASK_POOLS || {};

  if (typeof window.registerTasks !== "function") {
    window.registerTasks = (defs) => {
      try { Object.assign(window.TASKS, defs || {}); } catch {}
    };
  }
  if (typeof window.registerTaskPool !== "function") {
    window.registerTaskPool = (name, pool) => {
      try { window.TASK_POOLS[String(name)] = Array.isArray(pool) ? pool : []; } catch {}
    };
  }
})();

(() => {
  const reg = window.registerTasks;
  const regPool = window.registerTaskPool;

  if (!reg) {
    console.error("registerTasks missing — load tasks.js before packs/pack1.js");
    return;
  }

  // Helpers (pack-local)
  const el = (t, c, txt) => {
    const d = document.createElement(t);
    if (c) d.className = c;
    if (txt !== undefined) d.textContent = txt;
    return d;
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const rndInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const begin = (ctx, title, desc) => {
    ctx.showTaskUI(title, desc);
    ctx.taskPrimary.textContent = "continue";
    ctx.taskPrimary.disabled = true;
    ctx.taskPrimary.onclick = null;
    ctx.taskSecondary.classList.add("hidden");
    ctx.taskBody.innerHTML = "";
  };

  const note = (t, kind = "note") => {
    const n = el("div");
    n.textContent = t ?? "";
    n.className =
      kind === "error" ? "task-error" :
      kind === "ok" ? "task-ok" :
      "task-note";
    return n;
  };

  const makeInput = (ph) => {
    const i = el("input");
    i.placeholder = ph || "";
    i.autocomplete = "off";
    i.spellcheck = false;
    i.style.width = "min(520px, 100%)";
    i.style.marginTop = "10px";
    return i;
  };

  // ✅ single success gate for all tasks (writes admin answer too)
  const finish = (ctx, resolve, answer) => {
    try { ctx.setAnswer?.(answer); } catch {}
    ctx.taskPrimary.textContent = "continue";
    ctx.taskPrimary.disabled = false;
    ctx.taskPrimary.onclick = () => resolve();
  };

  // ✅ unified wrong handler (counts toward +3 resistance + haywire)
  const wrong = (ctx, msgEl, text, reason) => {
    if (msgEl) {
      msgEl.style.color = "rgba(255,190,190,.95)";
      msgEl.textContent = text || "Incorrect.";
    }
    ctx.glitch?.();
    ctx.penalize?.(1, reason || "wrong");
  };

  const TASKS = {
    // 1) quick confirm (story beat micro task)
    confirm_signal: async (ctx) => {
      begin(ctx, "CONFIRM SIGNAL", "Type the exact phrase to proceed.");
      ctx.taskBody.appendChild(note("System wants something boring."));

      const phrase = "i will not click ads";
      ctx.setAnswer?.(phrase);

      const inp = makeInput(`type: "${phrase}"`);
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      const submit = () => {
        const got = (inp.value || "").trim().toLowerCase();
        if (got !== phrase) {
          wrong(ctx, msg, "Incorrect.", "confirm_signal");
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Accepted.";
        finish(ctx, resolve, phrase);
      };

      ctx.taskPrimary.onclick = submit;
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
      inp.focus();

      return new Promise((r) => (resolve = r));
    },

    // 2) timed observe (do nothing for X ms)
    idle_window: async (ctx, args = {}) => {
      const base = Number(args.baseMs || 2200);
      const ms = clamp(base + (ctx.difficultyBoost?.() ?? 0) * 250, 1800, 5200);

      begin(ctx, "IDLE WINDOW", "Do nothing until the timer completes.");

      const bar = el("div", "pill");
      bar.style.marginTop = "12px";
      bar.style.width = "min(520px, 100%)";
      bar.style.height = "14px";
      bar.style.padding = "0";
      bar.style.overflow = "hidden";

      const fill = el("div");
      fill.style.height = "100%";
      fill.style.width = "0%";
      fill.style.background = "rgba(120,180,255,0.22)";
      bar.appendChild(fill);
      ctx.taskBody.appendChild(bar);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      msg.style.marginTop = "10px";
      ctx.taskBody.appendChild(msg);

      let moved = false;
      const onMove = () => { moved = true; };
      window.addEventListener("mousemove", onMove, { passive: true });

      let resolve;
      const done = (answer) => {
        window.removeEventListener("mousemove", onMove);
        finish(ctx, resolve, answer);
      };

      const start = performance.now();
      const tick = () => {
        const t = performance.now() - start;
        fill.style.width = `${Math.min(100, (t / ms) * 100)}%`;

        if (moved) {
          msg.textContent = "You moved. Window invalidated.";
          ctx.glitch?.();
          ctx.penalize?.(1, "idle_window move");
          done("moved");
          return;
        }

        if (t >= ms) {
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Window held.";
          done("held");
          return;
        }

        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

      return new Promise((r) => (resolve = r));
    },

    // 3) pick the “least suspicious” option
    choose_boring: async (ctx) => {
      begin(ctx, "CHOOSE", "Pick the option that looks the least interesting to an auditor.");

      const opts = shuffle([
        "EXPORT USER HISTORY",
        "OPEN SYSTEM CAMERA",
        "REFRESH AD FEED",
        "RENAME TEMP FILE",
      ]);
      const correct = "RENAME TEMP FILE";
      ctx.setAnswer?.(correct);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const row = el("div");
      row.style.marginTop = "10px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      let resolve;

      opts.forEach((o) => {
        const b = el("button", "sim-btn", o);
        b.onclick = () => {
          if (o !== correct) {
            wrong(ctx, msg, "Too loud.", "choose_boring");
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Boring enough.";
          finish(ctx, resolve, correct);
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      return new Promise((r) => (resolve = r));
    },

    // 4) short memory burst
    memory_3: async (ctx) => {
      begin(ctx, "MEMORY", "Memorize the line. You will retype it.");

      const tokens = ["echo", "static", "vault", "pane", "trace", "buffer"];
      const pick3 = shuffle(tokens).slice(0, 3).join("-");
      ctx.setAnswer?.(pick3);

      const shown = el("div", "pill", pick3);
      shown.style.marginTop = "12px";
      ctx.taskBody.appendChild(shown);

      await wait(2500 + Math.min(2000, (ctx.difficultyBoost?.() ?? 0) * 250));
      shown.textContent = "—";

      const inp = makeInput("retype the exact line…");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      const submit = () => {
        const got = (inp.value || "").trim();
        if (got !== pick3) {
          wrong(ctx, msg, "Incorrect.", "memory_3");
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Good.";
        finish(ctx, resolve, pick3);
      };

      ctx.taskPrimary.onclick = submit;
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
      inp.focus();

      return new Promise((r) => (resolve = r));
    },

    // 5) smallest number
    smallest: async (ctx) => {
      begin(ctx, "SELECT", "Click the smallest number.");

      const n = shuffle([rndInt(2, 14), rndInt(15, 40), rndInt(41, 98), rndInt(99, 140)]);
      const smallest = Math.min(...n);
      ctx.setAnswer?.(String(smallest));

      const row = el("div");
      row.style.marginTop = "10px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      let resolve;

      n.forEach((x) => {
        const b = el("button", "sim-btn", String(x));
        b.onclick = () => {
          if (x !== smallest) {
            wrong(ctx, msg, "No.", "smallest");
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Okay.";
          finish(ctx, resolve, String(smallest));
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      return new Promise((r) => (resolve = r));
    },

    // 6) backspace clean
    backspace_clean: async (ctx) => {
      begin(ctx, "CLEANUP", "Erase the noisy string (use Backspace) until empty.");

      const len = clamp(12 + (ctx.difficultyBoost?.() ?? 0) * 3, 12, 36);
      const str = Array.from({ length: len }, () => String.fromCharCode(rndInt(33, 126))).join("");
      ctx.setAnswer?.("clean");

      const tip = note("Don’t paste. Don’t select. Just erase.");
      ctx.taskBody.appendChild(tip);

      const inp = makeInput("");
      inp.value = str;
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      let lastLen = inp.value.length;

      let resolve;
      inp.addEventListener("input", () => {
        // disallow adding chars (counts as wrong attempt)
        if (inp.value.length > lastLen) {
          inp.value = inp.value.slice(0, lastLen);
          wrong(ctx, msg, "No adding.", "backspace_clean add");
          return;
        }

        // disallow paste/sudden huge jumps (counts as wrong attempt)
        if (lastLen - inp.value.length > 8) {
          // allow small deletes, but big jumps look like select+delete or paste shenanigans
          wrong(ctx, msg, "Too fast.", "backspace_clean jump");
        }

        lastLen = inp.value.length;

        if (inp.value.length === 0) {
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Clean.";
          finish(ctx, resolve, "clean");
        }
      });

      inp.focus();

      return new Promise((r) => (resolve = r));
    },

    // 7) safe line
    safe_line: async (ctx) => {
      begin(ctx, "SAFE LINE", "Select the line that sounds like it helps you.");

      const lines = shuffle([
        "System: Restore loop suggested.",
        "Emma (Security): Keep your hands visible.",
        "Liam (Worker): Pick the task nobody wants to audit.",
        "System: Increase ad exposure time.",
      ]);
      const correct = "Liam (Worker): Pick the task nobody wants to audit.";
      ctx.setAnswer?.(correct);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      let resolve;

      lines.forEach((t) => {
        const b = el("button", "sim-btn", t);
        b.style.display = "block";
        b.style.width = "100%";
        b.style.textAlign = "left";
        b.style.marginTop = "10px";
        b.onclick = () => {
          if (t !== correct) {
            wrong(ctx, msg, "Wrong angle.", "safe_line");
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "You listened.";
          finish(ctx, resolve, correct);
        };
        ctx.taskBody.appendChild(b);
      });

      ctx.taskBody.appendChild(msg);

      return new Promise((r) => (resolve = r));
    },

    // 8) parity
    parity: async (ctx) => {
      begin(ctx, "PARITY", "Type ODD or EVEN for the number shown.");

      const n = rndInt(11, 199);
      const correct = n % 2 === 0 ? "EVEN" : "ODD";
      ctx.setAnswer?.(correct);

      ctx.taskBody.appendChild(note(`number: ${n}`));
      const inp = makeInput("ODD or EVEN");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      const submit = () => {
        const got = (inp.value || "").trim().toUpperCase();
        if (got !== correct) {
          wrong(ctx, msg, "No.", "parity");
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Ok.";
        finish(ctx, resolve, correct);
      };

      ctx.taskPrimary.onclick = submit;
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
      inp.focus();

      return new Promise((r) => (resolve = r));
    },

    // 9) tap counter
    tap_n: async (ctx, args = {}) => {
      const base = Number(args.base || 9);
      const need = clamp(base + (ctx.difficultyBoost?.() ?? 0) * 2, 8, 22);

      begin(ctx, "TAP", "Tap exactly the required number of times. Not more.");
      ctx.taskBody.appendChild(note(`required taps: ${need}`));
      ctx.setAnswer?.(String(need));

      let count = 0;
      const btn = el("button", "sim-btn", "tap");
      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      let resolve;

      btn.onclick = () => {
        count++;
        btn.textContent = `tap (${count})`;

        if (count > need) {
          wrong(ctx, msg, "Too many.", "tap_n too many");
          return; // keep going; they can still hit exact, but they’ve been penalized
        }

        if (count === need) {
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Exact.";
          finish(ctx, resolve, String(need));
        } else {
          msg.textContent = "";
        }
      };

      ctx.taskBody.appendChild(btn);
      ctx.taskBody.appendChild(msg);

      return new Promise((r) => (resolve = r));
    },

    // 10) add two
    add_two: async (ctx) => {
      begin(ctx, "SUM", "Add the two numbers. Type the result.");

      const a = rndInt(7, 49);
      const b = rndInt(7, 49);
      const correct = String(a + b);
      ctx.setAnswer?.(correct);

      ctx.taskBody.appendChild(note(`${a} + ${b} = ?`));
      const inp = makeInput("answer");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      const submit = () => {
        if ((inp.value || "").trim() !== correct) {
          wrong(ctx, msg, "Wrong.", "add_two");
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Ok.";
        finish(ctx, resolve, correct);
      };

      ctx.taskPrimary.onclick = submit;
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
      inp.focus();

      return new Promise((r) => (resolve = r));
    },

    // 11) file pick
    file_pick: async (ctx) => {
      begin(ctx, "FILE PICK", "Select the file that looks least valuable.");

      const opts = shuffle(["ads/active.json", "sys/core.map", "logs/noise.tmp", "user/history.db"]);
      const correct = "logs/noise.tmp";
      ctx.setAnswer?.(correct);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      let resolve;

      opts.forEach((o) => {
        const b = el("button", "sim-btn", o);
        b.style.display = "block";
        b.style.width = "100%";
        b.style.textAlign = "left";
        b.style.marginTop = "10px";
        b.onclick = () => {
          if (o !== correct) {
            wrong(ctx, msg, "Too important.", "file_pick");
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Noise selected.";
          finish(ctx, resolve, correct);
        };
        ctx.taskBody.appendChild(b);
      });

      ctx.taskBody.appendChild(msg);

      return new Promise((r) => (resolve = r));
    },

    // 12) reverse word
    reverse_word: async (ctx) => {
      begin(ctx, "REVERSE", "Reverse the word and type it.");

      const words = ["pane", "static", "echo", "buffer", "trace", "vault"];
      const w = words[rndInt(0, words.length - 1)];
      const correct = w.split("").reverse().join("");
      ctx.setAnswer?.(correct);

      ctx.taskBody.appendChild(note(`word: ${w}`));
      const inp = makeInput("reversed");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      const submit = () => {
        if ((inp.value || "").trim().toLowerCase() !== correct) {
          wrong(ctx, msg, "No.", "reverse_word");
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Good.";
        finish(ctx, resolve, correct);
      };

      ctx.taskPrimary.onclick = submit;
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
      inp.focus();

      return new Promise((r) => (resolve = r));
    },

    // 13) lowercase only
    lowercase_only: async (ctx) => {
      begin(ctx, "FILTER", "Click the only option that is fully lowercase.");

      const opts = shuffle(["Trace-OK", "STATIC", "pane_reflection", "Echo"]);
      const correct = "pane_reflection";
      ctx.setAnswer?.(correct);

      const row = el("div");
      row.style.marginTop = "10px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      let resolve;

      opts.forEach((o) => {
        const b = el("button", "sim-btn", o);
        b.onclick = () => {
          if (o !== correct) {
            wrong(ctx, msg, "Rejected.", "lowercase_only");
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Ok.";
          finish(ctx, resolve, correct);
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      return new Promise((r) => (resolve = r));
    },

    // 14) click order 1-4
    click_order_4: async (ctx) => {
      begin(ctx, "ORDER", "Click 1 → 2 → 3 → 4. Any mistake resets.");

      const seq = ["1", "2", "3", "4"];
      const opts = shuffle(seq);
      ctx.setAnswer?.("1-2-3-4");

      let idx = 0;
      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const row = el("div");
      row.style.marginTop = "10px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      let resolve;

      opts.forEach((o) => {
        const b = el("button", "sim-btn", o);
        b.onclick = () => {
          if (o !== seq[idx]) {
            idx = 0;
            wrong(ctx, msg, "Wrong. Reset.", "click_order_4");
            return;
          }
          idx++;
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = `ok (${idx}/4)`;
          if (idx === 4) {
            msg.textContent = "Sequence complete.";
            finish(ctx, resolve, "1-2-3-4");
          }
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      return new Promise((r) => (resolve = r));
    },

    // 15) select two safe words
    select_two: async (ctx) => {
      begin(ctx, "SELECT TWO", "Click BOTH safe words. Exactly two.");

      const opts = shuffle(["export", "audit", "boring", "mirror", "quiet", "inject"]);
      const safe = new Set(["boring", "quiet"]);
      ctx.setAnswer?.("boring,quiet");

      const picked = new Set();
      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const row = el("div");
      row.style.marginTop = "10px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      let resolve;

      const updateCheck = () => {
        if (picked.size === 2) {
          const ok = [...picked].every((x) => safe.has(x));
          if (!ok) {
            wrong(ctx, msg, "Wrong pair.", "select_two wrong pair");
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Correct pair.";
          finish(ctx, resolve, "boring,quiet");
          return;
        }
        if (picked.size > 2) {
          wrong(ctx, msg, "Too many.", "select_two too many");
        } else {
          msg.textContent = "";
        }
      };

      opts.forEach((o) => {
        const b = el("button", "sim-btn", o);
        b.onclick = () => {
          if (picked.has(o)) {
            picked.delete(o);
            b.style.opacity = "1";
          } else {
            picked.add(o);
            b.style.opacity = "0.7";
          }
          updateCheck();
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      return new Promise((r) => (resolve = r));
    },

    // 16) middle character
    middle_char: async (ctx) => {
      begin(ctx, "MIDDLE", "Type the middle character of the string.");

      const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
      const len = rndInt(7, 13);
      let s = "";
      for (let i = 0; i < len; i++) s += chars[rndInt(0, chars.length - 1)];
      const correct = s[Math.floor(s.length / 2)];
      ctx.setAnswer?.(correct);

      ctx.taskBody.appendChild(note(`string: ${s}`));
      const inp = makeInput("middle character");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      const submit = () => {
        if ((inp.value || "").trim() !== correct) {
          wrong(ctx, msg, "Incorrect.", "middle_char");
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Ok.";
        finish(ctx, resolve, correct);
      };

      ctx.taskPrimary.onclick = submit;
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
      inp.focus();

      return new Promise((r) => (resolve = r));
    },

    // 17) sum digits
    sum_digits: async (ctx) => {
      begin(ctx, "DIGIT SUM", "Sum the digits. Type the result.");

      const len = rndInt(5, 8);
      let s = "";
      let sum = 0;
      for (let i = 0; i < len; i++) {
        const d = rndInt(0, 9);
        s += String(d);
        sum += d;
      }
      const correct = String(sum);
      ctx.setAnswer?.(correct);

      ctx.taskBody.appendChild(note(`digits: ${s}`));
      const inp = makeInput("sum");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      const submit = () => {
        if ((inp.value || "").trim() !== correct) {
          wrong(ctx, msg, "Wrong.", "sum_digits");
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Accepted.";
        finish(ctx, resolve, correct);
      };

      ctx.taskPrimary.onclick = submit;
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
      inp.focus();

      return new Promise((r) => (resolve = r));
    },

    // 18) delayed click
    delayed_click: async (ctx) => {
      begin(ctx, "DELAY", "Wait until the button unlocks, then click once.");

      const ms = clamp(1200 + (ctx.difficultyBoost?.() ?? 0) * 350, 1200, 4200);
      const answer = `${ms}ms`;
      ctx.setAnswer?.(answer);

      const b = el("button", "sim-btn", `locked (${Math.ceil(ms / 1000)}s)`);
      b.disabled = true;
      b.style.marginTop = "12px";
      ctx.taskBody.appendChild(b);

      await wait(ms);

      b.disabled = false;
      b.textContent = "click";

      let resolve;
      b.onclick = () => finish(ctx, resolve, answer);

      return new Promise((r) => (resolve = r));
    },

    // 19) find slashes
    find_slashes: async (ctx) => {
      begin(ctx, "FIND", "Click the string with exactly two slashes (/).");

      const opts = shuffle([
        "sys/cache.tmp",
        "logs//boot.log",
        "user/profile.cfg",
        "assets/img1.jpg",
      ]);
      const correct = "logs//boot.log";
      ctx.setAnswer?.(correct);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      let resolve;

      opts.forEach((o) => {
        const b = el("button", "sim-btn", o);
        b.style.display = "block";
        b.style.width = "100%";
        b.style.textAlign = "left";
        b.style.marginTop = "10px";
        b.onclick = () => {
          if (o !== correct) {
            wrong(ctx, msg, "No.", "find_slashes");
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Ok.";
          finish(ctx, resolve, correct);
        };
        ctx.taskBody.appendChild(b);
      });

      ctx.taskBody.appendChild(msg);

      return new Promise((r) => (resolve = r));
    },

    // 20) two-step
    two_step: async (ctx) => {
      begin(ctx, "PROCEDURE", "Step 1: type OK. Step 2: type CONFIRM.");

      ctx.setAnswer?.("OK->CONFIRM");

      const inp = makeInput("type OK");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      let step = 1;

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      const submit = () => {
        const got = (inp.value || "").trim().toUpperCase();

        if (step === 1) {
          if (got !== "OK") {
            wrong(ctx, msg, "Step 1 failed.", "two_step step1");
            return;
          }
          step = 2;
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Step 1 complete.";
          inp.value = "";
          inp.placeholder = "type CONFIRM";
          // re-arm message to red-ish for the next check
          setTimeout(() => {
            msg.style.color = "rgba(255,190,190,.95)";
            msg.textContent = "";
          }, 250);
          return;
        }

        if (step === 2) {
          if (got !== "CONFIRM") {
            wrong(ctx, msg, "Step 2 failed.", "two_step step2");
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Procedure complete.";
          finish(ctx, resolve, "OK->CONFIRM");
        }
      };

      ctx.taskPrimary.onclick = submit;
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
      inp.focus();

      return new Promise((r) => (resolve = r));
    },
  };

  // Register functions
  reg(TASKS);

  // Register pool as STRING IDs (tasks.js random expects strings)
  if (regPool) {
    regPool("pack1", Object.keys(TASKS));
  }
})();
