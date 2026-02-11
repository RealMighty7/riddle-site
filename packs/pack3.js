// /packs/pack3.js
// Registers 20 tasks into window.TASKS via window.registerTasks()
// Theme: "mirror logic + duplication artifacts"
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
    console.error("registerTasks missing — load tasks.js before /packs/pack3.js");
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

  const finish = (ctx, resolve, answer) => {
    try { ctx.setAnswer?.(answer); } catch {}
    try { ctx.taskPrimary.classList.remove("hidden"); } catch {}
    ctx.taskPrimary.textContent = "continue";
    ctx.taskPrimary.disabled = false;
    ctx.taskPrimary.onclick = () => {
      try { ctx.success?.(); } catch {}
      try { resolve?.(); } catch {}
    };
  };

  const wrong = (ctx, msgEl, text, reason) => {
    if (msgEl) {
      msgEl.style.color = "rgba(255,190,190,.95)";
      msgEl.textContent = text || "Incorrect.";
    }
    ctx.glitch?.();
    ctx.penalize?.(1, reason || "wrong");
  };

  const alpha = "abcdefghijklmnopqrstuvwxyz";
  const alnum = "abcdefghijklmnopqrstuvwxyz0123456789";

  const TASKS = {
    // 1) Spot the duplicated pair (exactly one token repeats)
    dup_token: async (ctx) => {
      begin(ctx, "DUPLICATE", "Type the token that appears twice.");
      const base = shuffle(["pane", "trace", "buffer", "mirror", "quiet", "audit", "shadow"]);
      const dup = base[0];
      const list = shuffle([dup, dup, base[1], base[2], base[3], base[4]]);
      ctx.setAnswer?.(dup);

      ctx.taskBody.appendChild(note(list.join("   ")));

      const inp = makeInput("duplicate…");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      const submit = () => {
        const got = (inp.value || "").trim().toLowerCase();
        if (got !== dup) return wrong(ctx, msg, "Wrong.", "dup_token");
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Confirmed.";
        finish(ctx, resolve, dup);
      };

      ctx.taskPrimary.onclick = submit;
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
      inp.focus();

      return new Promise((r) => (resolve = r));
    },

    // 2) Mirror math: reverse then take first 3
    mirror_take3: async (ctx) => {
      begin(ctx, "MIRROR", "Reverse the string, then type the first 3 characters.");
      let s = "";
      const len = clamp(9 + (ctx.difficultyBoost?.() ?? 0), 9, 15);
      for (let i = 0; i < len; i++) s += alnum[rndInt(0, alnum.length - 1)];
      const ans = s.split("").reverse().join("").slice(0, 3);
      ctx.setAnswer?.(ans);

      ctx.taskBody.appendChild(note(`string: ${s}`));
      const inp = makeInput("3 chars…");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      const submit = () => {
        const got = (inp.value || "").trim();
        if (got !== ans) return wrong(ctx, msg, "No.", "mirror_take3");
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Ok.";
        finish(ctx, resolve, ans);
      };

      ctx.taskPrimary.onclick = submit;
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
      inp.focus();

      return new Promise((r) => (resolve = r));
    },

    // 3) Click only the option with exactly two slashes
    two_slashes: async (ctx) => {
      begin(ctx, "FILTER", "Click the only option with exactly TWO slashes (/).");
      const correct = "sys/cache/quiet"; // exactly 2 slashes
      ctx.setAnswer?.(correct);

      const opts = shuffle([
        correct,
        "sys//cache/quiet",   // 3 slashes
        "sys/cache/quiet/",   // 3 slashes
        "sys-cache-quiet",    // 0 slashes
      ]);

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
            wrong(ctx, msg, "Rejected.", "two_slashes");
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

    // 4) Type only bracketed digits
    bracket_digits: async (ctx) => {
      begin(ctx, "EXTRACT", "Type only the digits inside [brackets], in order.");
      const L = clamp(20 + (ctx.difficultyBoost?.() ?? 0) * 2, 20, 38);
      let s = "";
      let ans = "";
      for (let i = 0; i < L; i++) {
        const d = String(rndInt(0, 9));
        const mark = Math.random() < 0.22;
        if (mark) { s += `[${d}]`; ans += d; }
        else s += (Math.random() < 0.6 ? alpha[rndInt(0, 25)] : d);
        if (Math.random() < 0.12) s += " ";
      }
      if (!ans) { s += " [7]"; ans = "7"; }

      ctx.setAnswer?.(ans);

      const shown = el("div", "pill", s);
      shown.style.marginTop = "10px";
      shown.style.whiteSpace = "pre-wrap";
      ctx.taskBody.appendChild(shown);

      const inp = makeInput("digits…");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      const submit = () => {
        const got = (inp.value || "").trim().replace(/\s+/g, "");
        if (got !== ans) return wrong(ctx, msg, "Extraction failed.", "bracket_digits");
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Extracted.";
        finish(ctx, resolve, ans);
      };

      ctx.taskPrimary.onclick = submit;
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
      inp.focus();

      return new Promise((r) => (resolve = r));
    },

    // 5) Click when the dot is "cold" (dim)
    cold_dot: async (ctx) => {
      begin(ctx, "WINDOW", "Click only when the dot is dim.");

      const dot = el("div");
      dot.style.width = "16px";
      dot.style.height = "16px";
      dot.style.borderRadius = "999px";
      dot.style.border = "1px solid rgba(255,255,255,0.18)";
      dot.style.marginTop = "12px";

      const btn = el("button", "sim-btn", "click");
      btn.style.marginTop = "12px";

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      ctx.taskBody.appendChild(dot);
      ctx.taskBody.appendChild(btn);
      ctx.taskBody.appendChild(msg);

      const L = scoped();
      const need = clamp(3 + Math.floor((ctx.difficultyBoost?.() ?? 0) / 2), 3, 8);
      ctx.setAnswer?.(String(need));

      let ok = 0;
      let dim = true;

      const flip = () => {
        dim = Math.random() < 0.55;
        dot.style.background = dim ? "rgba(255,255,255,0.10)" : "rgba(255,200,200,0.26)";
        dot.style.boxShadow = dim ? "none" : "0 0 18px rgba(255,180,180,0.18)";
      };
      flip();
      L.interval(flip, clamp(520 - (ctx.difficultyBoost?.() ?? 0) * 35, 260, 520));

      let resolve;
      btn.onclick = () => {
        if (!dim) return wrong(ctx, msg, "Too bright.", "cold_dot misclick");
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

    // 6) Count vowels
    count_vowels: async (ctx) => {
      begin(ctx, "COUNT", "Count the vowels (a,e,i,o,u). Type the number.");
      const len = clamp(12 + (ctx.difficultyBoost?.() ?? 0) * 2, 12, 28);
      let s = "";
      for (let i = 0; i < len; i++) s += alpha[rndInt(0, 25)];
      const vowels = new Set(["a","e","i","o","u"]);
      let count = 0;
      for (const ch of s) if (vowels.has(ch)) count++;

      const ans = String(count);
      ctx.setAnswer?.(ans);

      ctx.taskBody.appendChild(note(`string: ${s}`));
      const inp = makeInput("vowel count…");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      const submit = () => {
        const got = (inp.value || "").trim();
        if (got !== ans) return wrong(ctx, msg, "Wrong.", "count_vowels");
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Ok.";
        finish(ctx, resolve, ans);
      };

      ctx.taskPrimary.onclick = submit;
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
      inp.focus();

      return new Promise((r) => (resolve = r));
    },

    // 7) Pick only valid key=value (no spaces)
    key_value: async (ctx) => {
      begin(ctx, "FORMAT", "Click the only valid key=value string.");
      const correct = "mode=quiet";
      ctx.setAnswer?.(correct);

      const opts = shuffle(["mode : quiet", "mode==quiet", correct, "mode= quiet"]);

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
          if (o !== correct) return wrong(ctx, msg, "Rejected.", "key_value");
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Valid.";
          finish(ctx, resolve, correct);
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      return new Promise((r) => (resolve = r));
    },

    // 8) Remove all underscores
    remove_underscores: async (ctx) => {
      begin(ctx, "EDIT", "Remove ALL underscores (_) and submit.");
      const base = "pane_reflection__trace_ok__cache_layer";
      const target = base.replace(/_/g, "");
      ctx.setAnswer?.(target);

      const shown = el("div", "pill", base);
      shown.style.marginTop = "10px";
      ctx.taskBody.appendChild(shown);

      const inp = makeInput("edited…");
      inp.value = base;
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      const submit = () => {
        const got = (inp.value || "");
        if (got !== target) return wrong(ctx, msg, "Not clean.", "remove_underscores");
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Applied.";
        finish(ctx, resolve, target);
      };

      ctx.taskPrimary.onclick = submit;
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
      inp.focus();

      return new Promise((r) => (resolve = r));
    },

    // 9) Click the only line with no punctuation at all
    no_punct: async (ctx) => {
      begin(ctx, "SCAN", "Click the only line with no punctuation.");
      const correct = "trace checkpoint ok";
      ctx.setAnswer?.(correct);

      const lines = shuffle([
        "System: Session pinned",
        "audit window (active)",
        correct,
        "mirror-write enabled.",
      ]);

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
          if (t !== correct) return wrong(ctx, msg, "Wrong scan.", "no_punct");
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Clean.";
          finish(ctx, resolve, correct);
        };
        ctx.taskBody.appendChild(b);
      });

      ctx.taskBody.appendChild(msg);
      return new Promise((r) => (resolve = r));
    },

    // 10) Add three numbers
    add_three: async (ctx) => {
      begin(ctx, "CHECKSUM", "Add the three numbers.");
      const a = rndInt(4, 29), b = rndInt(4, 29), c = rndInt(4, 29);
      const ans = String(a + b + c);
      ctx.setAnswer?.(ans);

      ctx.taskBody.appendChild(note(`${a} + ${b} + ${c} = ?`));
      const inp = makeInput("total…");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      const submit = () => {
        const got = (inp.value || "").trim();
        if (got !== ans) return wrong(ctx, msg, "Incorrect.", "add_three");
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Accepted.";
        finish(ctx, resolve, ans);
      };

      ctx.taskPrimary.onclick = submit;
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
      inp.focus();

      return new Promise((r) => (resolve = r));
    },

    // 11) Hold pattern: short short long
    tap_hold_pattern: async (ctx) => {
      begin(ctx, "SIGNAL", "Perform: SHORT, SHORT, LONG holds.");
      const target = ["S", "S", "L"];
      const got = [];
      const answer = "S-S-L";
      ctx.setAnswer?.(answer);

      const btn = el("button", "sim-btn", "hold");
      btn.style.marginTop = "12px";

      const readout = el("div", "pill", "pattern: — — —");
      readout.style.marginTop = "12px";

      const warn = note("Hold and release to register a segment.");
      warn.style.color = "rgba(232,237,247,0.82)";

      const err = note("");
      err.style.color = "rgba(255,190,190,.95)";

      ctx.taskBody.appendChild(warn);
      ctx.taskBody.appendChild(btn);
      ctx.taskBody.appendChild(readout);
      ctx.taskBody.appendChild(err);

      const shortMax = clamp(340 + (ctx.difficultyBoost?.() ?? 0) * 35, 340, 650);
      const longMin = clamp(760 + (ctx.difficultyBoost?.() ?? 0) * 55, 760, 1180);

      const L = scoped();
      let downAt = null;

      const render = () => {
        readout.textContent = `pattern: ${target.map((_, i) => got[i] || "—").join(" ")}`;
      };

      const fail = () => {
        got.length = 0;
        render();
        wrong(ctx, err, "Signal corrupted. Reset.", "tap_hold_pattern");
      };

      L.on(btn, "mousedown", () => { downAt = performance.now(); });

      let resolve;
      L.on(window, "mouseup", () => {
        if (downAt === null) return;
        const dur = performance.now() - downAt;
        downAt = null;

        const seg = (dur <= shortMax) ? "S" : (dur >= longMin ? "L" : "?");
        if (seg === "?") return fail();

        got.push(seg);
        render();

        for (let i = 0; i < got.length; i++) {
          if (got[i] !== target[i]) return fail();
        }

        if (got.length === target.length) {
          err.style.color = "rgba(232,237,247,0.85)";
          err.textContent = "Signal accepted.";
          L.clear();
          finish(ctx, resolve, answer);
        }
      });

      render();
      return new Promise((r) => (resolve = r));
    },

    // 12) Type last word
    last_word: async (ctx) => {
      begin(ctx, "MARGIN", "Type the last word.");
      const line = "keep the noise low and the hands still";
      const ans = "still";
      ctx.setAnswer?.(ans);

      ctx.taskBody.appendChild(note(line));

      const inp = makeInput("last word…");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      const submit = () => {
        const got = (inp.value || "").trim().toLowerCase();
        if (got !== ans) return wrong(ctx, msg, "No.", "last_word");
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Ok.";
        finish(ctx, resolve, ans);
      };

      ctx.taskPrimary.onclick = submit;
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
      inp.focus();

      return new Promise((r) => (resolve = r));
    },

    // 13) Choose the only even-length string
    even_length: async (ctx) => {
      begin(ctx, "FILTER", "Click the only option with an EVEN character count.");
      const mk = (n) => Array.from({ length: n }, () => alpha[rndInt(0, 25)]).join("");
      const even = mk(rndInt(6, 10) * 2);
      ctx.setAnswer?.(even);

      const opts = shuffle([
        mk((rndInt(7, 15) | 1)),
        mk((rndInt(7, 15) | 1)),
        even,
        mk((rndInt(7, 15) | 1)),
      ]);

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
          if (o !== even) return wrong(ctx, msg, "Rejected.", "even_length");
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Filtered.";
          finish(ctx, resolve, even);
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      return new Promise((r) => (resolve = r));
    },

    // 14) Retype exactly (case-sensitive)
    retype_exact: async (ctx) => {
      begin(ctx, "RETYPE", "Retype exactly (case-sensitive).");
      const parts = ["Quiet", "AUDIT", "mirror", "Trace", "buffer", "SHADOW"];
      const line = `${parts[rndInt(0, parts.length - 1)]}-${parts[rndInt(0, parts.length - 1)]}-${rndInt(10, 99)}`;
      ctx.setAnswer?.(line);

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
      const submit = () => {
        const got = (inp.value || "").trim();
        if (got !== line) return wrong(ctx, msg, "Mismatch.", "retype_exact");
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Exact.";
        finish(ctx, resolve, line);
      };

      ctx.taskPrimary.onclick = submit;
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
      inp.focus();

      return new Promise((r) => (resolve = r));
    },

    // 15) Mirror pick: choose the reversed option
    mirror_pick: async (ctx) => {
      begin(ctx, "MIRROR PICK", "Click the option that is the mirror (reversed) of the target.");
      const words = ["pane", "trace", "buffer", "mirror", "quiet", "audit", "shadow", "layer"];
      const w = words[rndInt(0, words.length - 1)];
      const correct = w.split("").reverse().join("");
      ctx.setAnswer?.(correct);

      ctx.taskBody.appendChild(note(`target: ${w}`));

      const opts = shuffle([
        correct,
        w.toUpperCase(),
        w + w,
        w.slice(1) + w[0],
      ]);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const row = el("div");
      row.style.marginTop = "12px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      let resolve;

      opts.forEach((o) => {
        const b = el("button", "sim-btn", o);
        b.onclick = () => {
          if (o !== correct) return wrong(ctx, msg, "Mismatch.", "mirror_pick");
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Matched.";
          finish(ctx, resolve, correct);
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      return new Promise((r) => (resolve = r));
    },

    // 16) Split token: type the second half after "|"
    token_split: async (ctx) => {
      begin(ctx, "TOKEN", "Type the SECOND half of the token (after the |).");
      const a = shuffle(["pane", "trace", "buffer", "quiet", "mirror", "audit", "shadow"]);
      const b = shuffle(["07", "19", "42", "88", "13", "64", "21"]);
      const token = `${a[0]}${b[0]}|${a[1]}${b[1]}`;
      const ans = token.split("|")[1];
      ctx.setAnswer?.(ans);

      ctx.taskBody.appendChild(note(`token: ${token}`));

      const inp = makeInput("second half…");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      const submit = () => {
        const got = (inp.value || "").trim();
        if (got !== ans) return wrong(ctx, msg, "Wrong half.", "token_split");
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Ok.";
        finish(ctx, resolve, ans);
      };

      ctx.taskPrimary.onclick = submit;
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
      inp.focus();

      return new Promise((r) => (resolve = r));
    },

    // 17) Order by length (4 items): shortest → longest
    order_length_4: async (ctx) => {
      begin(ctx, "ORDER", "Click items shortest → longest.");
      const items = shuffle(["noise", "trace_ok", "pane_reflection", "microfracture", "audit_shadow"]);
      const pick = items.slice(0, 4);
      const sorted = pick.slice().sort((a, b) => a.length - b.length);
      const answer = sorted.join("→");
      ctx.setAnswer?.(answer);

      const row = el("div");
      row.style.marginTop = "12px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      let idx = 0;
      let resolve;

      pick.forEach((t) => {
        const b = el("button", "sim-btn", t);
        b.onclick = () => {
          if (t !== sorted[idx]) {
            idx = 0;
            wrong(ctx, msg, "Wrong order.", "order_length_4");
            row.querySelectorAll("button").forEach((x) => {
              x.disabled = false;
              x.style.opacity = "1";
            });
            return;
          }
          b.disabled = true;
          b.style.opacity = "0.55";
          idx++;
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = `ok (${idx}/${sorted.length})`;
          if (idx >= sorted.length) finish(ctx, resolve, answer);
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      return new Promise((r) => (resolve = r));
    },

    // 18) Scrub X: replace every 'x' with '.'
    scrub_x: async (ctx) => {
      begin(ctx, "SCRUB", "Replace every 'x' with '.' and submit.");
      const len = clamp(18 + (ctx.difficultyBoost?.() ?? 0) * 2, 18, 40);
      let s = "";
      for (let i = 0; i < len; i++) s += (Math.random() < 0.22 ? "x" : alpha[rndInt(0, 25)]);
      if (!s.includes("x")) s = s.slice(0, -1) + "x";
      const target = s.replace(/x/g, ".");
      ctx.setAnswer?.(target);

      ctx.taskBody.appendChild(note(`source: ${s}`));

      const inp = makeInput("type scrubbed…");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      let last = 0;
      inp.addEventListener("input", () => {
        const now = inp.value.length;
        if (now - last > 6) {
          // warn + penalize, but don't hard fail
          wrong(ctx, msg, "Too fast.", "scrub_x paste");
        }
        last = now;
      });

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      const submit = () => {
        const got = (inp.value || "").trim();
        if (got !== target) return wrong(ctx, msg, "Scrub failed.", "scrub_x");
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Scrubbed.";
        finish(ctx, resolve, target);
      };

      ctx.taskPrimary.onclick = submit;
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
      inp.focus();

      return new Promise((r) => (resolve = r));
    },

    // 19) Odd-one: click the only option containing a number
    has_number: async (ctx) => {
      begin(ctx, "MISMATCH", "Click the only option that contains a number.");
      const opts = shuffle(["pane", "trace", "mirror", "quiet07"]);
      const correct = "quiet07";
      ctx.setAnswer?.(correct);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const row = el("div");
      row.style.marginTop = "12px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      let resolve;

      opts.forEach((o) => {
        const b = el("button", "sim-btn", o);
        b.onclick = () => {
          if (o !== correct) return wrong(ctx, msg, "No.", "has_number");
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Found.";
          finish(ctx, resolve, correct);
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      return new Promise((r) => (resolve = r));
    },

    // 20) Compliance: do NOT click for N seconds (capture)
    dont_click: async (ctx) => {
      const sec = clamp(2 + Math.floor((ctx.difficultyBoost?.() ?? 0) / 2), 2, 6);
      begin(ctx, "COMPLIANCE", `Do NOT click anywhere for ${sec} seconds.`);

      const timer = el("div", "pill", `time: ${sec}s`);
      timer.style.marginTop = "12px";
      ctx.taskBody.appendChild(timer);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      msg.style.marginTop = "10px";
      ctx.taskBody.appendChild(msg);

      const L = scoped();
      let clicks = 0;
      L.on(window, "click", () => { clicks++; }, true);

      let resolve;
      const start = performance.now();

      const tick = () => {
        const t = (performance.now() - start) / 1000;
        const left = Math.max(0, Math.ceil(sec - t));
        timer.textContent = `time: ${left}s  |  clicks: ${clicks}`;

        if (t >= sec) {
          L.clear();
          if (clicks > 0) {
            wrong(ctx, msg, "Auditor noted it.", "dont_click");
            finish(ctx, resolve, `clicked:${clicks}`);
          } else {
            msg.style.color = "rgba(232,237,247,0.85)";
            msg.textContent = "Clean window held.";
            finish(ctx, resolve, "clean");
          }
          return;
        }
        requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
      return new Promise((r) => (resolve = r));
    },
  };

  reg(TASKS);

  // ✅ Pool as string IDs (tasks.js random expects strings)
  if (regPool) {
    regPool("pack3", Object.keys(TASKS));
  }
})();
