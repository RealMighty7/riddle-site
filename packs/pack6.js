// packs/pack6.js
// Pack 6: interactive puzzles (10) — visually-forward, click/drag heavy.
// Requires tasks.js to be loaded first.

(() => {
  const reg = window.registerTasks;
  const regPool = window.registerTaskPool;
  if (typeof reg !== "function" || typeof regPool !== "function") {
    console.error("Pack 6: registerTasks/registerTaskPool missing — load tasks.js before packs/pack6.js");
    return;
  }

  const defs = {};

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  const el = (tag, attrs = {}, children = []) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k === "html") n.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, String(v));
    }
    for (const c of (children || [])) n.appendChild(c);
    return n;
  };

  function setAnswer(ctx, ans) {
    try { ctx.setAnswer?.(String(ans ?? "")); } catch {}
  }

  // ------------------------------
  // p6_rotors — rotary dials (drag) to match target
  // ------------------------------
  defs.p6_rotors = async (ctx) => {
    ctx.showTaskUI?.("rotors", "drag the dials to match the target");
    const target = [rint(0, 9), rint(0, 9), rint(0, 9)];
    setAnswer(ctx, target.join("-"));

    const wrap = el("div", { class: "p6-panel" });
    const head = el("div", { class: "p6-head" }, [
      el("div", { class: "mono p6-kv", text: `target: ${target.join("-")}` }),
      el("div", { class: "muted", text: "(drag each dial)" }),
    ]);

    const dialRow = el("div", { class: "p6-dialRow" });
    const values = [rint(0, 9), rint(0, 9), rint(0, 9)];

    const mkDial = (i) => {
      const dial = el("div", { class: "p6-dial", "data-i": String(i) });
      const ring = el("div", { class: "p6-dialRing" });
      const tick = el("div", { class: "p6-dialTick" });
      const read = el("div", { class: "p6-dialRead mono", text: String(values[i]) });
      dial.append(ring, tick, read);

      const update = (v) => {
        values[i] = (v + 10) % 10;
        read.textContent = String(values[i]);
        const ang = (values[i] / 10) * 320 - 160;
        ring.style.transform = `rotate(${ang}deg)`;
        tick.style.transform = `rotate(${ang}deg)`;
        if (values.every((x, j) => x === target[j])) ctx.success?.("ok");
      };

      update(values[i]);

      // Drag: vertical motion changes value, snappy and tactile.
      let lastY = 0;
      let acc = 0;
      const onMove = (e) => {
        const y = e.clientY;
        const dy = lastY - y;
        lastY = y;
        acc += dy;
        const step = 14;
        while (acc >= step) { acc -= step; update(values[i] + 1); }
        while (acc <= -step) { acc += step; update(values[i] - 1); }
      };
      const stop = () => {
        window.removeEventListener("pointermove", onMove, true);
        window.removeEventListener("pointerup", stop, true);
        dial.releasePointerCapture?.(1);
        dial.classList.remove("drag");
      };
      dial.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        dial.classList.add("drag");
        lastY = e.clientY;
        acc = 0;
        try { dial.setPointerCapture(e.pointerId); } catch {}
        window.addEventListener("pointermove", onMove, true);
        window.addEventListener("pointerup", stop, true);
      });
      dial.addEventListener("dblclick", () => update(values[i] + 1));
      return dial;
    };

    dialRow.append(mkDial(0), mkDial(1), mkDial(2));

    const hint = el("div", { class: "muted", text: "tip: double-click a dial to step" });
    wrap.append(head, dialRow, hint);
    ctx.taskBody.append(wrap);

    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.onclick = () => {
      if (values.every((x, i) => x === target[i])) return ctx.success?.("ok");
      ctx.penalize?.();
    };
  };

  // ------------------------------
  // p6_wordsplice — drag tiles into slots
  // ------------------------------
  defs.p6_wordsplice = async (ctx) => {
    ctx.showTaskUI?.("wordsplice", "drag the tiles into the slots");
    const words = ["CIRCUIT", "REFRACT", "SIGNAL", "SANDBOX", "MONITOR", "PROTOCOL", "GLITCH", "VECTOR"]; 
    const word = words[Math.floor(Math.random() * words.length)];
    setAnswer(ctx, word);

    const wrap = el("div", { class: "p6-panel" });
    const slots = el("div", { class: "p6-slots" });
    const bank = el("div", { class: "p6-bank" });
    const msg = el("div", { class: "muted", text: "" });

    const letters = word.split("").sort(() => Math.random() - 0.5);
    const slotEls = [];
    const placed = Array(word.length).fill(null);

    for (let i = 0; i < word.length; i++) {
      const s = el("div", { class: "p6-slot", "data-i": String(i) }, [el("span", { class: "mono", text: "" })]);
      s.addEventListener("dragover", (e) => { e.preventDefault(); s.classList.add("over"); });
      s.addEventListener("dragleave", () => s.classList.remove("over"));
      s.addEventListener("drop", (e) => {
        e.preventDefault();
        s.classList.remove("over");
        const id = e.dataTransfer?.getData("text/plain");
        const tile = id ? document.getElementById(id) : null;
        if (!tile) return;
        const ch = tile.getAttribute("data-ch") || "";
        const idx = Number(s.getAttribute("data-i"));
        if (!Number.isFinite(idx)) return;

        // If slot occupied, return existing tile to bank
        if (placed[idx]) {
          const oldId = placed[idx];
          const old = document.getElementById(oldId);
          if (old) bank.appendChild(old);
        }
        placed[idx] = tile.id;
        s.firstChild.textContent = ch;
        s.classList.add("filled");
        tile.classList.add("ghost");
        tile.setAttribute("draggable", "false");

        // check
        const attempt = slotEls.map((sl) => sl.firstChild.textContent).join("");
        if (attempt.length === word.length && attempt === word) ctx.success?.("ok");
      });
      slotEls.push(s);
      slots.appendChild(s);
    }

    letters.forEach((ch, i) => {
      const id = `p6_tile_${Math.random().toString(16).slice(2)}_${i}`;
      const t = el("div", { class: "p6-tile mono", id, draggable: "true" });
      t.setAttribute("data-ch", ch);
      t.textContent = ch;
      t.addEventListener("dragstart", (e) => {
        e.dataTransfer?.setData("text/plain", id);
        e.dataTransfer && (e.dataTransfer.effectAllowed = "move");
      });
      bank.appendChild(t);
    });

    const reset = el("button", { type: "button", class: "taskBtn", text: "reset" });
    reset.onclick = () => {
      slotEls.forEach((sl, i) => {
        sl.classList.remove("filled");
        sl.firstChild.textContent = "";
        if (placed[i]) {
          const tile = document.getElementById(placed[i]);
          if (tile) {
            tile.classList.remove("ghost");
            tile.setAttribute("draggable", "true");
            bank.appendChild(tile);
          }
        }
        placed[i] = null;
      });
      msg.textContent = "";
    };

    wrap.append(
      el("div", { class: "p6-head" }, [
        el("div", { class: "mono p6-kv", text: `length: ${word.length}` }),
        el("div", { class: "muted", text: "drag tiles into slots" }),
      ]),
      slots,
      el("div", { class: "p6-sub" }, [bank, reset]),
      msg
    );
    ctx.taskBody.append(wrap);

    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.onclick = () => {
      const attempt = slotEls.map((sl) => sl.firstChild.textContent).join("");
      if (attempt === word) return ctx.success?.("ok");
      ctx.penalize?.();
      msg.textContent = "not aligned";
    };
  };

  // ------------------------------
  // p6_freqdial — oscilloscope + dial
  // ------------------------------
  defs.p6_freqdial = async (ctx) => {
    ctx.showTaskUI?.("freq dial", "tune until the trace locks" );
    const target = rint(180, 620);
    const tol = 8;
    setAnswer(ctx, `${target}±${tol}`);

    const wrap = el("div", { class: "p6-panel" });
    const canvas = el("canvas", { class: "p6-scope", width: "560", height: "160" });
    const read = el("div", { class: "mono p6-kv", text: "hz: ---" });
    const hint = el("div", { class: "muted", text: `target band: ${target} ±${tol}` });

    const dial = el("input", { type: "range", min: "100", max: "700", value: String(rint(100, 700)), class: "p6-range" });
    wrap.append(el("div", { class: "p6-head" }, [read, hint]), canvas, dial);
    ctx.taskBody.append(wrap);

    const g = canvas.getContext("2d");
    let running = true;
    const draw = () => {
      if (!g) return;
      const w = canvas.width, h = canvas.height;
      const hz = Number(dial.value);
      read.textContent = `hz: ${hz}`;
      const lock = Math.abs(hz - target) <= tol;
      g.clearRect(0, 0, w, h);

      // grid
      g.globalAlpha = 0.16;
      for (let x = 0; x <= w; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      for (let y = 0; y <= h; y += 20) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.globalAlpha = 1;

      // target band marker
      const bandX = ((target - 100) / 600) * w;
      const bandW = (tol / 600) * w;
      g.globalAlpha = 0.22;
      g.fillRect(bandX - bandW, 0, bandW * 2, h);
      g.globalAlpha = 1;

      // trace
      const t = performance.now() / 1000;
      const amp = lock ? 0.18 : 0.42;
      const freq = 2 + (hz / 200);
      g.beginPath();
      for (let i = 0; i < w; i++) {
        const px = i;
        const u = (i / w) * Math.PI * 2;
        const y = h / 2 + Math.sin(u * freq + t * 2.2) * (h * 0.35 * amp) + Math.sin(u * (freq * 0.33) - t) * (h * 0.10 * amp);
        if (i === 0) g.moveTo(px, y); else g.lineTo(px, y);
      }
      g.stroke();

      // lock overlay
      if (lock) {
        g.globalAlpha = 0.16;
        g.fillRect(0, 0, w, h);
        g.globalAlpha = 1;
      }

      if (running) requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);

    ctx.taskPrimary.textContent = "lock";
    ctx.taskPrimary.onclick = () => {
      const hz = Number(dial.value);
      if (Math.abs(hz - target) <= tol) {
        running = false;
        return ctx.success?.("locked");
      }
      ctx.penalize?.();
    };
  };

  // ------------------------------
  // p6_morse — visual blink + decode
  // ------------------------------
  defs.p6_morse = async (ctx) => {
    ctx.showTaskUI?.("morse", "watch the blinks, type the letters" );
    const map = {
      A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", I: "..", M: "--", N: "-.", O: "---", R: ".-.", S: "...", T: "-", U: "..-"
    };
    const words = ["SON", "TONE", "SENT", "RUN", "ECHO", "STATIC", "NODE", "RIM", "TUNER"]; // all in-map
    const word = words[Math.floor(Math.random() * words.length)].replace(/[^A-Z]/g, "");
    setAnswer(ctx, word);

    const code = word.split("").map((ch) => map[ch]).join(" ");
    const lamp = el("div", { class: "p6-lamp" });
    const msg = el("div", { class: "muted", text: "press PLAY, then decode" });
    const inp = el("input", { type: "text", placeholder: "letters", class: "p6-input" });
    const play = el("button", { type: "button", class: "taskBtn", text: "PLAY" });
    const help = el("details", { class: "p6-help" }, [
      el("summary", { class: "muted", text: "show hint" }),
      el("div", { class: "mono", text: code }),
    ]);

    ctx.taskBody.append(el("div", { class: "p6-panel" }, [
      el("div", { class: "p6-head" }, [el("div", { class: "mono p6-kv", text: "signal: blink" }), msg]),
      lamp,
      el("div", { class: "p6-row" }, [play, inp]),
      help,
    ]));

    let playing = false;
    const blink = async () => {
      if (playing) return;
      playing = true;
      msg.textContent = "watch";
      const dot = async () => { lamp.classList.add("on"); await sleep(140); lamp.classList.remove("on"); await sleep(120); };
      const dash = async () => { lamp.classList.add("on"); await sleep(380); lamp.classList.remove("on"); await sleep(160); };
      for (const ch of word) {
        const pat = map[ch];
        for (const sym of pat) {
          if (sym === ".") await dot(); else await dash();
        }
        await sleep(260);
      }
      msg.textContent = "your turn";
      playing = false;
    };
    play.onclick = blink;

    const submit = () => {
      const v = String(inp.value || "").trim().toUpperCase();
      if (v === word) return ctx.success?.("ok");
      ctx.penalize?.();
    };
    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.onclick = submit;
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
  };

  // ------------------------------
  // p6_gridtap — tap lit cells IN ORDER (animated)
  // ------------------------------
  defs.p6_gridtap = async (ctx) => {
    ctx.showTaskUI?.("grid tap", "tap the cells in the order they ignite" );
    const order = [];
    while (order.length < 5) {
      const n = rint(0, 8);
      if (!order.includes(n)) order.push(n);
    }
    setAnswer(ctx, order.map((n) => n + 1).join("-"));

    const wrap = el("div", { class: "p6-panel" });
    const grid = el("div", { class: "grid3 p6-grid" });
    const msg = el("div", { class: "muted", text: "watch…" });
    wrap.append(el("div", { class: "p6-head" }, [el("div", { class: "mono p6-kv", text: "pattern" }), msg]), grid);
    ctx.taskBody.append(wrap);

    const btns = [];
    for (let i = 0; i < 9; i++) {
      const b = el("button", { type: "button", class: "gridCell p6-cell", text: "" });
      btns.push(b);
      grid.appendChild(b);
    }

    // play pattern
    await sleep(220);
    for (const idx of order) {
      btns[idx].classList.add("hot");
      await sleep(260);
      btns[idx].classList.remove("hot");
      await sleep(120);
    }
    msg.textContent = "repeat";

    let pos = 0;
    btns.forEach((b, i) => {
      b.onclick = () => {
        if (i !== order[pos]) {
          pos = 0;
          ctx.penalize?.();
          msg.textContent = "reset";
          return;
        }
        b.classList.add("on");
        pos++;
        msg.textContent = `ok ${pos}/${order.length}`;
        if (pos >= order.length) ctx.success?.("ok");
      };
    });
  };

  // ------------------------------
  // p6_switchboard — connect left jacks to right jacks (click) with a live wire
  // ------------------------------
  defs.p6_switchboard = async (ctx) => {
    ctx.showTaskUI?.("switchboard", "patch the left sockets to match the right" );
    const n = 5;
    const perm = Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5);
    setAnswer(ctx, perm.map((i) => i + 1).join("-"));

    const wrap = el("div", { class: "p6-panel" });
    const msg = el("div", { class: "muted", text: "click a left socket, then the matching right socket" });
    const board = el("div", { class: "p6-switch" });
    const left = el("div", { class: "p6-col" });
    const right = el("div", { class: "p6-col" });
    const wires = el("div", { class: "p6-wires" });
    board.append(left, wires, right);

    const lines = new Map();
    let activeL = null;

    const makeJack = (side, i) => {
      const j = el("button", { type: "button", class: `p6-jack ${side}`, text: side === "L" ? String(i + 1) : String(perm.indexOf(i) + 1) });
      j.dataset.i = String(i);
      j.dataset.side = side;
      return j;
    };

    const L = Array.from({ length: n }, (_, i) => makeJack("L", i));
    const R = Array.from({ length: n }, (_, i) => makeJack("R", i));
    L.forEach((j) => left.appendChild(j));
    R.forEach((j) => right.appendChild(j));

    const draw = () => {
      wires.innerHTML = "";
      const rect = board.getBoundingClientRect();
      const toRel = (b) => {
        const r = b.getBoundingClientRect();
        return { x: r.left - rect.left + r.width / 2, y: r.top - rect.top + r.height / 2 };
      };
      for (const [li, ri] of lines.entries()) {
        const p1 = toRel(L[li]);
        const p2 = toRel(R[ri]);
        const l = el("div", { class: "p6-wire" });
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.hypot(dx, dy);
        const ang = Math.atan2(dy, dx) * (180 / Math.PI);
        l.style.width = `${len}px`;
        l.style.transform = `translate(${p1.x}px, ${p1.y}px) rotate(${ang}deg)`;
        wires.appendChild(l);
      }
    };

    const check = () => {
      if (lines.size !== n) return false;
      for (let i = 0; i < n; i++) {
        const ri = lines.get(i);
        if (ri == null) return false;
        if (perm[ri] !== i) return false;
      }
      return true;
    };

    const bind = () => {
      L.forEach((b, li) => {
        b.onclick = () => {
          activeL = li;
          L.forEach((x) => x.classList.remove("sel"));
          b.classList.add("sel");
        };
      });
      R.forEach((b, ri) => {
        b.onclick = () => {
          if (activeL == null) { ctx.penalize?.(); return; }
          lines.set(activeL, ri);
          activeL = null;
          L.forEach((x) => x.classList.remove("sel"));
          draw();
          if (check()) ctx.success?.("ok");
        };
      });
    };

    bind();
    window.addEventListener("resize", draw, { passive: true });
    await sleep(50);
    draw();

    wrap.append(el("div", { class: "p6-head" }, [el("div", { class: "mono p6-kv", text: "patch panel" }), msg]), board);
    ctx.taskBody.append(wrap);

    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.onclick = () => {
      if (check()) return ctx.success?.("ok");
      ctx.penalize?.();
    };
  };

  // ------------------------------
  // p6_checksum2 — keypad entry, rule stays same
  // ------------------------------
  defs.p6_checksum2 = async (ctx) => {
    ctx.showTaskUI?.("checksum2", "enter checksum: (sum of digits) mod 97" );
    const n = rint(1000, 9999);
    const sum = String(n).split("").reduce((a, d) => a + Number(d), 0);
    const ans = String(sum % 97).padStart(2, "0");
    setAnswer(ctx, ans);

    const wrap = el("div", { class: "p6-panel" });
    const q = el("div", { class: "mono p6-kv", text: `id: ${n}` });
    const out = el("div", { class: "mono p6-out", text: "__" });
    const pad = el("div", { class: "p6-pad" });
    const msg = el("div", { class: "muted", text: "" });

    let cur = "";
    const render = () => { out.textContent = (cur + "__").slice(0, 2); };
    const press = (d) => {
      if (cur.length >= 2) return;
      cur += String(d);
      render();
      if (cur.length === 2) {
        if (cur === ans) return ctx.success?.("ok");
        ctx.penalize?.();
        msg.textContent = "wrong";
      }
    };

    for (let i = 1; i <= 9; i++) pad.appendChild(el("button", { type: "button", class: "p6-padBtn", text: String(i), onclick: () => press(i) }));
    pad.appendChild(el("button", { type: "button", class: "p6-padBtn", text: "0", onclick: () => press(0) }));
    const del = el("button", { type: "button", class: "p6-padBtn alt", text: "DEL" });
    del.onclick = () => { cur = cur.slice(0, -1); msg.textContent = ""; render(); };
    const clr = el("button", { type: "button", class: "p6-padBtn alt", text: "CLR" });
    clr.onclick = () => { cur = ""; msg.textContent = ""; render(); };
    pad.append(del, clr);

    render();
    wrap.append(el("div", { class: "p6-head" }, [q, el("div", { class: "muted", text: "enter 2 digits" })]), out, pad, msg);
    ctx.taskBody.append(wrap);

    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.onclick = () => {
      if (cur === ans) return ctx.success?.("ok");
      ctx.penalize?.();
    };
  };

  // ------------------------------
  // p6_sequence — pick the next value (visual options)
  // ------------------------------
  defs.p6_sequence = async (ctx) => {
    ctx.showTaskUI?.("sequence", "choose the next value" );
    const a = rint(1, 6);
    const b = rint(2, 9);
    const seq = [a, a + b, a + 2 * b, a + 3 * b];
    const ans = a + 4 * b;
    setAnswer(ctx, String(ans));

    const wrap = el("div", { class: "p6-panel" });
    const q = el("div", { class: "mono p6-kv", text: `${seq.join("  ")}  ?` });
    const opts = new Set([ans]);
    while (opts.size < 4) opts.add(ans + rint(-6, 9));
    const btns = Array.from(opts).sort(() => Math.random() - 0.5).map((v) => {
      const b = el("button", { type: "button", class: "p6-choice", text: String(v) });
      b.onclick = () => {
        if (v === ans) return ctx.success?.("ok");
        ctx.penalize?.();
      };
      return b;
    });
    wrap.append(el("div", { class: "p6-head" }, [q, el("div", { class: "muted", text: "constant step" })]), el("div", { class: "p6-choices" }, btns));
    ctx.taskBody.append(wrap);
    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.onclick = () => ctx.penalize?.();
  };

  // ------------------------------
  // p6_matchpairs — glitch-flip cards
  // ------------------------------
  defs.p6_matchpairs = async (ctx) => {
    ctx.showTaskUI?.("match pairs", "reveal and match all pairs" );
    const vals = ["A","A","B","B","C","C","D","D"].sort(() => Math.random() - 0.5);
    const wrap = el("div", { class: "p6-panel" });
    const grid = el("div", { class: "p6-pairs" });
    const msg = el("div", { class: "muted", text: "" });
    wrap.append(el("div", { class: "p6-head" }, [el("div", { class: "mono p6-kv", text: "pair memory" }), msg]), grid);
    ctx.taskBody.append(wrap);

    let first = null;
    let matched = 0;
    vals.forEach((v, i) => {
      const card = el("button", { type: "button", class: "p6-card", html: `<span class="front">?</span><span class="back">${v}</span>` });
      card.dataset.v = v;
      card.onclick = () => {
        if (card.disabled || card.classList.contains("open")) return;
        card.classList.add("open");
        if (!first) { first = card; return; }
        const a = first;
        first = null;
        if (a.dataset.v === card.dataset.v) {
          a.disabled = card.disabled = true;
          matched += 2;
          if (matched >= vals.length) ctx.success?.("ok");
        } else {
          ctx.penalize?.();
          setTimeout(() => { a.classList.remove("open"); card.classList.remove("open"); }, 520);
        }
      };
      grid.appendChild(card);
    });

    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.onclick = () => ctx.penalize?.();
  };

  // ------------------------------
  // p6_hexpad — hex keypad with scanline feedback
  // ------------------------------
  defs.p6_hexpad = async (ctx) => {
    ctx.showTaskUI?.("hexpad", "convert DEC → HEX" );
    const n = rint(16, 420);
    const ans = n.toString(16).toUpperCase();
    setAnswer(ctx, ans);

    const wrap = el("div", { class: "p6-panel" });
    const q = el("div", { class: "mono p6-kv", text: `dec: ${n}` });
    const out = el("div", { class: "mono p6-out", text: "" });
    const pad = el("div", { class: "p6-pad hex" });
    const msg = el("div", { class: "muted", text: "" });

    let cur = "";
    const render = () => { out.textContent = cur; };
    const press = (ch) => {
      if (cur.length >= ans.length) return;
      cur += String(ch);
      render();
      if (cur.length === ans.length) {
        if (cur.toUpperCase() === ans) return ctx.success?.("ok");
        ctx.penalize?.();
        msg.textContent = "wrong";
      }
    };

    const keys = "0123456789ABCDEF".split("");
    keys.forEach((k) => pad.appendChild(el("button", { type: "button", class: "p6-padBtn", text: k, onclick: () => press(k) })));
    const del = el("button", { type: "button", class: "p6-padBtn alt", text: "DEL" });
    del.onclick = () => { cur = cur.slice(0, -1); msg.textContent = ""; render(); };
    const clr = el("button", { type: "button", class: "p6-padBtn alt", text: "CLR" });
    clr.onclick = () => { cur = ""; msg.textContent = ""; render(); };
    pad.append(del, clr);

    wrap.append(el("div", { class: "p6-head" }, [q, el("div", { class: "muted", text: `chars: ${ans.length}` })]), out, pad, msg);
    ctx.taskBody.append(wrap);

    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.onclick = () => {
      if (cur.toUpperCase() === ans) return ctx.success?.("ok");
      ctx.penalize?.();
    };
  };

  // Register
  reg(defs);
  regPool("pack6", [
    "p6_rotors",
    "p6_wordsplice",
    "p6_freqdial",
    "p6_morse",
    "p6_gridtap",
    "p6_switchboard",
    "p6_checksum2",
    "p6_sequence",
    "p6_matchpairs",
    "p6_hexpad",
  ]);
})();
