// tasks.js (FULL REPLACEMENT)
// Exposes window.TASKS used by main.js
// - Merges pack1..pack5 task functions (supports multiple naming conventions)
// - Provides safe "random" task selector that ONLY picks existing tasks
// - Avoids repetition (recent-history filter)
// - Emits admin hints (task id + suggested answer) for ANY task
// - Includes core tasks used by dialogue.js: random, checksum
//   plus extra core tasks: keypad_4, mirror_match, wire_cut, arrow_memory, click_pressure

(() => {
  const TASKS = Object.create(null);

  /* =========================
     HELPERS
  ========================= */
  const el = (tag, props = {}, children = []) => {
    const n = document.createElement(tag);
    Object.entries(props).forEach(([k, v]) => {
      if (k === "class") n.className = v;
      else if (k === "style" && v && typeof v === "object") Object.assign(n.style, v);
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else if (v !== undefined && v !== null) n.setAttribute(k, String(v));
    });
    for (const c of children) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    return n;
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function emitAdminHint(taskId, hint) {
    try {
      document.dispatchEvent(
        new CustomEvent("admin:hint", { detail: { taskId: String(taskId || "—"), hint } })
      );
    } catch {}
  }

  function hardDisable(btn) {
    if (!btn) return;
    btn.disabled = true;
    btn.setAttribute("aria-disabled", "true");
  }

  function hardEnable(btn) {
    if (!btn) return;
    btn.disabled = false;
    btn.removeAttribute("aria-disabled");
  }

  /* =========================
     PACK MERGE
  ========================= */
  function readPackTasks(n) {
    const candidates = [
      window[`PACK${n}_TASKS`],
      window[`PACK${n}TASKS`],
      window[`pack${n}Tasks`],
      window[`pack${n}_tasks`],
      window[`PACK${n}`]?.tasks,
      window[`pack${n}`]?.tasks,
    ];
    for (const c of candidates) {
      if (c && typeof c === "object") return c;
    }
    return null;
  }

  function mergePack(n) {
    const obj = readPackTasks(n);
    if (!obj) return { ids: [], merged: false };

    const ids = [];
    for (const [id, fn] of Object.entries(obj)) {
      if (typeof fn !== "function") continue;
      // don’t overwrite core tasks
      if (!TASKS[id]) TASKS[id] = fn;
      ids.push(id);
    }
    return { ids, merged: ids.length > 0 };
  }

  const POOLS = {
    core: [],
    pack1: [],
    pack2: [],
    pack3: [],
    pack4: [],
    pack5: [],
  };

  function rebuildPools() {
    // clear existing pool lists
    Object.keys(POOLS).forEach((k) => (POOLS[k] = []));

    // core tasks are added later (after definitions)
    // pack tasks:
    for (let n = 1; n <= 5; n++) {
      const { ids } = mergePack(n);
      POOLS[`pack${n}`] = ids.slice();
    }
  }

  /* =========================
     CORE TASK: CHECKSUM
  ========================= */
  TASKS.checksum = async (ctx, args = {}) => {
    const phrase = String(args.phrase || "").trim();
    const title = "CHECKSUM";
    const desc = phrase
      ? "Enter the checksum phrase exactly."
      : "Enter the checksum phrase exactly (phrase missing).";

    ctx.showTaskUI(title, desc);

    emitAdminHint("checksum", phrase || "(missing phrase)");

    const input = el("input", {
      class: "textIn",
      placeholder: "checksum phrase",
      autocomplete: "off",
      spellcheck: "false",
      style: { width: "100%" },
    });

    const note = el("div", { class: "task-note" }, ["press continue when finished"]);
    ctx.taskBody.appendChild(input);
    ctx.taskBody.appendChild(note);

    hardEnable(ctx.taskPrimary);

    await new Promise((resolve) => {
      const done = () => {
        const v = String(input.value || "").trim();
        if (!phrase) {
          ctx.doReset("PROCEDURE MISSING", "checksum phrase not provided.");
          return;
        }
        if (v === phrase || window.__ADMIN_FORCE_OK) {
          resolve();
          return;
        }
        ctx.glitch?.();
        ctx.penalize?.(1, "Checksum mismatch");
        input.focus();
      };

      ctx.taskPrimary.onclick = done;
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") done();
      });
      setTimeout(() => input.focus(), 50);
    });
  };

  /* =========================
     EXTRA CORE TASKS (simple, reliable)
  ========================= */

  // 4-digit keypad (random code shown briefly)
  TASKS.keypad_4 = async (ctx) => {
    ctx.showTaskUI("KEYPAD", "Enter the 4-digit code.");

    const code = String(Math.floor(1000 + Math.random() * 9000));
    emitAdminHint("keypad_4", code);

    const flash = el(
      "div",
      {
        class: "pill",
        style: { marginTop: "10px", display: "inline-block", filter: "brightness(1.15)" },
      },
      [`code: ${code}`]
    );

    const input = el("input", {
      class: "textIn",
      placeholder: "0000",
      inputmode: "numeric",
      autocomplete: "off",
      spellcheck: "false",
      style: { width: "100%", marginTop: "12px", letterSpacing: "2px" },
    });

    ctx.taskBody.appendChild(flash);
    ctx.taskBody.appendChild(input);

    // hide the code quickly
    await sleep(900);
    flash.textContent = "code: —";

    await new Promise((resolve) => {
      const check = () => {
        const v = String(input.value || "").replace(/\D/g, "").slice(0, 4);
        input.value = v;
        if (v === code || window.__ADMIN_FORCE_OK) return resolve();
        ctx.glitch?.();
        ctx.penalize?.(1, "Keypad rejected");
        input.focus();
      };

      ctx.taskPrimary.onclick = check;
      input.addEventListener("keydown", (e) => e.key === "Enter" && check());
      input.addEventListener("input", () => {
        input.value = String(input.value || "").replace(/\D/g, "").slice(0, 4);
      });
      setTimeout(() => input.focus(), 50);
    });
  };

  // mirror match (choose the symmetrical pair)
  TASKS.mirror_match = async (ctx) => {
    ctx.showTaskUI("MIRROR", "Pick the pair that matches when mirrored.");

    const pairs = [
      ["b", "d"],
      ["p", "q"],
      ["(", ")"],
      ["{", "}"],
      ["<", ">"],
    ];
    const correct = pairs[Math.floor(Math.random() * pairs.length)];
    emitAdminHint("mirror_match", `${correct[0]} ${correct[1]}`);

    const row = el("div", { style: { display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "12px" } });

    // make 3 options, one correct
    const options = [];
    options.push(correct);
    while (options.length < 3) {
      const cand = pairs[Math.floor(Math.random() * pairs.length)];
      if (options.some((p) => p[0] === cand[0] && p[1] === cand[1])) continue;
      options.push(cand);
    }
    // shuffle
    options.sort(() => Math.random() - 0.5);

    let picked = null;
    options.forEach((p) => {
      const b = el("button", { class: "sim-btn", type: "button" }, [`${p[0]}  ${p[1]}`]);
      b.addEventListener("click", () => {
        picked = p;
        [...row.querySelectorAll("button")].forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
      });
      row.appendChild(b);
    });

    ctx.taskBody.appendChild(row);

    await new Promise((resolve) => {
      ctx.taskPrimary.onclick = () => {
        if (window.__ADMIN_FORCE_OK) return resolve();
        if (!picked) {
          ctx.glitch?.();
          ctx.penalize?.(1, "No selection");
          return;
        }
        const ok = picked[0] === correct[0] && picked[1] === correct[1];
        if (ok) return resolve();
        ctx.glitch?.();
        ctx.penalize?.(1, "Mirror mismatch");
      };
    });
  };

  // wire cut (choose the correct wire)
  TASKS.wire_cut = async (ctx) => {
    ctx.showTaskUI("WIRES", "Cut the correct wire. Wrong cut increases resistance.");

    const colors = ["red", "blue", "yellow", "green", "white"];
    const correct = colors[Math.floor(Math.random() * colors.length)];
    emitAdminHint("wire_cut", correct);

    const row = el("div", { style: { display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "12px" } });

    let picked = null;
    colors.forEach((c) => {
      const b = el("button", { class: "sim-btn", type: "button" }, [c]);
      b.addEventListener("click", () => {
        picked = c;
        [...row.querySelectorAll("button")].forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
      });
      row.appendChild(b);
    });

    ctx.taskBody.appendChild(row);

    await new Promise((resolve) => {
      ctx.taskPrimary.onclick = () => {
        if (window.__ADMIN_FORCE_OK) return resolve();
        if (!picked) {
          ctx.glitch?.();
          ctx.penalize?.(1, "No wire selected");
          return;
        }
        if (picked === correct) return resolve();
        ctx.glitch?.();
        ctx.penalize?.(2, "Wrong wire");
      };
    });
  };

  // arrow memory (repeat sequence)
  TASKS.arrow_memory = async (ctx, args = {}) => {
    const len = Math.max(3, Math.min(8, Number(args.len || 5)));
    ctx.showTaskUI("MEMORY", `Repeat the ${len}-step arrow sequence.`);

    const arrows = ["↑", "→", "↓", "←"];
    const seq = Array.from({ length: len }, () => arrows[Math.floor(Math.random() * arrows.length)]);
    emitAdminHint("arrow_memory", seq.join(" "));

    const flash = el("div", { class: "pill", style: { marginTop: "10px" } }, [seq.join(" ")]);
    const input = el("input", {
      class: "textIn",
      placeholder: "paste sequence, e.g. ↑→↓←",
      autocomplete: "off",
      spellcheck: "false",
      style: { width: "100%", marginTop: "12px" },
    });

    ctx.taskBody.appendChild(flash);
    ctx.taskBody.appendChild(input);

    await sleep(1200);
    flash.textContent = "sequence: —";

    const normalize = (s) =>
      String(s || "")
        .replace(/[^↑→↓←]/g, "")
        .trim();

    await new Promise((resolve) => {
      const check = () => {
        if (window.__ADMIN_FORCE_OK) return resolve();
        const v = normalize(input.value);
        const want = seq.join("");
        if (v === want) return resolve();
        ctx.glitch?.();
        ctx.penalize?.(1, "Memory mismatch");
        input.focus();
      };

      ctx.taskPrimary.onclick = check;
      input.addEventListener("keydown", (e) => e.key === "Enter" && check());
      setTimeout(() => input.focus(), 50);
    });
  };

  // click pressure (click N times)
  TASKS.click_pressure = async (ctx, args = {}) => {
    const need = Math.max(6, Math.min(24, Number(args.count || 12)));
    ctx.showTaskUI("PRESSURE", `Click ${need} times. Do not overclick.`);

    emitAdminHint("click_pressure", `exactly ${need} clicks`);

    let count = 0;
    const pill = el("div", { class: "pill", style: { marginTop: "12px" } }, [`0 / ${need}`]);

    const pad = el(
      "button",
      {
        class: "sim-btn",
        type: "button",
        style: { width: "100%", marginTop: "12px", padding: "18px 12px" },
      },
      ["tap"]
    );

    ctx.taskBody.appendChild(pill);
    ctx.taskBody.appendChild(pad);

    await new Promise((resolve) => {
      const update = () => (pill.textContent = `${count} / ${need}`);

      pad.addEventListener("click", () => {
        if (window.__ADMIN_FORCE_OK) return resolve();
        count++;
        update();
        if (count === need) return resolve();
        if (count > need) {
          ctx.glitch?.();
          ctx.penalize?.(2, "Overpressure");
          count = 0;
          update();
        }
      });

      ctx.taskPrimary.onclick = () => {
        // "continue" is allowed only when complete
        if (window.__ADMIN_FORCE_OK) return resolve();
        if (count === need) return resolve();
        ctx.glitch?.();
        ctx.penalize?.(1, "Incomplete");
      };
    });
  };

  /* =========================
     RANDOM TASK (safe, no missing spam)
  ========================= */
  const RECENT_MAX = 7;
  const recent = [];

  function markRecent(id) {
    recent.push(id);
    while (recent.length > RECENT_MAX) recent.shift();
  }

  function pickFrom(list) {
    if (!list.length) return null;

    // avoid repetition if possible
    const filtered = list.filter((id) => !recent.includes(id));
    const src = filtered.length ? filtered : list;

    return src[Math.floor(Math.random() * src.length)];
  }

  TASKS.random = async (ctx, args = {}) => {
    // args.pool: ["core","pack1",...]
    const poolNames = Array.isArray(args.pool) && args.pool.length ? args.pool : ["core"];

    // build candidate task ids
    let candidates = [];
    for (const p of poolNames) {
      const name = String(p || "").trim();
      const ids = POOLS[name] || [];
      candidates = candidates.concat(ids);
    }

    // if user passed core but pools not populated yet, fallback to available core ids:
    if (!candidates.length && poolNames.includes("core")) {
      candidates = Object.keys(TASKS).filter((k) => k !== "random");
    }

    // only tasks that exist
    candidates = candidates.filter((id) => typeof TASKS[id] === "function" && id !== "random");

    if (!candidates.length) {
      // no spam loop, just a single clear line via task UI
      ctx.showTaskUI("PROCEDURE", "No procedures available in this pool.");
      emitAdminHint("random", "NO TASKS IN POOL");
      hardDisable(ctx.taskPrimary);
      await sleep(900);
      return;
    }

    const id = pickFrom(candidates);
    if (!id) return;

    markRecent(id);
    emitAdminHint("random", id);

    // run the chosen task
    return TASKS[id](ctx, args.args || {});
  };

  /* =========================
     POOL FINALIZE
  ========================= */
  rebuildPools();

  // fill core pool AFTER all core tasks exist
  POOLS.core = Object.keys(TASKS).filter(
    (k) => typeof TASKS[k] === "function" && k !== "random"
  );

  // If packs loaded after tasks.js (race), try again once shortly after
  setTimeout(() => {
    try {
      rebuildPools();
    } catch {}
  }, 250);

  // expose
  window.TASKS = TASKS;
  window.__TASK_POOLS = POOLS; // optional debug
})();
