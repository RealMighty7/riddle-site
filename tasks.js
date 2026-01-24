// tasks.js
// window.TASKS async tasks + pack registration + pool router
// ctx provides: showTaskUI, taskBody, taskPrimary, taskSecondary, doReset, difficultyBoost, penalize(amount, note), glitch()

(() => {
  // Keep TASKS object stable for packs
  const TASKS = (window.TASKS = window.TASKS || {});
  // Pools for random selection
  const TASK_POOLS = (window.TASK_POOLS = window.TASK_POOLS || {});

  // packs call: registerTaskPool("core" / "packX" / etc, [{ id:"anchors", w:1 }, ...])
  window.registerTaskPool = function registerTaskPool(poolName, entries) {
    if (!poolName) return;
    if (!Array.isArray(entries)) return;
    TASK_POOLS[poolName] = (TASK_POOLS[poolName] || []).concat(entries);
  };

  // packs call: registerTasks({ taskId: async (ctx,args)=>{}, ... })
  window.registerTasks = function registerTasks(map) {
    if (!map || typeof map !== "object") return;
    for (const [k, v] of Object.entries(map)) {
      if (typeof v === "function") TASKS[k] = v;
    }
  };

  /* ====================== POOL UTILITIES ====================== */
  function pickWeighted(entries) {
    let total = 0;
    for (const e of entries) total += Math.max(0, Number(e?.w ?? 1));
    if (total <= 0) return null;

    let r = Math.random() * total;
    for (const e of entries) {
      r -= Math.max(0, Number(e?.w ?? 1));
      if (r <= 0) return e;
    }
    return entries[entries.length - 1] || null;
  }

  function poolEntries(nameOrNames) {
    const names = Array.isArray(nameOrNames) ? nameOrNames : [nameOrNames];
    const out = [];
    for (const n of names) {
      const list = TASK_POOLS[n];
      if (Array.isArray(list)) out.push(...list);
    }
    return out;
  }

  // Anti-repeat (light pacing)
  let _lastTaskId = null;

  // Make packs harder to crash (esp during manual console tests)
  function normalizeCtx(ctx) {
    const noop = () => {};
    const fakeClassList = { add: noop, remove: noop, contains: () => false };

    const safe = ctx && typeof ctx === "object" ? ctx : {};
    if (!safe.showTaskUI) safe.showTaskUI = noop;
    if (!safe.doReset) safe.doReset = noop;
    if (!safe.difficultyBoost) safe.difficultyBoost = () => 0;
    if (!safe.penalize) safe.penalize = noop;
    if (!safe.glitch) safe.glitch = noop;

    if (!safe.taskBody) safe.taskBody = document.body;

    // taskPrimary needs: textContent, disabled, onclick
    if (!safe.taskPrimary) safe.taskPrimary = {};
    if (typeof safe.taskPrimary !== "object") safe.taskPrimary = {};
    if (!("textContent" in safe.taskPrimary)) safe.taskPrimary.textContent = "";
    if (!("disabled" in safe.taskPrimary)) safe.taskPrimary.disabled = false;
    if (!("onclick" in safe.taskPrimary)) safe.taskPrimary.onclick = null;

    // taskSecondary needs: classList at minimum
    if (!safe.taskSecondary) safe.taskSecondary = {};
    if (typeof safe.taskSecondary !== "object") safe.taskSecondary = {};
    if (!safe.taskSecondary.classList) safe.taskSecondary.classList = fakeClassList;

    // --- admin diagnostics ---
    if (!safe.admin) safe.admin = {};
    safe.admin.enabled = document.body.classList.contains("admin");
    if (typeof safe.admin.forceOk !== "boolean") safe.admin.forceOk = false;

    // publish hints to admin panel (main.js listens for admin:hint)
    if (!safe.setAdminHint) {
      safe.setAdminHint = (text) => {
        if (!safe.admin.enabled) return;
        document.dispatchEvent(
          new CustomEvent("admin:hint", {
            detail: { taskId: safe.currentTaskId || "—", hint: text },
          })
        );
      };
    }

    // bind skip once per ctx object
    if (!safe._adminBound) {
      safe._adminBound = true;
      document.addEventListener("admin:skip", () => {
        if (!safe.admin) safe.admin = {};
        safe.admin.forceOk = true;
        try {
          safe.taskPrimary.disabled = false;
        } catch {}
      });
    }

    return safe;
  }

  // Runs one random task from a pool (or list of pools)
  TASKS.random = async function random(ctx, args = {}) {
    ctx = normalizeCtx(ctx);

    const pools = args.pools || args.pool || "core";
    const entries = poolEntries(pools).filter((e) => e && typeof e.id === "string");

    if (!entries.length) {
      ctx.showTaskUI(
        "TASK ROUTER",
        `No tasks in pool: ${Array.isArray(pools) ? pools.join(", ") : pools}`
      );
      ctx.taskBody.innerHTML = `<div style="opacity:.85">Pool is empty or missing.</div>`;
      ctx.taskPrimary.textContent = "continue";
      ctx.taskPrimary.disabled = false;
      await new Promise((r) => (ctx.taskPrimary.onclick = r));
      return;
    }

    let pick = pickWeighted(entries);
    if (entries.length > 1 && pick?.id === _lastTaskId) {
      pick = pickWeighted(entries) || pick;
    }

    const id = pick?.id;
    _lastTaskId = id;

    // publish current task id for admin panel
    ctx.currentTaskId = id;
    if (document.body.classList.contains("admin")) {
      document.dispatchEvent(new CustomEvent("admin:task", { detail: { taskId: id } }));
    }

    const fn = TASKS[id];
    if (typeof fn !== "function") {
      ctx.showTaskUI("TASK ROUTER", `Missing task: ${id}`);
      ctx.taskBody.innerHTML = `<div style="opacity:.85">A pool references a task that isn't registered yet.</div>`;
      ctx.taskPrimary.textContent = "continue";
      ctx.taskPrimary.disabled = false;
      await new Promise((r) => (ctx.taskPrimary.onclick = r));
      return;
    }

    await fn(ctx, args.inner || {});
  };

  /* ====================== SHARED HELPERS ====================== */
  function el(tag, props = {}, children = []) {
    const n = document.createElement(tag);
    Object.assign(n, props);
    for (const c of children) n.appendChild(c);
    return n;
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function scopedListeners() {
    const offs = [];
    return {
      on(target, type, fn, opts) {
        target.addEventListener(type, fn, opts);
        offs.push(() => target.removeEventListener(type, fn, opts));
      },
      clear() {
        for (const off of offs.splice(0)) {
          try {
            off();
          } catch {}
        }
      },
    };
  }

  /* ====================== CORE TASKS ====================== */

  // TASK: anchors
  TASKS.anchors = async function anchors(ctx, args = {}) {
    ctx = normalizeCtx(ctx);

    const base = args.base ?? 5;
    const count = base + (ctx.difficultyBoost?.() ?? 0);

    let attempts = 0;

    while (true) {
      attempts++;
      ctx.admin.forceOk = false;

      ctx.showTaskUI("RESTART // ANCHOR SYNC", `Stabilize boundary. Locate and click ${count} anchors.`);
      ctx.setAdminHint?.(`Click ${count} anchors. (Admin: SKIP will force-pass)`);
      ctx.taskBody.innerHTML = "";

      ctx.taskPrimary.textContent = "continue";
      ctx.taskPrimary.disabled = true;

      let remaining = count;
      const remainText = el("b", { textContent: String(remaining) });

      const pill = el("div", { className: "pill" }, [
        document.createTextNode("Anchors remaining: "),
        remainText,
      ]);
      ctx.taskBody.appendChild(pill);

      const anchors = [];
      const L = scopedListeners();

      const spawn = () => {
        const a = document.createElement("div");
        a.className = "anchor";
        a.style.left = `${10 + Math.random() * 80}vw`;
        a.style.top = `${12 + Math.random() * 72}vh`;

        a.addEventListener("click", () => {
          remaining--;
          remainText.textContent = String(remaining);
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

      const timeLimit = 14000 + (ctx.difficultyBoost?.() ?? 0) * 1200;
      let timedOut = false;

      const to = setTimeout(() => {
        timedOut = true;
        ctx.taskPrimary.disabled = true;
        for (const x of anchors) x.remove();
        ctx.taskBody.appendChild(
          el("div", {
            style: "margin-top:10px;opacity:.85;color:rgba(255,190,190,.95)",
            textContent: "Timeout. Boundary drift detected.",
          })
        );
      }, timeLimit);

      const ok = await new Promise((resolve) => {
        ctx.taskPrimary.onclick = () => resolve(true);

        const watcher = setInterval(() => {
          if (ctx.admin?.forceOk) {
            clearInterval(watcher);
            ctx.taskPrimary.disabled = false;
            ctx.taskPrimary.onclick = () => resolve(true);
            return;
          }
          if (!timedOut) return;
          clearInterval(watcher);
          ctx.taskPrimary.disabled = false;
          ctx.taskPrimary.onclick = () => resolve(false);
        }, 120);

        L.on(window, "beforeunload", () => {
          try {
            clearInterval(watcher);
          } catch {}
        });
      });

      clearTimeout(to);
      for (const x of anchors) x.remove();
      L.clear();

      if (ok || ctx.admin?.forceOk) return;

      ctx.glitch?.();
      ctx.penalize?.(1, "ANCHOR DESYNC: penalty applied.");
      if (attempts >= 2) {
        ctx.doReset?.("LOCKDOWN", "Anchor drift exceeded safe limits.\n\nRestart required.");
        return;
      }

      await wait(450);
    }
  };

  // TASK: reorder
  TASKS.reorder = async function reorder(ctx, args = {}) {
    ctx = normalizeCtx(ctx);

    const items = Array.isArray(args.items) ? args.items.slice() : [];
    const correct = Array.isArray(args.correct) ? args.correct.slice() : [];
    let attempts = 0;

    while (true) {
      attempts++;
      ctx.admin.forceOk = false;

      ctx.showTaskUI("RESTART // LOG RECONSTRUCTION", "Reorder fragments to rebuild the event timeline.");
      if (correct.length) ctx.setAdminHint?.(`Correct order:\n- ${correct.join("\n- ")}`);
      ctx.taskBody.innerHTML = "";

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
        const okNow = state.join("|") === correct.join("|");
        ctx.taskPrimary.disabled = !okNow && !ctx.admin?.forceOk;
      };

      const state = items.slice();

      ctx.taskPrimary.textContent = "confirm order";
      ctx.taskPrimary.disabled = true;
      render();

      await new Promise((resolve) => {
        ctx.taskPrimary.onclick = () => resolve();
        const watcher = setInterval(() => {
          if (ctx.admin?.forceOk) {
            clearInterval(watcher);
            try {
              ctx.taskPrimary.disabled = false;
            } catch {}
          }
        }, 120);
      });

      const ok = state.join("|") === correct.join("|");
      if (ok || ctx.admin?.forceOk) return;

      ctx.glitch?.();
      ctx.penalize?.(1, "LOG INTEGRITY FAILURE: penalty applied.");
      if (attempts >= 2) {
        ctx.doReset?.("RESET", "Log reconstruction failed twice.\n\nSimulation restart required.");
        return;
      }
      await wait(450);
    }
  };

  // TASK: checksum
  TASKS.checksum = async function checksum(ctx, args = {}) {
    ctx = normalizeCtx(ctx);

    const phrase = String(args.phrase || "").trim();
    let attempts = 0;

    while (true) {
      attempts++;
      ctx.admin.forceOk = false;

      ctx.showTaskUI("RESTART // CHECKSUM", "Enter the checksum phrase exactly to verify memory integrity.");
      if (phrase) ctx.setAdminHint?.(`Phrase: ${phrase}`);
      ctx.taskBody.innerHTML = `
        <div style="opacity:.85;margin-bottom:8px">Checksum required:</div>
        <div class="pill" style="opacity:.9">Format: wordwordnumberword</div>
        <div style="margin-top:10px">
          <input id="chk" placeholder="enter checksum..." style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.18);background:rgba(0,0,0,0.25);color:#e5e7eb;">
        </div>
        <div id="msg" style="margin-top:8px;opacity:.85"></div>
      `;

      const inp = ctx.taskBody.querySelector("#chk");
      const msg = ctx.taskBody.querySelector("#msg");

      const validate = () => {
        const v = (inp.value || "").trim();
        const okNow = v.toLowerCase() === phrase.toLowerCase();
        ctx.taskPrimary.disabled = !okNow && !ctx.admin?.forceOk;
        msg.textContent = okNow ? "checksum accepted." : "";
      };

      inp.addEventListener("input", validate);
      inp.focus();

      ctx.taskPrimary.textContent = "verify";
      ctx.taskPrimary.disabled = true;

      await new Promise((resolve) => {
        ctx.taskPrimary.onclick = () => resolve();
        const watcher = setInterval(() => {
          if (ctx.admin?.forceOk) {
            clearInterval(watcher);
            try {
              ctx.taskPrimary.disabled = false;
            } catch {}
          }
        }, 120);
      });

      if (ctx.admin?.forceOk) return;

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
  };

  // TASK: hold
  TASKS.hold = async function hold(ctx, args = {}) {
    ctx = normalizeCtx(ctx);
    ctx.admin.forceOk = false;

    const baseMs = Number(args.baseMs ?? 3000);
    const ms = baseMs + (ctx.difficultyBoost?.() ?? 0) * 550;

    ctx.showTaskUI("RESTART // STABILIZE", "Hold to stabilize the boundary. Releasing resets the cycle.");
    ctx.setAdminHint?.(`Hold duration: ~${ms}ms (Admin: SKIP will force-pass)`);

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

    ctx.taskPrimary.textContent = "continue";
    ctx.taskPrimary.disabled = true;

    const L = scopedListeners();
    let start = null;
    let raf = null;
    let holdingNow = false;
    let completed = false;

    const step = (ts) => {
      if (!holdingNow || completed) return;
      if (start === null) start = ts;
      const elapsed = ts - start;
      const pct = clamp(elapsed / ms, 0, 1);

      bar.style.width = `${(pct * 100).toFixed(1)}%`;
      bar.style.background = "rgba(120,180,255,0.45)";

      if (pct >= 1) {
        completed = true;
        holdingNow = false;
        hint.textContent = "stabilized.";
        ctx.taskPrimary.disabled = false;
        if (raf) cancelAnimationFrame(raf);
        return;
      }
      raf = requestAnimationFrame(step);
    };

    const reset = () => {
      if (completed) return;
      start = null;
      bar.style.width = "0%";
      hint.textContent = "holding interrupted.";
      ctx.taskPrimary.disabled = true;
      ctx.penalize?.(1, "STABILITY DROP: penalty applied.");
      ctx.glitch?.();
    };

    L.on(holdBtn, "mousedown", () => {
      if (completed) return;
      holdingNow = true;
      hint.textContent = "";
      raf = requestAnimationFrame(step);
    });

    L.on(window, "mouseup", () => {
      if (holdingNow) {
        holdingNow = false;
        reset();
      }
    });

    L.on(holdBtn, "touchstart", (e) => {
      e.preventDefault();
      if (completed) return;
      holdingNow = true;
      hint.textContent = "";
      raf = requestAnimationFrame(step);
    }, { passive: false });

    L.on(window, "touchend", () => {
      if (holdingNow) {
        holdingNow = false;
        reset();
      }
    });

    await new Promise((resolve) => {
      ctx.taskPrimary.onclick = () => resolve();
      const watcher = setInterval(() => {
        if (ctx.admin?.forceOk) {
          clearInterval(watcher);
          try {
            ctx.taskPrimary.disabled = false;
          } catch {}
        }
      }, 120);
    });

    L.clear();
  };

  // TASK: pattern
  TASKS.pattern = async function pattern(ctx, args = {}) {
    ctx = normalizeCtx(ctx);

    const base = Number(args.base ?? 5);
    const count = base + (ctx.difficultyBoost?.() ?? 0);

    let attempts = 0;

    while (true) {
      attempts++;
      ctx.admin.forceOk = false;

      ctx.showTaskUI("RESTART // PATTERN LOCK", "Memorize the sequence. You have 10 seconds.");

      const symbols = ["▲", "■", "●", "◆", "✚", "✖", "◈", "◇", "⬡"];
      const sequence = Array.from({ length: count }, () => symbols[Math.floor(Math.random() * symbols.length)]);
      let input = [];

      ctx.setAdminHint?.(`Sequence:\n${sequence.join(" ")}`);

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

      const SHOW_MS = 10000;
      let left = 10;
      timerEl.textContent = `Time remaining: ${left}s`;

      const interval = setInterval(() => {
        left--;
        if (left <= 0) {
          clearInterval(interval);
          timerEl.textContent = "";
        } else {
          timerEl.textContent = `Time remaining: ${left}s`;
        }
      }, 1000);

      const hideTimeout = setTimeout(() => {
        seqEl.textContent = "— — — — —";
        seqEl.style.opacity = "0.6";
      }, SHOW_MS);

      const needed = Array.from(new Set(sequence));
      const decoys = symbols.filter((s) => !needed.includes(s));
      while (needed.length < Math.min(7, symbols.length) && decoys.length) {
        needed.push(decoys.splice(Math.floor(Math.random() * decoys.length), 1)[0]);
      }

      needed.forEach((s) => {
        const b = document.createElement("button");
        b.className = "sim-btn";
        b.textContent = s;
        b.style.minWidth = "44px";
        b.onclick = () => {
          if (input.length >= sequence.length) return;
          input.push(s);
          inEl.textContent = input.join(" ");

          if (input.length === sequence.length) {
            const okNow = input.join("|") === sequence.join("|");
            msg.textContent = okNow ? "pattern accepted." : "pattern rejected.";
            ctx.taskPrimary.disabled = (!okNow) && !ctx.admin?.forceOk;
            if (!okNow) {
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

      await new Promise((resolve) => {
        ctx.taskPrimary.onclick = () => resolve();
        const watcher = setInterval(() => {
          if (ctx.admin?.forceOk) {
            clearInterval(watcher);
            try {
              ctx.taskPrimary.disabled = false;
            } catch {}
          }
        }, 120);
      });

      clearInterval(interval);
      clearTimeout(hideTimeout);

      const ok = input.join("|") === sequence.join("|");
      if (ok || ctx.admin?.forceOk) return;

      ctx.glitch?.();
      ctx.penalize?.(1, "PATTERN REJECTED: penalty applied.");
      if (attempts >= 2) {
        ctx.doReset?.("LOCKDOWN", "Pattern validation failed twice.\n\nRestart required.");
        return;
      }
      await wait(450);
    }
  };

  // TASK: mismatch
  TASKS.mismatch = async function mismatch(ctx, args = {}) {
    ctx = normalizeCtx(ctx);

    const base = Number(args.base ?? 7);
    const count = base + (ctx.difficultyBoost?.() ?? 0) + 2;

    let attempts = 0;

    while (true) {
      attempts++;
      ctx.admin.forceOk = false;

      ctx.showTaskUI("RESTART // MISMATCH SCAN", "Find the corrupted fragment. Only one does not match.");

      const shapes = ["◻", "◼", "◯", "⬡", "△", "◇", "○", "□", "◊", "⬢", "⬣"];
      const good = shapes[Math.floor(Math.random() * shapes.length)];
      const bad = shapes.filter((x) => x !== good)[Math.floor(Math.random() * (shapes.length - 1))];
      const badIndex = Math.floor(Math.random() * count);

      ctx.setAdminHint?.(`Bad index: ${badIndex + 1} (0-based: ${badIndex})`);

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
        b.textContent = i === badIndex ? bad : good;
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

            if (wrongClicks >= 2 && attempts >= 2) {
              ctx.doReset?.("RESET", "Repeated mismatch errors.\n\nSimulation restart required.");
              return;
            }
          }
        };

        wrap.appendChild(b);
      }

      ctx.taskBody.appendChild(wrap);

      ctx.taskPrimary.textContent = "continue";
      ctx.taskPrimary.disabled = true;

      await new Promise((resolve) => {
        ctx.taskPrimary.onclick = () => resolve();
        const watcher = setInterval(() => {
          if (ctx.admin?.forceOk) {
            clearInterval(watcher);
            try {
              ctx.taskPrimary.disabled = false;
            } catch {}
          }
        }, 120);
      });

      if (solved || ctx.admin?.forceOk) return;

      ctx.glitch?.();
      ctx.penalize?.(1, "MISMATCH FAILED: penalty applied.");
      if (attempts >= 2) {
        ctx.doReset?.("LOCKDOWN", "Mismatch scan failed twice.\n\nRestart required.");
        return;
      }
      await wait(450);
    }
  };

  /* ====================== CORE POOL ====================== */
  window.registerTaskPool("core", [
    { id: "anchors", w: 1 },
    { id: "reorder", w: 1 },
    { id: "checksum", w: 1 },
    { id: "hold", w: 1 },
    { id: "pattern", w: 1 },
    { id: "mismatch", w: 1 },
  ]);
})();
