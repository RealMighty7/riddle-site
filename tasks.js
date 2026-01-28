// tasks.js (FULL REPLACEMENT)
// Exposes window.TASKS used by main.js
// Goal: (1) eliminate “missing task” situations by merging all packs,
// (2) provide safe core tasks + fallbacks, (3) support main.js admin panel for ALL pack tasks,
// (4) reduce repetition with simple anti-repeat picks.

(() => {
  const TASKS = (window.TASKS = window.TASKS || {});

  /* ===================== UTIL ===================== */
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const safeText = (s) => String(s ?? "").replace(/[<>]/g, "");
  const el = (tag, props = {}, children = []) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "style" && v && typeof v === "object") Object.assign(n.style, v);
      else if (k === "class") n.className = v;
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else if (v !== undefined && v !== null) n.setAttribute(k, String(v));
    }
    for (const c of children) {
      if (c == null) continue;
      if (typeof c === "string") n.appendChild(document.createTextNode(c));
      else n.appendChild(c);
    }
    return n;
  };

  // task id blacklist for random selection
  const RESERVED = new Set(["random"]);

  // anti-repeat
  const recentTasks = [];
  function pickNonRepeating(list, maxRecent = 10) {
    const arr = (list || []).filter(Boolean);
    if (!arr.length) return null;

    const recent = new Set(recentTasks.slice(-maxRecent));
    const candidates = arr.filter((x) => !recent.has(x));
    const pick = (candidates.length ? candidates : arr)[
      Math.floor(Math.random() * (candidates.length ? candidates : arr).length)
    ];
    recentTasks.push(pick);
    if (recentTasks.length > 40) recentTasks.splice(0, recentTasks.length - 40);
    return pick;
  }

  /* ===================== PACK MERGE ===================== */
  function mergePack(obj) {
    if (!obj || typeof obj !== "object") return;
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "function") TASKS[k] = v;
    }
  }

  // Merge common pack globals (supports lots of naming)
  mergePack(window.PACK1);
  mergePack(window.PACK2);
  mergePack(window.PACK3);
  mergePack(window.PACK4);
  mergePack(window.PACK5);
  if (window.PACKS && typeof window.PACKS === "object") {
    for (const v of Object.values(window.PACKS)) mergePack(v);
  }
  if (window.Packs && typeof window.Packs === "object") {
    for (const v of Object.values(window.Packs)) mergePack(v);
  }

  /* =====================
     HELPERS FOR CORE TASKS
  ===================== */
  function mountBasicTaskUI(ctx, title, desc) {
    ctx.showTaskUI?.(title, desc);
    // ctx.showTaskUI should reveal taskUI and hide sim (main.js already does this)
  }

  function finishTask(ctx, ok = true, msg = "") {
    // Let packs optionally render feedback via ctx.taskBody
    if (msg && ctx.taskBody) {
      ctx.taskBody.appendChild(
        el("div", { style: { marginTop: "10px", opacity: "0.9" } }, [msg])
      );
    }
    // main.js closes the UI after fn resolves.
    return ok;
  }

  function adminHint(taskId, hint, args) {
    try {
      document.dispatchEvent(
        new CustomEvent("admin:hint", { detail: { taskId, hint, args: args || null } })
      );
    } catch {}
  }

  /* =====================
     CORE TASKS (fallbacks)
     These prevent “PROCEDURE MISSING” if a pack file fails.
  ===================== */

  // --- checksum ---
  if (!TASKS.checksum) {
    TASKS.checksum = async (ctx, args = {}) => {
      const phrase = String(args.phrase || "echostatic07vault").trim();
      const taskId = "checksum";
      adminHint(taskId, phrase, args);

      mountBasicTaskUI(ctx, "CHECKSUM", "Type the checksum phrase exactly, then continue.");

      const input = el("input", {
        type: "text",
        placeholder: "checksum…",
        autocomplete: "off",
        spellcheck: "false",
        style: {
          width: "100%",
          padding: "10px 12px",
          borderRadius: "14px",
          border: "1px solid rgba(255,255,255,.14)",
          background: "rgba(255,255,255,.06)",
          color: "rgba(232,237,247,.92)",
        },
      });

      const note = el(
        "div",
        { style: { marginTop: "10px", opacity: "0.8", fontSize: "13px" } },
        ["Enter phrase, then press continue."]
      );

      ctx.taskBody.appendChild(input);
      ctx.taskBody.appendChild(note);

      return await new Promise((resolve) => {
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.onclick = () => {
          if (window.__ADMIN_FORCE_OK) {
            window.__ADMIN_FORCE_OK = false;
            resolve(finishTask(ctx, true));
            return;
          }

          const v = String(input.value || "").trim();
          if (v !== phrase) {
            ctx.glitch?.();
            ctx.penalize?.(1, "Checksum mismatch");
            resolve(finishTask(ctx, false, "Checksum mismatch."));
            return;
          }
          resolve(finishTask(ctx, true, "Checksum accepted."));
        };
      });
    };
  }

  // --- click_pressure (simple) ---
  if (!TASKS.click_pressure) {
    TASKS.click_pressure = async (ctx, args = {}) => {
      const taskId = "click_pressure";
      adminHint(taskId, "Tap 8 times", args);

      const target = clamp(Number(args.target || 8), 3, 16);
      mountBasicTaskUI(ctx, "PRESSURE", `Click the button ${target} times.`);

      let n = 0;
      const counter = el("div", { style: { marginTop: "8px", opacity: ".85" } }, [
        `count: ${n}/${target}`,
      ]);

      const btn = el(
        "button",
        {
          class: "sim-btn",
          style: { marginTop: "10px" },
        },
        ["press"]
      );

      btn.onclick = () => {
        n++;
        counter.textContent = `count: ${n}/${target}`;
        if (n >= target) {
          try {
            btn.disabled = true;
          } catch {}
        }
      };

      ctx.taskBody.appendChild(counter);
      ctx.taskBody.appendChild(btn);

      return await new Promise((resolve) => {
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.onclick = () => {
          if (window.__ADMIN_FORCE_OK) {
            window.__ADMIN_FORCE_OK = false;
            resolve(finishTask(ctx, true));
            return;
          }
          if (n < target) {
            ctx.glitch?.();
            ctx.penalize?.(1, "Incomplete");
            resolve(finishTask(ctx, false, "Incomplete."));
            return;
          }
          resolve(finishTask(ctx, true, "Pressure stabilized."));
        };
      });
    };
  }

  // --- keypad_4 (simple 4-digit) ---
  if (!TASKS.keypad_4) {
    TASKS.keypad_4 = async (ctx, args = {}) => {
      const code = String(args.code || "0417").replace(/\D/g, "").slice(0, 4) || "0417";
      const taskId = "keypad_4";
      adminHint(taskId, code, args);

      mountBasicTaskUI(ctx, "KEYPAD", "Enter the 4-digit code, then continue.");

      let entered = "";
      const display = el(
        "div",
        {
          style: {
            marginTop: "10px",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            fontSize: "18px",
            letterSpacing: "4px",
            opacity: ".9",
          },
        },
        ["____"]
      );

      const grid = el("div", {
        style: {
          marginTop: "12px",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "10px",
          maxWidth: "360px",
        },
      });

      const buttons = ["1","2","3","4","5","6","7","8","9","←","0","clr"];
      buttons.forEach((label) => {
        const b = el("button", { class: "sim-btn" }, [label]);
        b.onclick = () => {
          if (label === "clr") entered = "";
          else if (label === "←") entered = entered.slice(0, -1);
          else if (entered.length < 4) entered += label;

          display.textContent = (entered + "____").slice(0, 4);
        };
        grid.appendChild(b);
      });

      ctx.taskBody.appendChild(display);
      ctx.taskBody.appendChild(grid);

      return await new Promise((resolve) => {
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.onclick = () => {
          if (window.__ADMIN_FORCE_OK) {
            window.__ADMIN_FORCE_OK = false;
            resolve(finishTask(ctx, true));
            return;
          }
          if (entered !== code) {
            ctx.glitch?.();
            ctx.penalize?.(1, "Bad code");
            resolve(finishTask(ctx, false, "Rejected."));
            return;
          }
          resolve(finishTask(ctx, true, "Accepted."));
        };
      });
    };
  }

  // --- mirror_match (very small) ---
  if (!TASKS.mirror_match) {
    TASKS.mirror_match = async (ctx, args = {}) => {
      const taskId = "mirror_match";
      adminHint(taskId, "Match left/right", args);

      mountBasicTaskUI(ctx, "MIRROR", "Make both sides match. Then continue.");

      const leftVal = ["▢","▣","▥","▦"][Math.floor(Math.random() * 4)];
      let rightVal = ["▢","▣","▥","▦"][Math.floor(Math.random() * 4)];

      const row = el("div", { style: { marginTop: "12px", display: "flex", gap: "12px", alignItems: "center" } });
      const left = el("div", { style: { fontSize: "30px", opacity: ".9" } }, [leftVal]);
      const right = el("button", { class: "sim-btn", style: { fontSize: "22px", padding: "12px 16px" } }, [rightVal]);

      right.onclick = () => {
        const opts = ["▢","▣","▥","▦"];
        rightVal = opts[(opts.indexOf(rightVal) + 1) % opts.length];
        right.textContent = rightVal;
      };

      row.appendChild(left);
      row.appendChild(el("div", { style: { opacity: ".7" } }, ["↔"]));
      row.appendChild(right);
      ctx.taskBody.appendChild(row);

      return await new Promise((resolve) => {
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.onclick = () => {
          if (window.__ADMIN_FORCE_OK) {
            window.__ADMIN_FORCE_OK = false;
            resolve(finishTask(ctx, true));
            return;
          }
          if (rightVal !== leftVal) {
            ctx.glitch?.();
            ctx.penalize?.(1, "Mismatch");
            resolve(finishTask(ctx, false, "Mismatch."));
            return;
          }
          resolve(finishTask(ctx, true, "Aligned."));
        };
      });
    };
  }

  // --- wire_cut (tiny: choose correct wire) ---
  if (!TASKS.wire_cut) {
    TASKS.wire_cut = async (ctx, args = {}) => {
      const taskId = "wire_cut";
      const wires = ["white", "blue", "red", "green"];
      const target = wires[Math.floor(Math.random() * wires.length)];
      adminHint(taskId, target, args);

      mountBasicTaskUI(ctx, "WIRES", "Cut the correct wire. Then continue.");

      let chosen = null;

      const row = el("div", { style: { marginTop: "12px", display: "flex", gap: "10px", flexWrap: "wrap" } });
      wires.forEach((w) => {
        const b = el("button", { class: "sim-btn" }, [w]);
        b.onclick = () => {
          chosen = w;
          Array.from(row.children).forEach((c) => c.classList.remove("active"));
          b.classList.add("active");
        };
        row.appendChild(b);
      });

      const note = el("div", { style: { marginTop: "10px", opacity: ".8" } }, ["Select one, then continue."]);
      ctx.taskBody.appendChild(row);
      ctx.taskBody.appendChild(note);

      return await new Promise((resolve) => {
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.onclick = () => {
          if (window.__ADMIN_FORCE_OK) {
            window.__ADMIN_FORCE_OK = false;
            resolve(finishTask(ctx, true));
            return;
          }
          if (!chosen) {
            ctx.glitch?.();
            resolve(finishTask(ctx, false, "No selection."));
            return;
          }
          if (chosen !== target) {
            ctx.glitch?.();
            ctx.penalize?.(1, "Wrong wire");
            resolve(finishTask(ctx, false, "Wrong wire."));
            return;
          }
          resolve(finishTask(ctx, true, "Circuit opened."));
        };
      });
    };
  }

  // --- arrow_memory (tiny) ---
  if (!TASKS.arrow_memory) {
    TASKS.arrow_memory = async (ctx, args = {}) => {
      const taskId = "arrow_memory";
      const arrows = ["↑","→","↓","←"];
      const seqLen = clamp(Number(args.len || 5), 3, 9);
      const seq = Array.from({ length: seqLen }, () => arrows[Math.floor(Math.random() * arrows.length)]);
      adminHint(taskId, seq.join(" "), args);

      mountBasicTaskUI(ctx, "ARROWS", "Memorize the sequence. Re-enter it.");

      const show = el("div", { style: { marginTop: "10px", fontSize: "22px", letterSpacing: "2px" } }, [
        seq.join(" "),
      ]);
      const hint = el("div", { style: { marginTop: "8px", opacity: ".8", fontSize: "13px" } }, [
        "It will hide in a moment.",
      ]);

      const entry = el("div", { style: { marginTop: "12px", display: "flex", gap: "10px", flexWrap: "wrap" } });
      let typed = [];

      const typedBox = el("div", { style: { marginTop: "10px", opacity: ".9" } }, ["your input: —"]);

      arrows.forEach((a) => {
        const b = el("button", { class: "sim-btn" }, [a]);
        b.onclick = () => {
          if (typed.length >= seqLen) return;
          typed.push(a);
          typedBox.textContent = "your input: " + typed.join(" ");
        };
        entry.appendChild(b);
      });

      const back = el("button", { class: "sim-btn", style: { marginTop: "10px" } }, ["back"]);
      back.onclick = () => {
        typed.pop();
        typedBox.textContent = "your input: " + (typed.length ? typed.join(" ") : "—");
      };

      ctx.taskBody.appendChild(show);
      ctx.taskBody.appendChild(hint);

      // hide sequence after a moment
      await sleep(900);
      show.textContent = "— — — — —";
      hint.textContent = "Re-enter it.";

      ctx.taskBody.appendChild(entry);
      ctx.taskBody.appendChild(back);
      ctx.taskBody.appendChild(typedBox);

      return await new Promise((resolve) => {
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.onclick = () => {
          if (window.__ADMIN_FORCE_OK) {
            window.__ADMIN_FORCE_OK = false;
            resolve(finishTask(ctx, true));
            return;
          }
          if (typed.length !== seqLen || typed.join("") !== seq.join("")) {
            ctx.glitch?.();
            ctx.penalize?.(1, "Memory fault");
            resolve(finishTask(ctx, false, "Rejected."));
            return;
          }
          resolve(finishTask(ctx, true, "Accepted."));
        };
      });
    };
  }

  /* =====================
     RANDOM TASK DISPATCHER
     Used by dialogue steps like {task:"random", args:{pool:["pack2"]}}
  ===================== */
  TASKS.random = async (ctx, args = {}) => {
    // admin skip works here too
    if (window.__ADMIN_FORCE_OK) {
      window.__ADMIN_FORCE_OK = false;
      return true;
    }

    // Build a set of selectable task ids.
    // If args.pool lists pack names, we try to pick tasks that “look like” they belong:
    // - pack globals exist: pull keys from those objects
    // - otherwise: fallback to all TASKS keys.
    const pools = Array.isArray(args.pool) ? args.pool.map(String) : ["core"];

    let candidateIds = [];
    const addFromObj = (obj) => {
      if (!obj || typeof obj !== "object") return;
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === "function" && !RESERVED.has(k)) candidateIds.push(k);
      }
    };

    for (const p of pools) {
      if (p === "core") {
        // “core” means: tasks.js provided fallbacks + anything not obviously reserved
        candidateIds.push("checksum", "keypad_4", "mirror_match", "wire_cut", "arrow_memory", "click_pressure");
      } else if (p === "pack1") addFromObj(window.PACK1 || window.PACKS?.pack1 || window.PACKS?.PACK1);
      else if (p === "pack2") addFromObj(window.PACK2 || window.PACKS?.pack2 || window.PACKS?.PACK2);
      else if (p === "pack3") addFromObj(window.PACK3 || window.PACKS?.pack3 || window.PACKS?.PACK3);
      else if (p === "pack4") addFromObj(window.PACK4 || window.PACKS?.pack4 || window.PACKS?.PACK4);
      else if (p === "pack5") addFromObj(window.PACK5 || window.PACKS?.pack5 || window.PACKS?.PACK5);
      else {
        // unknown pool name: just ignore it
      }
    }

    // If nothing found from pools, fallback to all tasks
    if (!candidateIds.length) {
      candidateIds = Object.keys(TASKS).filter((k) => typeof TASKS[k] === "function" && !RESERVED.has(k));
    }

    // remove dupes
    candidateIds = Array.from(new Set(candidateIds));

    const tid = pickNonRepeating(candidateIds, 12);
    if (!tid || typeof TASKS[tid] !== "function") return true;

    // announce for admin panel (main.js also announces on step.task, but random is a task itself)
    try {
      document.dispatchEvent(new CustomEvent("admin:task", { detail: { taskId: tid, args: args || null } }));
    } catch {}

    return await TASKS[tid](ctx, args.args || {});
  };

  /* =====================
     SAFETY: if packs register tasks after load, allow refresh
  ===================== */
  window.__mergeAllPacksIntoTasks = () => {
    mergePack(window.PACK1);
    mergePack(window.PACK2);
    mergePack(window.PACK3);
    mergePack(window.PACK4);
    mergePack(window.PACK5);
    if (window.PACKS && typeof window.PACKS === "object") {
      for (const v of Object.values(window.PACKS)) mergePack(v);
    }
    if (window.Packs && typeof window.Packs === "object") {
      for (const v of Object.values(window.Packs)) mergePack(v);
    }
  };
})();
