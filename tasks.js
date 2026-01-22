// tasks.js
window.TASKS = (function () {
  function el(tag, props, children) {
    var n = document.createElement(tag);
    props = props || {};
    children = children || [];
    Object.assign(n, props);
    for (var i = 0; i < children.length; i++) n.appendChild(children[i]);
    return n;
  }

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function boost(ctx){
    if (ctx && typeof ctx.difficultyBoost === "function") return ctx.difficultyBoost();
    return 0;
  }

  function doReset(ctx, title, body){
    if (ctx && typeof ctx.doReset === "function") ctx.doReset(title, body);
  }

  async function anchors(ctx, args) {
    args = args || {};
    var base = (args.base != null) ? args.base : 5;
    var count = base + boost(ctx);

    ctx.showTaskUI("RESTART // ANCHOR SYNC", "Stabilize boundary. Locate and click " + count + " anchors.");
    var remaining = count;

    var anchorsArr = [];
    function spawn() {
      var a = document.createElement("div");
      a.className = "anchor";
      a.style.position = "fixed";
      a.style.width = "16px";
      a.style.height = "16px";
      a.style.borderRadius = "999px";
      a.style.left = (10 + Math.random() * 80) + "vw";
      a.style.top = (12 + Math.random() * 72) + "vh";
      a.style.background = "rgba(120,180,255,0.85)";
      a.style.boxShadow = "0 0 18px rgba(120,180,255,0.55)";
      a.style.zIndex = "10020";
      a.style.cursor = "pointer";

      a.addEventListener("click", function () {
        remaining--;
        a.remove();
        if (remaining <= 0) {
          for (var j = 0; j < anchorsArr.length; j++) anchorsArr[j].remove();
          ctx.taskPrimary.disabled = false;
        }
      });

      document.body.appendChild(a);
      anchorsArr.push(a);
    }

    for (var i = 0; i < count; i++) spawn();

    ctx.taskBody.innerHTML = "";
    var pill = el("div", { className: "pill" }, [
      document.createTextNode("Anchors remaining: "),
      el("b", { id: "remain", textContent: String(remaining) }, [])
    ]);
    pill.style.marginTop = "8px";
    pill.style.opacity = "0.9";
    ctx.taskBody.appendChild(pill);

    var remainEl = pill.querySelector("#remain");
    var tick = setInterval(function () {
      if (!remainEl || !remainEl.isConnected) { clearInterval(tick); return; }
      remainEl.textContent = String(remaining);
      if (remaining <= 0) clearInterval(tick);
    }, 120);

    ctx.taskPrimary.textContent = "continue";
    ctx.taskPrimary.disabled = true;

    await new Promise(function (resolve) {
      ctx.taskPrimary.onclick = function () {
        for (var k = 0; k < anchorsArr.length; k++) anchorsArr[k].remove();
        resolve();
      };
    });
  }

  async function reorder(ctx, args) {
    args = args || {};
    var items = Array.isArray(args.items) ? args.items.slice() : [];
    var correct = Array.isArray(args.correct) ? args.correct.slice() : [];

    ctx.showTaskUI("RESTART // LOG RECONSTRUCTION", "Reorder fragments to rebuild the event timeline.");
    var state = items.slice();

    function render() {
      ctx.taskBody.innerHTML = "<div style='opacity:.85;margin-bottom:8px'>Click two items to swap them.</div>";
      var wrap = document.createElement("div");
      wrap.style.display = "flex";
      wrap.style.flexWrap = "wrap";
      wrap.style.gap = "10px";

      var first = null;

      state.forEach(function (txt, idx) {
        var pill = document.createElement("span");
        pill.className = "pill";
        pill.textContent = txt;
        pill.style.cursor = "pointer";
        pill.style.padding = "8px 10px";
        pill.style.borderRadius = "999px";
        pill.style.border = "1px solid rgba(255,255,255,0.18)";
        pill.style.background = "rgba(255,255,255,0.06)";

        pill.onclick = function () {
          if (first === null) {
            first = idx;
            pill.style.outline = "2px solid rgba(120,180,255,0.55)";
          } else {
            var tmp = state[first];
            state[first] = state[idx];
            state[idx] = tmp;
            render();
          }
        };

        wrap.appendChild(pill);
      });

      ctx.taskBody.appendChild(wrap);
      var ok = state.join("|") === correct.join("|");
      ctx.taskPrimary.disabled = !ok;
    }

    render();

    ctx.taskPrimary.textContent = "confirm order";
    ctx.taskPrimary.disabled = true;

    await new Promise(function (resolve) {
      ctx.taskPrimary.onclick = function () { resolve(); };
    });
  }

  async function checksum(ctx, args) {
    args = args || {};
    var phrase = String(args.phrase || "").trim();

    ctx.showTaskUI("RESTART // CHECKSUM", "Enter the checksum phrase exactly to verify memory integrity.");

    ctx.taskBody.innerHTML =
      "<div style='opacity:.85;margin-bottom:8px'>Checksum required:</div>" +
      "<div style='opacity:.9;padding:10px 12px;border-radius:999px;border:1px solid rgba(255,255,255,0.18);display:inline-block;background:rgba(255,255,255,0.06)'>Format: WORDWORD-WORD</div>" +
      "<div style='margin-top:10px'>" +
      "  <input id='chk' placeholder='enter checksum...' style='width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.18);background:rgba(0,0,0,0.25);color:#e5e7eb;'>" +
      "</div>" +
      "<div id='msg' style='margin-top:8px;opacity:.85'></div>";

    var inp = ctx.taskBody.querySelector("#chk");
    var msg = ctx.taskBody.querySelector("#msg");

    function validate() {
      var v = (inp.value || "").trim();
      var ok = v.toLowerCase() === phrase.toLowerCase();
      ctx.taskPrimary.disabled = !ok;
      msg.textContent = ok ? "checksum accepted." : "";
    }

    inp.addEventListener("input", validate);

    ctx.taskPrimary.textContent = "verify";
    ctx.taskPrimary.disabled = true;

    await new Promise(function (resolve) {
      ctx.taskPrimary.onclick = function () { resolve(); };
    });
  }

  async function hold(ctx, args) {
    args = args || {};
    var baseMs = Number((args.baseMs != null) ? args.baseMs : 3000);
    var ms = baseMs + boost(ctx) * 550;

    ctx.showTaskUI("RESTART // STABILIZE", "Hold to stabilize the boundary. Releasing resets the cycle.");

    ctx.taskBody.innerHTML =
      "<div style='opacity:.85;margin-bottom:10px'>Hold the button until the bar completes.</div>" +
      "<div style='height:10px;border-radius:999px;border:1px solid rgba(255,255,255,0.18);overflow:hidden;background:rgba(0,0,0,0.25)'>" +
      "  <div id='bar' style='height:100%;width:0%'></div>" +
      "</div>" +
      "<div style='margin-top:12px'><button id='hold' class='sim-btn'>hold</button></div>" +
      "<div id='hint' style='margin-top:8px;opacity:.8'></div>";

    var holdBtn = ctx.taskBody.querySelector("#hold");
    var bar = ctx.taskBody.querySelector("#bar");
    var hint = ctx.taskBody.querySelector("#hint");

    var start = null;
    var raf = null;
    var holdingNow = false;

    function step(ts) {
      if (!holdingNow) return;
      if (start === null) start = ts;
      var elapsed = ts - start;
      var pct = clamp(elapsed / ms, 0, 1);

      bar.style.width = (pct * 100).toFixed(1) + "%";
      bar.style.background = "rgba(120,180,255,0.45)";

      if (pct >= 1) {
        holdingNow = false;
        hint.textContent = "stabilized.";
        ctx.taskPrimary.disabled = false;
        if (raf) cancelAnimationFrame(raf);
        return;
      }
      raf = requestAnimationFrame(step);
    }

    function reset() {
      start = null;
      bar.style.width = "0%";
      hint.textContent = "holding interrupted.";
      ctx.taskPrimary.disabled = true;
    }

    holdBtn.addEventListener("mousedown", function () {
      holdingNow = true;
      hint.textContent = "";
      raf = requestAnimationFrame(step);
    });
    window.addEventListener("mouseup", function () {
      if (holdingNow) { holdingNow = false; reset(); }
    });

    holdBtn.addEventListener("touchstart", function (e) {
      e.preventDefault();
      holdingNow = true;
      hint.textContent = "";
      raf = requestAnimationFrame(step);
    }, { passive: false });
    window.addEventListener("touchend", function () {
      if (holdingNow) { holdingNow = false; reset(); }
    });

    ctx.taskPrimary.textContent = "continue";
    ctx.taskPrimary.disabled = true;

    await new Promise(function (resolve) {
      ctx.taskPrimary.onclick = function () { resolve(); };
    });
  }

  async function pattern(ctx, args) {
    args = args || {};
    var base = Number((args.base != null) ? args.base : 5);
    var count = base + boost(ctx);

    ctx.showTaskUI("RESTART // PATTERN LOCK", "Match the pattern fragments in the correct order.");

    var symbols = ["▲","■","●","◆","✚","✖","◈"];
    var sequence = [];
    for (var i = 0; i < count; i++) sequence.push(symbols[Math.floor(Math.random() * symbols.length)]);
    var input = [];

    ctx.taskBody.innerHTML =
      "<div style='opacity:.85;margin-bottom:8px'>Memorize this sequence (10 seconds):</div>" +
      "<div id='seq' style='font-size:22px;letter-spacing:.25em;margin-bottom:10px'>" + sequence.join(" ") + "</div>" +
      "<div style='opacity:.85;margin:10px 0 8px'>Now enter it:</div>" +
      "<div id='buttons' style='display:flex;flex-wrap:wrap;gap:10px'></div>" +
      "<div id='in' style='margin-top:10px;opacity:.9'></div>" +
      "<div id='msg' style='margin-top:8px;opacity:.85'></div>";

    var seqEl = ctx.taskBody.querySelector("#seq");
    var btns = ctx.taskBody.querySelector("#buttons");
    var inEl = ctx.taskBody.querySelector("#in");
    var msg = ctx.taskBody.querySelector("#msg");

    // EXACT: 10 seconds
    setTimeout(function () {
      seqEl.textContent = Array(sequence.length + 1).join("— ").trim();
      seqEl.style.opacity = "0.6";
    }, 10000);

    var pool = symbols.slice(0, 6);
    pool.forEach(function (s) {
      var b = document.createElement("button");
      b.className = "sim-btn";
      b.textContent = s;
      b.style.minWidth = "44px";
      b.onclick = function () {
        if (input.length >= sequence.length) return;
        input.push(s);
        inEl.textContent = input.join(" ");
        if (input.length === sequence.length) {
          var ok = input.join("|") === sequence.join("|");
          msg.textContent = ok ? "pattern accepted." : "pattern rejected.";
          ctx.taskPrimary.disabled = !ok;
        }
      };
      btns.appendChild(b);
    });

    var resetBtn = document.createElement("button");
    resetBtn.className = "sim-btn";
    resetBtn.textContent = "reset";
    resetBtn.onclick = function () {
      input = [];
      inEl.textContent = "";
      msg.textContent = "";
      ctx.taskPrimary.disabled = true;
    };
    btns.appendChild(resetBtn);

    ctx.taskPrimary.textContent = "continue";
    ctx.taskPrimary.disabled = true;

    await new Promise(function (resolve) {
      ctx.taskPrimary.onclick = function () { resolve(); };
    });
  }

  async function mismatch(ctx, args) {
    args = args || {};
    var base = Number((args.base != null) ? args.base : 7);
    var count = base + boost(ctx) + 2;

    ctx.showTaskUI("RESTART // MISMATCH SCAN", "Find the corrupted fragment. Only one does not match.");

    var shapes = ["◻","◼","◯","⬡","△","◇","○","□","◊"];
    var good = shapes[Math.floor(Math.random() * shapes.length)];
    var pool = shapes.filter(function (x) { return x !== good; });
    var bad = pool[Math.floor(Math.random() * pool.length)];
    var badIndex = Math.floor(Math.random() * count);

    ctx.taskBody.innerHTML = "<div style='opacity:.85;margin-bottom:10px'>Click the one that does not match.</div>";
    var wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.flexWrap = "wrap";
    wrap.style.gap = "10px";

    for (var i = 0; i < count; i++) {
      (function (idx) {
        var b = document.createElement("button");
        b.className = "sim-btn";
        b.textContent = (idx === badIndex) ? bad : good;
        b.style.minWidth = "46px";
        b.onclick = function () {
          if (idx === badIndex) {
            b.textContent = "✓";
            ctx.taskPrimary.disabled = false;
          } else {
            b.textContent = "✖";
            if (boost(ctx) >= 3) {
              doReset(ctx, "TOO ERRATIC", "Your behavior destabilized the reboot window.\n\nRestart required.");
            }
          }
        };
        wrap.appendChild(b);
      })(i);
    }

    ctx.taskBody.appendChild(wrap);

    ctx.taskPrimary.textContent = "continue";
    ctx.taskPrimary.disabled = true;

    await new Promise(function (resolve) {
      ctx.taskPrimary.onclick = function () { resolve(); };
    });
  }

  return { anchors: anchors, reorder: reorder, checksum: checksum, hold: hold, pattern: pattern, mismatch: mismatch };
})();
