// tasks.js (FULL REPLACEMENT: loader + answer plumbing + core tasks)

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

  // Flush queued registrations
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

  // Helper: announce to admin
  function adminTask(taskId, args) {
    document.dispatchEvent(new CustomEvent("admin:task", {
      detail: { taskId, args: args ?? null }
    }));
  }

  function adminAnswer(answer) {
    document.dispatchEvent(new CustomEvent("admin:answer", {
      detail: { answer }
    }));
  }

  // -----------------------------
  // CORE TASKS
  // -----------------------------

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
      candidates = Object.keys(TASKS).filter(k => !["random"].includes(k));
    }

    if (!candidates.length) {
      ctx.showTaskUI("TASK", "No procedures available.");
      ctx.taskBody.textContent = "System: PROCEDURE MISSING (pool empty).";
      return;
    }

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    const fn = TASKS[pick];

    adminTask(pick, args.args || null);

    if (typeof fn !== "function") {
      ctx.showTaskUI("TASK", "Procedure missing.");
      ctx.taskBody.textContent = `System: PROCEDURE MISSING (${pick}).`;
      return;
    }

    // Let task return an answer object OR call ctx.setAnswer itself
    const before = ctx.getAnswer?.() ?? null;
    const res = await fn(ctx, args.args || {});
    const after = ctx.getAnswer?.() ?? null;

    if (after != null && after !== before) adminAnswer(after);
    else if (res && typeof res === "object" && "answer" in res) {
      ctx.setAnswer?.(res.answer);
      adminAnswer(res.answer);
    }
  };

  // checksum: simple input gate (exposes phrase as admin answer)
  TASKS.checksum = async (ctx, args = {}) => {
    const phrase = String(args.phrase || "").trim();
    ctx.setAnswer?.(phrase); // ✅ admin can see expected phrase

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

    const msg = document.createElement("div");
    msg.style.opacity = ".85";

    wrap.appendChild(inp);
    ctx.taskBody.appendChild(wrap);
    ctx.taskBody.appendChild(msg);

    const val = await new Promise((resolve) => {
      ctx.taskPrimary.textContent = "submit";
      ctx.taskPrimary.onclick = () => resolve(inp.value.trim());
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") resolve(inp.value.trim());
      });
      inp.focus();
    });

    if (window.__ADMIN_FORCE_OK) {
      window.__ADMIN_FORCE_OK = false;
      return { answer: phrase };
    }

    if (!phrase) return { answer: "" };

    if (val.toLowerCase() === phrase.toLowerCase()) {
      msg.style.color = "rgba(30,140,70,.92)";
      msg.textContent = "ok";
      await new Promise((r) => setTimeout(r, 250));
      return { answer: phrase };
    }

    msg.style.color = "rgba(210,40,40,.92)";
    msg.textContent = "bad checksum";
    ctx.penalize?.(1, "checksum failed");
    await new Promise((r) => setTimeout(r, 450));
    return { answer: phrase };
  };
})();
