// tasks.js (REPLACEMENT: loader + core tasks + pack merge)

(() => {
  const TASKS = (window.TASKS = window.TASKS || {});

  // Packs call registerTasks({...}) or registerTasks([ ... ]) depending on your pack format.
  window.registerTasks = function registerTasks(payload) {
    if (!payload) return;

    // array of { id, fn } or array of functions or array of objects
    if (Array.isArray(payload)) {
      for (const item of payload) registerTasks(item);
      return;
    }

    // If payload looks like { taskName: fn, ... }
    for (const [k, v] of Object.entries(payload)) {
      if (typeof v === "function") TASKS[k] = v;
    }
  };

  // If packs loaded “too early” (via shim), flush them now
  try {
    const q = window.__TASK_QUEUE__ || [];
    while (q.length) window.registerTasks(q.shift());
  } catch {}

  // -----------------------------
  // CORE TASKS used by your DIALOGUE
  // -----------------------------

  // random: picks a random task from one or more pools of task ids
  // expects args.pool like ["core"] or ["pack1","pack2"]
  TASKS.random = async (ctx, args = {}) => {
    const pools = Array.isArray(args.pool) ? args.pool : ["core"];

    // Collect candidates from window.TASK_POOLS if you have it,
    // otherwise fall back to “any registered non-core task”
    const POOLS = window.TASK_POOLS || {};
    let candidates = [];

    for (const p of pools) {
      const list = POOLS[p];
      if (Array.isArray(list)) candidates.push(...list);
    }

    // fallback: any task except these
    if (!candidates.length) {
      candidates = Object.keys(TASKS).filter(
        (k) => !["random", "checksum"].includes(k)
      );
    }

    if (!candidates.length) {
      ctx.showTaskUI("TASK", "No procedures available.");
      ctx.taskBody.textContent = "System: PROCEDURE MISSING (pool empty).";
      return;
    }

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    const fn = TASKS[pick];

    // announce admin hint
    document.dispatchEvent(new CustomEvent("admin:task", { detail: { taskId: pick, args: null } }));

    if (typeof fn !== "function") {
      ctx.showTaskUI("TASK", "Procedure missing.");
      ctx.taskBody.textContent = `System: PROCEDURE MISSING (${pick}).`;
      return;
    }

    await fn(ctx, args.args || {});
  };

  // checksum: simple input gate
  TASKS.checksum = async (ctx, args = {}) => {
    const phrase = String(args.phrase || "").trim();
    ctx.showTaskUI("checksum", "enter checksum phrase to continue");

    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.gap = "10px";
    wrap.style.flexWrap = "wrap";
    wrap.style.alignItems = "center";

    const inp = document.createElement("input");
    inp.type = "text";
    inp.placeholder = "checksum phrase";
    inp.autocomplete = "off";
    inp.spellcheck = false;
    inp.style.flex = "1";
    inp.style.minWidth = "240px";
    inp.className = "textIn";

    const msg = document.createElement("div");
    msg.style.opacity = ".85";

    wrap.appendChild(inp);
    ctx.taskBody.appendChild(wrap);
    ctx.taskBody.appendChild(msg);

    const done = () =>
      new Promise((resolve) => {
        ctx.taskPrimary.textContent = "submit";
        ctx.taskPrimary.onclick = () => resolve(inp.value.trim());
      });

    const val = await done();

    if (window.__ADMIN_FORCE_OK) {
      window.__ADMIN_FORCE_OK = false;
      return;
    }

    if (!phrase) return;

    if (val.toLowerCase() === phrase.toLowerCase()) {
      msg.style.color = "rgba(200,255,220,.90)";
      msg.textContent = "ok";
      await new Promise((r) => setTimeout(r, 250));
      return;
    }

    msg.style.color = "rgba(255,190,190,.95)";
    msg.textContent = "bad checksum";
    ctx.penalize?.(1, "checksum failed");
    await new Promise((r) => setTimeout(r, 450));
  };

  // If you maintain pools, define them here (optional)
  // These should match what your DIALOGUE uses: "core", "pack1"..."pack5"
  window.TASK_POOLS = window.TASK_POOLS || {
    core: ["checksum"],
    pack1: [],
    pack2: [],
    pack3: [],
    pack4: [],
    pack5: [],
  };

  // After packs load, you can fill TASK_POOLS.packX in the pack files
  // OR just leave them empty and random() will fallback to all tasks.
})();
