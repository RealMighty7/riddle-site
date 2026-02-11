// /packs/pack5.js
// Registers 20 tasks into window.TASKS via window.registerTasks()
// Theme: "breach / escape prep" (tactile + procedural + tense, fair)
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
    console.error("registerTasks missing — load tasks.js before /packs/pack5.js");
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

    // Optional: if your TTS system exposes one of these, it’ll speak the header.
    // No hard dependency.
    try {
      window.enqueueTTS?.(`${title}. ${desc}`);
      window.ttsSpeak?.(`${title}. ${desc}`);
      window.TTS?.speak?.(`${title}. ${desc}`);
    } catch {}
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

  const once = (fn) => {
    let done = false;
    return (...args) => {
      if (done) return;
      done = true;
      fn(...args);
    };
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
    // 1) Keypad 4-digit entry (flashes once)
    keypad_4: async (ctx) => {
      begin(ctx, "KEYPAD", "Enter the 4-digit access code. (Click digits.)");
      const code = String(rndInt(1000, 9999));
      ctx.setAnswer?.(code);

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

            // Memorize window: base 10s, reduced 5% per resistance point
      const r = Number(ctx.getResistance?.() ?? 0);
      const memSec = Math.max(2.5, Math.min(10, 10 * (1 - 0.05 * r)));
      const flashMs = Math.floor(memSec * 1000);
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

      const digits = shuffle(["1","2","3","4","5","6","7","8","9","0"]);
      let resolve;

      digits.forEach((d) => {
        const b = el("button", "sim-btn", d);
        b.onclick = () => {
          if (input.length >= 4) return;
          input += d;
          read.textContent = `input: ${input.padEnd(4, "•")}`;

          if (input.length === 4) {
            if (input !== code) {
              wrong(ctx, msg, "Access denied.", "keypad bad");
              input = "";
              read.textContent = "input: ";
              return;
            }
            msg.style.color = "rgba(232,237,247,0.85)";
            msg.textContent = "Access granted.";
            finish(ctx, resolve, code);
          }
        };
        grid.appendChild(b);
      });

      const clearBtn = el("button", "sim-btn", "clear");
      clearBtn.style.gridColumn = "span 3";
      clearBtn.onclick = () => {
        input = "";
        read.textContent = "input: ";
        msg.textContent = "";
      };
      grid.appendChild(clearBtn);

      ctx.taskBody.appendChild(grid);
      return new Promise((r) => (resolve = r));
    },

    // 2) Wire cut — pick safe wire
    wire_cut: async (ctx) => {
      begin(ctx, "WIRES", "Cut the safe wire. One cut only.");
            const wires = shuffle(["RED", "BLUE", "GREEN", "WHITE"]);
      const safe = "WHITE";
      ctx.setAnswer?.(safe);

      // No guessing: player must scan first, then cut.
      let scanned = false;
const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const scan = el("button", "sim-btn", "scan");
      scan.style.marginTop = "12px";
      scan.onclick = () => {
        if (scanned) return;
        scanned = true;
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Scan complete. Continuity stable on WHITE.";
        // enable cut buttons
        ctx.taskBody.querySelectorAll("button[data-wire]").forEach((b) => (b.disabled = false));
      };
      ctx.taskBody.appendChild(scan);

      const row = el("div");
      row.style.marginTop = "12px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      let resolve;

      wires.forEach((w) => {
        const b = el("button", "sim-btn", `cut ${w}`);
        b.dataset.wire = "1";
        b.disabled = true;
        b.onclick = () => {
          if (!scanned) {
            msg.style.color = "rgba(255,190,190,.95)";
            msg.textContent = "Scan first. One cut only.";
            return;
          }
          if (w !== safe) return wrong(ctx, msg, "Wrong wire. Surge detected.", "wire surge");
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Safe wire cut.";
          finish(ctx, resolve, safe);
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      return new Promise((r) => (resolve = r));
    },

    // 3) Click the highest number
    highest_number: async (ctx) => {
      begin(ctx, "CALIBRATE", "Click the highest number.");
      const nums = shuffle([rndInt(10, 50), rndInt(51, 90), rndInt(91, 130), rndInt(131, 180)]);
      const high = Math.max(...nums);
      ctx.setAnswer?.(String(high));

      const row = el("div");
      row.style.marginTop = "12px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      let resolve;

      nums.forEach((n) => {
        const b = el("button", "sim-btn", String(n));
        b.onclick = () => {
          if (n !== high) return wrong(ctx, msg, "No.", "highest_number");
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Ok.";
          finish(ctx, resolve, String(high));
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      return new Promise((r) => (resolve = r));
    },

    // 4) Mirror match
    mirror_match: async (ctx) => {
      begin(ctx, "MIRROR", "Pick the option that is the mirror (reversed) of the target.");
      const words = ["pane", "buffer", "trace", "layer", "quiet", "audit", "shadow", "cache"];
      const w = words[rndInt(0, words.length - 1)];
      const correct = w.split("").reverse().join("");
      ctx.setAnswer?.(correct);

      const opts = shuffle([correct, w.toUpperCase(), w + w, w.slice(1) + w[0]]);
      ctx.taskBody.appendChild(note(`target: ${w}`));

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
          if (o !== correct) return wrong(ctx, msg, "Mismatch.", "mirror_match");
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

    // 5) Steady hand — keep cursor inside box for N seconds
    steady_hand: async (ctx) => {
      const sec = clamp(2 + Math.floor((ctx.difficultyBoost?.() ?? 0) / 2), 2, 7);
      begin(ctx, "STEADY HAND", "Keep your cursor inside the box until the timer ends.");
      ctx.setAnswer?.(`hold:${sec}s`);

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

      const msg = note("Move cursor into the box to start.");
      msg.style.color = "rgba(232,237,247,0.82)";
      ctx.taskBody.appendChild(msg);

      const L = scoped();
      let inside = false;
      const armedAt = performance.now() + 3000; // read window

      L.on(box, "mouseenter", () => { inside = true; });
      L.on(box, "mouseleave", () => { inside = false; });

      let resolve;
      const start = performance.now();

      const tick = () => {
        const t = (performance.now() - start) / 1000;
        const left = Math.max(0, Math.ceil(sec - t));
        label.textContent = `time: ${left}s`;

        if (performance.now() < armedAt) {
          msg.textContent = "Move into the box…";
          requestAnimationFrame(tick);
          return;
        }

        if (!inside) {
          wrong(ctx, msg, "You slipped.", "steady_hand slip");
          L.clear();
          finish(ctx, resolve, "slip");
          return;
        }
        if (t >= sec) {
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Steady.";
          L.clear();
          finish(ctx, resolve, "steady");
          return;
        }
        requestAnimationFrame(tick);
      };

      const waitInside = () => {
        if (!inside) return requestAnimationFrame(waitInside);
        msg.textContent = "";
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(waitInside);

      return new Promise((r) => (resolve = r));
    },

    // 6) Port select — only 443
    port_select: async (ctx) => {
      begin(ctx, "ROUTE", "Select the only allowed port.");
      const opts = shuffle(["22", "80", "443", "8080"]);
      const correct = "443";
      ctx.setAnswer?.(correct);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      const row = el("div");
      row.style.marginTop = "12px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      let resolve;

      opts.forEach((p) => {
        const b = el("button", "sim-btn", `:${p}`);
        b.onclick = () => {
          if (p !== correct) return wrong(ctx, msg, "Blocked.", "port_select");
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Routed.";
          finish(ctx, resolve, correct);
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      return new Promise((r) => (resolve = r));
    },

    // 7) Time sync — click at 0 (within window)
    click_on_zero: async (ctx) => {
      begin(ctx, "TIME SYNC", "Click when the counter hits 0.");
      const ms = clamp(1800 + (ctx.difficultyBoost?.() ?? 0) * 250, 1800, 5200);
      const windowMs = clamp(170 - (ctx.difficultyBoost?.() ?? 0) * 10, 90, 170);
      ctx.setAnswer?.(`ms:${ms}|win:${windowMs}`);

      const pill = el("div", "pill", "ready…");
      pill.style.marginTop = "12px";

      const btn = el("button", "sim-btn", "click");
      btn.style.marginTop = "12px";

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      ctx.taskBody.appendChild(pill);
      ctx.taskBody.appendChild(btn);
      ctx.taskBody.appendChild(msg);

      const start = performance.now();
      let done = false;
      let resolve;

      const tick = () => {
        if (done) return;
        const t = performance.now() - start;
        const left = Math.max(0, ms - t);
        pill.textContent = `t-minus: ${Math.ceil(left)}ms`;
        if (left <= 0) pill.textContent = "t-minus: 0";
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

      btn.onclick = () => {
        const t = performance.now() - start;
        const left = ms - t;
        done = true;

        if (Math.abs(left) > windowMs) {
          wrong(ctx, msg, "Out of sync.", "click_on_zero timing");
          finish(ctx, resolve, "miss");
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Synced.";
        finish(ctx, resolve, "synced");
      };

      return new Promise((r) => (resolve = r));
    },

    // 8) Private IP — only 10.x.x.x
    private_ip: async (ctx) => {
      begin(ctx, "ROUTE TABLE", "Click the only private IP address.");
      const correct = `10.${rndInt(0, 255)}.${rndInt(0, 255)}.${rndInt(1, 254)}`;
      const other = [
        `${rndInt(11, 223)}.${rndInt(0,255)}.${rndInt(0,255)}.${rndInt(1,254)}`,
        `${rndInt(11, 223)}.${rndInt(0,255)}.${rndInt(0,255)}.${rndInt(1,254)}`,
        `${rndInt(11, 223)}.${rndInt(0,255)}.${rndInt(0,255)}.${rndInt(1,254)}`,
      ];
      const opts = shuffle([correct, ...other]);
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
          if (o !== correct) return wrong(ctx, msg, "Public route.", "private_ip");
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Private route selected.";
          finish(ctx, resolve, correct);
        };
        ctx.taskBody.appendChild(b);
      });

      ctx.taskBody.appendChild(msg);
      return new Promise((r) => (resolve = r));
    },

    // 9) Sum 2-digit chunks
    sum_chunks: async (ctx) => {
      begin(ctx, "CHECKSUM", "Sum the 2-digit chunks. Type the result.");
      const n = clamp(3 + Math.floor((ctx.difficultyBoost?.() ?? 0) / 2), 3, 7);

      const chunks = [];
      let sum = 0;
      for (let i = 0; i < n; i++) {
        const c = rndInt(10, 99);
        chunks.push(String(c));
        sum += c;
      }
      const ans = String(sum);
      ctx.setAnswer?.(ans);

      ctx.taskBody.appendChild(note(`chunks: ${chunks.join(" ")}`));
      const inp = makeInput("sum…");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      const submit = () => {
        const got = (inp.value || "").trim();
        if (got !== ans) return wrong(ctx, msg, "Rejected.", "sum_chunks");
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Accepted.";
        finish(ctx, resolve, ans);
      };

      ctx.taskPrimary.onclick = submit;
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
      inp.focus();

      return new Promise((r) => (resolve = r));
    },

    // 10) Devowel command
    devowel: async (ctx) => {
      begin(ctx, "SANITIZE", "Type the command with vowels removed (a,e,i,o,u).");
      const cmds = ["tracebuffer", "auditmirror", "accesslayer", "quietmode", "sessionmap", "logrotate"];
      const cmd = cmds[rndInt(0, cmds.length - 1)];
      const ans = cmd.replace(/[aeiou]/g, "");
      ctx.setAnswer?.(ans);

      ctx.taskBody.appendChild(note(`command: ${cmd}`));
      const inp = makeInput("no vowels…");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      const submit = () => {
        const got = (inp.value || "").trim().toLowerCase();
        if (got !== ans) return wrong(ctx, msg, "Not sanitized.", "devowel");
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Sanitized.";
        finish(ctx, resolve, ans);
      };

      ctx.taskPrimary.onclick = submit;
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
      inp.focus();

      return new Promise((r) => (resolve = r));
    },

    // 11) Lock pins — click 1→2→3
    pins_3: async (ctx) => {
      begin(ctx, "LOCK PINS", "Click pins in order: 1 → 2 → 3. Any mistake resets.");
      ctx.setAnswer?.("1-2-3");

      const pins = shuffle(["1", "2", "3"]);
      let idx = 0;

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const row = el("div");
      row.style.marginTop = "12px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      let resolve;

      pins.forEach((p) => {
        const b = el("button", "sim-btn", `pin ${p}`);
        b.onclick = () => {
          if (p !== String(idx + 1)) {
            idx = 0;
            return wrong(ctx, msg, "Slip. Reset.", "pins_3");
          }
          idx++;
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = `set (${idx}/3)`;
          if (idx === 3) {
            msg.textContent = "Unlocked.";
            finish(ctx, resolve, "unlocked");
          }
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      return new Promise((r) => (resolve = r));
    },

    // 12) Only one contains a number
    has_number: async (ctx) => {
      begin(ctx, "MISMATCH", "Click the only option that contains a number.");
      const correct = "quiet19";
      const opts = shuffle(["quiet", correct, "trace", "buffer"]);
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

    // 13) Retype exactly (case-sensitive)
    retype_case: async (ctx) => {
      begin(ctx, "RETYPE", "Retype exactly (case-sensitive).");
      const parts = ["Quiet", "AUDIT", "PaNe", "TrAcE", "buffer", "Layer"];
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
        if (got !== line) return wrong(ctx, msg, "Mismatch.", "retype_case");
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Exact.";
        finish(ctx, resolve, line);
      };

      ctx.taskPrimary.onclick = submit;
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
      inp.focus();

      return new Promise((r) => (resolve = r));
    },

    // 14) Binary pick — only valid 8-bit binary
    binary_8: async (ctx) => {
      begin(ctx, "BINARY", "Click the only valid 8-bit binary string.");
      const makeBin = () => Array.from({ length: 8 }, () => (Math.random() < 0.5 ? "0" : "1")).join("");
      const correct = makeBin();
      const opts = shuffle([correct, makeBin().slice(0, 7), makeBin() + "2", makeBin().replace(/0/g, "O")]);
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
          if (o !== correct) return wrong(ctx, msg, "Invalid.", "binary_8");
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

    // 15) Arrow memory
    arrow_memory: async (ctx) => {
      begin(ctx, "SEQUENCE", "Memorize the arrows. Then repeat by clicking.");
      const arrows = ["↑", "↓", "←", "→"];
      const len = clamp(4 + Math.floor((ctx.difficultyBoost?.() ?? 0) / 2), 4, 8);
      const seq = Array.from({ length: len }, () => arrows[rndInt(0, 3)]);
      ctx.setAnswer?.(seq.join(" "));

      const shown = el("div", "pill", seq.join(" "));
      shown.style.marginTop = "12px";
      shown.style.fontSize = "22px";
      shown.style.letterSpacing = ".2em";
      ctx.taskBody.appendChild(shown);

      await wait(clamp(2200 - (ctx.difficultyBoost?.() ?? 0) * 120, 900, 2200));
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
      const render = () => { out.textContent = `input: ${input.join(" ")}`; };
      render();

      const fail = () => {
        input = [];
        render();
        wrong(ctx, msg, "Wrong. Reset.", "arrow_memory");
      };

      let resolve;

      arrows.forEach((a) => {
        const b = el("button", "sim-btn", a);
        b.style.minWidth = "54px";
        b.onclick = () => {
          if (input.length >= seq.length) return;
          input.push(a);
          render();

          for (let i = 0; i < input.length; i++) {
            if (input[i] !== seq[i]) return fail();
          }

          if (input.length === seq.length) {
            msg.style.color = "rgba(232,237,247,0.85)";
            msg.textContent = "Matched.";
            finish(ctx, resolve, "matched");
          }
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(out);
      ctx.taskBody.appendChild(msg);

      return new Promise((r) => (resolve = r));
    },

    // 16) Type last 3 chars
    last_three: async (ctx) => {
      begin(ctx, "TAIL", "Type the last 3 characters of the string.");
      const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
      const len = clamp(10 + (ctx.difficultyBoost?.() ?? 0) * 2, 10, 22);
      let s = "";
      for (let i = 0; i < len; i++) s += chars[rndInt(0, chars.length - 1)];
      const ans = s.slice(-3);
      ctx.setAnswer?.(ans);

      ctx.taskBody.appendChild(note(`string: ${s}`));
      const inp = makeInput("last 3…");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      const submit = () => {
        const got = (inp.value || "").trim();
        if (got !== ans) return wrong(ctx, msg, "No.", "last_three");
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Ok.";
        finish(ctx, resolve, ans);
      };

      ctx.taskPrimary.onclick = submit;
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
      inp.focus();

      return new Promise((r) => (resolve = r));
    },

    // 17) Ends with .tmp
    ends_tmp: async (ctx) => {
      begin(ctx, "FILTER", "Click the only string that ends with .tmp");
      const correct = "logs/quiet.tmp";
      const opts = shuffle(["logs/quiet.tmpx", "logs/quiet", correct, "logs/quiet.tmp/"]);
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
          if (o !== correct) return wrong(ctx, msg, "Rejected.", "ends_tmp");
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Ok.";
          finish(ctx, resolve, correct);
        };
        ctx.taskBody.appendChild(b);
      });

      ctx.taskBody.appendChild(msg);
      return new Promise((r) => (resolve = r));
    },

    // 18) Pressure — click exactly N times before timer ends
    click_pressure: async (ctx) => {
      begin(ctx, "PRESSURE", "Click exactly N times before the timer ends.");
      const need = clamp(6 + (ctx.difficultyBoost?.() ?? 0), 6, 16);
      const ms = clamp(2200 + (ctx.difficultyBoost?.() ?? 0) * 250, 2200, 5600);
      ctx.setAnswer?.(`need:${need}`);

      const pill = el("div", "pill", `target: ${need} clicks`);
      pill.style.marginTop = "12px";

      const timer = el("div", "pill", `time: ${Math.ceil(ms / 1000)}s`);
      timer.style.marginTop = "10px";

      const btn = el("button", "sim-btn", "click");
      btn.style.marginTop = "12px";

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      ctx.taskBody.appendChild(pill);
      ctx.taskBody.appendChild(timer);
      ctx.taskBody.appendChild(btn);
      ctx.taskBody.appendChild(msg);

      let count = 0;
      btn.onclick = () => {
        count++;
        btn.textContent = `click (${count})`;
        if (count > need) {
          wrong(ctx, msg, "Too many.", "click_pressure over");
        }
      };

      let resolve;
      const start = performance.now();

      const tick = () => {
        const t = performance.now() - start;
        const left = Math.max(0, ms - t);
        timer.textContent = `time: ${Math.ceil(left / 1000)}s`;

        if (t >= ms) {
          btn.disabled = true;
          if (count !== need) {
            wrong(ctx, msg, `Missed. (${count}/${need})`, "click_pressure miss");
            finish(ctx, resolve, `miss:${count}`);
          } else {
            msg.style.color = "rgba(232,237,247,0.85)";
            msg.textContent = "Exact.";
            finish(ctx, resolve, "exact");
          }
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

      return new Promise((r) => (resolve = r));
    },

    // 19) Escape hint line
    escape_hint_line: async (ctx) => {
      begin(ctx, "MESSAGE", "Pick the line that helps you leave.");
      const lines = shuffle([
        "Security: Stay still.",
        "System: Mirror writes are permanent.",
        "Worker: If you can’t be brave, be boring.",
        "System: Increase retention window."
      ]);
      const correct = "Worker: If you can’t be brave, be boring.";
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
          if (t !== correct) return wrong(ctx, msg, "Wrong read.", "escape_hint_line");
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "You heard it.";
          finish(ctx, resolve, correct);
        };
        ctx.taskBody.appendChild(b);
      });

      ctx.taskBody.appendChild(msg);
      return new Promise((r) => (resolve = r));
    },

    // 20) Toggle 3 switches to ON
    toggles_3: async (ctx) => {
      begin(ctx, "SWITCHES", "Flip all switches to ON.");
      const n = 3;
      const state = Array.from({ length: n }, () => Math.random() < 0.5);
      ctx.setAnswer?.("all_on");

      const row = el("div");
      row.style.marginTop = "12px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      const out = el("div", "pill", "");
      out.style.marginTop = "12px";

      const msg = note("");
      msg.style.marginTop = "10px";

      let resolve;

      const render = () => {
        out.textContent = `state: ${state.map((s) => (s ? "ON" : "OFF")).join("  ")}`;
        const ok = state.every(Boolean);
        if (ok) {
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Ready.";
        } else {
          msg.style.color = "rgba(232,237,247,0.82)";
          msg.textContent = "Flip them all. Quietly.";
        }
        ctx.taskPrimary.disabled = !ok;
      };

      for (let i = 0; i < n; i++) {
        const b = el("button", "sim-btn", `switch ${i + 1}`);
        b.onclick = () => {
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

      ctx.taskPrimary.onclick = () => finish(ctx, resolve, "all_on");
      render();

      return new Promise((r) => (resolve = r));
    },
  };

  reg(TASKS);

  // ✅ pool as string IDs (same fix as pack4)
  if (regPool) {
    regPool("pack5", Object.keys(TASKS));
  }
})();
