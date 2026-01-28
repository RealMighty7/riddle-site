// /tasks.js
// Provides:
// - window.TASKS (id -> async fn(ctx, args))
// - window.registerTasks(obj)
// - window.registerTaskPool(name, weightedIds)
// - window.pickFromPool(name)

(() => {
  const TASKS = (window.TASKS = window.TASKS || {});
  const POOLS = (window.TASK_POOLS = window.TASK_POOLS || {});

  window.registerTasks = function registerTasks(obj) {
    if (!obj || typeof obj !== "object") return;
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "function") TASKS[k] = v;
    }
  };

  window.registerTaskPool = function registerTaskPool(name, weighted) {
    if (!name) return;
    POOLS[name] = Array.isArray(weighted) ? weighted.slice() : [];
  };

  function weightedPick(list) {
    const items = (list || []).filter(Boolean);
    if (!items.length) return null;

    let total = 0;
    for (const it of items) total += Math.max(0, Number(it.w ?? 1) || 1);
    if (total <= 0) return items[0].id;

    let r = Math.random() * total;
    for (const it of items) {
      r -= Math.max(0, Number(it.w ?? 1) || 1);
      if (r <= 0) return it.id;
    }
    return items[items.length - 1].id;
  }

  window.pickFromPool = function pickFromPool(name) {
    const list = POOLS[name];
    return weightedPick(list);
  };

  // Simple default pool if you forget to register one
  if (!POOLS.default) {
    POOLS.default = [
      { id: "keypad_4", w: 1 },
      { id: "wire_cut", w: 1 },
      { id: "mirror_match", w: 1 },
    ];
  }
})();
