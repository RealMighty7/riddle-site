// /packs/pack3.js
// Registers 20 tasks into window.TASKS via window.registerTasks()
// Also registers a pool "pack3" so TASKS.random can pull from it.
// --- pack safety shim (must be FIRST) ---
(() => {
  // If tasks.js didn't load for any reason, don't hard-crash.
  window.TASKS = window.TASKS || {};
  window.TASK_POOLS = window.TASK_POOLS || {};

  // Some packs call registerTasks/registerTaskPool — define stubs if missing.
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

  if (!reg || !regPool) {
    console.error("registerTasks/registerTaskPool missing — load /tasks.js before /packs/pack3.js");
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
    ctx.taskSecondary?.classList?.add("hidden");
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
    i.style.padding = "10px 12px";
    i.style.borderRadius = "10px";
    i.style.border = "1px solid rgba(255,255,255,0.18)";
    i.style.background = "rgba(0,0,0,0.25)";
    i.style.color = "#e5e7eb";
    return i;
  };

  const makeRow = () => {
    const row = el("div");
    row.style.marginTop = "10px";
    row.style.display = "flex";
    row.style.flexWrap = "wrap";
    row.style.gap = "10px";
    return row;
  };

  const doneGate = (ctx, resolve) => {
    ctx.taskPrimary.textContent = "continue";
    ctx.taskPrimary.disabled = false;
    ctx.taskPrimary.onclick = () => resolve();
  };

  const PACK3_TASKS = {
    // 1) click three stamps in order (procedural vibe)
    stamp_order_3: async (ctx) => {
      begin(ctx, "STAMP", "Apply stamps in the correct order: REVIEW → ACK → ARCHIVE.");
      const order = ["REVIEW", "ACK", "ARCHIVE"];
      const opts = shuffle(order);

      let i = 0;
      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const row = makeRow();
      opts.forEach(label => {
        const b = el("button", "sim-btn", label);
        b.onclick = () => {
          if (label !== order[i]) {
            i = 0;
            msg.textContent = "Wrong stamp. Procedure reset.";
            ctx.glitch?.();
            ctx.penalize?.(1, "procedure");
            return;
          }
          i++;
          msg.textContent = `ok (${i}/3)`;
          if (i === order.length) {
            msg.style.color = "rgba(232,237,247,0.85)";
            msg.textContent = "Stamped.";
            doneGate(ctx, resolve);
          }
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      let resolve;
      return new Promise(r => (resolve = r));
    },

    // 2) slider align (calibration)
    align_slider: async (ctx) => {
      begin(ctx, "CALIBRATE", "Align the slider to the target value exactly.");
      const target = rndInt(12, 88);
      ctx.taskBody.appendChild(note(`target: ${target}`));

      const wrap = el("div");
      wrap.style.marginTop = "12px";
      wrap.style.width = "min(520px, 100%)";

      const range = el("input");
      range.type = "range";
      range.min = "0";
      range.max = "100";
      range.value = String(rndInt(0, 100));
      range.style.width = "100%";

      const read = note("");
      read.style.marginTop = "8px";
      read.textContent = `value: ${range.value}`;

      range.addEventListener("input", () => {
        read.textContent = `value: ${range.value}`;
        const ok = Number(range.value) === target;
        ctx.taskPrimary.disabled = !ok;
        if (ok) read.textContent += "  ✓";
      });

      wrap.appendChild(range);
      wrap.appendChild(read);
      ctx.taskBody.appendChild(wrap);

      ctx.taskPrimary.textContent = "continue";
      ctx.taskPrimary.disabled = true;

      return new Promise(r => (ctx.taskPrimary.onclick = r));
    },

    // 3) nth character extraction (small “audit check”)
    nth_char: async (ctx) => {
      begin(ctx, "INDEX", "Type the requested character from the string.");
      const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789-_";
      const len = rndInt(14, 24);
      let s = "";
      for (let i = 0; i < len; i++) s += alphabet[rndInt(0, alphabet.length - 1)];

      const idx = rndInt(3, Math.min(len, 18)); // 1-based prompt
      const correct = s[idx - 1];

      ctx.taskBody.appendChild(note(`string: ${s}`));
      ctx.taskBody.appendChild(note(`requested: character #${idx} (1-based)`));

      const inp = makeInput("type the character");
      inp.maxLength = 1;
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;
      ctx.taskPrimary.onclick = () => {
        const got = (inp.value || "");
        if (got !== correct) {
          msg.textContent = "Incorrect index.";
          ctx.glitch?.();
          ctx.penalize?.(1, "index");
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Index verified.";
        doneGate(ctx, resolve);
      };

      inp.focus();

      let resolve;
      return new Promise(r => (resolve = r));
    },

    // 4) triage flags (select exactly 3 safe)
    triage_flags: async (ctx) => {
      begin(ctx, "TRIAGE", "Select exactly THREE items that are safe to keep.");
      const safe = new Set(["cache-note", "noise.tmp", "idle-memo"]);
      const opts = shuffle(["cache-note", "kernel.map", "noise.tmp", "user.db", "idle-memo", "audit.key"]);

      const picked = new Set();
      const msg = note("Pick 3.");
      msg.style.color = "rgba(255,190,190,.95)";

      const row = makeRow();
      opts.forEach(o => {
        const b = el("button", "sim-btn", o);
        b.style.opacity = "1";
        b.onclick = () => {
          if (picked.has(o)) {
            picked.delete(o);
            b.style.opacity = "1";
          } else {
            picked.add(o);
            b.style.opacity = "0.7";
          }

          if (picked.size === 3) {
            const ok = [...picked].every(x => safe.has(x));
            if (!ok) {
              msg.textContent = "Bad triage. Too loud.";
              ctx.glitch?.();
              ctx.penalize?.(1, "triage");
              return;
            }
            msg.style.color = "rgba(232,237,247,0.85)";
            msg.textContent = "Triage accepted.";
            doneGate(ctx, resolve);
          } else {
            msg.textContent = `Selected: ${picked.size}/3`;
            ctx.taskPrimary.disabled = true;
          }

          if (picked.size > 3) {
            msg.textContent = "Too many selected.";
            ctx.glitch?.();
            ctx.penalize?.(1, "overselect");
          }
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      let resolve;
      return new Promise(r => (resolve = r));
    },

    // 5) pair match (two-column linking)
    match_pairs_3: async (ctx) => {
      begin(ctx, "PAIRING", "Match each label with its partner. (3 pairs)");
      const pairs = [
        ["echo", "reflection"],
        ["static", "snow"],
        ["vault", "latch"]
      ];
      const left = shuffle(pairs.map(p => p[0]));
      const right = shuffle(pairs.map(p => p[1]));
      const map = new Map(pairs.map(p => [p[0], p[1]]));

      let activeLeft = null;
      let solved = 0;

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const cols = el("div");
      cols.style.display = "grid";
      cols.style.gridTemplateColumns = "1fr 1fr";
      cols.style.gap = "10px";
      cols.style.marginTop = "10px";
      cols.style.maxWidth = "520px";

      const leftCol = el("div");
      const rightCol = el("div");

      const leftBtns = new Map();
      const rightBtns = new Map();

      left.forEach(l => {
        const b = el("button", "sim-btn", l);
        b.style.width = "100%";
        b.style.textAlign = "left";
        b.onclick = () => {
          if (b.disabled) return;
          activeLeft = l;
          for (const x of leftBtns.values()) x.style.outline = "";
          b.style.outline = "2px solid rgba(120,180,255,0.55)";
          msg.textContent = `Selected: ${l} → ?`;
        };
        leftBtns.set(l, b);
        leftCol.appendChild(b);
        leftCol.appendChild(el("div", null, "")); // spacer-ish
      });

      right.forEach(r => {
        const b = el("button", "sim-btn", r);
        b.style.width = "100%";
        b.style.textAlign = "left";
        b.onclick = () => {
          if (b.disabled) return;
          if (!activeLeft) {
            msg.textContent = "Pick a left label first.";
            ctx.glitch?.();
            return;
          }
          const correct = map.get(activeLeft);
          if (r !== correct) {
            msg.textContent = "Mismatch.";
            ctx.glitch?.();
            ctx.penalize?.(1, "pair mismatch");
            return;
          }
          // lock both
          leftBtns.get(activeLeft).disabled = true;
          leftBtns.get(activeLeft).style.opacity = "0.6";
          leftBtns.get(activeLeft).style.outline = "";
          b.disabled = true;
          b.style.opacity = "0.6";
          activeLeft = null;
          solved++;
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = `Paired (${solved}/3).`;
          if (solved === 3) {
            msg.textContent = "All pairs matched.";
            doneGate(ctx, resolve);
          } else {
            msg.style.color = "rgba(255,190,190,.95)";
          }
        };
        rightBtns.set(r, b);
        rightCol.appendChild(b);
        rightCol.appendChild(el("div", null, ""));
      });

      cols.appendChild(leftCol);
      cols.appendChild(rightCol);
      ctx.taskBody.appendChild(cols);
      ctx.taskBody.appendChild(msg);

      let resolve;
      return new Promise(r => (resolve = r));
    },

    // 6) tap when lit (reaction but gentle)
    tap_on_green: async (ctx) => {
      begin(ctx, "GATE", "Tap only when the indicator is ON. Need 5 clean taps.");
      const need = clamp(5 + (ctx.difficultyBoost?.() ?? 0), 5, 8);

      const indicator = el("div", "pill", "OFF");
      indicator.style.width = "min(520px, 100%)";
      indicator.style.textAlign = "center";
      indicator.style.padding = "12px";
      indicator.style.marginTop = "10px";

      const btn = el("button", "sim-btn", "tap");
      btn.style.marginTop = "10px";

      const msg = note(`clean taps: 0/${need}`);
      msg.style.color = "rgba(255,190,190,.95)";

      let on = false;
      let taps = 0;

      const cycle = async () => {
        for (;;) {
          const offMs = rndInt(450, 900);
          const onMs = rndInt(320, 650);

          on = false;
          indicator.textContent = "OFF";
          indicator.style.background = "rgba(0,0,0,0.25)";
          await wait(offMs);

          on = true;
          indicator.textContent = "ON";
          indicator.style.background = "rgba(120,180,255,0.22)";
          await wait(onMs);
        }
      };

      let alive = true;
      cycle();

      btn.onclick = () => {
        if (!alive) return;
        if (!on) {
          msg.textContent = "Bad tap. Not during ON.";
          ctx.glitch?.();
          ctx.penalize?.(1, "timing");
          return;
        }
        taps++;
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = `clean taps: ${taps}/${need}`;
        msg.style.color = "rgba(255,190,190,.95)";
        if (taps >= need) {
          alive = false;
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Gate passed.";
          doneGate(ctx, resolve);
        }
      };

      ctx.taskBody.appendChild(indicator);
      ctx.taskBody.appendChild(btn);
      ctx.taskBody.appendChild(msg);

      let resolve;
      return new Promise(r => (resolve = r));
    },

    // 7) type phrase without letter (anti-copy vibe)
    type_without_e: async (ctx) => {
      begin(ctx, "SANITIZE", "Retype the phrase WITHOUT using the letter 'e'.");
      const phrase = "keep it boring and quiet";
      ctx.taskBody.appendChild(note(`phrase: "${phrase}"`));
      ctx.taskBody.appendChild(note("Rule: your retype must contain NO 'e' characters."));

      const inp = makeInput("type sanitized phrase…");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;

      ctx.taskPrimary.onclick = () => {
        const got = (inp.value || "").trim().toLowerCase();
        if (got.includes("e")) {
          msg.textContent = "Rejected: contains 'e'.";
          ctx.glitch?.();
          ctx.penalize?.(1, "sanitize");
          return;
        }
        // must still roughly match meaning: require words subset
        const want = ["keep", "it", "boring", "and", "quiet"];
        const ok = want.every(w => got.split(/\s+/).includes(w));
        if (!ok) {
          msg.textContent = "Too mangled.";
          ctx.glitch?.();
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Sanitized.";
        doneGate(ctx, resolve);
      };

      inp.focus();

      let resolve;
      return new Promise(r => (resolve = r));
    },

    // 8) bucket sort (two buckets)
    bucket_sort_4: async (ctx) => {
      begin(ctx, "SORT", "Move each item into the correct bucket: SAFE or NOISY.");
      const items = shuffle(["cache.tmp", "audit.key", "noise.log", "idle.memo"]);
      const safe = new Set(["cache.tmp", "idle.memo"]);

      const msg = note("Drag not required — just click bucket buttons.");
      msg.style.color = "rgba(255,190,190,.95)";

      const list = el("div");
      list.style.marginTop = "10px";
      list.style.display = "grid";
      list.style.gap = "10px";
      list.style.maxWidth = "520px";

      let solved = 0;

      items.forEach(item => {
        const row = el("div");
        row.style.display = "flex";
        row.style.gap = "10px";
        row.style.alignItems = "center";

        const pill = el("div", "pill", item);
        pill.style.flex = "1";

        const safeBtn = el("button", "sim-btn", "SAFE");
        const noisyBtn = el("button", "sim-btn", "NOISY");

        const lock = () => {
          safeBtn.disabled = true;
          noisyBtn.disabled = true;
          safeBtn.style.opacity = "0.65";
          noisyBtn.style.opacity = "0.65";
          pill.style.opacity = "0.75";
        };

        safeBtn.onclick = () => {
          const ok = safe.has(item);
          if (!ok) {
            msg.textContent = `${item} is not SAFE.`;
            ctx.glitch?.();
            ctx.penalize?.(1, "sort");
            return;
          }
          lock();
          solved++;
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = `Sorted (${solved}/4).`;
          msg.style.color = "rgba(255,190,190,.95)";
          if (solved === 4) {
            msg.style.color = "rgba(232,237,247,0.85)";
            msg.textContent = "Sorted.";
            doneGate(ctx, resolve);
          }
        };

        noisyBtn.onclick = () => {
          const ok = !safe.has(item);
          if (!ok) {
            msg.textContent = `${item} should be SAFE.`;
            ctx.glitch?.();
            ctx.penalize?.(1, "sort");
            return;
          }
          lock();
          solved++;
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = `Sorted (${solved}/4).`;
          msg.style.color = "rgba(255,190,190,.95)";
          if (solved === 4) {
            msg.style.color = "rgba(232,237,247,0.85)";
            msg.textContent = "Sorted.";
            doneGate(ctx, resolve);
          }
        };

        row.appendChild(pill);
        row.appendChild(safeBtn);
        row.appendChild(noisyBtn);
        list.appendChild(row);
      });

      ctx.taskBody.appendChild(list);
      ctx.taskBody.appendChild(msg);

      let resolve;
      return new Promise(r => (resolve = r));
    },

    // 9) color memory (short)
    color_memory_4: async (ctx) => {
      begin(ctx, "VISUAL", "Memorize the color order. Then click them in the same order.");
      const colors = ["Slate", "Ice", "Ash", "Ink", "Fog", "Steel"];
      const seq = shuffle(colors).slice(0, 4);

      const shown = el("div");
      shown.style.marginTop = "12px";
      shown.style.display = "flex";
      shown.style.flexWrap = "wrap";
      shown.style.gap = "10px";
      shown.style.maxWidth = "520px";

      seq.forEach(c => {
        const p = el("div", "pill", c);
        p.style.flex = "1";
        p.style.textAlign = "center";
        shown.appendChild(p);
      });

      ctx.taskBody.appendChild(note("Showing for a moment…"));
      ctx.taskBody.appendChild(shown);

      await wait(2000 + clamp((ctx.difficultyBoost?.() ?? 0) * 250, 0, 1500));

      shown.style.opacity = "0.35";
      shown.style.filter = "blur(2px)";

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const buttons = makeRow();
      const opts = shuffle(seq.concat(shuffle(colors.filter(x => !seq.includes(x))).slice(0, 2)));

      let i = 0;

      opts.forEach(c => {
        const b = el("button", "sim-btn", c);
        b.onclick = () => {
          if (c !== seq[i]) {
            i = 0;
            msg.textContent = "Wrong order. Reset.";
            ctx.glitch?.();
            ctx.penalize?.(1, "memory");
            return;
          }
          i++;
          msg.textContent = `ok (${i}/4)`;
          if (i === 4) {
            msg.style.color = "rgba(232,237,247,0.85)";
            msg.textContent = "Order confirmed.";
            doneGate(ctx, resolve);
          }
        };
        buttons.appendChild(b);
      });

      ctx.taskBody.appendChild(note("Now repeat:"));
      ctx.taskBody.appendChild(buttons);
      ctx.taskBody.appendChild(msg);

      let resolve;
      return new Promise(r => (resolve = r));
    },

    // 10) hold SPACE (keyboard physicality)
    hold_space: async (ctx) => {
      begin(ctx, "HOLD KEY", "Hold SPACE until the counter completes. Releasing resets.");
      const ms = clamp(2200 + (ctx.difficultyBoost?.() ?? 0) * 350, 2200, 4200);

      const bar = el("div", "pill", "Hold SPACE");
      bar.style.marginTop = "12px";
      bar.style.width = "min(520px, 100%)";
      bar.style.padding = "12px";
      bar.style.textAlign = "center";

      const fillWrap = el("div");
      fillWrap.style.marginTop = "10px";
      fillWrap.style.width = "min(520px, 100%)";
      fillWrap.style.height = "12px";
      fillWrap.style.borderRadius = "999px";
      fillWrap.style.border = "1px solid rgba(255,255,255,0.18)";
      fillWrap.style.overflow = "hidden";
      fillWrap.style.background = "rgba(0,0,0,0.25)";

      const fill = el("div");
      fill.style.height = "100%";
      fill.style.width = "0%";
      fill.style.background = "rgba(120,180,255,0.22)";
      fillWrap.appendChild(fill);

      const msg = note("Click here then press SPACE.");
      msg.style.color = "rgba(255,190,190,.95)";

      ctx.taskBody.appendChild(bar);
      ctx.taskBody.appendChild(fillWrap);
      ctx.taskBody.appendChild(msg);

      let holding = false;
      let start = null;
      let raf = null;

      const step = (t) => {
        if (!holding) return;
        if (start === null) start = t;
        const pct = clamp((t - start) / ms, 0, 1);
        fill.style.width = `${(pct * 100).toFixed(1)}%`;
        if (pct >= 1) {
          holding = false;
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Key hold confirmed.";
          doneGate(ctx, resolve);
          return;
        }
        raf = requestAnimationFrame(step);
      };

      const reset = () => {
        start = null;
        fill.style.width = "0%";
        msg.textContent = "Released. Reset.";
        ctx.glitch?.();
        ctx.penalize?.(1, "stability");
      };

      const onDown = (e) => {
        if (e.code !== "Space") return;
        e.preventDefault();
        if (!holding) {
          holding = true;
          msg.textContent = "";
          raf = requestAnimationFrame(step);
        }
      };

      const onUp = (e) => {
        if (e.code !== "Space") return;
        e.preventDefault();
        if (holding) {
          holding = false;
          if (raf) cancelAnimationFrame(raf);
          reset();
        }
      };

      window.addEventListener("keydown", onDown);
      window.addEventListener("keyup", onUp);

      let resolve;
      const p = new Promise(r => (resolve = r));
      p.finally(() => {
        window.removeEventListener("keydown", onDown);
        window.removeEventListener("keyup", onUp);
        if (raf) cancelAnimationFrame(raf);
      });
      return p;
    },

    // 11) count vowels
    count_vowels: async (ctx) => {
      begin(ctx, "COUNT", "Count the vowels (a,e,i,o,u) in the string. Type the number.");
      const alphabet = "abcdefghijklmnopqrstuvwxyz";
      const len = rndInt(12, 22);
      let s = "";
      for (let i = 0; i < len; i++) s += alphabet[rndInt(0, alphabet.length - 1)];

      const vowels = new Set(["a","e","i","o","u"]);
      let count = 0;
      for (const ch of s) if (vowels.has(ch)) count++;

      ctx.taskBody.appendChild(note(`string: ${s}`));
      const inp = makeInput("vowel count");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;
      ctx.taskPrimary.onclick = () => {
        const got = (inp.value || "").trim();
        if (got !== String(count)) {
          msg.textContent = "Wrong count.";
          ctx.glitch?.();
          ctx.penalize?.(1, "count");
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Count verified.";
        doneGate(ctx, resolve);
      };

      inp.focus();

      let resolve;
      return new Promise(r => (resolve = r));
    },

    // 12) pick duplicate line
    pick_duplicate: async (ctx) => {
      begin(ctx, "DEDUP", "Click the line that appears twice.");
      const base = shuffle([
        "System: buffer stable.",
        "System: noise floor ok.",
        "Security: eyes forward.",
        "System: cache warmed."
      ]);
      const dup = base[rndInt(0, base.length - 1)];
      const lines = shuffle(base.concat([dup])); // one duplicate

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      lines.forEach(t => {
        const b = el("button", "sim-btn", t);
        b.style.display = "block";
        b.style.width = "100%";
        b.style.textAlign = "left";
        b.style.marginTop = "10px";
        b.onclick = () => {
          if (t !== dup) {
            msg.textContent = "Not the duplicate.";
            ctx.glitch?.();
            ctx.penalize?.(1, "dedup");
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Duplicate removed.";
          doneGate(ctx, resolve);
        };
        ctx.taskBody.appendChild(b);
      });

      ctx.taskBody.appendChild(msg);

      let resolve;
      return new Promise(r => (resolve = r));
    },

    // 13) binary choice (small)
    pick_binary: async (ctx) => {
      begin(ctx, "ENCODE", "Pick the correct binary for the number.");
      const n = rndInt(3, 15);
      const correct = n.toString(2);

      const opts = shuffle([
        correct,
        (n + 1).toString(2),
        (n + 2).toString(2),
        Math.max(0, n - 1).toString(2)
      ]);

      ctx.taskBody.appendChild(note(`number: ${n}`));

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const row = makeRow();
      opts.forEach(o => {
        const b = el("button", "sim-btn", o);
        b.onclick = () => {
          if (o !== correct) {
            msg.textContent = "Wrong encoding.";
            ctx.glitch?.();
            ctx.penalize?.(1, "encode");
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Encoding ok.";
          doneGate(ctx, resolve);
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      let resolve;
      return new Promise(r => (resolve = r));
    },

    // 14) whitelist toggles (checkboxes)
    whitelist_toggles: async (ctx) => {
      begin(ctx, "WHITELIST", "Enable ONLY the allowed switches.");
      const allowed = new Set(["cache", "idle", "noise"]);
      const opts = shuffle(["cache", "camera", "idle", "export", "noise", "trace"]);

      const msg = note("Allowed: cache, idle, noise");
      msg.style.color = "rgba(255,190,190,.95)";

      const wrap = el("div");
      wrap.style.marginTop = "12px";
      wrap.style.display = "grid";
      wrap.style.gap = "10px";
      wrap.style.maxWidth = "520px";

      const checks = [];

      opts.forEach(name => {
        const row = el("label");
        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.gap = "10px";
        row.style.padding = "10px 12px";
        row.style.borderRadius = "12px";
        row.style.border = "1px solid rgba(255,255,255,0.14)";
        row.style.background = "rgba(0,0,0,0.18)";

        const cb = el("input");
        cb.type = "checkbox";
        const t = el("div", null, name);
        t.style.opacity = "0.9";

        row.appendChild(cb);
        row.appendChild(t);
        wrap.appendChild(row);

        checks.push([name, cb]);
      });

      const validate = () => {
        for (const [name, cb] of checks) {
          if (allowed.has(name) && !cb.checked) return false;
          if (!allowed.has(name) && cb.checked) return false;
        }
        return true;
      };

      wrap.addEventListener("change", () => {
        ctx.taskPrimary.disabled = !validate();
      });

      ctx.taskBody.appendChild(wrap);
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "continue";
      ctx.taskPrimary.disabled = true;
      return new Promise(r => (ctx.taskPrimary.onclick = r));
    },

    // 15) time gate (click within short window after unlock)
    time_gate: async (ctx) => {
      begin(ctx, "WINDOW", "Wait for UNLOCK, then click within the window.");
      const pre = clamp(900 + (ctx.difficultyBoost?.() ?? 0) * 250, 900, 2400);
      const windowMs = clamp(650 - (ctx.difficultyBoost?.() ?? 0) * 60, 350, 650);

      const btn = el("button", "sim-btn", "LOCKED");
      btn.disabled = true;
      btn.style.marginTop = "12px";

      const msg = note("Don’t guess.");
      msg.style.color = "rgba(255,190,190,.95)";

      ctx.taskBody.appendChild(btn);
      ctx.taskBody.appendChild(msg);

      await wait(pre);

      btn.disabled = false;
      btn.textContent = "UNLOCK";

      let openedAt = performance.now();
      let clicked = false;

      btn.onclick = () => {
        clicked = true;
        const dt = performance.now() - openedAt;
        if (dt > windowMs) {
          msg.textContent = "Too late.";
          ctx.glitch?.();
          ctx.penalize?.(1, "window");
          // still allow continue (keeps pacing moving)
        } else {
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "On time.";
        }
        doneGate(ctx, resolve);
      };

      // auto-fail if they wait too long
      setTimeout(() => {
        if (clicked) return;
        msg.textContent = "Window expired.";
        ctx.glitch?.();
        ctx.penalize?.(1, "expired");
        doneGate(ctx, resolve);
      }, windowMs + 250);

      let resolve;
      return new Promise(r => (resolve = r));
    },

    // 16) scrub log (scroll to bottom)
    scrub_log_scroll: async (ctx) => {
      begin(ctx, "SCRUB", "Scroll to the bottom of the log to confirm you reviewed it.");
      const box = el("div");
      box.style.marginTop = "12px";
      box.style.width = "min(520px, 100%)";
      box.style.height = "180px";
      box.style.overflow = "auto";
      box.style.padding = "10px 12px";
      box.style.borderRadius = "12px";
      box.style.border = "1px solid rgba(255,255,255,0.14)";
      box.style.background = "rgba(0,0,0,0.18)";
      box.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
      box.style.fontSize = "12px";
      box.style.opacity = "0.9";

      const lines = [];
      const n = 40 + (ctx.difficultyBoost?.() ?? 0) * 8;
      for (let i = 0; i < n; i++) {
        const a = String(rndInt(10, 99));
        const b = ["cache", "noise", "idle", "trace", "audit"][rndInt(0, 4)];
        lines.push(`${String(i + 1).padStart(2, "0")}: ${b} … ${a}`);
      }
      box.textContent = lines.join("\n");

      const msg = note("Scroll to bottom to unlock.");
      msg.style.color = "rgba(255,190,190,.95)";

      const onScroll = () => {
        const nearBottom = box.scrollTop + box.clientHeight >= box.scrollHeight - 6;
        if (nearBottom) {
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Reviewed.";
          ctx.taskPrimary.disabled = false;
          box.removeEventListener("scroll", onScroll);
        }
      };

      box.addEventListener("scroll", onScroll);

      ctx.taskBody.appendChild(box);
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "continue";
      ctx.taskPrimary.disabled = true;
      return new Promise(r => (ctx.taskPrimary.onclick = r));
    },

    // 17) quiet typing (slow down)
    quiet_typing: async (ctx) => {
      begin(ctx, "QUIET INPUT", "Type the phrase, but not too fast. (No paste.)");
      const phrase = "acknowledge the window";
      ctx.taskBody.appendChild(note(`phrase: "${phrase}"`));
      ctx.taskBody.appendChild(note("Rule: total time must be at least 2 seconds."));

      const inp = makeInput("type here…");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      let startedAt = null;
      let pasted = false;

      inp.addEventListener("paste", (e) => {
        pasted = true;
        msg.textContent = "No paste.";
        ctx.glitch?.();
        ctx.penalize?.(1, "paste");
        e.preventDefault();
      });

      inp.addEventListener("input", () => {
        if (startedAt === null && (inp.value || "").length > 0) startedAt = performance.now();
      });

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;
      ctx.taskPrimary.onclick = () => {
        const got = (inp.value || "").trim().toLowerCase();
        const dt = startedAt === null ? 0 : (performance.now() - startedAt);
        if (pasted) {
          msg.textContent = "Rejected: paste detected.";
          ctx.glitch?.();
          return;
        }
        if (got !== phrase) {
          msg.textContent = "Incorrect phrase.";
          ctx.glitch?.();
          ctx.penalize?.(1, "typo");
          return;
        }
        if (dt < 2000) {
          msg.textContent = "Too fast.";
          ctx.glitch?.();
          ctx.penalize?.(1, "rushed");
          // still allow continue to keep flow moving
        } else {
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Quiet enough.";
        }
        doneGate(ctx, resolve);
      };

      inp.focus();

      let resolve;
      return new Promise(r => (resolve = r));
    },

    // 18) mirror word (reverse letters)
    mirror_word: async (ctx) => {
      begin(ctx, "MIRROR", "Type the word mirrored (reversed).");
      const words = ["audit", "quiet", "buffer", "static", "mirror", "vault", "trace"];
      const w = words[rndInt(0, words.length - 1)];
      const correct = w.split("").reverse().join("");

      ctx.taskBody.appendChild(note(`word: ${w}`));
      const inp = makeInput("mirrored");
      ctx.taskBody.appendChild(inp);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";
      ctx.taskBody.appendChild(msg);

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = false;
      ctx.taskPrimary.onclick = () => {
        const got = (inp.value || "").trim().toLowerCase();
        if (got !== correct) {
          msg.textContent = "Not mirrored.";
          ctx.glitch?.();
          ctx.penalize?.(1, "mirror");
          return;
        }
        msg.style.color = "rgba(232,237,247,0.85)";
        msg.textContent = "Mirror ok.";
        doneGate(ctx, resolve);
      };

      inp.focus();

      let resolve;
      return new Promise(r => (resolve = r));
    },

    // 19) coordinate pick
    pick_coordinate: async (ctx) => {
      begin(ctx, "COORD", "Click the shown coordinate.");
      const letters = ["A","B","C","D"];
      const nums = ["1","2","3","4"];
      const target = `${letters[rndInt(0,3)]}${nums[rndInt(0,3)]}`;

      ctx.taskBody.appendChild(note(`target: ${target}`));

      const grid = el("div");
      grid.style.marginTop = "12px";
      grid.style.display = "grid";
      grid.style.gridTemplateColumns = "repeat(4, 1fr)";
      grid.style.gap = "10px";
      grid.style.maxWidth = "520px";

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      for (const L of letters) {
        for (const N of nums) {
          const id = `${L}${N}`;
          const b = el("button", "sim-btn", id);
          b.onclick = () => {
            if (id !== target) {
              msg.textContent = "Wrong cell.";
              ctx.glitch?.();
              ctx.penalize?.(1, "coord");
              return;
            }
            msg.style.color = "rgba(232,237,247,0.85)";
            msg.textContent = "Coordinate confirmed.";
            doneGate(ctx, resolve);
          };
          grid.appendChild(b);
        }
      }

      ctx.taskBody.appendChild(grid);
      ctx.taskBody.appendChild(msg);

      let resolve;
      return new Promise(r => (resolve = r));
    },

    // 20) acknowledge keyword among lookalikes
    choose_acknowledged: async (ctx) => {
      begin(ctx, "ACK", "Choose the exact keyword.");
      const correct = "ACKNOWLEDGED";
      const opts = shuffle([
        "ACKNOWLEDGE",
        "ACKNOWLEDGED",
        "ACK-NOW-LEDGED",
        "A C K N O W L E D G E D"
      ]);

      const msg = note("");
      msg.style.color = "rgba(255,190,190,.95)";

      const row = makeRow();
      opts.forEach(o => {
        const b = el("button", "sim-btn", o);
        b.onclick = () => {
          if (o !== correct) {
            msg.textContent = "Not exact.";
            ctx.glitch?.();
            ctx.penalize?.(1, "precision");
            return;
          }
          msg.style.color = "rgba(232,237,247,0.85)";
          msg.textContent = "Acknowledged.";
          doneGate(ctx, resolve);
        };
        row.appendChild(b);
      });

      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(msg);

      let resolve;
      return new Promise(r => (resolve = r));
    },
  };

  // Register tasks
  reg(PACK3_TASKS);

  // Register pool "pack3"
  regPool(
    "pack3",
    Object.keys(PACK3_TASKS).map(id => ({ id, w: 1 }))
  );
})();
