// /packs/pack4.js
// Registers 20 tasks into window.TASKS via window.registerTasks()
// Theme: "audit pressure + stealth ops"
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
    console.error("registerTasks missing — load tasks.js before /packs/pack4.js");
    return;
  }

  const el = (t, c, txt) => {
    const d = document.createElement(t);
    if (c) d.className = c;
    if (txt !== undefined) d.textContent = txt;
    return d;
  };
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

  const wrong = (ctx, msgEl, text, reason) => {
    if (msgEl) {
      msgEl.style.color = "rgba(255,190,190,.95)";
      msgEl.textContent = text || "Incorrect.";
    }
    ctx.glitch?.();
    ctx.penalize?.(1, reason || "wrong");
  };

  const TASKS = {
    // 1) Reaction gate: click ONLY when it turns "SAFE"
    safe_gate: async (ctx) => {
      begin(ctx, "SAFE GATE", "Click only when the indicator reads SAFE. One misclick adds noise.");

      const wrap = el("div");
      wrap.style.marginTop = "12px";

      const pill = el("div", "pill", "STATUS: HOLD");
      pill.style.display = "inline-block";
      pill.style.userSelect = "none";

      const btn = el("button", "sim-btn", "click");
      btn.style.marginTop = "12px";

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      wrap.appendChild(pill);
      wrap.appendChild(el("div"));
      wrap.appendChild(btn);
      wrap.appendChild(msg);
      ctx.taskBody.appendChild(wrap);

      const safeWindows = clamp(2 + Math.floor((ctx.difficultyBoost?.() ?? 0) / 2), 2, 5);
      ctx.setAnswer?.(String(safeWindows));

      let safeCount = 0;
      let state = "HOLD";

      const L = scoped();

      const cycle = () => {
        const holdMs = clamp(rndInt(650, 1100) + (ctx.difficultyBoost?.() ?? 0) * 60, 650, 1600);
        const safeMs = clamp(rndInt(420, 780) - (ctx.difficultyBoost?.() ?? 0) * 25, 220, 780);

        pill.textContent = "STATUS: HOLD";
        pill.style.opacity = "0.85";
        state = "HOLD";

        L.timeout(() => {
          pill.textContent = "STATUS: SAFE";
          pill.style.opacity = "1";
          state = "SAFE";

          L.timeout(() => {
            // if not finished, continue cycling
            if (safeCount < safeWindows) cycle();
          }, safeMs);
        }, holdMs);
      };

      cycle();

      let resolve;
      const done = once(() => {
        L.clear();
        finish(ctx, resolve, String(safeWindows));
      });

      btn.onclick = () => {
        if (state !== "SAFE") return wrong(ctx, msg, "Too early.", "safe_gate misclick");
        safeCount++;
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = `Good. (${safeCount}/${safeWindows})`;
        if (safeCount >= safeWindows) done();
      };

      return new Promise((r) => (resolve = r));
    },

    // 2) Extract letters inside brackets
    bracket_extract: async (ctx) => {
      begin(ctx, "EXTRACT", "Type only the letters inside [brackets], in order.");
      const letters = "abcdefghijklmnopqrstuvwxyz";
      const len = clamp(18 + (ctx.difficultyBoost?.() ?? 0) * 2, 18, 34);

      let s = "";
      let answer = "";
      for (let i = 0; i < len; i++) {
        const ch = letters[rndInt(0, letters.length - 1)];
        const mark = Math.random() < 0.28;
        if (mark) { s += `[${ch}]`; answer += ch; }
        else s += ch;
        if (Math.random() < 0.12) s += " ";
      }
      if (!answer) {
        const ch = letters[rndInt(0, letters.length - 1)];
        s += ` [${ch}]`;
        answer = ch;
      }

      ctx.setAnswer?.(answer);

      ctx.taskBody.appendChild(note("string:"));
      const shown = el("div", "pill", s);
      shown.style.marginTop = "10px";
      shown.style.whiteSpace = "pre-wrap";
      ctx.taskBody.appendChild(shown);

      const inp = makeInput("extracted letters…");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      const submit = () => {
        const got = (inp.value || "").trim().replace(/\s+/g, "");
        if (got !== answer) return wrong(ctx, msg, "Extraction failed.", "bracket_extract");
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Extracted.";
        finish(ctx, resolve, answer);
      };

      ctx.taskPrimary.onclick = submit;
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
      inp.focus();

      return new Promise((r) => (resolve = r));
    },

    // 3) Lowest-risk action
    low_risk_action: async (ctx) => {
      begin(
        ctx,
        "AUDIT CHOICE",
        "Pick the lowest-risk action: choose the one that changes metadata, not people or content. The auditor is watching."
      );
      const opts = shuffle([
        "REQUEST FULL USER EXPORT",
        "INCREASE AD RETENTION",
        "ROTATE LOGS (NO CONTENT)",
        "OPEN LIVE FEED",
      ]);
      const correct = "ROTATE LOGS (NO CONTENT)";
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
          if (o !== correct) return wrong(ctx, msg, "Too loud.", "low_risk_action");
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Low risk confirmed.";
          finish(ctx, resolve, correct);
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      return new Promise((r) => (resolve = r));
    },

    // 4) Multi-hold pattern: S S L
    tap_hold_pattern: async (ctx) => {
      begin(ctx, "SIGNAL", "Perform the signal: SHORT, SHORT, LONG holds (in that order).");
      const target = ["S", "S", "L"];
      const got = [];
      const answer = "S-S-L";
      ctx.setAnswer?.(answer);

      const msg = note("Hold the button. Release to register a segment.");
      msg.style.color = "rgba(232,237,247,0.82)";

      const btn = el("button", "sim-btn", "hold");
      btn.style.marginTop = "12px";

      const readout = el("div", "pill", "pattern: — — —");
      readout.style.marginTop = "12px";

      const warn = note("");
      warn.style.color = "rgba(255,190,190,.95)";

      ctx.taskBody.appendChild(msg);
      ctx.taskBody.appendChild(btn);
      ctx.taskBody.appendChild(readout);
      ctx.taskBody.appendChild(warn);

      const shortMax = clamp(320 + (ctx.difficultyBoost?.() ?? 0) * 35, 320, 620);
      const longMin = clamp(720 + (ctx.difficultyBoost?.() ?? 0) * 55, 720, 1150);

      const L = scoped();
      let downAt = null;

      const render = () => {
        const view = target.map((_, i) => got[i] || "—").join(" ");
        readout.textContent = `pattern: ${view}`;
      };
      render();

      const fail = () => {
        got.length = 0;
        render();
        wrong(ctx, warn, "Signal corrupted. Reset.", "tap_hold_pattern");
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
          warn.style.color = "rgba(232,237,247,0.85)";
          warn.textContent = "Signal accepted.";
          L.clear();
          finish(ctx, resolve, answer);
        }
      });

      return new Promise((r) => (resolve = r));
    },

    // 5) Find only line WITHOUT a colon
    no_colon_line: async (ctx) => {
      begin(ctx, "SCAN", "Click the only line without a colon (:).");
      const lines = shuffle([
        "System: Session pinned",
        "Audit: Mirror enabled",
        "trace checkpoint ok",
        "Security: Hands off",
      ]);
      const correct = "trace checkpoint ok";
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
          if (t !== correct) return wrong(ctx, msg, "Wrong scan.", "no_colon_line");
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Clean.";
          finish(ctx, resolve, correct);
        };
        ctx.taskBody.appendChild(b);
      });

      ctx.taskBody.appendChild(msg);
      return new Promise((r) => (resolve = r));
    },

    // 6) Type the 3rd and 7th characters
    index_chars: async (ctx) => {
      begin(ctx, "INDEX", "Type the 3rd and 7th characters (no spaces).");
      const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
      const len = clamp(10 + (ctx.difficultyBoost?.() ?? 0), 10, 18);
      let s = "";
      for (let i = 0; i < len; i++) s += chars[rndInt(0, chars.length - 1)];
      const ans = (s[2] || "") + (s[6] || "");
      ctx.setAnswer?.(ans);

      ctx.taskBody.appendChild(note(`string: ${s}`));
      const inp = makeInput("two characters…");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      const submit = () => {
        const got = (inp.value || "").trim();
        if (got !== ans) return wrong(ctx, msg, "Index mismatch.", "index_chars");
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Indexed.";
        finish(ctx, resolve, ans);
      };

      ctx.taskPrimary.onclick = submit;
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
      inp.focus();

      return new Promise((r) => (resolve = r));
    },

    // 7) Click the only even-length string
    even_length: async (ctx) => {
      begin(ctx, "FILTER", "Click the only option with an EVEN number of characters.");
      const make = (n) => Array.from({ length: n }, () => String.fromCharCode(rndInt(97, 122))).join("");

      const even = make(rndInt(6, 10) * 2);
      ctx.setAnswer?.(even);

      const opts = shuffle([
        make(rndInt(7, 15) | 1),
        make(rndInt(7, 15) | 1),
        make(rndInt(7, 15) | 1),
        even,
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

    // 8) Micro-scrub: replace all "x" with "."
    scrub_x: async (ctx) => {
      begin(ctx, "SCRUB", "Replace every 'x' with '.' and submit.");
      const len = clamp(18 + (ctx.difficultyBoost?.() ?? 0) * 2, 18, 40);
      let s = "";
      for (let i = 0; i < len; i++) s += (Math.random() < 0.22 ? "x" : String.fromCharCode(rndInt(97, 122)));
      if (!s.includes("x")) s = s.slice(0, -1) + "x";

      const target = s.replace(/x/g, ".");
      ctx.setAnswer?.(target);

      ctx.taskBody.appendChild(note(`source: ${s}`));
      const inp = makeInput("type scrubbed string…");
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

    // 9) Choose the ONLY option that contains a dash
    has_dash: async (ctx) => {
      begin(ctx, "SCAN", "Click the only option that contains a dash (-).");
      const dash = "audit-log";
      const opts = shuffle(["auditlog", "audit/log", dash, "audit_log"]);
      ctx.setAnswer?.(dash);

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
          if (o !== dash) return wrong(ctx, msg, "No.", "has_dash");
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Ok.";
          finish(ctx, resolve, dash);
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      return new Promise((r) => (resolve = r));
    },

    // 10) Type the word that appears twice
    duplicate_word: async (ctx) => {
      begin(ctx, "DUPLICATE", "Type the word that appears twice.");
      const base = shuffle(["pane", "buffer", "trace", "audit", "quiet", "layer"]);
      const dup = base[0];
      const list = shuffle([dup, dup, base[1], base[2], base[3]]);
      ctx.setAnswer?.(dup);

      ctx.taskBody.appendChild(note(list.join("   ")));

      const inp = makeInput("duplicate word…");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      const submit = () => {
        const got = (inp.value || "").trim().toLowerCase();
        if (got !== dup) return wrong(ctx, msg, "Wrong.", "duplicate_word");
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Confirmed.";
        finish(ctx, resolve, dup);
      };

      ctx.taskPrimary.onclick = submit;
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
      inp.focus();

      return new Promise((r) => (resolve = r));
    },

    // 11) Compliance: don't click for N seconds
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

    // 12) Choose valid key=value
    key_value: async (ctx) => {
      begin(ctx, "FORMAT", "Click the only string that matches key=value.");
      const correct = "mode=quiet";
      const opts = shuffle(["mode:quiet", "mode = quiet", correct, "mode==quiet"]);
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
          if (o !== correct) return wrong(ctx, msg, "Format rejected.", "key_value");
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

    // 13) Order by length (3 items)
    length_order_3: async (ctx) => {
      begin(ctx, "ORDER", "Order from shortest → longest (click to append).");
      const words = shuffle(["pane", "buffer", "trace", "audit", "quiet", "layer", "integrity", "containment"]);
      const a = words[0], b = words[1], c = words[2];
      const items = shuffle([a, b, c]);
      const correct = [a, b, c].slice().sort((x, y) => x.length - y.length);
      const answer = correct.join("→");
      ctx.setAnswer?.(answer);

      const picked = [];
      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const row = el("div");
      row.style.marginTop = "10px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      const out = el("div", "pill", "picked: —");
      out.style.marginTop = "12px";

      const render = () => {
        out.textContent = `picked: ${picked.length ? picked.join(" ") : "—"}`;
      };
      render();

      let resolve;

      items.forEach((w) => {
        const btn = el("button", "sim-btn", w);
        btn.onclick = () => {
          if (picked.includes(w)) return;
          picked.push(w);
          render();

          if (picked.length === 3) {
            const ok = picked.join("|") === correct.join("|");
            if (!ok) {
              picked.length = 0;
              render();
              return wrong(ctx, msg, "Wrong order.", "length_order_3");
            }
            msg.style.color = "rgba(232,237,247,0.85)";
            msg.textContent = "Ordered.";
            finish(ctx, resolve, answer);
          }
        };
        row.appendChild(btn);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(out);
      ctx.taskBody.appendChild(msg);

      return new Promise((r) => (resolve = r));
    },

    // 14) Count vowels
    count_vowels: async (ctx) => {
      begin(ctx, "COUNT", "Count the vowels (a,e,i,o,u). Type the number.");
      const letters = "abcdefghijklmnopqrstuvwxyz";
      const len = clamp(10 + (ctx.difficultyBoost?.() ?? 0) * 2, 10, 24);
      let s = "";
      for (let i = 0; i < len; i++) s += letters[rndInt(0, letters.length - 1)];
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
        msg.textContent = "Count matches.";
        finish(ctx, resolve, ans);
      };

      ctx.taskPrimary.onclick = submit;
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
      inp.focus();

      return new Promise((r) => (resolve = r));
    },

    // 15) Starts with sys/
    starts_sys: async (ctx) => {
      begin(ctx, "PATH", "Click the only option that starts with sys/.");
      const correct = "sys/quiet.cfg";
      const opts = shuffle(["logs/sys/quiet.cfg", "user/sys/quiet.cfg", correct, "/sys/quiet.cfg"]);
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
          if (o !== correct) return wrong(ctx, msg, "Wrong path.", "starts_sys");
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Path confirmed.";
          finish(ctx, resolve, correct);
        };
        ctx.taskBody.appendChild(b);
      });

      ctx.taskBody.appendChild(msg);
      return new Promise((r) => (resolve = r));
    },

    // 16) Add 3 numbers
    add_three: async (ctx) => {
      begin(ctx, "CHECKSUM", "Add the three numbers. Type the total.");
      const a = rndInt(4, 29);
      const b = rndInt(4, 29);
      const c = rndInt(4, 29);
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

    // 17) Exactly two underscores
    two_underscores: async (ctx) => {
      begin(ctx, "FILTER", "Click the string with exactly TWO underscores (_).");
      const correct = "pane__reflection";
      const opts = shuffle(["pane_reflection", correct, "pane___reflection", "pane-reflection"]);
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
          if (o !== correct) return wrong(ctx, msg, "Rejected.", "two_underscores");
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

    // 18) Safe rename (least suspicious)
    safe_rename: async (ctx) => {
      begin(ctx, "RENAME", "Pick the rename that looks least suspicious.");
      const opts = shuffle(["core.map", "core.map.bak", "core.tmp", "core.map.tmp"]);
      const correct = "core.map.tmp";
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
          if (o !== correct) return wrong(ctx, msg, "Too obvious.", "safe_rename");
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Quiet rename set.";
          finish(ctx, resolve, correct);
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      return new Promise((r) => (resolve = r));
    },

    // 19) One true statement
    true_statement: async (ctx) => {
      begin(ctx, "STATEMENT", "Pick the statement that is TRUE in this room.");
      const opts = shuffle([
        "The auditor is blind.",
        "Deleting core lines is safe.",
        "Noise looks like compliance.",
        "Mirrors don’t keep copies."
      ]);
      const correct = "Noise looks like compliance.";
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
          if (o !== correct) return wrong(ctx, msg, "False.", "true_statement");
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "True.";
          finish(ctx, resolve, correct);
        };
        ctx.taskBody.appendChild(b);
      });

      ctx.taskBody.appendChild(msg);
      return new Promise((r) => (resolve = r));
    },

    // 20) Token split: type second half after |
    token_split: async (ctx) => {
      begin(ctx, "TOKEN", "Type the SECOND half of the token (after the |).");
      const partsA = shuffle(["pane", "trace", "buffer", "quiet", "audit", "layer"]);
      const partsB = shuffle(["19", "42", "88", "13", "64", "21"]);
      const token = `${partsA[0]}${partsB[0]}|${partsA[1]}${partsB[1]}`;
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
  };

  reg(TASKS);

  // ✅ pool as string IDs (matches pack3 fix)
  if (regPool) {
    regPool("pack4", Object.keys(TASKS));
  }
})();
