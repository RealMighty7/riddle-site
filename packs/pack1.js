// packs/pack1.js
// Registers 20 tasks into window.TASKS via window.registerTasks()
// Also registers TASK_POOLS.pack1 for the random router.

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
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
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
    ctx.taskSecondary.classList.add("hidden");
    ctx.taskBody.innerHTML = "";
  };
const note = (t, kind = "note") => {
  const n = el("div");
  n.textContent = t ?? "";
  n.className = (kind === "error") ? "task-error"
              : (kind === "ok") ? "task-ok"
              : "task-note";
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

  // Pack task map (same IDs you already use)
  const TASKS = {
    // 1) quick confirm (story beat micro task)
    confirm_signal: async (ctx) => {
      begin(ctx, "CONFIRM SIGNAL", "Type the exact phrase to proceed.");
      ctx.taskBody.appendChild(note("System wants something boring."));
      const phrase = "i will not click ads";
      const inp = makeInput(`type: "${phrase}"`);
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      ctx.taskPrimary.onclick = () => {
        const got = (inp.value || "").trim().toLowerCase();
        if (got !== phrase) {
          msg.textContent = "Incorrect.";
          ctx.glitch?.();
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Accepted.";
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.onclick = () => resolve();
      };

      return new Promise(r => (resolve = r));
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

      let moved = false;
      const onMove = () => { moved = true; };
      window.addEventListener("mousemove", onMove, { passive: true });

      let resolve;
      const done = () => {
        window.removeEventListener("mousemove", onMove);
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.disabled = false;
        ctx.taskPrimary.onclick = () => resolve();
      };

      const start = performance.now();
      const tick = () => {
        const t = performance.now() - start;
        fill.style.width = `${Math.min(100, (t / ms) * 100)}%`;

        if (moved) {
          ctx.taskBody.appendChild(note("You moved. Window invalidated."));
          ctx.glitch?.();
          ctx.penalize?.(1, "noise");
          done();
          return;
        }

        if (t >= ms) {
          ctx.taskBody.appendChild(note("Window held."));
          done();
          return;
        }

        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

      return new Promise(r => (resolve = r));
    },

    // 3) pick the “least suspicious” option
    choose_boring: async (ctx) => {
      begin(ctx, "CHOOSE", "Pick the option that looks the least interesting to an auditor.");
      const opts = shuffle([
        "EXPORT USER HISTORY",
        "OPEN SYSTEM CAMERA",
        "REFRESH AD FEED",
        "RENAME TEMP FILE"
      ]);
      const correct = "RENAME TEMP FILE";

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const row = el("div");
      row.style.marginTop = "10px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      let resolve;

      opts.forEach(o => {
        const b = el("button", "sim-btn", o);
        b.onclick = () => {
          if (o !== correct) {
            msg.textContent = "Too loud.";
            ctx.glitch?.();
            ctx.penalize?.(1, "audit risk");
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Boring enough.";
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => resolve();
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      return new Promise(r => (resolve = r));
    },

    // 4) short memory burst
    memory_3: async (ctx) => {
      begin(ctx, "MEMORY", "Memorize the line. You will retype it.");
      const tokens = ["echo", "static", "vault", "pane", "trace", "buffer"];
      const pick = shuffle(tokens).slice(0, 3).join("-");
      const shown = el("div", "pill", pick);
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
      ctx.taskPrimary.onclick = () => {
        const got = (inp.value || "").trim();
        if (got !== pick) {
          msg.textContent = "Incorrect.";
          ctx.glitch?.();
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Good.";
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.onclick = () => resolve();
      };

      return new Promise(r => (resolve = r));
    },

    // 5) smallest number
    smallest: async (ctx) => {
      begin(ctx, "SELECT", "Click the smallest number.");
      const n = shuffle([rndInt(2, 14), rndInt(15, 40), rndInt(41, 98), rndInt(99, 140)]);
      const smallest = Math.min(...n);

      const row = el("div");
      row.style.marginTop = "10px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      let resolve;

      n.forEach(x => {
        const b = el("button", "sim-btn", String(x));
        b.onclick = () => {
          if (x !== smallest) {
            msg.textContent = "No.";
            ctx.glitch?.();
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Okay.";
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => resolve();
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      return new Promise(r => (resolve = r));
    },

    // 6) backspace clean
    backspace_clean: async (ctx) => {
      begin(ctx, "CLEANUP", "Erase the noisy string (use Backspace) until empty.");
      const len = clamp(12 + (ctx.difficultyBoost?.() ?? 0) * 3, 12, 36);
      const str = Array.from({ length: len }, () => String.fromCharCode(rndInt(33, 126))).join("");

      const inp = makeInput("");
      inp.value = str;
      ctx.taskBody.appendChild(note("Don’t paste. Don’t select. Just erase."));
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      let lastLen = inp.value.length;

      let resolve;
      inp.addEventListener("input", () => {
        if (inp.value.length > lastLen) {
          msg.textContent = "No adding.";
          ctx.glitch?.();
          inp.value = inp.value.slice(0, lastLen);
          return;
        }
        lastLen = inp.value.length;
        if (inp.value.length === 0) {
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Clean.";
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => resolve();
        }
      });

      inp.focus();

      return new Promise(r => (resolve = r));
    },

    // 7) safe line
    safe_line: async (ctx) => {
      begin(ctx, "SAFE LINE", "Select the line that sounds like it helps you.");
      const lines = shuffle([
        "System: Restore loop suggested.",
        "Emma (Security): Keep your hands visible.",
        "Liam (Worker): Pick the task nobody wants to audit.",
        "System: Increase ad exposure time."
      ]);
      const correct = "Liam (Worker): Pick the task nobody wants to audit.";

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      let resolve;

      lines.forEach(t => {
        const b = el("button", "sim-btn", t);
        b.style.display = "block";
        b.style.width = "100%";
        b.style.textAlign = "left";
        b.style.marginTop = "10px";
        b.onclick = () => {
          if (t !== correct) {
            msg.textContent = "Wrong angle.";
            ctx.glitch?.();
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "You listened.";
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => resolve();
        };
        ctx.taskBody.appendChild(b);
      });

      ctx.taskBody.appendChild(msg);

      return new Promise(r => (resolve = r));
    },

    // 8) parity
    parity: async (ctx) => {
      begin(ctx, "PARITY", "Type ODD or EVEN for the number shown.");
      const n = rndInt(11, 199);
      const correct = (n % 2 === 0) ? "EVEN" : "ODD";

      ctx.taskBody.appendChild(note(`number: ${n}`));
      const inp = makeInput("ODD or EVEN");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      ctx.taskPrimary.onclick = () => {
        const got = (inp.value || "").trim().toUpperCase();
        if (got !== correct) {
          msg.textContent = "No.";
          ctx.glitch?.();
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Ok.";
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.onclick = () => resolve();
      };

      return new Promise(r => (resolve = r));
    },

    // 9) tap counter
    tap_n: async (ctx, args = {}) => {
      const base = Number(args.base || 9);
      const need = clamp(base + (ctx.difficultyBoost?.() ?? 0) * 2, 8, 22);

      begin(ctx, "TAP", "Tap exactly the required number of times. Not more.");
      ctx.taskBody.appendChild(note(`required taps: ${need}`));

      let count = 0;
      const btn = el("button", "sim-btn", "tap");
      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      let resolve;

      btn.onclick = () => {
        count++;
        btn.textContent = `tap (${count})`;
        if (count > need) {
          msg.textContent = "Too many.";
          ctx.glitch?.();
          ctx.penalize?.(1, "sloppy");
        }
        if (count === need) {
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Exact.";
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => resolve();
        }
      };

      ctx.taskBody.appendChild(btn);
      ctx.taskBody.appendChild(msg);

      return new Promise(r => (resolve = r));
    },

    // 10) add two
    add_two: async (ctx) => {
      begin(ctx, "SUM", "Add the two numbers. Type the result.");
      const a = rndInt(7, 49);
      const b = rndInt(7, 49);
      const correct = String(a + b);

      ctx.taskBody.appendChild(note(`${a} + ${b} = ?`));
      const inp = makeInput("answer");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      ctx.taskPrimary.onclick = () => {
        if ((inp.value || "").trim() !== correct) {
          msg.textContent = "Wrong.";
          ctx.glitch?.();
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Ok.";
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.onclick = () => resolve();
      };

      return new Promise(r => (resolve = r));
    },

    // 11) file pick
    file_pick: async (ctx) => {
      begin(ctx, "FILE PICK", "Select the file that looks least valuable.");
      const opts = shuffle(["ads/active.json", "sys/core.map", "logs/noise.tmp", "user/history.db"]);
      const correct = "logs/noise.tmp";

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      let resolve;

      opts.forEach(o => {
        const b = el("button", "sim-btn", o);
        b.style.display = "block";
        b.style.width = "100%";
        b.style.textAlign = "left";
        b.style.marginTop = "10px";
        b.onclick = () => {
          if (o !== correct) {
            msg.textContent = "Too important.";
            ctx.glitch?.();
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Noise selected.";
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => resolve();
        };
        ctx.taskBody.appendChild(b);
      });

      ctx.taskBody.appendChild(msg);

      return new Promise(r => (resolve = r));
    },

    // 12) reverse word
    reverse_word: async (ctx) => {
      begin(ctx, "REVERSE", "Reverse the word and type it.");
      const words = ["pane", "static", "echo", "buffer", "trace", "vault"];
      const w = words[rndInt(0, words.length - 1)];
      const correct = w.split("").reverse().join("");

      ctx.taskBody.appendChild(note(`word: ${w}`));
      const inp = makeInput("reversed");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      ctx.taskPrimary.onclick = () => {
        if ((inp.value || "").trim().toLowerCase() !== correct) {
          msg.textContent = "No.";
          ctx.glitch?.();
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Good.";
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.onclick = () => resolve();
      };

      return new Promise(r => (resolve = r));
    },

    // 13) lowercase only
    lowercase_only: async (ctx) => {
      begin(ctx, "FILTER", "Click the only option that is fully lowercase.");
      const opts = shuffle(["Trace-OK", "STATIC", "pane_reflection", "Echo"]);
      const correct = "pane_reflection";

      const row = el("div");
      row.style.marginTop = "10px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      let resolve;

      opts.forEach(o => {
        const b = el("button", "sim-btn", o);
        b.onclick = () => {
          if (o !== correct) {
            msg.textContent = "Rejected.";
            ctx.glitch?.();
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Ok.";
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => resolve();
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      return new Promise(r => (resolve = r));
    },

    // 14) click order 1-4
    click_order_4: async (ctx) => {
      begin(ctx, "ORDER", "Click 1 → 2 → 3 → 4. Any mistake resets.");
      const seq = ["1", "2", "3", "4"];
      const opts = shuffle(seq);

      let idx = 0;
      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const row = el("div");
      row.style.marginTop = "10px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      let resolve;

      opts.forEach(o => {
        const b = el("button", "sim-btn", o);
        b.onclick = () => {
          if (o !== seq[idx]) {
            idx = 0;
            msg.textContent = "Wrong. Reset.";
            ctx.glitch?.();
            return;
          }
          idx++;
          msg.textContent = `ok (${idx}/4)`;
          if (idx === 4) {
            msg.style.color = "rgba(232,237,247,0.85)";
            msg.textContent = "Sequence complete.";
            ctx.taskPrimary.textContent = "continue";
            ctx.taskPrimary.disabled = false;
            ctx.taskPrimary.onclick = () => resolve();
          }
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      return new Promise(r => (resolve = r));
    },

    // 15) select two safe words
    select_two: async (ctx) => {
      begin(ctx, "SELECT TWO", "Click BOTH safe words. Exactly two.");
      const opts = shuffle(["export", "audit", "boring", "mirror", "quiet", "inject"]);
      const safe = new Set(["boring", "quiet"]);

      const picked = new Set();
      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const row = el("div");
      row.style.marginTop = "10px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      let resolve;

      opts.forEach(o => {
        const b = el("button", "sim-btn", o);
        b.onclick = () => {
          if (picked.has(o)) {
            picked.delete(o);
            b.style.opacity = "1";
          } else {
            picked.add(o);
            b.style.opacity = "0.7";
          }

          if (picked.size === 2) {
            const ok = [...picked].every(x => safe.has(x));
            if (!ok) {
              msg.textContent = "Wrong pair.";
              ctx.glitch?.();
              return;
            }
            msg.style.color = "rgba(232,237,247,0.85)";
            msg.textContent = "Correct pair.";
            ctx.taskPrimary.textContent = "continue";
            ctx.taskPrimary.disabled = false;
            ctx.taskPrimary.onclick = () => resolve();
          }
          if (picked.size > 2) {
            msg.textContent = "Too many.";
            ctx.glitch?.();
          }
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      return new Promise(r => (resolve = r));
    },

    // 16) middle character
    middle_char: async (ctx) => {
      begin(ctx, "MIDDLE", "Type the middle character of the string.");
      const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
      const len = rndInt(7, 13);
      let s = "";
      for (let i = 0; i < len; i++) s += chars[rndInt(0, chars.length - 1)];
      const correct = s[Math.floor(s.length / 2)];

      ctx.taskBody.appendChild(note(`string: ${s}`));
      const inp = makeInput("middle character");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      ctx.taskPrimary.onclick = () => {
        if ((inp.value || "").trim() !== correct) {
          msg.textContent = "Incorrect.";
          ctx.glitch?.();
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Ok.";
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.onclick = () => resolve();
      };

      return new Promise(r => (resolve = r));
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

      ctx.taskBody.appendChild(note(`digits: ${s}`));
      const inp = makeInput("sum");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      ctx.taskPrimary.onclick = () => {
        if ((inp.value || "").trim() !== String(sum)) {
          msg.textContent = "Wrong.";
          ctx.glitch?.();
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Accepted.";
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.onclick = () => resolve();
      };

      return new Promise(r => (resolve = r));
    },

    // 18) delayed click
    delayed_click: async (ctx) => {
      begin(ctx, "DELAY", "Wait until the button unlocks, then click once.");
      const ms = clamp(1200 + (ctx.difficultyBoost?.() ?? 0) * 350, 1200, 4200);

      const b = el("button", "sim-btn", `locked (${Math.ceil(ms/1000)}s)`);
      b.disabled = true;
      b.style.marginTop = "12px";
      ctx.taskBody.appendChild(b);

      await wait(ms);

      b.disabled = false;
      b.textContent = "click";

      let resolve;
      b.onclick = () => {
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.disabled = false;
        ctx.taskPrimary.onclick = () => resolve();
      };

      return new Promise(r => (resolve = r));
    },

    // 19) find slashes
    find_slashes: async (ctx) => {
      begin(ctx, "FIND", "Click the string with exactly two slashes (/).");
      const opts = shuffle([
        "sys/cache.tmp",
        "logs//boot.log",
        "user/profile.cfg",
        "assets/img1.jpg"
      ]);
      const correct = "logs//boot.log";

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      let resolve;

      opts.forEach(o => {
        const b = el("button", "sim-btn", o);
        b.style.display = "block";
        b.style.width = "100%";
        b.style.textAlign = "left";
        b.style.marginTop = "10px";
        b.onclick = () => {
          if (o !== correct) {
            msg.textContent = "No.";
            ctx.glitch?.();
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Ok.";
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => resolve();
        };
        ctx.taskBody.appendChild(b);
      });

      ctx.taskBody.appendChild(msg);

      return new Promise(r => (resolve = r));
    },

    // 20) two-step
    two_step: async (ctx) => {
      begin(ctx, "PROCEDURE", "Step 1: type OK. Step 2: type CONFIRM.");
      const inp = makeInput("type OK");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      let step = 1;

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      ctx.taskPrimary.onclick = () => {
        const got = (inp.value || "").trim().toUpperCase();
        if (step === 1) {
          if (got !== "OK") {
            msg.textContent = "Step 1 failed.";
            ctx.glitch?.();
            return;
          }
          step = 2;
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Step 1 complete.";
          inp.value = "";
          inp.placeholder = "type CONFIRM";
          msg.style.color = "rgba(255,190,190,.95)";
          return;
        }
        if (step === 2) {
          if (got !== "CONFIRM") {
            msg.textContent = "Step 2 failed.";
            ctx.glitch?.();
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Procedure complete.";
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.onclick = () => resolve();
        }
      };

      return new Promise(r => (resolve = r));
    },
  };

  // Register functions
  reg(TASKS);

  // Register pool (so TASKS.random can pull from pack1)
  if (regPool) {
    regPool("pack1", Object.keys(TASKS).map(id => ({ id, w: 1 })));
  }
})();
