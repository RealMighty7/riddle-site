// tasks.js (FULL REPLACEMENT)
// Provides:
// - window.TASKS (id -> async fn)
// - window.registerTasks({ ... })
// - window.registerTaskPool(name, weightedList)
// - task ids: "random", "checksum"

(() => {
  window.TASKS = window.TASKS || Object.create(null);

  // poolName -> [{id,w}]
  const POOLS = window.__TASK_POOLS__ || (window.__TASK_POOLS__ = Object.create(null));

  window.registerTasks = function registerTasks(map) {
    if (!map || typeof map !== "object") return;
    for (const [k, v] of Object.entries(map)) {
      if (typeof v === "function") window.TASKS[k] = v;
    }
  };

  window.registerTaskPool = function registerTaskPool(name, items) {
    if (!name) return;
    const arr = Array.isArray(items) ? items : [];
    POOLS[name] = arr
      .map(x => ({
        id: String(x.id || ""),
        w: Math.max(0, Number(x.w ?? 1) || 1),
      }))
      .filter(x => x.id && x.w > 0);
  };

  function pickWeighted(list) {
    let total = 0;
    for (const it of list) total += it.w;
    let r = Math.random() * total;
    for (const it of list) {
      r -= it.w;
      if (r <= 0) return it.id;
    }
    return list[list.length - 1]?.id || null;
  }

  function el(tag, cls, txt) {
    const d = document.createElement(tag);
    if (cls) d.className = cls;
    if (txt !== undefined) d.textContent = txt;
    return d;
  }

  function makeInput(ph) {
    const i = el("input", "textIn");
    i.placeholder = ph || "";
    i.autocomplete = "off";
    i.spellcheck = false;
    return i;
  }

  function note(t, kind = "note") {
    const n = el("div");
    n.textContent = t ?? "";
    n.className =
      kind === "error" ? "task-error" :
      kind === "ok" ? "task-ok" :
      "task-note";
    return n;
  }

  // ------------------------------------------------------------
  // BUILTIN TASKS
  // ------------------------------------------------------------
  window.registerTasks({
    // random: pick a task id from pools and run it
    random: async (ctx, args = {}) => {
      const wanted = Array.isArray(args.pool) ? args.pool : ["core"];
      const candidates = [];

      for (const poolName of wanted) {
        const list = POOLS[String(poolName)] || [];
        for (const it of list) candidates.push(it);
      }

      // fallback: if no pools registered yet, pick any task except random itself
      let taskId = null;
      if (candidates.length) {
        taskId = pickWeighted(candidates);
      } else {
        const keys = Object.keys(window.TASKS).filter(k => k !== "random");
        taskId = keys[Math.floor(Math.random() * keys.length)] || null;
      }

      if (!taskId || typeof window.TASKS[taskId] !== "function") {
        ctx.showTaskUI("PROCEDURE", "Procedure missing. Continue.");
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.disabled = false;
        return new Promise(r => (ctx.taskPrimary.onclick = r));
      }

      // fire hint to admin panel
      document.dispatchEvent(new CustomEvent("admin:task", { detail: { taskId } }));

      return window.TASKS[taskId](ctx, args.taskArgs || {});
    },

    // checksum: type exact phrase (or a derived check)
    checksum: async (ctx, args = {}) => {
      const phrase = String(args.phrase || "").trim();
      ctx.showTaskUI("CHECKSUM", "Type the checksum exactly.");
      ctx.taskPrimary.textContent = "verify";
      ctx.taskSecondary.classList.add("hidden");

      const shown = el("div", "pill", phrase || "—");
      shown.style.marginTop = "10px";

      const inp = makeInput("checksum…");
      inp.style.marginTop = "10px";

      const msg = note("");
      msg.style.marginTop = "10px";

      ctx.taskBody.appendChild(note("case-sensitive."));
      ctx.taskBody.appendChild(shown);
      ctx.taskBody.appendChild(inp);
      ctx.taskBody.appendChild(msg);

      let resolve;
      const done = () => resolve();

      ctx.taskPrimary.disabled = false;
      ctx.taskPrimary.onclick = () => {
        const got = (inp.value || "").trim();
        if (got !== phrase) {
          msg.textContent = "Rejected.";
          msg.className = "task-error";
          ctx.glitch?.();
          ctx.penalize?.(1, "checksum mismatch");
          return;
        }
        msg.textContent = "Accepted.";
        msg.className = "task-ok";
        ctx.taskPrimary.textContent = "continue";
        ctx.taskPrimary.onclick = done;
      };

      return new Promise(r => (resolve = r));
    },
  });

  // Default “core” pool (so random never fails even if packs fail to load)
  window.registerTaskPool("core", [
    { id: "checksum", w: 1 }, // still valid
  ]);
})();
