// tasks.js (FULL REPLACEMENT: loader + task plumbing + core tasks)
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

  /* =========================================================
     Small UI helpers (works with BOTH old + new main.js)
  ========================================================= */

  function setTaskHeaderFallback(title, desc) {
    const t = document.getElementById("taskTitle");
    const d = document.getElementById("taskDesc");
    const ui = document.getElementById("taskUI");

    if (ui) ui.classList.remove("hidden");
    if (t) t.textContent = title || "";
    if (d) d.textContent = desc || "";
  }

  function showTask(ctx, title, desc) {
    if (ctx && typeof ctx.showTaskUI === "function") {
      ctx.showTaskUI(title, desc);
    } else {
      setTaskHeaderFallback(title, desc);
      // clear body if available
      if (ctx?.taskBody) ctx.taskBody.innerHTML = "";
    }
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function adminSetExpectedAnswer(ans) {
    try {
      document.dispatchEvent(
        new CustomEvent("admin:answer", { detail: { answer: ans } })
      );
    } catch {}
  }

  /* =========================================================
     CORE TASKS
  ========================================================= */

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
      showTask(ctx, "TASK", "No procedures available.");
      if (ctx?.taskBody) ctx.taskBody.textContent = "System: PROCEDURE MISSING (pool empty).";
      // do not penalize; let fallback Continue happen
      return { ok: false };
    }

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    const fn = TASKS[pick];

    if (typeof fn !== "function") {
      showTask(ctx, "TASK", "Procedure missing.");
      if (ctx?.taskBody) ctx.taskBody.textContent = `System: PROCEDURE MISSING (${pick}).`;
      return { ok: false };
    }

    const res = await fn(ctx, args.args || {});
    // If nested task returns ok:true but forgot ctx.success(), we can still end cleanly:
    if (res && res.ok === true && typeof ctx?.success === "function") {
      ctx.success("Ok.");
    }
    return res || { ok: false };
  };

  // checksum: input gate, loops until correct (wrong attempts = ctx.penalize)
  TASKS.checksum = async (ctx, args = {}) => {
    const phrase = String(args.phrase || "").trim();
    adminSetExpectedAnswer(phrase || "—");

    showTask(ctx, "checksum", "enter checksum phrase to continue");

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
    msg.style.opacity = ".9";
    msg.style.marginTop = "10px";

    wrap.appendChild(inp);
    ctx.taskBody.appendChild(wrap);
    ctx.taskBody.appendChild(msg);

    // Primary button = submit
    if (ctx?.taskPrimary) {
      ctx.taskPrimary.classList.remove("hidden");
      ctx.taskPrimary.disabled = false;
      ctx.taskPrimary.textContent = "submit";
    }
    if (ctx?.taskSecondary) {
      ctx.taskSecondary.classList.add("hidden");
    }

    // Allow admin skip to pass instantly
    if (window.__ADMIN_FORCE_OK) {
      window.__ADMIN_FORCE_OK = false;
      ctx?.success?.("Ok.");
      return { ok: true, answer: phrase };
    }

    if (!phrase) {
      // Nothing to verify, let it pass
      ctx?.success?.("Ok.");
      return { ok: true, answer: "" };
    }

    // submit gate (re-used each attempt)
    const readSubmit = () =>
      new Promise((resolve) => {
        let done = false;
        const finish = (v) => {
          if (done) return;
          done = true;
          resolve(String(v || "").trim());
        };

        const onEnter = (e) => {
          if (e.key === "Enter") finish(inp.value);
        };

        inp.addEventListener("keydown", onEnter, { once: true });

        if (ctx?.taskPrimary) {
          ctx.taskPrimary.onclick = () => finish(inp.value);
        }

        // focus each attempt
        try { inp.focus(); inp.select?.(); } catch {}
      });

    // Loop until correct (your main.js haywire rule will reset after 3 penalize calls)
    while (true) {
      msg.style.color = "rgba(232,237,247,.85)";
      msg.textContent = "";

      const val = await readSubmit();

      // Admin skip mid-task
      if (window.__ADMIN_FORCE_OK) {
        window.__ADMIN_FORCE_OK = false;
        ctx?.success?.("Ok.");
        return { ok: true, answer: phrase };
      }

      if (val.toLowerCase() === phrase.toLowerCase()) {
        msg.style.color = "rgba(30,140,70,.92)";
        msg.textContent = "ok";
        await sleep(220);
        ctx?.success?.("Ok.");
        return { ok: true, answer: phrase };
      }

      msg.style.color = "rgba(210,40,40,.92)";
      msg.textContent = "bad checksum";

      // This is the ONLY place we count a wrong attempt
      ctx?.penalize?.();

      // small delay so it feels responsive but not instant
      await sleep(280);
    }
  };
})();
