// /packs/pack5.js
// Registers 20 tasks into window.TASKS via window.registerTasks()
// Theme: "breach / escape prep" (tactile + procedural + a little tense, but still fair)

(() => {
  const reg = window.registerTasks;
  if (!reg) {
    console.error("registerTasks missing — load tasks.js before /packs/pack5.js");
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
  const once = (fn) => {
    let done = false;
    return (...args) => {
      if (done) return;
      done = true;
      fn(...args);
    };
  };

  // helper: safe cleanup for listeners per-task
  const scoped = () => {
    const offs = [];
    return {
      on(target, type, fn, opts) {
        target.addEventListener(type, fn, opts);
        offs.push(() => target.removeEventListener(type, fn, opts));
      },
      clear() {
        for (const off of offs.splice(0)) {
          try { off(); } catch {}
        }
      }
    };
  };

  // ============================================================
  // PACK 5 TASKS
  // ============================================================
  reg({
    // 1) "Keypad" 4-digit entry
    keypad_4: async (ctx) => {
      begin(ctx, "KEYPAD", "Enter the 4-digit access code. (Click digits.)");
      const code = String(rndInt(1000, 9999));
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

      // flash the code briefly (difficulty affects flash time)
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

      const digits = shuffle(["1","2","3","4","5","6","7","8","9","0"]);
      digits.forEach(d => {
        const b = el("button", "sim-btn", d);
        b.onclick = () => {
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
            ctx.taskPrimary.onclick = () => resolve();
          }
        };
        grid.appendChild(b);
      });

      const clear = el("button", "sim-btn", "clear");
      clear.style.gridColumn = "span 3";
      clear.onclick = () => {
        input = "";
        read.textContent = "input: ";
        msg.textContent = "";
      };
      grid.appendChild(clear);

      ctx.taskBody.appendChild(grid);

      let resolve;
      return new Promise(r => (resolve = r));
    },

    // 2) "Wire cut" - pick the only safe wire
    wire_cut: async (ctx) => {
      begin(ctx, "WIRES", "Cut the safe wire. One cut only.");
      const wires = shuffle(["RED", "BLUE", "GREEN", "WHITE"]);
      const safe = "WHITE"; // consistent “boring/safe” theme
      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const row = el("div");
      row.style.marginTop = "12px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      wires.forEach(w => {
        const b = el("button", "sim-btn", `cut ${w}`);
        b.onclick = () => {
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
          ctx.taskPrimary.onclick = () => resolve();
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      let resolve;
      return new Promise(r => (resolve = r));
    },

    // 3) "Altitude" - click the highest number
    highest_number: async (ctx) => {
      begin(ctx, "CALIBRATE", "Click the highest number.");
      const nums = shuffle([rndInt(10, 50), rndInt(51, 90), rndInt(91, 130), rndInt(131, 180)]);
      const high = Math.max(...nums);

      const row = el("div");
      row.style.marginTop = "12px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      nums.forEach(n => {
        const b = el("button", "sim-btn", String(n));
        b.onclick = () => {
          if (n !== high) {
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

    // 4) "Mirror check" - choose the reversed string that matches
    mirror_match: async (ctx) => {
      begin(ctx, "MIRROR", "Pick the option that is the mirror (reversed) of the target.");
      const words = ["pane", "static", "echo", "buffer", "trace", "vault", "quiet", "audit"];
      const w = words[rndInt(0, words.length - 1)];
      const target = w;
      const correct = w.split("").reverse().join("");

      const opts = shuffle([
        correct,
        w.toUpperCase(),
        w + w,
        w.slice(1) + w[0],
      ]);

      ctx.taskBody.appendChild(note(`target: ${target}`));

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const row = el("div");
      row.style.marginTop = "12px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      opts.forEach(o => {
        const b = el("button", "sim-btn", o);
        b.onclick = () => {
          if (o !== correct) {
            msg.textContent = "Mismatch.";
            ctx.glitch();
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Matched.";
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

    // 5) "No touch" — hold the mouse still inside a box
    steady_hand: async (ctx) => {
      begin(ctx, "STEADY HAND", "Keep your cursor inside the box until the timer ends.");
      const sec = clamp(2 + Math.floor(ctx.difficultyBoost() / 2), 2, 7);

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
      const L = scoped();
      L.on(box, "mouseenter", () => { inside = true; });
      L.on(box, "mouseleave", () => { inside = false; });

      const start = performance.now();
      const tick = () => {
        const t = (performance.now() - start) / 1000;
        const left = Math.max(0, Math.ceil(sec - t));
        label.textContent = `time: ${left}s`;

        if (!inside) {
          msg.textContent = "You slipped.";
          ctx.glitch();
          ctx.penalize(1, "slip");
          L.clear();
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => resolve();
          return;
        }

        if (t >= sec) {
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Steady.";
          L.clear();
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => resolve();
          return;
        }
        requestAnimationFrame(tick);
      };

      // must enter to start (feels fair)
      msg.textContent = "Move cursor into the box to start.";
      const startWatcher = () => {
        if (!inside) return requestAnimationFrame(startWatcher);
        msg.textContent = "";
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(startWatcher);

      let resolve;
      return new Promise(r => (resolve = r));
    },

    // 6) "Port select" - choose only port 443
    port_select: async (ctx) => {
      begin(ctx, "ROUTE", "Select the only allowed port.");
      const opts = shuffle(["22", "80", "443", "8080"]);
      const correct = "443";

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      const row = el("div");
      row.style.marginTop = "12px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      opts.forEach(p => {
        const b = el("button", "sim-btn", `:${p}`);
        b.onclick = () => {
          if (p !== correct) {
            msg.textContent = "Blocked.";
            ctx.glitch();
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Routed.";
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

    // 7) "Time sync" - click the exact second
    click_on_zero: async (ctx) => {
      begin(ctx, "TIME SYNC", "Click when the counter hits 0.");
      const ms = clamp(1800 + ctx.difficultyBoost() * 250, 1800, 5200);
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

        // window: within 120ms around zero (tight but fair)
        const windowMs = clamp(170 - ctx.difficultyBoost() * 10, 90, 170);
        if (Math.abs(left) > windowMs) {
          msg.textContent = "Out of sync.";
          ctx.glitch();
          ctx.penalize(1, "timing");
          ctx.taskPrimary.textContent = "continue";
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => resolve();
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Synced.";
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.disabled = false;
        ctx.taskPrimary.onclick = () => resolve();
      };

      let resolve;
      return new Promise(r => (resolve = r));
    },

    // 8) "Route table": choose the only private IP
    private_ip: async (ctx) => {
      begin(ctx, "ROUTE TABLE", "Click the only private IP address.");
      // 10.x.x.x private; others public-looking
      const correct = `10.${rndInt(0, 255)}.${rndInt(0, 255)}.${rndInt(1, 254)}`;
      const other = [
        `${rndInt(11, 223)}.${rndInt(0,255)}.${rndInt(0,255)}.${rndInt(1,254)}`,
        `${rndInt(11, 223)}.${rndInt(0,255)}.${rndInt(0,255)}.${rndInt(1,254)}`,
        `${rndInt(11, 223)}.${rndInt(0,255)}.${rndInt(0,255)}.${rndInt(1,254)}`,
      ];
      const opts = shuffle([correct, ...other]);

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
            msg.textContent = "Public route.";
            ctx.glitch();
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Private route selected.";
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

    // 9) "Checksum lite": sum of 2-digit chunks
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
      ctx.taskBody.appendChild(note(`chunks: ${chunks.join(" ")}`));
      const inp = makeInput("sum");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      ctx.taskPrimary.onclick = () => {
        const got = (inp.value || "").trim();
        if (got !== String(sum)) {
          msg.textContent = "Rejected.";
          ctx.glitch();
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Accepted.";
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.onclick = () => resolve();
      };

      return new Promise(r => (resolve = r));
    },

    // 10) "Command sanitize": type the command without vowels
    devowel: async (ctx) => {
      begin(ctx, "SANITIZE", "Type the command with vowels removed (a,e,i,o,u).");
      const cmds = ["tracebuffer", "auditmirror", "vaultaccess", "quietmode", "sessionmap", "logrotate"];
      const cmd = cmds[rndInt(0, cmds.length - 1)];
      const ans = cmd.replace(/[aeiou]/g, "");

      ctx.taskBody.appendChild(note(`command: ${cmd}`));
      const inp = makeInput("no vowels…");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      let resolve;
      ctx.taskPrimary.onclick = () => {
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
        ctx.taskPrimary.onclick = () => resolve();
      };

      return new Promise(r => (resolve = r));
    },

    // 11) "Lock picks": click pins in correct order
    pins_3: async (ctx) => {
      begin(ctx, "LOCK PINS", "Click pins in order: 1 → 2 → 3. Any mistake resets.");
      const pins = shuffle(["1","2","3"]);
      let idx = 0;

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const row = el("div");
      row.style.marginTop = "12px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      pins.forEach(p => {
        const b = el("button", "sim-btn", `pin ${p}`);
        b.onclick = () => {
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
            ctx.taskPrimary.onclick = () => resolve();
          }
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      let resolve;
      return new Promise(r => (resolve = r));
    },

    // 12) "Pick the odd one": only one has a number
    has_number: async (ctx) => {
      begin(ctx, "MISMATCH", "Click the only option that contains a number.");
      const correct = "echo07";
      const opts = shuffle(["echo", correct, "static", "vault"]);
      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const row = el("div");
      row.style.marginTop = "12px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      opts.forEach(o => {
        const b = el("button", "sim-btn", o);
        b.onclick = () => {
          if (o !== correct) {
            msg.textContent = "No.";
            ctx.glitch();
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Found.";
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

    // 13) "Quiet copy": retype exactly (case-sensitive)
    retype_case: async (ctx) => {
      begin(ctx, "RETYPE", "Retype exactly (case-sensitive).");
      const parts = ["Echo", "STATIC", "VaUlT", "pane", "TrAcE", "buffer"];
      const line = `${parts[rndInt(0,5)]}-${parts[rndInt(0,5)]}-${rndInt(10,99)}`;
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
          ctx.glitch();
          ctx.penalize(1, "typo");
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Exact.";
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.onclick = () => resolve();
      };

      return new Promise(r => (resolve = r));
    },

    // 14) "Binary pick": choose the only valid 8-bit binary
    binary_8: async (ctx) => {
      begin(ctx, "BINARY", "Click the only valid 8-bit binary string.");
      const makeBin = () => Array.from({ length: 8 }, () => (Math.random() < 0.5 ? "0" : "1")).join("");
      const correct = makeBin();
      const opts = shuffle([correct, makeBin().slice(0,7), makeBin()+"2", makeBin().replace(/0/g,"O")]);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const row = el("div");
      row.style.marginTop = "12px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      opts.forEach(o => {
        const b = el("button", "sim-btn", o);
        b.onclick = () => {
          if (o !== correct) {
            msg.textContent = "Invalid.";
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

    // 15) "Sequence": click arrows in order shown (memorize short)
    arrow_memory: async (ctx) => {
      begin(ctx, "SEQUENCE", "Memorize the arrows. Then repeat by clicking.");
      const arrows = ["↑","↓","←","→"];
      const len = clamp(4 + Math.floor(ctx.difficultyBoost() / 2), 4, 8);
      const seq = Array.from({ length: len }, () => arrows[rndInt(0,3)]);
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
      const render = () => { out.textContent = `input: ${input.join(" ")}`; };
      render();

      const fail = () => {
        input = [];
        render();
        msg.textContent = "Wrong. Reset.";
        ctx.glitch();
        ctx.penalize(1, "sequence fail");
      };

      arrows.forEach(a => {
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
            ctx.taskPrimary.textContent = "continue";
            ctx.taskPrimary.disabled = false;
            ctx.taskPrimary.onclick = () => resolve();
          }
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(out);
      ctx.taskBody.appendChild(msg);

      let resolve;
      return new Promise(r => (resolve = r));
    },

    // 16) "Checksum 2": type the last 3 characters
    last_three: async (ctx) => {
      begin(ctx, "TAIL", "Type the last 3 characters of the string.");
      const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
      const len = clamp(10 + ctx.difficultyBoost() * 2, 10, 22);
      let s = "";
      for (let i = 0; i < len; i++) s += chars[rndInt(0, chars.length - 1)];
      const ans = s.slice(-3);

      ctx.taskBody.appendChild(note(`string: ${s}`));
      const inp = makeInput("last 3…");
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
          ctx.glitch();
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Ok.";
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.onclick = () => resolve();
      };

      return new Promise(r => (resolve = r));
    },

    // 17) "Route filter": click the only string that ends with ".tmp"
    ends_tmp: async (ctx) => {
      begin(ctx, "FILTER", "Click the only string that ends with .tmp");
      const correct = "logs/quiet.tmp";
      const opts = shuffle(["logs/quiet.tmpx", "logs/quiet", correct, "logs/quiet.tmp/"]);

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
        ctx.taskBody.appendChild(b);
      });

      ctx.taskBody.appendChild(msg);

      let resolve;
      return new Promise(r => (resolve = r));
    },

    // 18) "Pressure" – click as close as possible to target count in a time window
    click_pressure: async (ctx) => {
      begin(ctx, "PRESSURE", "Click exactly N times before the timer ends.");
      const need = clamp(6 + ctx.difficultyBoost(), 6, 16);
      const ms = clamp(2200 + ctx.difficultyBoost() * 250, 2200, 5600);

      const pill = el("div", "pill", `target: ${need} clicks`);
      pill.style.marginTop = "12px";
      ctx.taskBody.appendChild(pill);

      const timer = el("div", "pill", `time: ${Math.ceil(ms/1000)}s`);
      timer.style.marginTop = "10px";
      ctx.taskBody.appendChild(timer);

      const btn = el("button", "sim-btn", "click");
      btn.style.marginTop = "12px";
      ctx.taskBody.appendChild(btn);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      let count = 0;
      btn.onclick = () => {
        count++;
        btn.textContent = `click (${count})`;
        if (count > need) {
          msg.textContent = "Too many.";
          ctx.glitch();
          ctx.penalize(1, "over");
        }
      };

      const start = performance.now();
      const tick = () => {
        const t = performance.now() - start;
        const left = Math.max(0, ms - t);
        timer.textContent = `time: ${Math.ceil(left/1000)}s`;

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
          ctx.taskPrimary.onclick = () => resolve();
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

      let resolve;
      return new Promise(r => (resolve = r));
    },

    // 19) "Phrase choose": pick the line that implies escape help
    escape_hint_line: async (ctx) => {
      begin(ctx, "MESSAGE", "Pick the line that helps you leave.");
      const lines = shuffle([
        "Security: Stay still.",
        "System: Mirror writes are permanent.",
        "Worker: If you can’t be brave, be boring.",
        "System: Increase retention window."
      ]);
      const correct = "Worker: If you can’t be brave, be boring.";

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
            msg.textContent = "Wrong read.";
            ctx.glitch();
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "You heard it.";
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

    // 20) "Final toggle": flip three switches to ON (click to toggle)
    toggles_3: async (ctx) => {
      begin(ctx, "SWITCHES", "Flip all switches to ON.");
      const n = 3;
      const state = Array.from({ length: n }, () => Math.random() < 0.5);
      const row = el("div");
      row.style.marginTop = "12px";
      row.style.display = "flex";
      row.style.flexWrap = "wrap";
      row.style.gap = "10px";

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      const out = el("div", "pill", "");
      out.style.marginTop = "12px";

      const render = () => {
        out.textContent = `state: ${state.map(s => (s ? "ON" : "OFF")).join("  ")}`;
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

      let resolve;
      ctx.taskPrimary.onclick = () => resolve();

      render();
      return new Promise(r => (resolve = r));
    },
  });

  // Optional: register a pool for this pack
  if (window.registerTaskPool) {
    window.registerTaskPool("pack5", [
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
  }
})();
