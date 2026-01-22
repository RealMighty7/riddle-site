// tasks.js
// window.TASKS async tasks
// ctx provides: showTaskUI, taskBody, taskPrimary, doReset, difficultyBoost, penalize(), glitch()

window.TASKS = (() => {
  function el(tag, props = {}, children = []) {
    const n = document.createElement(tag);
    Object.assign(n, props);
    for (const c of children) n.appendChild(c);
    return n;
  }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  async function anchors(ctx, args = {}) {
    const base = args.base ?? 5;
    const count = base + (ctx.difficultyBoost?.() ?? 0);

    let attempts = 0;

    while (true) {
      attempts++;

      ctx.showTaskUI("RESTART // ANCHOR SYNC", `Stabilize boundary. Locate and click ${count} anchors.`);
      let remaining = count;

      const anchors = [];
      const spawn = () => {
        const a = document.createElement("div");
        a.className = "anchor";
        a.style.left = `${10 + Math.random() * 80}vw`;
        a.style.top  = `${12 + Math.random() * 72}vh`;

        a.addEventListener("click", () => {
          remaining--;
          a.remove();
          if (remaining <= 0) {
            for (const x of anchors) x.remove();
            ctx.taskPrimary.disabled = false;
          }
        });

        document.body.appendChild(a);
        anchors.push(a);
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

      // timeout consequence
      const timeLimit = 14000 + (ctx.difficultyBoost?.() ?? 0) * 1200;
      let timedOut = false;
      const to = setTimeout(() => {
        timedOut = true;
        ctx.taskPrimary.disabled = true;
        for (const x of anchors) x.remove();
        ctx.taskBody.innerHTML += `<div style="margin-top:10px;opacity:.85;color:rgba(255,190,190,.95)">Timeout. Boundary drift detected.</div>`;
      }, timeLimit);

      ctx.taskPrimary.textContent = "continue";
      ctx.taskPrimary.disabled = true;

      const ok = await new Promise(resolve => {
        ctx.taskPrimary.onclick = () => resolve(true);
        // if timed out, let them proceed after penalty by clicking primary
        const watcher = setInterval(() => {
          if (timedOut) {
            clearInterval(watcher);
            ctx.taskPrimary.disabled = false;
            ctx.taskPrimary.onclick = () => resolve(false);
          }
        }, 120);
      });

      clearTimeout(to);
      for (const x of anchors) x.remove();

      if (ok) return;

      // penalty
      ctx.glitch?.();
      ctx.penalize?.(1, "ANCHOR DESYNC: penalty applied.");
      if (attempts >= 2) {
        ctx.doReset?.("LOCKDOWN", "Anchor drift exceeded safe limits.\n\nRestart required.");
        return;
      }

      await wait(450);
    }
  }

  async function reorder(ctx, args = {}) {
    const items = Array.isArray(args.items) ? args.items.slice() : [];
    const correct = Array.isArray(args.correct) ? args.correct.slice() : [];
    let attempts = 0;

    while (true) {
      attempts++;

      ctx.showTaskUI("RESTART // LOG RECONSTRUCTION", "Reorder fragments to rebuild the event timeline.");
      const state = items.slice();

      let first = null;

      const render = () => {
        ctx.taskBody.innerHTML = `<div style="opacity:.85;margin-bottom:8px">Click two items to swap them.</div>`;
        const wrap = document.createElement("div");
        wrap.style.display = "flex";
        wrap.style.flexWrap = "wrap";
        wrap.style.gap = "10px";

        first = null;

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

      await new Promise(resolve => {
        ctx.taskPrimary.onclick = () => resolve();
      });

      // validate again (anti-edge-case)
      const ok = state.join("|") === correct.join("|");
      if (ok) return;

      ctx.glitch?.();
      ctx.penalize?.(1, "LOG INTEGRITY FAILURE: penalty applied.");
      if (attempts >= 2) {
        ctx.doReset?.("RESET", "Log reconstruction failed twice.\n\nSimulation restart required.");
        return;
      }
      await wait(450);
    }
  }

  async function checksum(ctx, args = {}) {
    const phrase = String(args.phrase || "").trim();
    let attempts = 0;

    while (true) {
      attempts++;

      ctx.showTaskUI("RESTART // CHECKSUM", "Enter the checksum phrase exactly to verify memory integrity.");

      ctx.taskBody.innerHTML = `
        <div style="opacity:.85;margin-bottom:8px">Checksum required:</div>
        <div class="pill" style="opacity:.9">Riddlers passcode: lowercase / no spaces</div>
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

      await new Promise(resolve => {
        ctx.taskPrimary.onclick = () => resolve();
      });

      const v = (inp.value || "").trim();
      const ok = v.toLowerCase() === phrase.toLowerCase();
      if (ok) return;

      ctx.glitch?.();
      ctx.penalize?.(1, "CHECKSUM REJECTED: penalty applied.");
      if (attempts >= 2) {
        ctx.doReset?.("LOCKDOWN", "Checksum failed twice.\n\nRestart required.");
        return;
      }
      await wait(450);
    }
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
      ctx.penalize?.(1, "STABILITY DROP: penalty applied.");
      ctx.glitch?.();
    };

    holdBtn.addEventListener("mousedown", () => { holdingNow = true; hint.textContent = ""; raf = requestAnimationFrame(step); });
    window.addEventListener("mouseup", () => { if (holdingNow) { holdingNow = false; reset(); } });

    holdBtn.addEventListener("touchstart", (e) => { e.preventDefault(); holdingNow = true; hint.textContent = ""; raf = requestAnimationFrame(step); }, { passive: false });
    window.addEventListener("touchend", () => { if (holdingNow) { holdingNow = false; reset(); } });

    ctx.taskPrimary.textContent = "continue";
    ctx.taskPrimary.disabled = true;

    await new Promise(resolve => {
      ctx.taskPrimary.onclick = () => resolve();
    });
  }

  async function pattern(ctx, args = {}) {
    const base = Number(args.base ?? 5);
    const count = base + (ctx.difficultyBoost?.() ?? 0);

    let attempts = 0;

    while (true) {
      attempts++;

      ctx.showTaskUI("RESTART // PATTERN LOCK", "Memorize the sequence. You have 10 seconds.");

      // Use a stable symbol set, and ensure the input buttons contain the symbols used.
      const symbols = ["▲","■","●","◆","✚","✖","◈","◇","⬡"];
      const sequence = Array.from({ length: count }, () => symbols[Math.floor(Math.random() * symbols.length)]);
      let input = [];

      ctx.taskBody.innerHTML = `
        <div style="opacity:.85;margin-bottom:8px">Memorize this sequence (10s):</div>
        <div id="seq" style="font-size:22px;letter-spacing:.25em;margin-bottom:10px">${sequence.join(" ")}</div>
        <div id="timer" style="opacity:.75;font-size:12px;margin-bottom:10px"></div>

        <div style="opacity:.85;margin:10px 0 8px">Now enter it:</div>
        <div id="buttons" style="display:flex;flex-wrap:wrap;gap:10px"></div>
        <div id="in" style="margin-top:10px;opacity:.9"></div>
        <div id="msg" style="margin-top:8px;opacity:.85"></div>
      `;

      const seqEl = ctx.taskBody.querySelector("#seq");
      const timerEl = ctx.taskBody.querySelector("#timer");
      const btns = ctx.taskBody.querySelector("#buttons");
      const inEl = ctx.taskBody.querySelector("#in");
      const msg = ctx.taskBody.querySelector("#msg");

      // 10s memorize
      const SHOW_MS = 10000;
      let left = 10;
      timerEl.textContent = `Time remaining: ${left}s`;
      const t = setInterval(() => {
        left--;
        if (left <= 0) {
          clearInterval(t);
          timerEl.textContent = "";
        } else {
          timerEl.textContent = `Time remaining: ${left}s`;
        }
      }, 1000);

      setTimeout(() => {
        seqEl.textContent = "— — — — —";
        seqEl.style.opacity = "0.6";
      }, SHOW_MS);

      // Ensure pool includes all symbols in sequence, plus a few decoys
      const needed = Array.from(new Set(sequence));
      const decoys = symbols.filter(s => !needed.includes(s));
      while (needed.length < Math.min(7, symbols.length) && decoys.length) {
        needed.push(decoys.splice(Math.floor(Math.random() * decoys.length), 1)[0]);
      }

      needed.forEach(s => {
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
            if (!ok) {
              ctx.penalize?.(1, "PATTERN FAIL: penalty applied.");
              ctx.glitch?.();
            }
          }
        };
        btns.appendChild(b);
      });

      const resetBtn = document.createElement("button");
      resetBtn.className = "sim-btn";
      resetBtn.textContent = "reset";
      resetBtn.onclick = () => {
        input = [];
        inEl.textContent = "";
        msg.textContent = "";
        ctx.taskPrimary.disabled = true;
      };
      btns.appendChild(resetBtn);

      ctx.taskPrimary.textContent = "continue";
      ctx.taskPrimary.disabled = true;

      const ok = await new Promise(resolve => {
        ctx.taskPrimary.onclick = () => resolve(true);
        // If they never succeed, they can retry by failing and we loop on attempts
      });

      if (ok) return;

      if (attempts >= 2) {
        ctx.doReset?.("LOCKDOWN", "Pattern validation failed repeatedly.\n\nRestart required.");
        return;
      }
      await wait(450);
    }
  }

  async function mismatch(ctx, args = {}) {
    const base = Number(args.base ?? 7);
    const count = base + (ctx.difficultyBoost?.() ?? 0) + 2;

    let attempts = 0;

    while (true) {
      attempts++;

      ctx.showTaskUI("RESTART // MISMATCH SCAN", "Find the corrupted fragment. Only one does not match.");

      const shapes = ["◻","◼","◯","⬡","△","◇","○","□","◊","⬢","⬣"];
      const good = shapes[Math.floor(Math.random() * shapes.length)];
      const bad = shapes.filter(x => x !== good)[Math.floor(Math.random() * (shapes.length - 1))];
      const badIndex = Math.floor(Math.random() * count);

      ctx.taskBody.innerHTML = `<div style="opacity:.85;margin-bottom:10px">Click the one that does not match.</div>`;
      const wrap = document.createElement("div");
      wrap.style.display = "flex";
      wrap.style.flexWrap = "wrap";
      wrap.style.gap = "10px";

      let solved = false;
      let wrongClicks = 0;

      for (let i = 0; i < count; i++) {
        const b = document.createElement("button");
        b.className = "sim-btn";
        b.textContent = (i === badIndex) ? bad : good;
        b.style.minWidth = "46px";

        b.onclick = () => {
          if (solved) return;
          if (i === badIndex) {
            solved = true;
            b.textContent = "✓";
            ctx.taskPrimary.disabled = false;
          } else {
            wrongClicks++;
            b.textContent = "✖";
            ctx.penalize?.(1, "WRONG PICK: penalty applied.");
            ctx.glitch?.();
            if (wrongClicks >= 2) {
              // escalate on repeated mistakes
              if (attempts >= 2) {
                ctx.doReset?.("RESET", "Repeated mismatch errors.\n\nSimulation restart required.");
              }
            }
          }
        };

        wrap.appendChild(b);
      }

      ctx.taskBody.appendChild(wrap);

      ctx.taskPrimary.textContent = "continue";
      ctx.taskPrimary.disabled = true;

      await new Promise(resolve => {
        ctx.taskPrimary.onclick = () => resolve();
      });

      if (solved) return;

      if (attempts >= 2) {
        ctx.doReset?.("LOCKDOWN", "Mismatch scan failed.\n\nRestart required.");
        return;
      }
      await wait(450);
    }
  }

  return { anchors, reorder, checksum, hold, pattern, mismatch };
})();
