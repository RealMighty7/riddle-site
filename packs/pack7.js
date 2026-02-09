// packs/pack7.js
// Pack 7: interactive puzzles (10) — more kinetic/visual than packs 1-5.
// Requires tasks.js loaded first.

(() => {
  const reg = window.registerTasks;
  const regPool = window.registerTaskPool;
  if (typeof reg !== "function" || typeof regPool !== "function") {
    console.error("Pack 7: registerTasks/registerTaskPool missing — load tasks.js before packs/pack7.js");
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

  function setAnswer(ctx, ans) { try { ctx.setAnswer?.(String(ans ?? "")); } catch {} }

  // -------------------------------------------------
  // p7_minisudoku — 4x4 with highlights + auto-advance
  // -------------------------------------------------
  defs.p7_minisudoku = async (ctx) => {
    ctx.showTaskUI?.("minisudoku", "fill the 4×4 so each row/col contains 1–4" );
    const solution = [
      [1, 2, 3, 4],
      [3, 4, 1, 2],
      [2, 1, 4, 3],
      [4, 3, 2, 1],
    ];
    const givens = new Set();
    while (givens.size < 6) givens.add(rint(0, 15));
    setAnswer(ctx, "solution fixed (4x4)");

    const wrap = el("div", { class: "p7-panel" });
    const grid = el("div", { class: "p7-4grid" });
    const msg = el("div", { class: "muted", text: "" });
    const cells = [];

    for (let i = 0; i < 16; i++) {
      const r = Math.floor(i / 4), c = i % 4;
      const input = el("input", { class: "p7-cell mono", maxlength: "1", inputmode: "numeric" });
      if (givens.has(i)) {
        input.value = String(solution[r][c]);
        input.disabled = true;
        input.classList.add("given");
      }
      input.addEventListener("focus", () => {
        cells.forEach((x, j) => {
          const rr = Math.floor(j / 4), cc = j % 4;
          x.classList.toggle("hl", rr === r || cc === c);
        });
      });
      input.addEventListener("input", () => {
        input.value = input.value.replace(/[^1-4]/g, "").slice(0, 1);
        // auto-advance
        if (input.value && i < 15) cells[i + 1]?.focus?.();
      });
      cells.push(input);
      grid.appendChild(input);
    }

    const check = () => {
      for (let i = 0; i < 16; i++) {
        const r = Math.floor(i / 4), c = i % 4;
        if (String(cells[i].value || "").trim() !== String(solution[r][c])) return false;
      }
      return true;
    };

    wrap.append(el("div", { class: "p7-head" }, [el("div", { class: "mono", text: "4×4" }), msg]), grid);
    ctx.taskBody.append(wrap);

    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.onclick = () => {
      if (check()) return ctx.success?.("ok");
      ctx.penalize?.();
      msg.textContent = "conflict";
    };
  };

  // -------------------------------------------------
  // p7_memoryflash — sequence flash, then repeat (FIXES old sleep bug)
  // -------------------------------------------------
  defs.p7_memoryflash = async (ctx) => {
    ctx.showTaskUI?.("memoryflash", "watch the sequence, then repeat" );
    const seqLen = 5;
    const seq = Array.from({ length: seqLen }, () => rint(0, 8));
    setAnswer(ctx, seq.map((n) => n + 1).join("-"));

    const wrap = el("div", { class: "p7-panel" });
    const grid = el("div", { class: "grid3 p7-grid" });
    const msg = el("div", { class: "muted", text: "watch" });
    wrap.append(el("div", { class: "p7-head" }, [el("div", { class: "mono", text: "sequence" }), msg]), grid);
    ctx.taskBody.append(wrap);

    const btns = [];
    for (let i = 0; i < 9; i++) {
      const b = el("button", { type: "button", class: "gridCell p7-cellBtn", text: "" });
      btns.push(b);
      grid.appendChild(b);
    }

    await sleep(250);
    for (const i of seq) {
      btns[i].classList.add("hot");
      await sleep(240);
      btns[i].classList.remove("hot");
      await sleep(110);
    }
    msg.textContent = "repeat";

    let pos = 0;
    btns.forEach((b, i) => {
      b.onclick = () => {
        if (i !== seq[pos]) {
          pos = 0;
          btns.forEach((x) => x.classList.remove("on"));
          ctx.penalize?.();
          msg.textContent = "reset";
          return;
        }
        b.classList.add("on");
        pos++;
        msg.textContent = `${pos}/${seqLen}`;
        if (pos >= seqLen) ctx.success?.("ok");
      };
    });
  };

  // -------------------------------------------------
  // p7_sortstack — drag reorder into ascending order
  // -------------------------------------------------
  defs.p7_sortstack = async (ctx) => {
    ctx.showTaskUI?.("sortstack", "drag cards into ascending order" );
    const nums = Array.from({ length: 5 }, () => rint(10, 99));
    const sorted = [...nums].sort((a, b) => a - b);
    setAnswer(ctx, sorted.join("-"));

    const wrap = el("div", { class: "p7-panel" });
    const msg = el("div", { class: "muted", text: "drag to reorder" });
    const list = el("div", { class: "p7-cardList" });

    const ids = nums.map((_, i) => `p7_card_${Math.random().toString(16).slice(2)}_${i}`);
    const render = () => {
      [...list.children].forEach((c) => c.classList.remove("over"));
    };

    nums.sort(() => Math.random() - 0.5).forEach((v, i) => {
      const id = ids[i];
      const card = el("div", { class: "p7-card mono", id, draggable: "true", text: String(v) });
      card.dataset.v = String(v);
      card.addEventListener("dragstart", (e) => {
        e.dataTransfer?.setData("text/plain", id);
        e.dataTransfer && (e.dataTransfer.effectAllowed = "move");
      });
      card.addEventListener("dragover", (e) => { e.preventDefault(); card.classList.add("over"); });
      card.addEventListener("dragleave", () => card.classList.remove("over"));
      card.addEventListener("drop", (e) => {
        e.preventDefault();
        const fromId = e.dataTransfer?.getData("text/plain");
        const from = fromId ? document.getElementById(fromId) : null;
        if (!from || from === card) return;
        card.classList.remove("over");
        const children = [...list.children];
        const a = children.indexOf(from);
        const b = children.indexOf(card);
        if (a < 0 || b < 0) return;
        if (a < b) list.insertBefore(from, card.nextSibling);
        else list.insertBefore(from, card);
        render();
      });
      list.appendChild(card);
    });

    const current = () => [...list.children].map((c) => Number(c.dataset.v));
    const check = () => {
      const c = current();
      return c.every((v, i) => v === sorted[i]);
    };

    wrap.append(el("div", { class: "p7-head" }, [el("div", { class: "mono", text: "stack" }), msg]), list);
    ctx.taskBody.append(wrap);
    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.onclick = () => {
      if (check()) return ctx.success?.("ok");
      ctx.penalize?.();
    };
  };

  // -------------------------------------------------
  // p7_ciphershift — slider shift until readable word
  // -------------------------------------------------
  defs.p7_ciphershift = async (ctx) => {
    ctx.showTaskUI?.("ciphershift", "slide until it becomes readable" );
    const word = ["WORKER", "STATION", "ACCESS", "ORIGIN", "ESCAPE", "VECTOR"][Math.floor(Math.random() * 6)];
    const shift = rint(1, 25);
    const enc = (s, k) => s.replace(/[A-Z]/g, (ch) => String.fromCharCode(((ch.charCodeAt(0) - 65 + k) % 26) + 65));
    const cipher = enc(word, shift);
    setAnswer(ctx, word);

    const wrap = el("div", { class: "p7-panel" });
    const out = el("div", { class: "mono p7-big", text: cipher });
    const slider = el("input", { type: "range", min: "0", max: "25", value: "0", class: "p7-range" });
    const msg = el("div", { class: "muted", text: "shift: 0" });

    const update = () => {
      const k = Number(slider.value);
      msg.textContent = `shift: ${k}`;
      out.textContent = enc(cipher, (26 - k) % 26);
    };
    slider.addEventListener("input", update);
    update();

    wrap.append(el("div", { class: "p7-head" }, [el("div", { class: "mono", text: "caesar" }), msg]), out, slider);
    ctx.taskBody.append(wrap);

    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.onclick = () => {
      if (String(out.textContent).trim() === word) return ctx.success?.("ok");
      ctx.penalize?.();
    };
  };

  // -------------------------------------------------
  // p7_parity — click bits to match target parity
  // -------------------------------------------------
  defs.p7_parity = async (ctx) => {
    ctx.showTaskUI?.("parity", "toggle bits until the parity matches" );
    const bits = Array.from({ length: 8 }, () => rint(0, 1));
    const wantEven = Math.random() < 0.5;
    const ones = () => bits.reduce((a, b) => a + b, 0);
    setAnswer(ctx, wantEven ? "even" : "odd");

    const wrap = el("div", { class: "p7-panel" });
    const row = el("div", { class: "p7-bits" });
    const msg = el("div", { class: "muted", text: wantEven ? "target: even" : "target: odd" });
    const led = el("div", { class: "p7-led" });

    const btns = bits.map((v, i) => {
      const b = el("button", { type: "button", class: "p7-bit mono", text: String(v) });
      b.onclick = () => {
        bits[i] = bits[i] ? 0 : 1;
        b.textContent = String(bits[i]);
        render();
      };
      row.appendChild(b);
      return b;
    });

    const render = () => {
      const ok = (ones() % 2 === 0) === wantEven;
      led.classList.toggle("on", ok);
      if (ok) msg.textContent = "parity matched";
    };
    render();

    wrap.append(el("div", { class: "p7-head" }, [el("div", { class: "mono", text: "bits" }), msg]), row, led);
    ctx.taskBody.append(wrap);

    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.onclick = () => {
      const ok = (ones() % 2 === 0) === wantEven;
      if (ok) return ctx.success?.("ok");
      ctx.penalize?.();
    };
  };

  // -------------------------------------------------
  // p7_patternflip — keep concept, add stronger visuals
  // -------------------------------------------------
  defs.p7_patternflip = async (ctx) => {
    ctx.showTaskUI?.("patternflip", "flip all tiles to OFF" );
    const n = 12;
    const state = Array.from({ length: n }, () => Math.random() < 0.5);
    setAnswer(ctx, "all off");

    const wrap = el("div", { class: "p7-panel" });
    const grid = el("div", { class: "p7-flip" });
    const msg = el("div", { class: "muted", text: "each flip toggles neighbors" });

    const toggle = (i) => { state[i] = !state[i]; };
    const render = () => {
      [...grid.children].forEach((b, i) => b.classList.toggle("on", state[i]));
      if (state.every((x) => !x)) ctx.success?.("ok");
    };

    for (let i = 0; i < n; i++) {
      const b = el("button", { type: "button", class: "p7-flipTile" });
      b.onclick = () => {
        toggle(i);
        if (i > 0) toggle(i - 1);
        if (i < n - 1) toggle(i + 1);
        render();
      };
      grid.appendChild(b);
    }
    render();

    wrap.append(el("div", { class: "p7-head" }, [el("div", { class: "mono", text: "toggle" }), msg]), grid);
    ctx.taskBody.append(wrap);
    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.onclick = () => {
      if (state.every((x) => !x)) return ctx.success?.("ok");
      ctx.penalize?.();
    };
  };

  // -------------------------------------------------
  // p7_keymaze — drag through grid without hitting walls
  // -------------------------------------------------
  defs.p7_keymaze = async (ctx) => {
    ctx.showTaskUI?.("keymaze", "drag from S to E without touching walls" );
    const wrap = el("div", { class: "p7-panel" });
    const grid = el("div", { class: "grid3 p7-maze" });
    const msg = el("div", { class: "muted", text: "" });
    wrap.append(el("div", { class: "p7-head" }, [el("div", { class: "mono", text: "maze" }), msg]), grid);
    ctx.taskBody.append(wrap);

    const start = 0;
    const end = 8;
    setAnswer(ctx, "path from S to E");

    // random walls but guarantee at least one simple path (center or right)
    const walls = new Set();
    [1, 2, 5, 7].forEach((i) => { if (Math.random() < 0.55) walls.add(i); });
    walls.delete(4); // keep center open often

    const cells = [];
    for (let i = 0; i < 9; i++) {
      const b = el("div", { class: "p7-mazeCell" });
      if (i === start) b.textContent = "S";
      if (i === end) b.textContent = "E";
      if (walls.has(i)) b.classList.add("wall");
      grid.appendChild(b);
      cells.push(b);
    }

    let dragging = false;
    let ok = false;
    let cur = start;
    cells[start].classList.add("path");

    const neighbors = (i) => {
      const r = Math.floor(i / 3), c = i % 3;
      const out = [];
      if (r > 0) out.push(i - 3);
      if (r < 2) out.push(i + 3);
      if (c > 0) out.push(i - 1);
      if (c < 2) out.push(i + 1);
      return out;
    };

    const reset = () => {
      dragging = false;
      ok = false;
      cur = start;
      cells.forEach((c) => c.classList.remove("path"));
      cells[start].classList.add("path");
      msg.textContent = "reset";
    };

    grid.addEventListener("pointerdown", (e) => {
      dragging = true;
      msg.textContent = "drag";
      grid.setPointerCapture?.(e.pointerId);
    });
    grid.addEventListener("pointerup", () => { dragging = false; });
    grid.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const t = e.target;
      const idx = cells.indexOf(t);
      if (idx < 0) return;
      if (walls.has(idx)) { ctx.penalize?.(); reset(); return; }
      if (!neighbors(cur).includes(idx)) { ctx.penalize?.(); reset(); return; }
      cur = idx;
      cells[idx].classList.add("path");
      if (idx === end) { ok = true; msg.textContent = "complete"; ctx.success?.("ok"); }
    });
  };

  // -------------------------------------------------
  // p7_anagram — drag letters into order (like a quick decode)
  // -------------------------------------------------
  defs.p7_anagram = async (ctx) => {
    ctx.showTaskUI?.("anagram", "reorder the letters" );
    const words = ["WORKER", "EMERGE", "MIRROR", "VECTOR", "FILTER", "ACCESS"]; 
    const word = words[Math.floor(Math.random() * words.length)];
    const shuffled = word.split("").sort(() => Math.random() - 0.5);
    setAnswer(ctx, word);

    const wrap = el("div", { class: "p7-panel" });
    const row = el("div", { class: "p7-anagram" });
    const msg = el("div", { class: "muted", text: "drag letters" });

    const mk = (ch, i) => {
      const id = `p7_a_${Math.random().toString(16).slice(2)}_${i}`;
      const t = el("div", { class: "p7-letter mono", id, draggable: "true", text: ch });
      t.addEventListener("dragstart", (e) => e.dataTransfer?.setData("text/plain", id));
      t.addEventListener("dragover", (e) => { e.preventDefault(); t.classList.add("over"); });
      t.addEventListener("dragleave", () => t.classList.remove("over"));
      t.addEventListener("drop", (e) => {
        e.preventDefault();
        const fromId = e.dataTransfer?.getData("text/plain");
        const from = fromId ? document.getElementById(fromId) : null;
        if (!from || from === t) return;
        t.classList.remove("over");
        const kids = [...row.children];
        const a = kids.indexOf(from), b = kids.indexOf(t);
        if (a < 0 || b < 0) return;
        if (a < b) row.insertBefore(from, t.nextSibling);
        else row.insertBefore(from, t);
      });
      return t;
    };

    shuffled.forEach((ch, i) => row.appendChild(mk(ch, i)));
    const current = () => [...row.children].map((n) => n.textContent).join("");

    wrap.append(el("div", { class: "p7-head" }, [el("div", { class: "mono", text: "letters" }), msg]), row);
    ctx.taskBody.append(wrap);

    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.onclick = () => {
      if (current() === word) return ctx.success?.("ok");
      ctx.penalize?.();
    };
  };

  // -------------------------------------------------
  // p7_gridroute — draw a route by dragging through lit checkpoints
  // -------------------------------------------------
  defs.p7_gridroute = async (ctx) => {
    ctx.showTaskUI?.("gridroute", "drag through all checkpoints" );
    const checkpoints = [0, 2, 4, 6, 8].sort(() => Math.random() - 0.5).slice(0, 4);
    setAnswer(ctx, checkpoints.map((n) => n + 1).join("-"));

    const wrap = el("div", { class: "p7-panel" });
    const msg = el("div", { class: "muted", text: "" });
    const grid = el("div", { class: "grid3 p7-route" });
    wrap.append(el("div", { class: "p7-head" }, [el("div", { class: "mono", text: "route" }), msg]), grid);
    ctx.taskBody.append(wrap);

    const cells = [];
    for (let i = 0; i < 9; i++) {
      const c = el("div", { class: "p7-routeCell" });
      if (checkpoints.includes(i)) c.classList.add("checkpoint");
      grid.appendChild(c);
      cells.push(c);
    }

    let dragging = false;
    const hit = new Set();
    const update = () => {
      msg.textContent = `checkpoints: ${hit.size}/${checkpoints.length}`;
      if (hit.size >= checkpoints.length) ctx.success?.("ok");
    };
    update();

    grid.addEventListener("pointerdown", (e) => { dragging = true; grid.setPointerCapture?.(e.pointerId); });
    grid.addEventListener("pointerup", () => { dragging = false; });
    grid.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const idx = cells.indexOf(e.target);
      if (idx < 0) return;
      if (checkpoints.includes(idx)) {
        hit.add(idx);
        cells[idx].classList.add("hit");
        update();
      }
    });
  };

  // -------------------------------------------------
  // p7_timerlock — ring indicator timing
  // -------------------------------------------------
  defs.p7_timerlock = async (ctx) => {
    ctx.showTaskUI?.("timerlock", "press when the ring hits the gate" );
    const period = 1400;
    const gate = rint(0, 359);
    const tol = 18;
    setAnswer(ctx, `gate@${gate}±${tol}`);

    const wrap = el("div", { class: "p7-panel" });
    const ring = el("div", { class: "p7-ring" });
    const needle = el("div", { class: "p7-needle" });
    const gateEl = el("div", { class: "p7-gate" });
    const btn = el("button", { type: "button", class: "taskBtn", text: "PRESS" });
    const msg = el("div", { class: "muted", text: "" });
    ring.append(gateEl, needle);
    gateEl.style.transform = `rotate(${gate}deg)`;
    wrap.append(el("div", { class: "p7-head" }, [el("div", { class: "mono", text: "lock" }), msg]), ring, btn);
    ctx.taskBody.append(wrap);

    const start = performance.now();
    let running = true;
    const tick = () => {
      if (!running) return;
      const t = (performance.now() - start) % period;
      const ang = (t / period) * 360;
      needle.style.transform = `rotate(${ang}deg)`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    btn.onclick = () => {
      const t = (performance.now() - start) % period;
      const ang = (t / period) * 360;
      const dist = Math.min(Math.abs(ang - gate), 360 - Math.abs(ang - gate));
      if (dist <= tol) { running = false; return ctx.success?.("ok"); }
      ctx.penalize?.();
      msg.textContent = "miss";
    };
  };

  // Register
  reg(defs);
  regPool("pack7", [
    "p7_minisudoku",
    "p7_memoryflash",
    "p7_sortstack",
    "p7_ciphershift",
    "p7_parity",
    "p7_patternflip",
    "p7_keymaze",
    "p7_anagram",
    "p7_gridroute",
    "p7_timerlock",
  ]);
})();
