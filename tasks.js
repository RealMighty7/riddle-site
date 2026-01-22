// tasks.js

window.TASKS = (() => {
  function el(tag, props = {}, children = []) {
    const n = document.createElement(tag);
    Object.assign(n, props);
    for (const c of children) n.appendChild(c);
    return n;
  }

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  const rand = (a,b) => a + Math.random()*(b-a);

  async function anchors(ctx, args = {}) {
    const base = args.base ?? 5;
    const count = base + (ctx.difficultyBoost?.() ?? 0);

    ctx.showTaskUI("RESTART // ANCHOR SYNC", `Stabilize boundary. Locate and click ${count} anchors.`);
    let remaining = count;

    // layer ABOVE sim
    const layer = document.createElement("div");
    layer.className = "anchor-layer";
    document.body.appendChild(layer);

    const anchors = [];
    const spawn = () => {
      const a = document.createElement("div");
      a.className = "anchor";
      a.style.left = `${rand(8, 92)}vw`;
      a.style.top  = `${rand(10, 86)}vh`;

      a.addEventListener("click", () => {
        remaining--;
        a.remove();
        if (remaining <= 0) {
          cleanup();
          ctx.taskPrimary.disabled = false;
        }
      });

      layer.appendChild(a);
      anchors.push(a);
    };

    const cleanup = () => {
      for (const x of anchors) x.remove();
      layer.remove();
    };

    for (let i = 0; i < count; i++) spawn();

    ctx.taskBody.innerHTML = "";
    const pill = el("div", { className: "pill" }, [
      document.createTextNode("Anchors remaining: "),
      el("b", { id: "remain", textContent: String(remaining) })
    ]);
    ctx.taskBody.appendChild(pill);

    const remainEl = pill.querySelector("#remain");
    const tick = setInterval(() => {
      if (!remainEl || !remainEl.isConnected) { clearInterval(tick); return; }
      remainEl.textContent = String(remaining);
      if (remaining <= 0) clearInterval(tick);
    }, 120);

    ctx.taskPrimary.textContent = "continue";
    ctx.taskPrimary.disabled = true;

    await new Promise(resolve => {
      ctx.taskPrimary.onclick = () => { cleanup(); resolve(); };
    });
  }

  async function reorder(ctx, args = {}) {
    const items = Array.isArray(args.items) ? args.items.slice() : [];
    const correct = Array.isArray(args.correct) ? args.correct.slice() : [];

    ctx.showTaskUI("RESTART // LOG RECONSTRUCTION", "Reorder fragments to rebuild the event timeline.");
    const state = items.slice();

    const render = () => {
      ctx.taskBody.innerHTML = `<div style="opacity:.85;margin-bottom:8px">Click two items to swap them.</div>`;
      const wrap = document.createElement("div");
      wrap.style.display = "flex";
      wrap.style.flexWrap = "wrap";
      wrap.style.gap = "10px";

      let first = null;

      state.forEach((txt, idx) => {
        const pill = document.createElement("span");
        pill.className = "pill";
        pill.textContent = txt;
        pill.style.cursor = "pointer";

        pill.onclick = () => {
          if (first === null) {
            first = idx;
            pill.style.outline = "2px solid rgba(120,180,255,0.55)";
          } else {
            const tmp = state[first];
            state[first] = state[idx];
            state[idx] = tmp;
            render();
          }
        };

        wrap.appendChild(pill);
      });

      ctx.taskBody.appendChild(wrap);
      const ok = state.join("|") === correct.join("|");
      ctx.taskPrimary.disabled = !ok;
    };

    render();

    ctx.taskPrimary.textContent = "confirm order";
    ctx.taskPrimary.disabled = true;

    await new Promise(resolve => { ctx.taskPrimary.onclick = () => resolve(); });
  }

  async function checksum(ctx, args = {}) {
    const phrase = String(args.phrase || "").trim();

    ctx.showTaskUI("RESTART // CHECKSUM", "Enter the checksum phrase exactly to verify memory integrity.");

    ctx.taskBody.innerHTML = `
      <div style="opacity:.85;margin-bottom:8px">Checksum required:</div>
      <div class="pill" style="opacity:.9">Format: WORDWORD-WORD</div>
      <div style="margin-top:10px">
        <input id="chk" placeholder="enter checksum..." style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.18);background:rgba(0,0,0,0.25);color:#e5e7eb;">
      </div>
      <div id="msg" style="margin-top:8px;opacity:.85"></div>
    `;

    const inp = ctx.taskBody.querySelector("#chk");
    const msg = ctx.taskBody.querySelector("#msg");

    const validate = () => {
      const v = (inp.value || "").trim();
      const ok = v.toLowerCase() === phrase.toLowerCase();
      ctx.taskPrimary.disabled = !ok;
      msg.textContent = ok ? "checksum accepted." : "";
    };

    inp.addEventListener("input", validate);

    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.disabled = true;

    await new Promise(resolve => { ctx.taskPrimary.onclick = () => resolve(); });
  }

  async function hold(ctx, args = {}) {
    const baseMs = Number(args.baseMs ?? 3000);
    const ms = baseMs + (ctx.difficultyBoost?.() ?? 0) * 550;

    ctx.showTaskUI("RESTART // STABILIZE", "Hold to stabilize the boundary. Releasing resets the cycle.");

    ctx.taskBody.innerHTML = `
      <div style="opacity:.85;margin-bottom:10px">Hold the button until the bar completes.</div>
      <div style="height:10px;border-radius:999px;border:1px solid rgba(255,255,255,0.18);overflow:hidden;background:rgba(0,0,0,0.25)">
        <div id="bar" style="height:100%;width:0%"></div>
      </div>
      <div style="margin-top:12px">
        <button id="hold" class="sim-btn">hold</button>
      </div>
      <div id="hint" style="margin-top:8px;opacity:.8"></div>
    `;

    const holdBtn = ctx.taskBody.querySelector("#hold");
    const bar = ctx.taskBody.querySelector("#bar");
    const hint = ctx.taskBody.querySelector("#hint");

    let start = null;
    let raf = null;
    let holdingNow = false;

    const step = (ts) => {
      if (!holdingNow) return;
      if (start === null) start = ts;
      const elapsed = ts - start;
      const pct = clamp(elapsed / ms, 0, 1);

      bar.style.width = `${(pct * 100).toFixed(1)}%`;
      bar.style.background = "rgba(120,180,255,0.45)";

      if (pct >= 1) {
        holdingNow = false;
        hint.textContent = "stabilized.";
        ctx.taskPrimary.disabled = false;
        cancelAnimationFrame(raf);
        return;
      }
      raf = requestAnimationFrame(step);
    };

    const reset = () => {
      start = null;
      bar.style.width = "0%";
      hint.textContent = "holding interrupted.";
      ctx.taskPrimary.disabled = true;
    };

    holdBtn.addEventListener("mousedown", () => { holdingNow = true; hint.textContent = ""; raf = requestAnimationFrame(step); });
    window.addEventListener("mouseup", () => { if (holdingNow) { holdingNow = false; reset(); } });

    holdBtn.addEventListener("touchstart", (e) => { e.preventDefault(); holdingNow = true; hint.textContent = ""; raf = requestAnimationFrame(step); }, { passive: false });
    window.addEventListener("touchend", () => { if (holdingNow) { holdingNow = false; reset(); } });

    ctx.taskPrimary.textContent = "continue";
    ctx.taskPrimary.disabled = true;

    await new Promise(resolve => { ctx.taskPrimary.onclick = () => resolve(); });
  }

  async function pattern(ctx, args = {}) {
    const base = Number(args.base ?? 5);
    const count = base + (ctx.difficultyBoost?.() ?? 0);

    ctx.showTaskUI("RESTART // PATTERN LOCK", "Match the pattern fragments in the correct order.");

    const symbols = ["▲","■","●","◆","✚","✖","◈"];
    const sequence = Array.from({ length: count }, () => symbols[Math.floor(Math.random() * symbols.length)]);
    let input = [];

    ctx.taskBody.innerHTML = `
      <div style="opacity:.85;margin-bottom:8px">Memorize this sequence:</div>
      <div id="seq" style="font-size:22px;letter-spacing:.25em;margin-bottom:10px">${sequence.join(" ")}</div>
      <div style="opacity:.85;margin:10px 0 8px">Now enter it:</div>
      <div id="buttons" style="display:flex;flex-wrap:wrap;gap:10px"></div>
      <div id="in" style="margin-top:10px;opacity:.9"></div>
      <div id="msg" style="margin-top:8px;opacity:.85"></div>
    `;

    const seqEl = ctx.taskBody.querySelector("#seq");
    const btns = ctx.taskBody.querySelector("#buttons");
    const inEl = ctx.taskBody.querySelector("#in");
    const msg = ctx.taskBody.querySelector("#msg");

    // Always give 10 seconds to memorize (per your request)
    const showMs = 10000;
    setTimeout(() => {
      seqEl.textContent = Array.from({ length: sequence.length }, () => "—").join(" ");
      seqEl.style.opacity = "0.6";
    }, showMs);


    const pool = symbols.slice(0, 5 + clamp(ctx.difficultyBoost?.() ?? 0, 0, 2));
    pool.forEach(s => {
      const b = document.createElement("button");
      b.className = "sim-btn";
      b.textContent = s;
      b.style.minWidth = "44px";
      b.onclick = () => {
        if (input.length >= sequence.length) return;
        input.push(s);
        inEl.textContent = input.join(" ");
        if (input.length === sequence.length) {
          const ok = input.join("|") === sequence.join("|");
          msg.textContent = ok ? "pattern accepted." : "pattern rejected.";
          ctx.taskPrimary.disabled = !ok;
        }
      };
      btns.appendChild(b);
    });

    const resetBtn = document.createElement("button");
    resetBtn.className = "sim-btn";
    resetBtn.textContent = "reset";
    resetBtn.onclick = () => { input = []; inEl.textContent = ""; msg.textContent = ""; ctx.taskPrimary.disabled = true; };
    btns.appendChild(resetBtn);

    ctx.taskPrimary.textContent = "continue";
    ctx.taskPrimary.disabled = true;

    await new Promise(resolve => { ctx.taskPrimary.onclick = () => resolve(); });
  }

  async function mismatch(ctx, args = {}) {
    const base = Number(args.base ?? 7);
    const count = base + (ctx.difficultyBoost?.() ?? 0) + 2;

    ctx.showTaskUI("RESTART // MISMATCH SCAN", "Find the corrupted fragment. Only one does not match.");

    const shapes = ["◻","◼","◯","⬡","△","◇","○","□","◊"];
    const good = shapes[Math.floor(Math.random() * shapes.length)];
    const bad = shapes.filter(x => x !== good)[Math.floor(Math.random() * (shapes.length - 1))];

    const badIndex = Math.floor(Math.random() * count);

    ctx.taskBody.innerHTML = `<div style="opacity:.85;margin-bottom:10px">Click the one that does not match.</div>`;
    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.flexWrap = "wrap";
    wrap.style.gap = "10px";

    for (let i = 0; i < count; i++) {
      const b = document.createElement("button");
      b.className = "sim-btn";
      b.textContent = (i === badIndex) ? bad : good;
      b.style.minWidth = "46px";
      b.onclick = () => {
        if (i === badIndex) {
          b.textContent = "✓";
          ctx.taskPrimary.disabled = false;
        } else {
          b.textContent = "✖";
          if ((ctx.difficultyBoost?.() ?? 0) >= 3) {
            ctx.doReset?.("TOO ERRATIC", "Your behavior destabilized the reboot window.\n\nRestart required.");
          }
        }
      };
      wrap.appendChild(b);
    }

    ctx.taskBody.appendChild(wrap);

    ctx.taskPrimary.textContent = "continue";
    ctx.taskPrimary.disabled = true;

    await new Promise(resolve => { ctx.taskPrimary.onclick = () => resolve(); });
  }

  // ---------- NEW TASKS (for 10 total) ----------

  async function trace(ctx, args = {}) {
    const base = Number(args.base ?? 6);
    const count = base + (ctx.difficultyBoost?.() ?? 0);

    ctx.showTaskUI("RESTART // TRACE NODES", `Tag ${count} moving trace nodes.`);
    ctx.taskPrimary.textContent = "continue";
    ctx.taskPrimary.disabled = true;

    let remaining = count;

    const layer = document.createElement("div");
    layer.className = "anchor-layer";
    document.body.appendChild(layer);

    const nodes = [];
    const spawn = () => {
      const n = document.createElement("div");
      n.className = "anchor";
      n.style.width = "18px";
      n.style.height = "18px";
      n.style.left = `${rand(10, 90)}vw`;
      n.style.top  = `${rand(12, 84)}vh`;
      layer.appendChild(n);

      let vx = rand(-0.08, 0.08);
      let vy = rand(-0.06, 0.06);

      const tick = () => {
        const r = n.getBoundingClientRect();
        let x = r.left + vx * 16;
        let y = r.top + vy * 16;
        if (x < 8 || x > window.innerWidth - 26) vx *= -1;
        if (y < 8 || y > window.innerHeight - 26) vy *= -1;
        n.style.left = `${x}px`;
        n.style.top  = `${y}px`;
      };

      const iv = setInterval(tick, 16);
      n.addEventListener("click", () => {
        clearInterval(iv);
        n.remove();
        remaining--;
        if (remaining <= 0) {
          cleanup();
          ctx.taskPrimary.disabled = false;
        }
      });

      nodes.push({ n, iv });
    };

    const cleanup = () => {
      for (const k of nodes) { clearInterval(k.iv); k.n.remove(); }
      layer.remove();
    };

    for (let i = 0; i < count; i++) spawn();

    ctx.taskBody.innerHTML = `<div class="pill">Remaining: <b id="r">${remaining}</b></div>`;
    const rEl = ctx.taskBody.querySelector("#r");
    const uiTick = setInterval(() => {
      if (!rEl?.isConnected) { clearInterval(uiTick); return; }
      rEl.textContent = String(remaining);
      if (remaining <= 0) clearInterval(uiTick);
    }, 80);

    await new Promise(resolve => {
      ctx.taskPrimary.onclick = () => { cleanup(); resolve(); };
    });
  }

  async function scrub(ctx, args = {}) {
    const base = Number(args.base ?? 5);
    const switches = clamp(base + (ctx.difficultyBoost?.() ?? 0), 4, 8);

    ctx.showTaskUI("RESTART // SCRUB FLAGS", "Set the switches to match the required states.");

    const required = Array.from({ length: switches }, () => Math.random() < 0.5);
    const state = Array.from({ length: switches }, () => Math.random() < 0.5);

    const render = () => {
      ctx.taskBody.innerHTML = `
        <div style="opacity:.85;margin-bottom:8px">Required:</div>
        <div class="pill" style="opacity:.9">${required.map(x => x ? "ON" : "OFF").join(" · ")}</div>
        <div style="opacity:.85;margin:12px 0 8px">Your switches (click to toggle):</div>
        <div id="sw" style="display:flex;flex-wrap:wrap;gap:10px"></div>
        <div id="msg" style="margin-top:10px;opacity:.85"></div>
      `;

      const sw = ctx.taskBody.querySelector("#sw");
      const msg = ctx.taskBody.querySelector("#msg");

      state.forEach((v, i) => {
        const b = document.createElement("button");
        b.className = "sim-btn";
        b.textContent = v ? `ON ${i+1}` : `OFF ${i+1}`;
        b.onclick = () => { state[i] = !state[i]; render(); };
        sw.appendChild(b);
      });

      const ok = state.every((v,i) => v === required[i]);
      ctx.taskPrimary.disabled = !ok;
      msg.textContent = ok ? "flags clean." : "";
    };

    ctx.taskPrimary.textContent = "confirm";
    ctx.taskPrimary.disabled = true;

    render();

    await new Promise(resolve => { ctx.taskPrimary.onclick = () => resolve(); });
  }

  async function cipher(ctx, args = {}) {
    const base = Number(args.base ?? 7);
    const n = clamp(base + (ctx.difficultyBoost?.() ?? 0), 6, 12);

    ctx.showTaskUI("RESTART // CIPHER ECHO", "Type the phrase exactly as it appears. It will distort quickly.");

    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const phrase = Array.from({ length: n }, () => chars[Math.floor(Math.random()*chars.length)]).join("");

    ctx.taskBody.innerHTML = `
      <div style="opacity:.85;margin-bottom:8px">Memorize:</div>
      <div id="ph" style="font-size:22px;letter-spacing:.22em" class="pill">${phrase}</div>
      <div style="opacity:.85;margin:12px 0 8px">Type it:</div>
      <input id="in" style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.18);background:rgba(0,0,0,0.25);color:#e5e7eb;">
      <div id="msg" style="margin-top:10px;opacity:.85"></div>
    `;

    const ph = ctx.taskBody.querySelector("#ph");
    const inp = ctx.taskBody.querySelector("#in");
    const msg = ctx.taskBody.querySelector("#msg");

    // distort quickly
    const hideMs = clamp(1200 - (ctx.difficultyBoost?.() ?? 0) * 140, 650, 1300);
    setTimeout(() => {
      ph.textContent = phrase.split("").map(() => (Math.random()<0.5?"#":"—")).join("");
      ph.style.opacity = "0.6";
    }, hideMs);

    const validate = () => {
      const ok = (inp.value || "").trim().toUpperCase() === phrase;
      ctx.taskPrimary.disabled = !ok;
      msg.textContent = ok ? "echo accepted." : "";
    };

    inp.addEventListener("input", validate);

    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.disabled = true;

    await new Promise(resolve => { ctx.taskPrimary.onclick = () => resolve(); });
  }

  async function focus(ctx, args = {}) {
    const baseMs = Number(args.baseMs ?? 1800);
    const ms = baseMs + (ctx.difficultyBoost?.() ?? 0) * 450;

    ctx.showTaskUI("RESTART // FOCUS LOCK", "Keep the crosshair centered. Leaving the zone resets.");

    ctx.taskBody.innerHTML = `
      <div style="opacity:.85;margin-bottom:10px">Move your mouse into the center circle and stay there.</div>
      <div id="zone" style="
        width:220px;height:220px;border-radius:999px;margin:10px auto 0;
        border:1px solid rgba(255,255,255,0.18);
        background: radial-gradient(circle at 50% 50%, rgba(120,180,255,0.14), rgba(0,0,0,0.18));
        display:grid;place-items:center; position:relative;
      ">
        <div style="width:34px;height:34px;border-radius:999px;border:1px solid rgba(255,255,255,0.22);
          box-shadow: 0 0 12px rgba(160,220,255,0.22)"></div>
      </div>
      <div style="margin-top:12px">
        <div style="height:10px;border-radius:999px;border:1px solid rgba(255,255,255,0.18);overflow:hidden;background:rgba(0,0,0,0.25)">
          <div id="bar" style="height:100%;width:0%"></div>
        </div>
      </div>
      <div id="hint" style="margin-top:10px;opacity:.85"></div>
    `;

    const zone = ctx.taskBody.querySelector("#zone");
    const bar = ctx.taskBody.querySelector("#bar");
    const hint = ctx.taskBody.querySelector("#hint");

    let inside = false;
    let start = null;
    let raf = null;

    const reset = () => {
      start = null;
      bar.style.width = "0%";
      hint.textContent = "lock broken.";
      ctx.taskPrimary.disabled = true;
    };

    const step = (ts) => {
      if (!inside) return;
      if (start === null) start = ts;
      const pct = clamp((ts - start) / ms, 0, 1);
      bar.style.width = `${(pct*100).toFixed(1)}%`;
      bar.style.background = "rgba(120,180,255,0.45)";
      hint.textContent = "locking…";
      if (pct >= 1) {
        hint.textContent = "focus locked.";
        ctx.taskPrimary.disabled = false;
        return;
      }
      raf = requestAnimationFrame(step);
    };

    const onMove = (e) => {
      const r = zone.getBoundingClientRect();
      const cx = r.left + r.width/2;
      const cy = r.top + r.height/2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const nowInside = dist <= (r.width * 0.18);

      if (nowInside && !inside) {
        inside = true;
        hint.textContent = "";
        raf = requestAnimationFrame(step);
      } else if (!nowInside && inside) {
        inside = false;
        if (raf) cancelAnimationFrame(raf);
        reset();
      }
    };

    window.addEventListener("mousemove", onMove);

    ctx.taskPrimary.textContent = "continue";
    ctx.taskPrimary.disabled = true;

    await new Promise(resolve => {
      ctx.taskPrimary.onclick = () => {
        window.removeEventListener("mousemove", onMove);
        resolve();
      };
    });
  }

  return { anchors, reorder, checksum, hold, pattern, mismatch, trace, scrub, cipher, focus };
})();
