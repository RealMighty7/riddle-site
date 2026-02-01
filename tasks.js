// tasks.js (FULL REPLACEMENT: loader + answer plumbing + core tasks)
// IMPORTANT: core tasks call ctx.success() on verified correct.
// Wrong attempts should call ctx.penalize() (adds resistance + speeds drain)

(() => {
  const TASKS = (window.TASKS = window.TASKS || {});

  // Packs may call registerTasks early; your index shim queues it.
  window.registerTasks = function registerTasks(payload) {
    if (!payload) return;

    if (Array.isArray(payload)) {
      for (const item of payload) registerTasks(item);
      return;
    }

    for (const [k, v] of Object.entries(payload)) {
      if (typeof v === "function") TASKS[k] = v;
    }
  };

  // Flush queued registrations (from your safety shim / packs)
  try {
    const q = window.__TASK_QUEUE__ || [];
    while (q.length) window.registerTasks(q.shift());
  } catch {}

  // Optional pools (packs can fill these)
  window.TASK_POOLS = window.TASK_POOLS || {
    core: ["checksum"],
    pack1: [],
    pack2: [],
    pack3: [],
    pack4: [],
    pack5: [],
  };

  /* =========================
     HELPERS
  ========================= */
  function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

  /* =========================
     CORE TASKS
  ========================= */

  // random: picks a random task from pools
  TASKS.random = async (ctx, args = {}) => {
    const pools = Array.isArray(args.pool) ? args.pool : ["core"];
    const POOLS = window.TASK_POOLS || {};

    let candidates = [];
    for (const p of pools) {
      const list = POOLS[p];
      if (Array.isArray(list)) candidates.push(...list);
    }

    // fallback: any task except random itself
    if (!candidates.length) {
      candidates = Object.keys(TASKS).filter((k) => k !== "random");
    }

    if (!candidates.length) {
      ctx.showTaskUI?.("TASK", "No procedures available.");
      if (ctx.taskBody) ctx.taskBody.textContent = "System: PROCEDURE MISSING (pool empty).";
      ctx.fail?.("No procedures available.");
      return;
    }

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    const fn = TASKS[pick];

    if (typeof fn !== "function") {
      ctx.showTaskUI?.("TASK", "Procedure missing.");
      if (ctx.taskBody) ctx.taskBody.textContent = `System: PROCEDURE MISSING (${pick}).`;
      ctx.fail?.("Procedure missing.");
      return;
    }

    // Let the nested task run; it should call ctx.success() when done.
    return await fn(ctx, args.args || {});
  };

  // checksum: simple input gate
  TASKS.checksum = async (ctx, args = {}) => {
    const phrase = String(args.phrase || "").trim();

    ctx.showTaskUI?.("checksum", "enter checksum phrase to continue");

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

    const msg = document.createElement("div");
    msg.style.opacity = ".85";
    msg.style.marginTop = "10px";

    wrap.appendChild(inp);
    ctx.taskBody.appendChild(wrap);
    ctx.taskBody.appendChild(msg);

    const getVal = () => String(inp.value || "").trim();

    const submit = async () => {
      const val = getVal();

      if (window.__ADMIN_FORCE_OK) {
        window.__ADMIN_FORCE_OK = false;
        msg.style.color = "rgba(30,140,70,.92)";
        msg.textContent = "ok";
        await sleep(220);
        ctx.success?.("Ok.");
        return;
      }

      if (!phrase) {
        msg.style.color = "rgba(30,140,70,.92)";
        msg.textContent = "ok";
        await sleep(180);
        ctx.success?.("Ok.");
        return;
      }

      if (val.toLowerCase() === phrase.toLowerCase()) {
        msg.style.color = "rgba(30,140,70,.92)";
        msg.textContent = "ok";
        await sleep(220);
        ctx.success?.("Ok.");
        return;
      }

      msg.style.color = "rgba(210,40,40,.92)";
      msg.textContent = "bad checksum";
      ctx.penalize?.(1, "checksum failed");
      await sleep(250);
      // keep task open; user can try again
      inp.focus();
      inp.select?.();
    };

    ctx.taskPrimary.textContent = "submit";
    ctx.taskPrimary.onclick = submit;

    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });

    inp.focus();
  };
})();
