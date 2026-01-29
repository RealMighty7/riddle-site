// /packs/pack2.js
// Registers 20 tasks into window.TASKS via window.registerTasks()
// (Optional) also registers a pool via window.registerTaskPool()
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
    console.error("registerTasks missing — load tasks.js before packs/pack2.js");
    return;
  }

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

  // prevent double resolve
  const once = (fn) => {
    let done = false;
    return (...args) => {
      if (done) return;
      done = true;
      fn(...args);
    };
  };

  // safe cleanup container for listeners/intervals/timeouts
  const scoped = () => {
    const offs = [];
    return {
      on(target, type, fn, opts) {
        try {
          target.addEventListener(type, fn, opts);
          offs.push(() => target.removeEventListener(type, fn, opts));
        } catch {}
      },
      interval(fn, ms) {
        const id = setInterval(fn, ms);
        offs.push(() => clearInterval(id));
        return id;
      },
      timeout(fn, ms) {
        const id = setTimeout(fn, ms);
        offs.push(() => clearTimeout(id));
        return id;
      },
      clear() {
        for (const off of offs.splice(0)) {
          try { off(); } catch {}
        }
      }
    };
  };

  // ✅ success gate (writes admin answer too)
  const finish = (ctx, resolve, answer) => {
    try { ctx.setAnswer?.(answer); } catch {}
    ctx.taskPrimary.textContent = "continue";
    ctx.taskPrimary.disabled = false;
    ctx.taskPrimary.onclick = () => resolve();
  };

  reg({
    // 1
    liam_whisper: async (ctx) => {
      begin(ctx, "WORKER CHANNEL", "Someone left a note in the margin. Type the last word.");
      ctx.taskBody.appendChild(note("Liam (Worker): Don't look at me. Read the end."));
      const line = "route everything into noise, then pretend you never saw it";
      const pill = el("div", "pill", line);
      pill.style.marginTop = "12px";
      ctx.taskBody.appendChild(pill);

      const inp = makeInput("last word…");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
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
        finish(ctx, resolve, "it");
      };

      return new Promise((r) => (resolve = r));
    },

    // 2
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
      const msg = note("");

      wrap.appendChild(dot);
      wrap.appendChild(btn);
      ctx.taskBody.appendChild(wrap);
      ctx.taskBody.appendChild(msg);

      const L = scoped();
      let dim = true;
      let strikes = 0;
      const need = clamp(3 + (ctx.difficultyBoost?.() ?? 0), 3, 8);

      const flip = () => {
        dim = Math.random() < 0.55;
        dot.style.background = dim ? "rgba(255,255,255,0.10)" : "rgba(255,190,190,0.24)";
        dot.style.boxShadow = dim ? "none" : "0 0 18px rgba(255,190,190,0.18)";
      };

      flip();
      L.interval(flip, clamp(520 - (ctx.difficultyBoost?.() ?? 0) * 45, 260, 520));

      let okClicks = 0;
      let resolve;

      btn.onclick = () => {
        if (!dim) {
          strikes++;
          msg.textContent = "Too bright.";
          ctx.glitch?.();
          ctx.penalize?.(1, "camera attention");
          if (strikes >= 2) {
            L.clear();
            msg.textContent = "Stop. You're drawing eyes.";
            finish(ctx, resolve, `failed:${okClicks}/${need}`);
          }
          return;
        }
        okClicks++;
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = `Good. (${okClicks}/${need})`;
        if (okClicks >= need) {
          L.clear();
          finish(ctx, resolve, String(need));
        }
      };

      return new Promise((r) => (resolve = r));
    },

    // 3
    restore_header: async (ctx) => {
      begin(ctx, "RESTORE HEADER", "Pick the only valid header signature.");
      const opts = shuffle(["[[ ok ]]", "{ ok }]", "(( ok ))", "{[ ok ]}"]);
      const correct = "(( ok ))";
      const msg = note("");

      let resolve;

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
          finish(ctx, resolve, correct);
        };
        ctx.taskBody.appendChild(b);
      });

      ctx.taskBody.appendChild(msg);
      return new Promise((r) => (resolve = r));
    },

    // 4
    sort_lengths: async (ctx) => {
      begin(ctx, "SORT", "Click items shortest → longest.");
      const items = shuffle(["noise", "trace_ok", "pane_reflection", "microfracture", "audit_shadow"]);
      const sorted = items.slice().sort((a, b) => a.length - b.length);

      const row = el("div");
      row.style.marginTop = "12px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      const msg = note("");
      let idx = 0;

      let resolve;

      items.forEach((t) => {
        const b = el("button", "sim-btn", t);
        b.onclick = () => {
          if (t !== sorted[idx]) {
            idx = 0;
            msg.textContent = "Wrong order.";
            ctx.glitch?.();
            ctx.penalize?.(1, "messy");
            // re-enable buttons
            row.querySelectorAll("button").forEach((bb) => {
              bb.disabled = false;
              bb.style.opacity = "";
            });
            return;
          }
          b.disabled = true;
          b.style.opacity = "0.55";
          idx++;
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = `ok (${idx}/${sorted.length})`;
          if (idx >= sorted.length) {
            finish(ctx, resolve, sorted.join("→"));
          }
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      return new Promise((r) => (resolve = r));
    },

    // 5
    quiet_replace: async (ctx) => {
      begin(ctx, "EDIT", "Replace all underscores (_) with hyphens (-).");
      const base = "pane_reflection__trace_ok__cache_layer";
      const inp = makeInput("");
      inp.value = base;

      ctx.taskBody.appendChild(note("Liam (Worker): Small edits. No headlines."));
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      const target = base.replace(/_/g, "-");
      let resolve;

      ctx.taskPrimary.onclick = () => {
        const got = (inp.value || "").trim();
        if (got !== target) {
          msg.textContent = "Not clean.";
          ctx.glitch?.();
          ctx.penalize?.(1, "dirty edit");
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Applied.";
        finish(ctx, resolve, target);
      };

      return new Promise((r) => (resolve = r));
    },

    // 6
    pick_only_lowercase: async (ctx) => {
      begin(ctx, "FILTER", "Click the only option that is entirely lowercase.");
      const correct = "quiet";
      const opts = shuffle(["Quiet", "QUIET", correct, "quIet"]);
      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const row = el("div");
      row.style.marginTop = "10px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      opts.forEach((o) => {
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

      let resolve;
      return new Promise((r) => (resolve = r));
    },

    // 7
    index_2_5: async (ctx) => {
      begin(ctx, "INDEX", "Type the 2nd and 5th characters (no spaces).");
      const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
      const len = clamp(9 + (ctx.difficultyBoost?.() ?? 0), 9, 16);
      let s = "";
      for (let i = 0; i < len; i++) s += chars[rndInt(0, chars.length - 1)];
      const ans = (s[1] || "") + (s[4] || "");

      ctx.taskBody.appendChild(note(`string: ${s}`));
      const inp = makeInput("two characters…");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      ctx.taskPrimary.onclick = () => {
        const got = (inp.value || "").trim();
        if (got !== ans) {
          msg.textContent = "Mismatch.";
          ctx.glitch?.();
          ctx.penalize?.(1, "index");
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Indexed.";
        finish(ctx, resolve, ans);
      };

      return new Promise((r) => (resolve = r));
    },

    // 8
    reverse_confirm: async (ctx) => {
      begin(ctx, "MIRROR", "Type the reverse of the shown token.");
      const tokens = ["pane", "trace", "buffer", "quiet", "audit", "shadow", "mirror"];
      const t = tokens[rndInt(0, tokens.length - 1)] + "_" + rndInt(10, 99);
      const ans = t.split("").reverse().join("");

      const shown = el("div", "pill", t);
      shown.style.marginTop = "12px";
      ctx.taskBody.appendChild(shown);

      const inp = makeInput("reversed…");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      ctx.taskPrimary.onclick = () => {
        const got = (inp.value || "").trim();
        if (got !== ans) {
          msg.textContent = "No.";
          ctx.glitch?.();
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Mirrored.";
        finish(ctx, resolve, ans);
      };

      return new Promise((r) => (resolve = r));
    },

    // 9
    click_when_blank: async (ctx) => {
      begin(ctx, "WINDOW", "Click only when the line is blank.");
      const pill = el("div", "pill", "—");
      pill.style.marginTop = "12px";
      ctx.taskBody.appendChild(pill);

      const btn = el("button", "sim-btn", "click");
      btn.style.marginTop = "12px";
      ctx.taskBody.appendChild(btn);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      const L = scoped();
      const need = clamp(3 + Math.floor((ctx.difficultyBoost?.() ?? 0) / 2), 3, 7);
      let ok = 0;
      let stateBlank = true;

      const flip = () => {
        stateBlank = Math.random() < 0.5;
        pill.textContent = stateBlank ? "" : "signal";
        pill.style.minHeight = "22px";
        pill.style.opacity = stateBlank ? "0.7" : "1";
      };

      flip();
      L.interval(flip, clamp(650 - (ctx.difficultyBoost?.() ?? 0) * 40, 320, 650));

      let resolve;
      btn.onclick = () => {
        if (!stateBlank) {
          msg.textContent = "Too loud.";
          ctx.glitch?.();
          ctx.penalize?.(1, "misclick");
          return;
        }
        ok++;
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = `ok (${ok}/${need})`;
        if (ok >= need) {
          L.clear();
          finish(ctx, resolve, String(need));
        }
      };

      return new Promise((r) => (resolve = r));
    },

    // 10
    choose_valid_path: async (ctx) => {
      begin(ctx, "PATH", "Pick the only path that looks internally consistent.");
      const correct = "sys/cache/quiet.cfg";
      const opts = shuffle([
        "sys//cache/quiet.cfg",
        "SYS/cache/quiet.cfg",
        correct,
        "sys/cache/quiet cfg",
      ]);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      opts.forEach((o) => {
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

      let resolve;
      return new Promise((r) => (resolve = r));
    },

    // 11
    count_slashes: async (ctx) => {
      begin(ctx, "COUNT", "Count the slashes ( / ) and type the number.");
      const parts = ["sys", "cache", "quiet.cfg", "logs", "tmp", "shadow"];
      const n = rndInt(3, 5);
      const path = Array.from({ length: n }, () => parts[rndInt(0, parts.length - 1)]).join("/");
      const count = (path.match(/\//g) || []).length;

      ctx.taskBody.appendChild(note(`path: ${path}`));
      const inp = makeInput("number…");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      ctx.taskPrimary.onclick = () => {
        const got = (inp.value || "").trim();
        if (got !== String(count)) {
          msg.textContent = "Wrong.";
          ctx.glitch?.();
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Count matches.";
        finish(ctx, resolve, String(count));
      };

      return new Promise((r) => (resolve = r));
    },

    // 12
    strip_spaces: async (ctx) => {
      begin(ctx, "SANITIZE", "Remove ALL spaces and submit.");
      const base = "trace  ok   pane  cache";
      const target = base.replace(/\s+/g, "");
      ctx.taskBody.appendChild(note("input:"));
      const shown = el("div", "pill", base);
      shown.style.marginTop = "10px";
      shown.style.whiteSpace = "pre-wrap";
      ctx.taskBody.appendChild(shown);

      const inp = makeInput("sanitized…");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      ctx.taskPrimary.onclick = () => {
        const got = (inp.value || "");
        if (got !== target) {
          msg.textContent = "Not sanitized.";
          ctx.glitch?.();
          ctx.penalize?.(1, "sanitize");
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Clean.";
        finish(ctx, resolve, target);
      };

      return new Promise((r) => (resolve = r));
    },

    // 13
    choose_unique_symbol: async (ctx) => {
      begin(ctx, "SCAN", "Click the only line that contains a tilde (~).");
      const correct = "mode~quiet";
      const lines = shuffle([
        "mode=quiet",
        "mode:quiet",
        correct,
        "mode_quiet",
      ]);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      lines.forEach((t) => {
        const b = el("button", "sim-btn", t);
        b.style.display = "block";
        b.style.width = "100%";
        b.style.textAlign = "left";
        b.style.marginTop = "10px";
        b.onclick = () => {
          if (t !== correct) {
            msg.textContent = "No.";
            ctx.glitch?.();
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Found.";
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

    // 14
    add_two: async (ctx) => {
      begin(ctx, "CHECK", "Add the two numbers. Type the total.");
      const a = rndInt(7, 41);
      const b = rndInt(7, 41);
      const ans = String(a + b);

      ctx.taskBody.appendChild(note(`${a} + ${b} = ?`));
      const inp = makeInput("total…");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      ctx.taskPrimary.onclick = () => {
        const got = (inp.value || "").trim();
        if (got !== ans) {
          msg.textContent = "Incorrect.";
          ctx.glitch?.();
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Accepted.";
        finish(ctx, resolve, ans);
      };

      return new Promise((r) => (resolve = r));
    },

    // 15
    pick_palindrome: async (ctx) => {
      begin(ctx, "PATTERN", "Click the only palindrome.");
      const correct = "level";
      const opts = shuffle([correct, "lever", "label", "levle"]);
      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const row = el("div");
      row.style.marginTop = "10px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

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
      let resolve;
      return new Promise((r) => (resolve = r));
    },

    // 16
    tap_triplet: async (ctx) => {
      begin(ctx, "RHYTHM", "Click three times. The third must be delayed.");
      const btn = el("button", "sim-btn", "click");
      btn.style.marginTop = "12px";
      ctx.taskBody.appendChild(btn);

      const msg = note("Tip: click, click, (wait), click.");
      msg.style.color = "rgba(232,237,247,0.82)";
      msg.style.marginTop = "10px";
      ctx.taskBody.appendChild(msg);

      const warn = note("");
      warn.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(warn);

      const L = scoped();
      const times = [];
      const minGap3 = clamp(520 - (ctx.difficultyBoost?.() ?? 0) * 30, 320, 520);

      let resolve;
      btn.onclick = () => {
        const t = performance.now();
        times.push(t);
        if (times.length < 3) {
          warn.textContent = `(${times.length}/3)`;
          return;
        }
        const gap12 = times[1] - times[0];
        const gap23 = times[2] - times[1];
        // requirement: third is noticeably delayed relative to the first gap, and above min
        if (gap23 < minGap3 || gap23 < gap12 + 140) {
          times.length = 0;
          warn.textContent = "Too even. Reset.";
          ctx.glitch?.();
          ctx.penalize?.(1, "timing");
          return;
        }
        warn.style.color = "rgba(232,237,247,0.85)";
        warn.textContent = "Ok.";
        finish(ctx, resolve, String(Math.round(gap23)));
        L.clear();
      };

      return new Promise((r) => (resolve = r));
    },

    // 17
    choose_missing_char: async (ctx) => {
      begin(ctx, "REPAIR", "Pick the token that is missing exactly ONE letter from 'mirror'.");
      const correct = "miror"; // missing one 'r'
      const opts = shuffle(["mirror", correct, "miiror", "mirrror"]);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const row = el("div");
      row.style.marginTop = "10px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      opts.forEach((o) => {
        const b = el("button", "sim-btn", o);
        b.onclick = () => {
          if (o !== correct) {
            msg.textContent = "Not that.";
            ctx.glitch?.();
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Repaired.";
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

    // 18
    hold_to_fill: async (ctx) => {
      begin(ctx, "HOLD", "Hold to fill the bar. Release early resets.");
      const bar = el("div");
      bar.style.marginTop = "12px";
      bar.style.width = "min(520px, 100%)";
      bar.style.height = "14px";
      bar.style.borderRadius = "999px";
      bar.style.border = "1px solid rgba(255,255,255,0.18)";
      bar.style.background = "rgba(0,0,0,0.18)";
      bar.style.overflow = "hidden";

      const fill = el("div");
      fill.style.height = "100%";
      fill.style.width = "0%";
      fill.style.background = "rgba(232,237,247,0.45)";
      bar.appendChild(fill);

      const btn = el("button", "sim-btn", "hold");
      btn.style.marginTop = "12px";

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      ctx.taskBody.appendChild(bar);
      ctx.taskBody.appendChild(btn);
      ctx.taskBody.appendChild(msg);

      const L = scoped();
      const needMs = clamp(900 + (ctx.difficultyBoost?.() ?? 0) * 120, 900, 1900);

      let downAt = null;
      let raf = null;

      const render = () => {
        if (downAt == null) return;
        const t = performance.now() - downAt;
        const p = clamp(t / needMs, 0, 1);
        fill.style.width = `${Math.round(p * 100)}%`;
        if (p >= 1) {
          cancelAnimationFrame(raf);
          raf = null;
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Filled.";
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => resolve();
          L.clear();
          return;
        }
        raf = requestAnimationFrame(render);
      };

      L.on(btn, "mousedown", () => {
        msg.textContent = "";
        downAt = performance.now();
        if (!raf) raf = requestAnimationFrame(render);
      });

      L.on(window, "mouseup", () => {
        if (downAt == null) return;
        const t = performance.now() - downAt;
        downAt = null;
        if (t < needMs) {
          fill.style.width = "0%";
          msg.textContent = "Released.";
          ctx.glitch?.();
          ctx.penalize?.(1, "impatient");
        }
      });

      let resolve;
      return new Promise((r) => (resolve = r));
    },

    // 19
    choose_even_digits: async (ctx) => {
      begin(ctx, "FILTER", "Click the only option made of ONLY even digits.");
      const correct = "2468";
      const opts = shuffle([correct, "2489", "1357", "0247"]);
      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const row = el("div");
      row.style.marginTop = "10px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

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
      let resolve;
      return new Promise((r) => (resolve = r));
    },

    // 20
    final_phrase: async (ctx) => {
      begin(ctx, "CLOSE OUT", "Type the exact phrase shown. (No extra spaces.)");
      const phrases = [
        "notice: internal endpoint",
        "notice: restricted access",
        "notice: procedure active",
        "notice: audit window",
      ];
      const line = phrases[rndInt(0, phrases.length - 1)];

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
      ctx.taskPrimary.onclick = () => {
        const got = (inp.value || "").trim();
        if (got !== line) {
          msg.textContent = "Mismatch.";
          ctx.glitch?.();
          ctx.penalize?.(1, "typo");
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Closed.";
        finish(ctx, resolve, line);
      };

      return new Promise((r) => (resolve = r));
    },
  });

  if (regPool) {
    regPool("pack2", [
      { id: "liam_whisper", w: 1 },
      { id: "emma_watch", w: 1 },
      { id: "restore_header", w: 1 },
      { id: "sort_lengths", w: 1 },
      { id: "quiet_replace", w: 1 },
      { id: "pick_only_lowercase", w: 1 },
      { id: "index_2_5", w: 1 },
      { id: "reverse_confirm", w: 1 },
      { id: "click_when_blank", w: 1 },
      { id: "choose_valid_path", w: 1 },
      { id: "count_slashes", w: 1 },
      { id: "strip_spaces", w: 1 },
      { id: "choose_unique_symbol", w: 1 },
      { id: "add_two", w: 1 },
      { id: "pick_palindrome", w: 1 },
      { id: "tap_triplet", w: 1 },
      { id: "choose_missing_char", w: 1 },
      { id: "hold_to_fill", w: 1 },
      { id: "choose_even_digits", w: 1 },
      { id: "final_phrase", w: 1 },
    ]);
  }
})();
