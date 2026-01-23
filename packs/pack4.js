// /packs/pack4.js
// Registers 20 tasks into window.TASKS via window.registerTasks()
// Theme: "audit pressure + stealth ops" (slightly harder, still fair)

(() => {
  const reg = window.registerTasks;
  if (!reg) {
    console.error("registerTasks missing — load tasks.js before /packs/pack4.js");
    return;
  }

  // Pack-local helpers
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

  // Prevent double-resolving
  const once = (fn) => {
    let done = false;
    return (...args) => {
      if (done) return;
      done = true;
      fn(...args);
    };
  };

  // ============================================================
  // PACK 4 TASKS
  // ============================================================
  reg({
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

      const safeWindows = clamp(2 + Math.floor(ctx.difficultyBoost() / 2), 2, 5);
      let safeCount = 0;
      let state = "HOLD";

      // make SAFE windows appear randomly
      const cycle = () => {
        const holdMs = clamp(rndInt(650, 1100) + ctx.difficultyBoost() * 60, 650, 1600);
        const safeMs = clamp(rndInt(420, 780) - ctx.difficultyBoost() * 25, 220, 780);

        pill.textContent = "STATUS: HOLD";
        pill.style.opacity = "0.85";
        state = "HOLD";

        setTimeout(() => {
          pill.textContent = "STATUS: SAFE";
          pill.style.opacity = "1";
          state = "SAFE";

          setTimeout(() => {
            if (safeCount < safeWindows) cycle();
          }, safeMs);
        }, holdMs);
      };
      cycle();

      let resolve;
      const done = once(() => resolve());

      btn.onclick = () => {
        if (state !== "SAFE") {
          msg.textContent = "Too early.";
          ctx.glitch();
          ctx.penalize(1, "misclick");
          return;
        }
        safeCount++;
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = `Good. (${safeCount}/${safeWindows})`;
        if (safeCount >= safeWindows) {
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = done;
        }
      };

      return new Promise(r => (resolve = r));
    },

    // 2) Audit phrase: type only the letters marked with brackets
    bracket_extract: async (ctx) => {
      begin(ctx, "EXTRACT", "Type only the letters inside [brackets], in order.");
      const letters = "abcdefghijklmnopqrstuvwxyz";
      const len = clamp(18 + ctx.difficultyBoost() * 2, 18, 34);

      let s = "";
      let answer = "";
      for (let i = 0; i < len; i++) {
        const ch = letters[rndInt(0, letters.length - 1)];
        const mark = Math.random() < 0.28;
        if (mark) { s += `[${ch}]`; answer += ch; }
        else s += ch;
        if (Math.random() < 0.12) s += " ";
      }
      if (!answer) { // guarantee at least something
        const ch = letters[rndInt(0, letters.length - 1)];
        s += ` [${ch}]`;
        answer = ch;
      }

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
      const done = once(() => resolve());

      ctx.taskPrimary.onclick = () => {
        const got = (inp.value || "").trim().replace(/\s+/g, "");
        if (got !== answer) {
          msg.textContent = "Extraction failed.";
          ctx.glitch();
          ctx.penalize(1, "read error");
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Extracted.";
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.onclick = done;
      };

      return new Promise(r => (resolve = r));
    },

    // 3) Choose the only "low risk" action (story flavored)
    low_risk_action: async (ctx) => {
      begin(ctx, "AUDIT CHOICE", "Pick the lowest-risk action. The auditor is watching.");
      const opts = shuffle([
        "REQUEST FULL USER EXPORT",
        "INCREASE AD RETENTION",
        "ROTATE LOGS (NO CONTENT)",
        "OPEN LIVE FEED",
      ]);
      const correct = "ROTATE LOGS (NO CONTENT)";

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const row = el("div");
      row.style.marginTop = "10px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      opts.forEach(o => {
        const b = el("button", "sim-btn", o);
        b.onclick = () => {
          if (o !== correct) {
            msg.textContent = "Too loud.";
            ctx.glitch();
            ctx.penalize(1, "audit risk");
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Low risk confirmed.";
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => resolve();
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      let resolve;
      return new Promise(r => (resolve = r));
    },

    // 4) Multi-tap pattern: exactly "short short long" (3 holds)
    tap_hold_pattern: async (ctx) => {
      begin(ctx, "SIGNAL", "Perform the signal: SHORT, SHORT, LONG holds (in that order).");
      const target = ["S", "S", "L"];
      const got = [];

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

      const shortMax = clamp(320 + ctx.difficultyBoost() * 35, 320, 620);
      const longMin = clamp(720 + ctx.difficultyBoost() * 55, 720, 1150);

      let downAt = null;

      const render = () => {
        const view = target.map((_, i) => got[i] || "—").join(" ");
        readout.textContent = `pattern: ${view}`;
      };
      render();

      const fail = () => {
        got.length = 0;
        render();
        warn.textContent = "Signal corrupted. Reset.";
        ctx.glitch();
        ctx.penalize(1, "bad signal");
      };

      btn.addEventListener("mousedown", () => { downAt = performance.now(); });
      window.addEventListener("mouseup", () => {
        if (downAt === null) return;
        const dur = performance.now() - downAt;
        downAt = null;

        const seg = (dur <= shortMax) ? "S" : (dur >= longMin ? "L" : "?");
        if (seg === "?") return fail();

        got.push(seg);
        render();

        // validate prefix
        for (let i = 0; i < got.length; i++) {
          if (got[i] !== target[i]) return fail();
        }
        if (got.length === target.length) {
          warn.style.color = "rgba(232,237,247,0.85)";
          warn.textContent = "Signal accepted.";
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => resolve();
        }
      });

      let resolve;
      return new Promise(r => (resolve = r));
    },

    // 5) Find the only line WITHOUT a colon (quick scan)
    no_colon_line: async (ctx) => {
      begin(ctx, "SCAN", "Click the only line without a colon (:).");
      const lines = shuffle([
        "System: Session pinned",
        "Audit: Mirror enabled",
        "trace checkpoint ok",
        "Security: Hands off",
      ]);
      const correct = "trace checkpoint ok";

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      lines.forEach(t => {
        const b = el("button", "sim-btn", t);
        b.style.display = "block";
        b.style.width = "100%";
        b.style.textAlign = "left";
        b.style.marginTop = "10px";
        b.onclick = () => {
          if (t !== correct) {
            msg.textContent = "Wrong scan.";
            ctx.glitch();
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Clean.";
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => resolve();
        };
        ctx.taskBody.appendChild(b);
      });

      ctx.taskBody.appendChild(msg);

      let resolve;
      return new Promise(r => (resolve = r));
    },

    // 6) Type the 3rd and 7th characters
    index_chars: async (ctx) => {
      begin(ctx, "INDEX", "Type the 3rd and 7th characters (no spaces).");
      const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
      const len = clamp(10 + ctx.difficultyBoost(), 10, 18);
      let s = "";
      for (let i = 0; i < len; i++) s += chars[rndInt(0, chars.length - 1)];
      const ans = (s[2] || "") + (s[6] || "");

      ctx.taskBody.appendChild(note(`string: ${s}`));
      const inp = makeInput("two characters…");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      const done = once(() => resolve());

      ctx.taskPrimary.onclick = () => {
        const got = (inp.value || "").trim();
        if (got !== ans) {
          msg.textContent = "Index mismatch.";
          ctx.glitch();
          ctx.penalize(1, "index error");
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Indexed.";
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.onclick = done;
      };

      return new Promise(r => (resolve = r));
    },

    // 7) Click the only "even length" string
    even_length: async (ctx) => {
      begin(ctx, "FILTER", "Click the only option with an EVEN number of characters.");
      const make = (n) => Array.from({ length: n }, () => String.fromCharCode(rndInt(97, 122))).join("");

      // build 3 odd length + 1 even length
      const even = make(rndInt(6, 10) * 2); // even
      const opts = [
        make(rndInt(7, 15) | 1),
        make(rndInt(7, 15) | 1),
        make(rndInt(7, 15) | 1),
        even,
      ];
      const shuffled = shuffle(opts);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const row = el("div");
      row.style.marginTop = "10px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      shuffled.forEach(o => {
        const b = el("button", "sim-btn", o);
        b.onclick = () => {
          if (o !== even) {
            msg.textContent = "Rejected.";
            ctx.glitch();
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Filtered.";
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => resolve();
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      let resolve;
      return new Promise(r => (resolve = r));
    },

    // 8) Micro-scrub: replace all "x" with "." by typing (no copy/paste)
    scrub_x: async (ctx) => {
      begin(ctx, "SCRUB", "Replace every 'x' with '.' and submit. (No copy/paste.)");
      const len = clamp(18 + ctx.difficultyBoost() * 2, 18, 40);
      let s = "";
      for (let i = 0; i < len; i++) s += (Math.random() < 0.22 ? "x" : String.fromCharCode(rndInt(97, 122)));
      if (!s.includes("x")) s = s.slice(0, -1) + "x";

      const target = s.replace(/x/g, ".");
      ctx.taskBody.appendChild(note(`source: ${s}`));
      const inp = makeInput("type scrubbed string…");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      // crude anti-paste: if input length jumps too far at once
      let last = 0;
      inp.addEventListener("input", () => {
        const now = inp.value.length;
        if (now - last > 6) {
          msg.textContent = "Too fast.";
          ctx.glitch();
          ctx.penalize(1, "paste risk");
        }
        last = now;
      });

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      const done = once(() => resolve());

      ctx.taskPrimary.onclick = () => {
        const got = (inp.value || "").trim();
        if (got !== target) {
          msg.textContent = "Scrub failed.";
          ctx.glitch();
          ctx.penalize(1, "dirty");
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Scrubbed.";
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.onclick = done;
      };

      return new Promise(r => (resolve = r));
    },

    // 9) Choose the ONLY option that contains a dash
    has_dash: async (ctx) => {
      begin(ctx, "SCAN", "Click the only option that contains a dash (-).");
      const dash = "echo-static";
      const opts = shuffle(["echostatic", "echo/static", dash, "echo_static"]);
      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const row = el("div");
      row.style.marginTop = "10px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      opts.forEach(o => {
        const b = el("button", "sim-btn", o);
        b.onclick = () => {
          if (o !== dash) {
            msg.textContent = "No.";
            ctx.glitch();
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
      return new Promise(r => (resolve = r));
    },

    // 10) Type the word that appears twice
    duplicate_word: async (ctx) => {
      begin(ctx, "DUPLICATE", "Type the word that appears twice.");
      const base = shuffle(["pane", "static", "echo", "buffer", "trace", "vault"]);
      const dup = base[0];
      const list = shuffle([dup, dup, base[1], base[2], base[3]]);
      ctx.taskBody.appendChild(note(list.join("   ")));

      const inp = makeInput("duplicate word…");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      const done = once(() => resolve());

      ctx.taskPrimary.onclick = () => {
        const got = (inp.value || "").trim().toLowerCase();
        if (got !== dup) {
          msg.textContent = "Wrong.";
          ctx.glitch();
          ctx.penalize(1, "scan fail");
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Confirmed.";
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.onclick = done;
      };

      return new Promise(r => (resolve = r));
    },

    // 11) "Do not click" test: don't click for N seconds (but you can move mouse)
    dont_click: async (ctx) => {
      const sec = clamp(2 + Math.floor(ctx.difficultyBoost() / 2), 2, 6);
      begin(ctx, "COMPLIANCE", `Do NOT click anywhere for ${sec} seconds. Clicking adds noise.`);

      const timer = el("div", "pill", `time: ${sec}s`);
      timer.style.marginTop = "12px";
      ctx.taskBody.appendChild(timer);

      let clicks = 0;
      const onClick = (e) => { clicks++; };
      window.addEventListener("click", onClick, true);

      const start = performance.now();
      const tick = () => {
        const t = (performance.now() - start) / 1000;
        const left = Math.max(0, Math.ceil(sec - t));
        timer.textContent = `time: ${left}s  |  clicks: ${clicks}`;

        if (t >= sec) {
          window.removeEventListener("click", onClick, true);

          if (clicks > 0) {
            ctx.glitch();
            ctx.penalize(1, "impulse");
            ctx.taskBody.appendChild(note("You clicked. Auditor noted it."));
          } else {
            ctx.taskBody.appendChild(note("Clean window held."));
          }

          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => resolve();
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

      let resolve;
      return new Promise(r => (resolve = r));
    },

    // 12) Choose the only option that is a valid "key=value"
    key_value: async (ctx) => {
      begin(ctx, "FORMAT", "Click the only string that matches key=value.");
      const correct = "mode=quiet";
      const opts = shuffle(["mode:quiet", "mode = quiet", correct, "mode==quiet"]);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const row = el("div");
      row.style.marginTop = "10px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      opts.forEach(o => {
        const b = el("button", "sim-btn", o);
        b.onclick = () => {
          if (o !== correct) {
            msg.textContent = "Format rejected.";
            ctx.glitch();
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Valid.";
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => resolve();
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      let resolve;
      return new Promise(r => (resolve = r));
    },

    // 13) Order by length (3 items) - small sort
    length_order_3: async (ctx) => {
      begin(ctx, "ORDER", "Order from shortest → longest (click to append).");
      const words = shuffle(["pane", "static", "echo", "buffer", "trace", "vault", "integrity", "containment"]);
      const a = words[0], b = words[1], c = words[2];
      const items = shuffle([a, b, c]);
      const correct = [a, b, c].slice().sort((x, y) => x.length - y.length);

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

      items.forEach(w => {
        const btn = el("button", "sim-btn", w);
        btn.onclick = () => {
          if (picked.includes(w)) return;
          picked.push(w);
          render();

          if (picked.length === 3) {
            const ok = picked.join("|") === correct.join("|");
            if (!ok) {
              msg.textContent = "Wrong order.";
              ctx.glitch();
              ctx.penalize(1, "sort fail");
              picked.length = 0;
              render();
              return;
            }
            msg.style.color = "rgba(232,237,247,0.85)";
            msg.textContent = "Ordered.";
            ctx.taskPrimary.textContent = "continue";
            ctx.taskPrimary.disabled = false;
            ctx.taskPrimary.onclick = () => resolve();
          }
        };
        row.appendChild(btn);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(out);
      ctx.taskBody.appendChild(msg);

      let resolve;
      return new Promise(r => (resolve = r));
    },

    // 14) Count the vowels in a short string
    count_vowels: async (ctx) => {
      begin(ctx, "COUNT", "Count the vowels (a,e,i,o,u). Type the number.");
      const letters = "abcdefghijklmnopqrstuvwxyz";
      const len = clamp(10 + ctx.difficultyBoost() * 2, 10, 24);
      let s = "";
      for (let i = 0; i < len; i++) s += letters[rndInt(0, letters.length - 1)];
      const vowels = new Set(["a","e","i","o","u"]);
      let count = 0;
      for (const ch of s) if (vowels.has(ch)) count++;

      ctx.taskBody.appendChild(note(`string: ${s}`));
      const inp = makeInput("vowel count…");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      const done = once(() => resolve());

      ctx.taskPrimary.onclick = () => {
        const got = (inp.value || "").trim();
        if (got !== String(count)) {
          msg.textContent = "Wrong.";
          ctx.glitch();
          ctx.penalize(1, "count fail");
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Count matches.";
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.onclick = done;
      };

      return new Promise(r => (resolve = r));
    },

    // 15) Pick the ONLY option that starts with "sys/"
    starts_sys: async (ctx) => {
      begin(ctx, "PATH", "Click the only option that starts with sys/.");
      const correct = "sys/quiet.cfg";
      const opts = shuffle(["logs/sys/quiet.cfg", "user/sys/quiet.cfg", correct, "/sys/quiet.cfg"]);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      opts.forEach(o => {
        const b = el("button", "sim-btn", o);
        b.style.display = "block";
        b.style.width = "100%";
        b.style.textAlign = "left";
        b.style.marginTop = "10px";
        b.onclick = () => {
          if (o !== correct) {
            msg.textContent = "Wrong path.";
            ctx.glitch();
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Path confirmed.";
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => resolve();
        };
        ctx.taskBody.appendChild(b);
      });

      ctx.taskBody.appendChild(msg);
      let resolve;
      return new Promise(r => (resolve = r));
    },

    // 16) "Audit checksum": add 3 small numbers
    add_three: async (ctx) => {
      begin(ctx, "CHECKSUM", "Add the three numbers. Type the total.");
      const a = rndInt(4, 29);
      const b = rndInt(4, 29);
      const c = rndInt(4, 29);
      const ans = String(a + b + c);

      ctx.taskBody.appendChild(note(`${a} + ${b} + ${c} = ?`));
      const inp = makeInput("total");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      const done = once(() => resolve());

      ctx.taskPrimary.onclick = () => {
        const got = (inp.value || "").trim();
        if (got !== ans) {
          msg.textContent = "Incorrect.";
          ctx.glitch();
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Accepted.";
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.onclick = done;
      };

      return new Promise(r => (resolve = r));
    },

    // 17) Click the only option with exactly 2 underscores
    two_underscores: async (ctx) => {
      begin(ctx, "FILTER", "Click the string with exactly TWO underscores (_).");
      const correct = "pane__reflection";
      const opts = shuffle(["pane_reflection", correct, "pane___reflection", "pane-reflection"]);
      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const row = el("div");
      row.style.marginTop = "10px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      opts.forEach(o => {
        const b = el("button", "sim-btn", o);
        b.onclick = () => {
          if (o !== correct) {
            msg.textContent = "Rejected.";
            ctx.glitch();
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
      return new Promise(r => (resolve = r));
    },

    // 18) "Quiet rename": choose the only safe rename (adds .tmp)
    safe_rename: async (ctx) => {
      begin(ctx, "RENAME", "Pick the rename that looks least suspicious.");
      const opts = shuffle(["core.map", "core.map.bak", "core.tmp", "core.map.tmp"]);
      const correct = "core.map.tmp";

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const row = el("div");
      row.style.marginTop = "10px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      opts.forEach(o => {
        const b = el("button", "sim-btn", o);
        b.onclick = () => {
          if (o !== correct) {
            msg.textContent = "Too obvious.";
            ctx.glitch();
            ctx.penalize(1, "noise");
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Quiet rename set.";
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => resolve();
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      let resolve;
      return new Promise(r => (resolve = r));
    },

    // 19) "One true statement" (story)
    true_statement: async (ctx) => {
      begin(ctx, "STATEMENT", "Pick the statement that is TRUE in this room.");
      const opts = shuffle([
        "The auditor is blind.",
        "Deleting core lines is safe.",
        "Noise looks like compliance.",
        "Mirrors don’t keep copies."
      ]);
      const correct = "Noise looks like compliance.";

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      opts.forEach(o => {
        const b = el("button", "sim-btn", o);
        b.style.display = "block";
        b.style.width = "100%";
        b.style.textAlign = "left";
        b.style.marginTop = "10px";
        b.onclick = () => {
          if (o !== correct) {
            msg.textContent = "False.";
            ctx.glitch();
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "True.";
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => resolve();
        };
        ctx.taskBody.appendChild(b);
      });

      ctx.taskBody.appendChild(msg);

      let resolve;
      return new Promise(r => (resolve = r));
    },

    // 20) "Token split": type the second half of a token
    token_split: async (ctx) => {
      begin(ctx, "TOKEN", "Type the SECOND half of the token (after the |).");
      const partsA = shuffle(["echo", "static", "pane", "trace", "vault", "buffer"]);
      const partsB = shuffle(["07", "19", "42", "88", "13", "64"]);
      const token = `${partsA[0]}${partsB[0]}|${partsA[1]}${partsB[1]}`;
      const ans = token.split("|")[1];

      ctx.taskBody.appendChild(note(`token: ${token}`));
      const inp = makeInput("second half…");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      const done = once(() => resolve());

      ctx.taskPrimary.onclick = () => {
        const got = (inp.value || "").trim();
        if (got !== ans) {
          msg.textContent = "Wrong half.";
          ctx.glitch();
          ctx.penalize(1, "token fail");
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Ok.";
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.onclick = done;
      };

      return new Promise(r => (resolve = r));
    },
  });

  // Optional: register a pool for this pack (recommended)
  if (window.registerTaskPool) {
    window.registerTaskPool("pack4", [
      { id: "safe_gate", w: 1 },
      { id: "bracket_extract", w: 1 },
      { id: "low_risk_action", w: 1 },
      { id: "tap_hold_pattern", w: 1 },
      { id: "no_colon_line", w: 1 },
      { id: "index_chars", w: 1 },
      { id: "even_length", w: 1 },
      { id: "scrub_x", w: 1 },
      { id: "has_dash", w: 1 },
      { id: "duplicate_word", w: 1 },
      { id: "dont_click", w: 1 },
      { id: "key_value", w: 1 },
      { id: "length_order_3", w: 1 },
      { id: "count_vowels", w: 1 },
      { id: "starts_sys", w: 1 },
      { id: "add_three", w: 1 },
      { id: "two_underscores", w: 1 },
      { id: "safe_rename", w: 1 },
      { id: "true_statement", w: 1 },
      { id: "token_split", w: 1 },
    ]);
  }
})();
