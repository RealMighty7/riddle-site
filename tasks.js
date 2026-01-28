// tasks.js (FULL REPLACEMENT)
// Provides window.TASKS + registration helpers used by packs.
// Also includes a built-in "random" task that draws from registered pools.

(() => {
  const g = window;

  // Core registries
  g.TASKS = g.TASKS || {};
  g.TASK_POOLS = g.TASK_POOLS || {}; // { poolName: ["taskIdA","taskIdB", ...] }

  // ---- Pack API (what your packs are complaining about) ----
  function registerTasks(taskMap) {
    if (!taskMap || typeof taskMap !== "object") return;
    for (const [k, v] of Object.entries(taskMap)) {
      if (typeof v === "function") g.TASKS[k] = v;
    }
  }

  function registerTaskPool(name, list) {
    if (!name) return;
    const arr = Array.isArray(list) ? list.slice() : [];
    g.TASK_POOLS[name] = arr.filter((x) => typeof x === "string" && x.trim().length);
  }

  // Aliases (packs sometimes use slightly different names)
  g.registerTasks = g.registerTasks || registerTasks;
  g.registerTaskPool = g.registerTaskPool || registerTaskPool;
  g.registerTasksPool = g.registerTasksPool || ((name, list) => registerTaskPool(name, list));
  g.registerTaskPools = g.registerTaskPools || ((obj) => {
    if (!obj || typeof obj !== "object") return;
    for (const [name, list] of Object.entries(obj)) registerTaskPool(name, list);
  });

  // ---- Anti-repeat helper for random ----
  const RECENT = [];
  const RECENT_MAX = 6;

  function remember(id) {
    RECENT.push(id);
    while (RECENT.length > RECENT_MAX) RECENT.shift();
  }

  function pickFrom(list) {
    if (!list.length) return null;
    // Prefer something not used recently
    const fresh = list.filter((t) => !RECENT.includes(t));
    const pool = fresh.length ? fresh : list;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ---- Built-in "random" task (your dialogue references this) ----
  // args: { pool: ["core","pack1",...], allowRepeat?: boolean }
  if (!g.TASKS.random) {
    g.TASKS.random = async (ctx, args = {}) => {
      const pools = Array.isArray(args.pool) ? args.pool : ["core"];
      const allowRepeat = !!args.allowRepeat;

      // Build candidate list from named pools
      let candidates = [];
      for (const p of pools) {
        const list = g.TASK_POOLS[p];
        if (Array.isArray(list) && list.length) candidates = candidates.concat(list);
      }

      // Fallback: if no pools exist, pick from all tasks except "random"
      if (!candidates.length) {
        candidates = Object.keys(g.TASKS).filter((k) => k !== "random");
      }

      // Filter to tasks that actually exist
      candidates = candidates.filter((id) => typeof g.TASKS[id] === "function");

      if (!candidates.length) {
        ctx?.showTaskUI?.("PROCEDURE", "No registered procedures available.");
        ctx?.taskPrimary && (ctx.taskPrimary.disabled = false);
        return;
      }

      let id = pickFrom(candidates);
      if (!allowRepeat) {
        // if we somehow picked a recent one and alternatives exist, re-pick
        const fresh = candidates.filter((t) => !RECENT.includes(t));
        if (fresh.length) id = pickFrom(fresh);
      }

      remember(id);

      // Tell admin panel what we’re about to run (if main.js listens)
      try {
        document.dispatchEvent(
          new CustomEvent("admin:task", { detail: { taskId: id, args: { via: "random", pools } } })
        );
      } catch {}

      return await g.TASKS[id](ctx, args);
    };
  }

  // (Optional) "checksum" shim if you still use it in dialogue but it's not defined in packs.
  // If your packs already define checksum, this does nothing.
  if (!g.TASKS.checksum) {
    g.TASKS.checksum = async (ctx, args = {}) => {
      const phrase = String(args.phrase || "").trim();
      ctx.showTaskUI?.("CHECKSUM", `Type the checksum phrase exactly.`);
      const wrap = document.createElement("div");
      const input = document.createElement("input");
      input.className = "textIn";
      input.placeholder = "enter phrase";
      input.autocomplete = "off";
      input.spellcheck = false;

      const note = document.createElement("div");
      note.className = "task-note";
      note.textContent = "case-sensitive. no extra spaces.";

      wrap.appendChild(input);
      wrap.appendChild(note);
      ctx.taskBody.appendChild(wrap);

      ctx.taskPrimary.textContent = "submit";
      ctx.taskPrimary.onclick = () => {
        const v = (input.value || "").trim();
        if (window.__ADMIN_FORCE_OK) {
          window.__ADMIN_FORCE_OK = false;
          ctx.taskPrimary.onclick = null;
          return;
        }
        if (v !== phrase) {
          ctx.glitch?.();
          ctx.penalize?.(1, "checksum mismatch");
          return;
        }
        ctx.taskPrimary.onclick = null;
      };
    };
  }
})();
