// packs/pack2.js
// Registers 20 tasks into window.TASKS via window.registerTasks()
// (Optional) also registers a pool via window.registerTaskPool()

(() => {
  const reg = window.registerTasks;
  const regPool = window.registerTaskPool;

  if (!reg) {
    console.error("registerTasks missing — load tasks.js before packs/pack2.js");
    return;
  }

  // ---------------- Helpers (pack-local) ----------------
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
    ctx.taskSecondary.classList.add("hidden");
    ctx.taskBody.innerHTML = "";
  };

  const note = (t, danger = false) => {
    const n = el("div");
    n.style.opacity = "0.82";
    n.style.marginTop = "10px";
    if (danger) n.style.color = "rgba(255,190,190,.95)";
    n.textContent = t;
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

  // ---------------- Pack 2 Tasks ----------------
  const TASKS = {
    liam_whisper: async (ctx) => {
      begin(ctx, "WORKER CHANNEL", "Someone left a note in the margin. Type the last word.");
      ctx.taskBody.appendChild(note("Liam (Worker): Don't look at me. Read the end."));
      const line = "route everything into noise, then pretend you never saw it";
      const pill = el("div", "pill", line);
      pill.style.marginTop = "12px";
      ctx.taskBody.appendChild(pill);

      const inp = makeInput("last word…");
      ctx.taskBody.appendChild(inp);

      const msg = note("", true);
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      ctx.taskPrimary.onclick = () => {
        const got = (inp.value || "").trim().toLowerCase();
        if (got !== "it") {
          msg.textContent = "No.";
          ctx.glitch?.();
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "…okay.";
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.onclick = () => resolve();
      };

      return new Promise((r) => (resolve = r));
    },

    emma_watch: async (ctx) => {
      begin(ctx, "SECURITY EYES", "Click ONLY when the indicator is dim. One mistake costs you.");
      ctx.taskBody.appendChild(note("Emma (Security): You're jittery. Stop moving when you shouldn't."));

      const wrap = el("div");
      wrap.style.marginTop = "12px";
      wrap.style.display = "flex";
      wrap.style.alignItems = "center";
      wrap.style.gap = "10px";
      wrap.style.flexWrap = "wrap";

      const dot = el("div");
      dot.style.width = "16px";
      dot.style.height = "16px";
      dot.style.borderRadius = "999px";
      dot.style.border = "1px solid rgba(255,255,255,0.18)";
      dot.style.background = "rgba(255,255,255,0.10)";

      const btn = el("button", "sim-btn", "click");
      const msg = note("", true);

      wrap.appendChild(dot);
      wrap.appendChild(btn);
      ctx.taskBody.appendChild(wrap);
      ctx.taskBody.appendChild(msg);

      let dim = true;
      let strikes = 0;
      const need = clamp(3 + (ctx.difficultyBoost?.() ?? 0), 3, 8);

      const flip = () => {
        dim = Math.random() < 0.55;
        dot.style.background = dim ? "rgba(255,255,255,0.10)" : "rgba(255,190,190,0.24)";
        dot.style.boxShadow = dim ? "none" : "0 0 18px rgba(255,190,190,0.18)";
      };

      flip();
      const iv = setInterval(flip, clamp(520 - (ctx.difficultyBoost?.() ?? 0) * 45, 260, 520));

      let okClicks = 0;

      let resolve;
      btn.onclick = () => {
        if (!dim) {
          strikes++;
          msg.textContent = "Too bright.";
          ctx.glitch?.();
          ctx.penalize?.(1, "camera attention");
          if (strikes >= 2) {
            clearInterval(iv);
            msg.textContent = "Stop. You're drawing eyes.";
            ctx.taskPrimary.textContent = "continue";
            ctx.taskPrimary.disabled = false;
            ctx.taskPrimary.onclick = () => resolve();
          }
          return;
        }
        okClicks++;
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = `Good. (${okClicks}/${need})`;
        if (okClicks >= need) {
          clearInterval(iv);
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => resolve();
        }
      };

      return new Promise((r) => (resolve = r));
    },

    restore_header: async (ctx) => {
      begin(ctx, "RESTORE HEADER", "Pick the only valid header signature.");
      const opts = shuffle(["[[ ok ]]", "{ ok }]", "(( ok ))", "{[ ok ]}"]);
      const correct = "(( ok ))";
      const msg = note("", true);

      opts.forEach((o) => {
        const b = el("button", "sim-btn", o);
        b.style.display = "block";
        b.style.width = "min(520px, 100%)";
        b.style.textAlign = "left";
        b.style.marginTop = "10px";
        b.onclick = () => {
          if (o !== correct) {
            msg.textContent = "Malformed.";
            ctx.glitch?.();
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Header restored.";
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => resolve();
        };
        ctx.taskBody.appendChild(b);
      });

      ctx.taskBody.appendChild(msg);

      let resolve;
      return new Promise((r) => (resolve = r));
    },

    sort_lengths: async (ctx) => {
      begin(ctx, "SORT", "Click items shortest → longest.");
      const items = shuffle(["noise", "trace_ok", "pane_reflection", "microfracture", "audit_shadow"]);
      const sorted = items.slice().sort((a, b) => a.length - b.length);

      const row = el("div");
      row.style.marginTop = "12px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      const msg = note("", true);
      let idx = 0;

      items.forEach((t) => {
        const b = el("button", "sim-btn", t);
        b.onclick = () => {
          if (t !== sorted[idx]) {
            idx = 0;
            msg.textContent = "Wrong order.";
            ctx.glitch?.();
            ctx.penalize?.(1, "messy");
            return;
          }
          b.disabled = true;
          b.style.opacity = "0.55";
          idx++;
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = `ok (${idx}/${sorted.length})`;
          if (idx >= sorted.length) {
            ctx.taskPrimary.textContent = "continue";
            ctx.taskPrimary.disabled = false;
            ctx.taskPrimary.onclick = () => resolve();
          }
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      let resolve;
      return new Promise((r) => (resolve = r));
    },

    quiet_replace: async (ctx) => {
      begin(ctx, "EDIT", "Replace all underscores (_) with hyphens (-).");
      const base = "pane_reflection__trace_ok__cache_layer";
      const inp = makeInput("");
      inp.value = base;

      ctx.taskBody.appendChild(note("Liam (Worker): Small edits. No headlines."));
      ctx.taskBody.appendChild(inp);

      const msg = note("", true);
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "submit";
      ctx.taskPrimary.disabled = false;

      let resolve;
      ctx.taskPrimary.onclick = () => {
        const got = inp.value || "";
        if (got.includes("_")) {
          msg.textContent = "Underscore remains.";
          ctx.glitch?.();
          return;
        }
        const want = base.replace(/_/g, "-");
        if (got !== want) {
          msg.textContent = "Wrong transform.";
          ctx.glitch?.();
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Applied.";
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.onclick = () => resolve();
      };

      return new Promise((r) => (resolve = r));
    },

    two_truths: async (ctx) => {
      begin(ctx, "FILTER", "Pick TWO lines that sound normal for a workstation.");
      const pool = shuffle([
        "AUDIT: mirror enabled",
        "NOTE: coffee request denied",
        "TRACE: session fingerprint pinned",
        "SYSTEM: open camera feed",
        "CACHE: layer=memory",
        "EXPORT: user history"
      ]);
      const good = new Set(["AUDIT: mirror enabled", "CACHE: layer=memory"]);
      const picked = new Set();
      const msg = note("", true);

      pool.forEach((t) => {
        const b = el("button", "sim-btn", t);
        b.style.display = "block";
        b.style.width = "min(720px, 100%)";
        b.style.textAlign = "left";
        b.style.marginTop = "10px";
        b.onclick = () => {
          if (picked.has(t)) {
            picked.delete(t);
            b.style.opacity = "1";
          } else {
            picked.add(t);
            b.style.opacity = "0.7";
          }

          if (picked.size === 2) {
            const ok = [...picked].every((x) => good.has(x));
            if (!ok) {
              msg.textContent = "Wrong pair.";
              ctx.glitch?.();
              ctx.penalize?.(1, "audit spike");
              return;
            }
            msg.style.color = "rgba(232,237,247,0.85)";
            msg.textContent = "Looks normal.";
            ctx.taskPrimary.textContent = "continue";
            ctx.taskPrimary.disabled = false;
            ctx.taskPrimary.onclick = () => resolve();
          }
          if (picked.size > 2) {
            msg.textContent = "Too many.";
            ctx.glitch?.();
          }
        };
        ctx.taskBody.appendChild(b);
      });

      ctx.taskBody.appendChild(msg);

      let resolve;
      return new Promise((r) => (resolve = r));
    },

    count_dots: async (ctx) => {
      begin(ctx, "COUNT", "Count the dots (.) and type the number.");
      const parts = ["sys", "cache", "tmp", "v2", "x"];
      const s = shuffle(parts).slice(0, 4).join(".") + ".log";
      const correct = String((s.match(/\./g) || []).length);

      ctx.taskBody.appendChild(note(`string: ${s}`));
      const inp = makeInput("number of dots");
      ctx.taskBody.appendChild(inp);

      const msg = note("", true);
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      ctx.taskPrimary.onclick = () => {
        if ((inp.value || "").trim() !== correct) {
          msg.textContent = "No.";
          ctx.glitch?.();
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Ok.";
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.onclick = () => resolve();
      };

      return new Promise((r) => (resolve = r));
    },

    lockstep: async (ctx) => {
      begin(ctx, "LOCKSTEP", "Click LEFT then RIGHT, repeating. Complete the cycle.");
      const need = clamp(6 + (ctx.difficultyBoost?.() ?? 0) * 2, 6, 18);

      const row = el("div");
      row.style.marginTop = "12px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      const left = el("button", "sim-btn", "LEFT");
      const right = el("button", "sim-btn", "RIGHT");
      const msg = note("", true);

      let expect = "LEFT";
      let done = 0;

      let resolve;
      const click = (side) => {
        if (side !== expect) {
          msg.textContent = "Wrong step.";
          ctx.glitch?.();
          ctx.penalize?.(1, "desync");
          expect = "LEFT";
          done = 0;
          return;
        }
        done++;
        expect = expect === "LEFT" ? "RIGHT" : "LEFT";
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = `ok (${done}/${need})`;
        if (done >= need) {
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => resolve();
        }
      };

      left.onclick = () => click("LEFT");
      right.onclick = () => click("RIGHT");

      row.appendChild(left);
      row.appendChild(right);
      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      return new Promise((r) => (resolve = r));
    },

    vowels_only: async (ctx) => {
      begin(ctx, "FRAGMENT", "Extract only the vowels and type them (in order).");
      const words = ["microfracture", "simulation", "reflection", "containment", "compliance", "telemetry"];
      const w = words[rndInt(0, words.length - 1)];
      const correct = (w.match(/[aeiou]/g) || []).join("");

      ctx.taskBody.appendChild(note(`word: ${w}`));
      const inp = makeInput("vowels only");
      ctx.taskBody.appendChild(inp);

      const msg = note("", true);
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      ctx.taskPrimary.onclick = () => {
        const got = (inp.value || "").trim().toLowerCase();
        if (got !== correct) {
          msg.textContent = "Rejected.";
          ctx.glitch?.();
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Accepted.";
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.onclick = () => resolve();
      };

      return new Promise((r) => (resolve = r));
    },

    prime_pick: async (ctx) => {
      begin(ctx, "SCAN", "Click the only prime number.");
      const prime = 29;
      const opts = shuffle([prime, 9, 21, 35]);

      const row = el("div");
      row.style.marginTop = "12px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      const msg = note("", true);

      opts.forEach((n) => {
        const b = el("button", "sim-btn", String(n));
        b.onclick = () => {
          if (n !== prime) {
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
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      let resolve;
      return new Promise((r) => (resolve = r));
    },

    single_press: async (ctx) => {
      begin(ctx, "DISCIPLINE", "Press the button ONCE. If you double-press, it resets.");
      const b = el("button", "sim-btn", "press");
      b.style.marginTop = "12px";

      const msg = note("", true);
      ctx.taskBody.appendChild(b);
      ctx.taskBody.appendChild(msg);

      let pressed = false;
      let lock = false;

      let resolve;
      b.onclick = () => {
        if (lock) return;
        if (!pressed) {
          pressed = true;
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Good.";
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => resolve();
          return;
        }
        lock = true;
        msg.textContent = "Too fast.";
        ctx.glitch?.();
        ctx.penalize?.(1, "twitchy");
        setTimeout(() => {
          lock = false;
          pressed = false;
          msg.textContent = "";
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = true;
        }, 550);
      };

      return new Promise((r) => (resolve = r));
    },

    count_spaces: async (ctx) => {
      begin(ctx, "DECODE", "Count the spaces and type the number.");
      const phrases = [
        "All you had to do was sit there",
        "This page is currently under revision",
        "Microfractures detected remain still",
        "Do not improvise follow instructions"
      ];
      const p = phrases[rndInt(0, phrases.length - 1)];
      const correct = String((p.match(/ /g) || []).length);

      ctx.taskBody.appendChild(note(`phrase: "${p}"`));
      const inp = makeInput("spaces");
      ctx.taskBody.appendChild(inp);

      const msg = note("", true);
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

      return new Promise((r) => (resolve = r));
    },

    notch: async (ctx) => {
      begin(ctx, "CALIBRATION", "Pick the correct notch.");
      const notches = clamp(5 + (ctx.difficultyBoost?.() ?? 0), 5, 10);
      const correct = rndInt(1, notches);

      ctx.taskBody.appendChild(note("Liam (Worker): Not too perfect. Just correct."));
      const row = el("div");
      row.style.marginTop = "12px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      const msg = note("", true);

      for (let i = 1; i <= notches; i++) {
        const b = el("button", "sim-btn", String(i));
        b.onclick = () => {
          if (i !== correct) {
            msg.textContent = "No.";
            ctx.glitch?.();
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Calibrated.";
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => resolve();
        };
        row.appendChild(b);
      }

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(note(`hint: notch ${correct} is "quiet"`));
      ctx.taskBody.appendChild(msg);

      let resolve;
      return new Promise((r) => (resolve = r));
    },

    acronym: async (ctx) => {
      begin(ctx, "ACRONYM", "Type the first letter of each word.");
      const line = "surface tension unstable";
      const correct = "stu";

      ctx.taskBody.appendChild(note(`line: "${line}"`));
      const inp = makeInput("acronym");
      ctx.taskBody.appendChild(inp);

      const msg = note("", true);
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      ctx.taskPrimary.onclick = () => {
        const got = (inp.value || "").trim().toLowerCase();
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

      return new Promise((r) => (resolve = r));
    },

    duplicate_token: async (ctx) => {
      begin(ctx, "SCAN", "Click the token that appears twice.");
      const tokens = shuffle(["echo", "static", "vault", "trace", "buffer", "pane"]);
      const dup = tokens[0];
      const list = shuffle(tokens.concat([dup]));

      const row = el("div");
      row.style.marginTop = "12px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      const msg = note("", true);

      list.forEach((t) => {
        const b = el("button", "sim-btn", t);
        b.onclick = () => {
          if (t !== dup) {
            msg.textContent = "No.";
            ctx.glitch?.();
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Duplicate found.";
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => resolve();
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      let resolve;
      return new Promise((r) => (resolve = r));
    },

    digits_only: async (ctx) => {
      begin(ctx, "EXTRACT", "Extract ONLY digits and type them (in order).");
      const s =
        "cf" + rndInt(10, 99) +
        "_v" + rndInt(1, 9) +
        "_id" + rndInt(100, 999) +
        "_x" + rndInt(0, 9);
      const correct = (s.match(/\d/g) || []).join("");

      ctx.taskBody.appendChild(note(`string: ${s}`));
      const inp = makeInput("digits only");
      ctx.taskBody.appendChild(inp);

      const msg = note("", true);
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      ctx.taskPrimary.onclick = () => {
        if ((inp.value || "").trim() !== correct) {
          msg.textContent = "Rejected.";
          ctx.glitch?.();
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Accepted.";
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.onclick = () => resolve();
      };

      return new Promise((r) => (resolve = r));
    },

    reorder_3: async (ctx) => {
      begin(ctx, "REORDER (MINI)", "Swap items until they match the target order.");
      const correct = ["boot", "cache", "audit"];
      const state = shuffle(correct);

      const row = el("div");
      row.style.marginTop = "12px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      const msg = note("", true);
      let first = null;

      let resolve;

      const render = () => {
        row.innerHTML = "";
        first = null;

        state.forEach((t, idx) => {
          const b = el("button", "sim-btn", t);
          b.onclick = () => {
            if (first === null) {
              first = idx;
              b.style.outline = "2px solid rgba(120,180,255,0.55)";
              return;
            }
            const tmp = state[first];
            state[first] = state[idx];
            state[idx] = tmp;
            render();
          };
          row.appendChild(b);
        });

        const ok = state.join("|") === correct.join("|");
        if (ok) {
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Aligned.";
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => resolve();
        } else {
          ctx.taskPrimary.disabled = true;
          msg.textContent = "";
        }
      };

      ctx.taskBody.appendChild(note(`target: ${correct.join(" → ")}`));
      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);
      render();

      return new Promise((r) => (resolve = r));
    },

    hold_quiet: async (ctx) => {
      begin(ctx, "QUIET HOLD", "Hold the button until it says QUIET.");
      const ms = clamp(1600 + (ctx.difficultyBoost?.() ?? 0) * 260, 1600, 4200);

      const b = el("button", "sim-btn", "hold");
      b.style.marginTop = "12px";

      const msg = note("", true);
      ctx.taskBody.appendChild(b);
      ctx.taskBody.appendChild(msg);

      let holding = false;
      let start = 0;
      let raf = 0;

      let resolve;

      const step = (t) => {
        if (!holding) return;
        const elapsed = t - start;
        if (elapsed >= ms) {
          holding = false;
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "QUIET.";
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => resolve();
          return;
        }
        raf = requestAnimationFrame(step);
      };

      const reset = () => {
        if (!holding) return;
        holding = false;
        cancelAnimationFrame(raf);
        msg.textContent = "Released early.";
        ctx.glitch?.();
        ctx.penalize?.(1, "noise");
      };

      b.addEventListener("mousedown", () => {
        holding = true;
        msg.textContent = "";
        start = performance.now();
        raf = requestAnimationFrame(step);
      });

      window.addEventListener("mouseup", reset, { passive: true });

      b.addEventListener("touchstart", (e) => {
        e.preventDefault();
        holding = true;
        msg.textContent = "";
        start = performance.now();
        raf = requestAnimationFrame(step);
      }, { passive: false });

      window.addEventListener("touchend", reset, { passive: true });

      return new Promise((r) => (resolve = r));
    },

    three_vowels: async (ctx) => {
      begin(ctx, "FILTER", "Click the option with exactly 3 vowels.");
      const opts = shuffle(["containment", "telemetry", "reflection", "microfracture"]);
      const countVowels = (s) => (s.match(/[aeiou]/gi) || []).length;

      // pick a correct deterministically: find first with 3 vowels; if none, force telemetry
      let correct = opts.find((x) => countVowels(x) === 3);
      if (!correct) correct = "telemetry";
      if (!opts.includes(correct)) opts[0] = correct;

      const msg = note("", true);
      const row = el("div");
      row.style.marginTop = "12px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      let resolve;

      opts.forEach((o) => {
        const b = el("button", "sim-btn", o);
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
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      return new Promise((r) => (resolve = r));
    },

    stamp: async (ctx) => {
      begin(ctx, "STAMP", "Approve the harmless report.");
      ctx.taskBody.appendChild(note("Emma (Security): Paperwork keeps people calm."));
      ctx.taskBody.appendChild(note("Liam (Worker): Paperwork hides exits."));

      const b = el("button", "sim-btn", "STAMP");
      b.style.marginTop = "12px";

      let pressed = false;
      let resolve;

      b.onclick = () => {
        if (pressed) return;
        pressed = true;
        b.textContent = "STAMPED";
        b.style.opacity = "0.7";
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.disabled = false;
        ctx.taskPrimary.onclick = () => resolve();
      };

      ctx.taskBody.appendChild(b);

      return new Promise((r) => (resolve = r));
    },
  };

  // Register functions into TASKS
  reg(TASKS);

  // Optional: register a pool so your random selector can pull from it
  if (regPool) {
    regPool("pack2", Object.keys(TASKS).map((id) => ({ id, w: 1 })));
  }
})();
