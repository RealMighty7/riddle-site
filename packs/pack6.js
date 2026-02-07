// packs/pack6.js
// Pack 6: interactive puzzles (10)
// Requires tasks.js to be loaded first.

(() => {
  const reg = window.registerTasks;
  const regPool = window.registerTaskPool;
  if (typeof reg !== "function" || typeof regPool !== "function") {
    console.error("Pack 6: registerTasks/registerTaskPool missing — load tasks.js before packs/pack6.js");
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

  defs.p6_rotors = async (ctx) => {
    ctx.showTaskUI?.("rotors", "set the rotors to match the target" );
    const target = Array.from({ length: 3 }, () => Math.floor(Math.random() * 10));
    const wrap = el("div", { class: "rotorWrap" });
    const msg = el("div", { class: "muted", text: `target: ${target.join("-")}` });
    const rotors = target.map(() => el("input", { type: "range", min: "0", max: "9", value: String(Math.floor(Math.random() * 10)) }));
    rotors.forEach(r => wrap.appendChild(r));
    ctx.taskBody.append(msg, wrap);
    const check = () => {
      const ok = rotors.every((r, i) => Number(r.value) === target[i]);
      if (ok) ctx.success?.("ok");
    };
    rotors.forEach(r => r.addEventListener("input", check));
    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.onclick = () => {
      if (rotors.every((r, i) => Number(r.value) === target[i])) return ctx.success?.("ok");
      ctx.penalize?.();
    };
    try { ctx.setAnswer?.(target.join("-")); } catch {}
  };

  defs.p6_wordsplice = async (ctx) => {
    ctx.showTaskUI?.("wordsplice", "reorder the tiles to form the word" );
    const words = ["CIRCUIT", "REFRACT", "SIGNAL", "SANDBOX", "MONITOR", "PROTOCOL"];
    const word = words[Math.floor(Math.random() * words.length)];
    const tiles = word.split("").sort(() => Math.random() - 0.5);
    const wrap = el("div", { class: "tileWrap" });
    const out = el("div", { class: "mono", text: tiles.join(" ") });
    const inp = el("input", { type: "text", placeholder: "type the correct word" });
    const msg = el("div", { class: "muted", text: "" });
    ctx.taskBody.append(out, inp, msg);
    const submit = () => {
      const v = String(inp.value || "").trim().toUpperCase();
      if (v === word) return ctx.success?.("ok");
      ctx.penalize?.();
      msg.textContent = "wrong";
    };
    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.onclick = submit;
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    try { ctx.setAnswer?.(word); } catch {}
  };

  defs.p6_freqdial = async (ctx) => {
    ctx.showTaskUI?.("freq dial", "tune to the target frequency" );
    const target = 120 + Math.floor(Math.random() * 480); // 120..599
    const tol = 6;
    const dial = el("input", { type: "range", min: "100", max: "650", value: String(100 + Math.floor(Math.random() * 550)) });
    const read = el("div", { class: "mono", text: `hz: ${dial.value}` });
    const msg = el("div", { class: "muted", text: `target: ${target} ±${tol}` });
    ctx.taskBody.append(read, dial, msg);
    dial.addEventListener("input", () => { read.textContent = `hz: ${dial.value}`; });
    ctx.taskPrimary.textContent = "lock";
    ctx.taskPrimary.onclick = () => {
      const v = Number(dial.value);
      if (Math.abs(v - target) <= tol) return ctx.success?.("locked");
      ctx.penalize?.();
    };
    try { ctx.setAnswer?.(String(target)); } catch {}
  };

  defs.p6_morse = async (ctx) => {
    ctx.showTaskUI?.("morse", "decode the signal" );
    const map = { A: ".-", S: "...", O: "---", T: "-", N: "-." };
    const words = ["AS", "SON", "TO", "SAT", "NOT", "SO"];
    const w = words[Math.floor(Math.random() * words.length)];
    const code = w.split("").map(ch => map[ch]).join(" ");
    const codeEl = el("div", { class: "mono", text: code });
    const inp = el("input", { type: "text", placeholder: "letters" });
    const msg = el("div", { class: "muted", text: "" });
    ctx.taskBody.append(codeEl, inp, msg);
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

  defs.p6_gridtap = async (ctx) => {
    ctx.showTaskUI?.("grid tap", "tap the lit cells" );
    const need = new Set();
    while (need.size < 4) need.add(Math.floor(Math.random() * 9));
    const wrap = el("div", { class: "grid3" });
    const msg = el("div", { class: "muted", text: "tap all highlighted" });
    const hit = new Set();
    for (let i = 0; i < 9; i++) {
      const b = el("button", { type: "button", class: "gridCell", text: "" });
      if (need.has(i)) b.classList.add("hot");
      b.onclick = () => {
        b.classList.toggle("on");
        if (b.classList.contains("on")) hit.add(i); else hit.delete(i);
        if (hit.size === need.size && [...hit].every(x => need.has(x))) ctx.success?.("ok");
      };
      wrap.appendChild(b);
    }
    ctx.taskBody.append(msg, wrap);
    try { ctx.setAnswer?.([...need].map(n => n + 1).join(",")); } catch {}
  };

  defs.p6_switchboard = async (ctx) => {
    ctx.showTaskUI?.("switchboard", "match the pattern" );
    const n = 6;
    const target = Array.from({ length: n }, () => (Math.random() < 0.5 ? 0 : 1));
    const wrap = el("div", { class: "switchRow" });
    const state = Array.from({ length: n }, () => 0);
    const msg = el("div", { class: "muted", text: `target: ${target.map(v => (v ? "1" : "0")).join("")}` });
    for (let i = 0; i < n; i++) {
      const b = el("button", { type: "button", class: "switchBtn", text: "0" });
      b.onclick = () => {
        state[i] = state[i] ? 0 : 1;
        b.textContent = String(state[i]);
        b.classList.toggle("on", !!state[i]);
        if (state.every((v, j) => v === target[j])) ctx.success?.("ok");
      };
      wrap.appendChild(b);
    }
    ctx.taskBody.append(msg, wrap);
    try { ctx.setAnswer?.(target.join("")); } catch {}
  };

  defs.p6_checksum2 = async (ctx) => {
    ctx.showTaskUI?.("checksum2", "enter the 2-digit checksum" );
    const n = 1000 + Math.floor(Math.random() * 9000);
    const sum = String(n).split("").reduce((a, d) => a + Number(d), 0);
    const ans = String(sum % 97).padStart(2, "0");
    const q = el("div", { class: "mono", text: `id: ${n}` });
    const inp = el("input", { type: "text", placeholder: "00" });
    inp.maxLength = 2;
    const msg = el("div", { class: "muted", text: "rule: (sum of digits) mod 97" });
    ctx.taskBody.append(q, inp, msg);
    const submit = () => {
      const v = String(inp.value || "").trim();
      if (v === ans) return ctx.success?.("ok");
      ctx.penalize?.();
    };
    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.onclick = submit;
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    try { ctx.setAnswer?.(ans); } catch {}
  };

  defs.p6_sequence = async (ctx) => {
    ctx.showTaskUI?.("sequence", "continue the sequence" );
    const a = 1 + Math.floor(Math.random() * 4);
    const b = 2 + Math.floor(Math.random() * 6);
    const seq = [a, a + b, a + 2 * b, a + 3 * b];
    const ans = String(a + 4 * b);
    const q = el("div", { class: "mono", text: seq.join("  ") + "  ?" });
    const inp = el("input", { type: "text", placeholder: "next" });
    const msg = el("div", { class: "muted", text: "" });
    ctx.taskBody.append(q, inp, msg);
    const submit = () => {
      if (String(inp.value || "").trim() === ans) return ctx.success?.("ok");
      ctx.penalize?.();
      msg.textContent = "wrong";
    };
    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.onclick = submit;
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    try { ctx.setAnswer?.(ans); } catch {}
  };

  defs.p6_matchpairs = async (ctx) => {
    ctx.showTaskUI?.("match pairs", "reveal and match all pairs" );
    const vals = ["A","A","B","B","C","C","D","D"].sort(() => Math.random() - 0.5);
    const wrap = el("div", { class: "pairGrid" });
    let first = null;
    let matched = 0;
    vals.forEach((v, i) => {
      const b = el("button", { type: "button", class: "pairCard", text: "?" });
      b.onclick = () => {
        if (b.disabled || b.classList.contains("open")) return;
        b.classList.add("open");
        b.textContent = v;
        if (!first) { first = b; return; }
        const a = first;
        first = null;
        if (a.textContent === b.textContent) {
          a.disabled = b.disabled = true;
          matched += 2;
          if (matched >= vals.length) ctx.success?.("ok");
        } else {
          setTimeout(() => {
            a.classList.remove("open");
            b.classList.remove("open");
            a.textContent = "?";
            b.textContent = "?";
          }, 450);
          ctx.penalize?.();
        }
      };
      wrap.appendChild(b);
    });
    ctx.taskBody.append(wrap);
  };

  defs.p6_hexpad = async (ctx) => {
    ctx.showTaskUI?.("hexpad", "enter the hex for the displayed number" );
    const n = 16 + Math.floor(Math.random() * 240);
    const ans = n.toString(16).toUpperCase();
    const q = el("div", { class: "mono", text: `dec: ${n}` });
    const inp = el("input", { type: "text", placeholder: "HEX" });
    const msg = el("div", { class: "muted", text: "" });
    ctx.taskBody.append(q, inp, msg);
    const submit = () => {
      const v = String(inp.value || "").trim().toUpperCase();
      if (v === ans) return ctx.success?.("ok");
      ctx.penalize?.();
      msg.textContent = "wrong";
    };
    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.onclick = submit;
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    try { ctx.setAnswer?.(ans); } catch {}
  };

  /* =========================
     PACK 7 (10 interactive puzzles)
  ========================= */


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
