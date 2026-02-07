// packs/pack7.js
// Pack 7: interactive puzzles (10)
// Requires tasks.js to be loaded first.

(() => {
  const reg = window.registerTasks;
  const regPool = window.registerTaskPool;
  if (typeof reg !== "function" || typeof regPool !== "function") {
    console.error("Pack 7: registerTasks/registerTaskPool missing — load tasks.js before packs/pack7.js");
    return;
  }

  const defs = {};

  const el = (tag, attrs = {}, children = []) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k === "html") n.innerHTML = v;
      else n.setAttribute(k, String(v));
    }
    for (const c of (children || [])) n.appendChild(c);
    return n;
  };

defs.p7_minisudoku = async (ctx) => {
  ctx.showTaskUI?.("minisudoku", "fill the blanks (digits 1-4)" );
  // 2x2 blocks in 4x4
  const solution = [
    [1,2,3,4],
    [3,4,1,2],
    [2,1,4,3],
    [4,3,2,1],
  ];
  const blanks = new Set();
  while (blanks.size < 6) blanks.add(Math.floor(Math.random() * 16));
  const grid = el("div", { class: "sudoku4" });
  const inputs = [];
  for (let i = 0; i < 16; i++) {
    const r = Math.floor(i / 4), c = i % 4;
    if (!blanks.has(i)) {
      const d = el("div", { class: "sudokuCell fixed", text: String(solution[r][c]) });
      grid.appendChild(d);
    } else {
      const inp = el("input", { class: "sudokuCell", type: "text" });
      inp.maxLength = 1;
      inputs.push({ inp, r, c });
      grid.appendChild(inp);
    }
  }
  ctx.taskBody.append(grid);
  const check = () => {
    const ok = inputs.every(({ inp, r, c }) => String(inp.value || "").trim() === String(solution[r][c]));
    if (ok) ctx.success?.("ok");
  };
  inputs.forEach(({ inp }) => inp.addEventListener("input", check));
  ctx.taskPrimary.textContent = "verify";
  ctx.taskPrimary.onclick = () => {
    if (inputs.every(({ inp, r, c }) => String(inp.value || "").trim() === String(solution[r][c]))) return ctx.success?.("ok");
    ctx.penalize?.();
  };
  try { ctx.setAnswer?.("4x4 fixed"); } catch {}
};

defs.p7_memoryflash = async (ctx) => {
  ctx.showTaskUI?.("memoryflash", "repeat the flash pattern" );
  const seq = Array.from({ length: 4 }, () => Math.floor(Math.random() * 4));
  const wrap = el("div", { class: "flashRow" });
  const btns = Array.from({ length: 4 }, (_, i) => el("button", { type: "button", class: "flashBtn", text: String(i + 1) }));
  btns.forEach(b => wrap.appendChild(b));
  const msg = el("div", { class: "muted", text: "watch…" });
  ctx.taskBody.append(msg, wrap);
  let idx = 0;
  const flash = async () => {
    for (const i of seq) {
      btns[i].classList.add("on");
      await sleep(240);
      btns[i].classList.remove("on");
      await sleep(140);
    }
    msg.textContent = "your turn";
  };
  await flash();
  btns.forEach((b, i) => {
    b.onclick = () => {
      if (seq[idx] !== i) {
        idx = 0;
        ctx.penalize?.();
        msg.textContent = "reset";
        return;
      }
      idx++;
      if (idx >= seq.length) ctx.success?.("ok");
    };
  });
  try { ctx.setAnswer?.(seq.map(n => n + 1).join("-")); } catch {}
};

defs.p7_sortstack = async (ctx) => {
  ctx.showTaskUI?.("sortstack", "type the numbers in ascending order" );
  const nums = Array.from({ length: 5 }, () => 10 + Math.floor(Math.random() * 90));
  const ans = nums.slice().sort((a, b) => a - b).join(" ");
  const q = el("div", { class: "mono", text: nums.join(" ") });
  const inp = el("input", { type: "text", placeholder: "sorted" });
  const msg = el("div", { class: "muted", text: "" });
  ctx.taskBody.append(q, inp, msg);
  const submit = () => {
    const v = String(inp.value || "").trim().replace(/\s+/g, " ");
    if (v === ans) return ctx.success?.("ok");
    ctx.penalize?.();
    msg.textContent = "wrong";
  };
  ctx.taskPrimary.textContent = "verify";
  ctx.taskPrimary.onclick = submit;
  inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
  try { ctx.setAnswer?.(ans); } catch {}
};

