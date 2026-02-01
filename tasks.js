// tasks.js (FULL REPLACEMENT: loader + answer plumbing + core tasks)
(() => {
  const TASKS = (window.TASKS = window.TASKS || {});

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

  try {
    const q = window.__TASK_QUEUE__ || [];
    while (q.length) window.registerTasks(q.shift());
  } catch {}

  window.TASK_POOLS = window.TASK_POOLS || {
    core: ["checksum"],
    pack1: [],
    pack2: [],
    pack3: [],
    pack4: [],
    pack5: [],
  };

  // -----------------------------
  // CORE TASKS
  // -----------------------------

  TASKS.random = async (ctx, args = {}) => {
    const pools = Array.isArray(args.pool) ? args.pool : ["core"];
    const POOLS = window.TASK_POOLS || {};

    let candidates = [];
    for (const p of pools) {
      const list = POOLS[p];
      if (Array.isArray(list)) candidates.push(...list);
    }

    if (!candidates.length) {
      candidates = Object.keys(TASKS).filter((k) => k !== "random");
    }

    if (!candidates.length) {
      ctx.showTaskUI?.("TASK", "No procedures available.");
      ctx.taskBody.textContent = "System: PROCEDURE MISSING (pool empty).";
      return { answer: ctx.getAnswer?.() ?? null };
    }

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    const fn = TASKS[pick];

    if (typeof fn !== "function") {
      ctx.showTaskUI?.("TASK", "Procedure missing.");
      ctx.taskBody.textContent = `System: PROCEDURE MISSING (${pick}).`;
      return { answer: ctx.getAnswer?.() ?? null };
    }

    const before = ctx.getAnswer?.() ?? null;
    const res = await fn(ctx, args.args || {});
    const after = ctx.getAnswer?.() ?? null;

    if (res && typeof res === "object" && "answer" in res && after == null) {
      ctx.setAnswer?.(res.answer);
    }

    return res ?? { answer: ctx.getAnswer?.() ?? null };
  };

  // checksum: simple input gate
  TASKS.checksum = async (ctx, args = {}) => {
    const phrase = String(args.phrase || "").trim();
    ctx.setAnswer?.(phrase);

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

    wrap.appendChild(inp);
    ctx.taskBody.appendChild(wrap);
    ctx.taskBody.appendChild(msg);

    const val = await new Promise((resolve) => {
      let done = false;
      const finish = (v) => {
        if (done) return;
        done = true;
        resolve(String(v || "").trim());
      };

      ctx.taskPrimary.textContent = "submit";
      ctx.taskPrimary.onclick = () => finish(inp.value);

      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") finish(inp.value);
      });

      inp.focus();
    });

    if (window.__ADMIN_FORCE_OK) {
      window.__ADMIN_FORCE_OK = false;
      msg.style.color = "rgba(30,140,70,.92)";
      msg.textContent = "ok";
      ctx.success?.("Ok.");
      return { answer: phrase };
    }

    if (!phrase) {
      ctx.fail?.("missing phrase");
      return { answer: "" };
    }

    if (val.toLowerCase() === phrase.toLowerCase()) {
      msg.style.color = "rgba(30,140,70,.92)";
      msg.textContent = "ok";
      ctx.success?.("Ok.");
      return { answer: phrase };
    }

    msg.style.color = "rgba(210,40,40,.92)";
    msg.textContent = "bad checksum";
    ctx.penalize?.(1, "checksum failed");
    ctx.fail?.("bad checksum");
    return { answer: phrase };
  };
})();