defs.p7_ciphershift = async (ctx) => {
  ctx.showTaskUI?.("ciphershift", "decode the Caesar shift" );
  const words = ["ESCAPE", "TRUST", "SIGNAL", "VECTOR", "WINDOW"];
  const plain = words[Math.floor(Math.random() * words.length)];
  const shift = 1 + Math.floor(Math.random() * 5);
  const enc = plain.replace(/[A-Z]/g, (ch) => String.fromCharCode(((ch.charCodeAt(0) - 65 + shift) % 26) + 65));
  const q = el("div", { class: "mono", text: `shift: +${shift}  msg: ${enc}` });
  const inp = el("input", { type: "text", placeholder: "decoded" });
  const msg = el("div", { class: "muted", text: "" });
  ctx.taskBody.append(q, inp, msg);
  const submit = () => {
    const v = String(inp.value || "").trim().toUpperCase();
    if (v === plain) return ctx.success?.("ok");
    ctx.penalize?.();
    msg.textContent = "wrong";
  };
  ctx.taskPrimary.textContent = "verify";
  ctx.taskPrimary.onclick = submit;
  inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
  try { ctx.setAnswer?.(plain); } catch {}
};

defs.p7_parity = async (ctx) => {
  ctx.showTaskUI?.("parity", "choose the even-parity line" );
  const lines = Array.from({ length: 4 }, () => Array.from({ length: 7 }, () => (Math.random() < 0.5 ? 0 : 1)));
  const parity = (arr) => arr.reduce((a, b) => a + b, 0) % 2;
  let correct = 0;
  for (let i = 0; i < 4; i++) {
    if (parity(lines[i]) === 0) { correct = i; break; }
  }
  const wrap = el("div", { class: "parityList" });
  const msg = el("div", { class: "muted", text: "even parity = even number of 1s" });
  ctx.taskBody.append(msg, wrap);
  lines.forEach((arr, i) => {
    const b = el("button", { type: "button", class: "parityBtn", text: arr.join("") });
    b.onclick = () => {
      if (i === correct) return ctx.success?.("ok");
      ctx.penalize?.();
    };
    wrap.appendChild(b);
  });
  try { ctx.setAnswer?.(`line:${correct + 1}`); } catch {}
};

defs.p7_patternflip = async (ctx) => {
  ctx.showTaskUI?.("patternflip", "toggle until the board is all on" );
  const wrap = el("div", { class: "grid3" });
  const st = Array.from({ length: 9 }, () => (Math.random() < 0.5 ? 0 : 1));
  const btns = [];
  const toggle = (i) => {
    const coords = [i, i - 1, i + 1, i - 3, i + 3].filter(j => j >= 0 && j < 9);
    coords.forEach(j => st[j] = st[j] ? 0 : 1);
    render();
    if (st.every(v => v === 1)) ctx.success?.("ok");
  };
  const render = () => {
    btns.forEach((b, i) => {
      b.classList.toggle("on", !!st[i]);
    });
  };
  for (let i = 0; i < 9; i++) {
    const b = el("button", { type: "button", class: "gridCell", text: "" });
    b.onclick = () => toggle(i);
    btns.push(b);
    wrap.appendChild(b);
  }
  ctx.taskBody.append(wrap);
  render();
};

defs.p7_keymaze = async (ctx) => {
  ctx.showTaskUI?.("keymaze", "use arrow keys to reach the exit" );
  const size = 5;
  let x = 0, y = 0;
  const exit = { x: 4, y: 4 };
  const grid = el("div", { class: "maze" });
  const cells = [];
  for (let i = 0; i < size * size; i++) {
    const c = el("div", { class: "mazeCell" });
    cells.push(c);
    grid.appendChild(c);
  }
  const msg = el("div", { class: "muted", text: "" });
  ctx.taskBody.append(msg, grid);
  const idx = (x, y) => y * size + x;
  const render = () => {
    cells.forEach(c => c.className = "mazeCell");
    cells[idx(exit.x, exit.y)].classList.add("exit");
    cells[idx(x, y)].classList.add("you");
  };
  render();
  const onKey = (e) => {
    const k = e.key;
    if (!["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(k)) return;
    e.preventDefault();
    if (k === "ArrowUp") y = Math.max(0, y - 1);
    if (k === "ArrowDown") y = Math.min(size - 1, y + 1);
    if (k === "ArrowLeft") x = Math.max(0, x - 1);
    if (k === "ArrowRight") x = Math.min(size - 1, x + 1);
    render();
    if (x === exit.x && y === exit.y) {
      window.removeEventListener("keydown", onKey, true);
      ctx.success?.("ok");
    }
  };
  window.addEventListener("keydown", onKey, true);
};

defs.p7_anagram = async (ctx) => {
  ctx.showTaskUI?.("anagram", "unscramble" );
  const words = ["WORKER","SECURITY","SYSTEM","GLASS","STATIC"];
  const w = words[Math.floor(Math.random() * words.length)];
  const scr = w.split("").sort(() => Math.random() - 0.5).join("");
  const q = el("div", { class: "mono", text: scr });
  const inp = el("input", { type: "text", placeholder: "word" });
  const msg = el("div", { class: "muted", text: "" });
  ctx.taskBody.append(q, inp, msg);
  const submit = () => {
    const v = String(inp.value || "").trim().toUpperCase();
    if (v === w) return ctx.success?.("ok");
    ctx.penalize?.();
    msg.textContent = "wrong";
  };
  ctx.taskPrimary.textContent = "verify";
  ctx.taskPrimary.onclick = submit;
  inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
  try { ctx.setAnswer?.(w); } catch {}
};

defs.p7_gridroute = async (ctx) => {
  ctx.showTaskUI?.("gridroute", "click a path from S to E" );
  const msg = el("div", { class: "muted", text: "S = start, E = exit. click a connected path." });
  const wrap = el("div", { class: "grid3" });
  const start = 0;
  const end = 8;
  const path = new Set([start]);
  const btns = [];
  const neighbors = (i) => {
    const r = Math.floor(i / 3), c = i % 3;
    const out = [];
    if (r > 0) out.push(i - 3);
    if (r < 2) out.push(i + 3);
    if (c > 0) out.push(i - 1);
    if (c < 2) out.push(i + 1);
    return out;
  };
  const render = () => {
    btns.forEach((b, i) => {
      b.classList.toggle("on", path.has(i));
      b.textContent = i === start ? "S" : i === end ? "E" : "";
    });
  };
  for (let i = 0; i < 9; i++) {
    const b = el("button", { type: "button", class: "gridCell", text: "" });
    b.onclick = () => {
      if (i === start) return;
      const ok = [...path].some(p => neighbors(p).includes(i));
      if (!ok) { ctx.penalize?.(); return; }
      path.add(i);
      render();
      if (path.has(end)) ctx.success?.("ok");
    };
    btns.push(b);
    wrap.appendChild(b);
  }
  ctx.taskBody.append(msg, wrap);
  render();
};

defs.p7_timerlock = async (ctx) => {
  ctx.showTaskUI?.("timerlock", "wait for the correct beat then press" );
  const windowMs = 260;
  const period = 1200;
  const start = performance.now();
  const msg = el("div", { class: "muted", text: "press when the indicator is ON" });
  const ind = el("div", { class: "lockIndicator" });
  const btn = el("button", { type: "button", class: "taskBtn", text: "PRESS" });
  ctx.taskBody.append(msg, ind, btn);
  const tick = () => {
    const t = (performance.now() - start) % period;
    ind.classList.toggle("on", t < windowMs);
    if (!ctx.__done__) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  btn.onclick = () => {
    const t = (performance.now() - start) % period;
    if (t < windowMs) return ctx.success?.("ok");
    ctx.penalize?.();
  };
};

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
