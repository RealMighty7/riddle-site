(() => {
  function boot() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot, { once: true });
      return;
    }

    var DIALOGUE = window.DIALOGUE;
    var TASKS = window.TASKS;

    if (!DIALOGUE || !TASKS) {
      console.error("Missing dialogue.js or tasks.js. Check script order.");
      return;
    }

    /* ======================
       RANDOM IMAGES
    ====================== */
    var IMAGE_POOL = [];
    for (var i = 0; i < 12; i++) IMAGE_POOL.push("/assets/img" + (i + 1) + ".jpg");
    document.querySelectorAll(".grid img").forEach(function (img) {
      img.src = IMAGE_POOL[Math.floor(Math.random() * IMAGE_POOL.length)];
    });

    /* ======================
       ELEMENTS
    ====================== */
    var ids = [
      "system","l1","l2","l3",
      "cracks","glitchFX",
      "simRoom","simText","simChoices","choiceNeed","choiceLie","choiceRun",
      "taskUI","taskTitle","taskDesc","taskBody","taskPrimary","taskSecondary",
      "resetOverlay","resetTitle","resetBody",
      "finalOverlay","finalDiscord","finalAnswer","finalCancel","finalVerify","finalErr","turnstileBox",
      "hackRoom","hackUser","hackTargets","hackFilename","hackLines","hackDelete","hackReset","hackStatus"
    ];

    var els = {};
    for (var j = 0; j < ids.length; j++) els[ids[j]] = document.getElementById(ids[j]);
    var missing = ids.filter(function (id) { return !els[id]; });
    if (missing.length) {
      console.error("Missing required element IDs:", missing);
      return;
    }

    var systemBox = els.system;
    var l1 = els.l1, l2 = els.l2, l3 = els.l3;
    var cracks = els.cracks;

    var simRoom = els.simRoom;
    var simText = els.simText;
    var simChoices = els.simChoices;
    var choiceNeed = els.choiceNeed;
    var choiceLie = els.choiceLie;
    var choiceRun = els.choiceRun;

    var taskUI = els.taskUI;
    var taskTitle = els.taskTitle;
    var taskDesc = els.taskDesc;
    var taskBody = els.taskBody;
    var taskPrimary = els.taskPrimary;
    var taskSecondary = els.taskSecondary;

    var resetOverlay = els.resetOverlay;
    var resetTitle = els.resetTitle;
    var resetBody = els.resetBody;

    var finalOverlay = els.finalOverlay;
    var finalDiscord = els.finalDiscord;
    var finalAnswer = els.finalAnswer;
    var finalCancel = els.finalCancel;
    var finalVerify = els.finalVerify;
    var finalErr = els.finalErr;
    var turnstileBox = els.turnstileBox;

    var hackRoom = els.hackRoom;
    var hackUser = els.hackUser;
    var hackTargets = els.hackTargets;
    var hackFilename = els.hackFilename;
    var hackLines = els.hackLines;
    var hackDelete = els.hackDelete;
    var hackReset = els.hackReset;
    var hackStatus = els.hackStatus;

    resetOverlay.classList.add("hidden");

    /* ======================
       HELPERS
    ====================== */
    var WPM = 225;
    var MS_PER_WORD = 60000 / WPM;

    function wordsCount(s) {
      return String(s || "").trim().split(/\s+/).filter(Boolean).length;
    }
    function msToRead(line) {
      var w = wordsCount(line);
      if (!w) return 850;
      return Math.max(1450, w * MS_PER_WORD + 850);
    }

    var timers = [];
    function clearTimers() { timers.forEach(function (t) { clearTimeout(t); }); timers = []; }

    function appendSimLine(line) {
      simText.textContent += (line ? line : "") + "\n";
      simText.scrollTop = simText.scrollHeight;
    }

    function playLines(lines) {
      clearTimers();
      return new Promise(function (resolve) {
        var t = 350;
        for (var i = 0; i < lines.length; i++) {
          (function (line, at) {
            timers.push(setTimeout(function () { appendSimLine(line); }, at));
          })(lines[i], t);
          t += msToRead(lines[i] || " ");
        }
        timers.push(setTimeout(resolve, t + 250));
      });
    }

    function showChoices() {
      simChoices.classList.remove("hidden");
      taskUI.classList.add("hidden");
    }
    function hideChoices() {
      simChoices.classList.add("hidden");
    }

    function showTaskUI(title, desc) {
      taskUI.classList.remove("hidden");
      taskTitle.textContent = title;
      taskDesc.textContent = desc;
      taskBody.innerHTML = "";
      taskSecondary.classList.add("hidden");
      taskPrimary.disabled = false;

      // Keep tasks visible
      taskUI.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    function hardReload() {
      window.location.href = window.location.href.split("#")[0];
    }

    function doReset(reasonTitle, reasonBody) {
      resetTitle.textContent = reasonTitle || "RESET";
      resetBody.textContent = reasonBody || "";
      resetOverlay.classList.remove("hidden");
      setTimeout(hardReload, 1800);
    }

    /* ======================
       AUDIO (WAV files)
====================== */
    var AUDIO = (function(){
      var unlocked = false;

      var ambience = null;
      var static1 = null;
      var static2 = null;
      var glitch1 = null;
      var glitch2 = null;
      var thud = null;

      function load(src, loop, vol){
        var a = new Audio(src);
        a.preload = "auto";
        a.loop = !!loop;
        a.volume = vol;
        return a;
      }

      function unlock(){
        if (unlocked) return;
        unlocked = true;

        ambience = load("/assets/ambience.wav", true, 0.35);
        static1  = load("/assets/static1.wav", false, 0.55);
        static2  = load("/assets/static2.wav", false, 0.55);
        glitch1  = load("/assets/glitch1.wav", false, 0.7);
        glitch2  = load("/assets/glitch2.wav", false, 0.7);
        thud     = load("/assets/thud.wav", false, 0.8);

        ambience.play().catch(function(){});
      }

      function play(a, rate){
        if (!a) return;
        var snd = a.cloneNode(true);
        snd.playbackRate = rate || 1;
        snd.currentTime = 0;
        snd.play().catch(function(){});
      }

      function onCorruption(c){
        if (!ambience) return;
        ambience.volume = 0.2 + (c / 100) * 0.5;

        if (Math.random() < (c / 100) * 0.06){
          if (Math.random() < 0.5) play(static1, 0.8 + Math.random()*0.4);
          else play(glitch1, 0.8 + Math.random()*0.5);
        }
      }

      return {
        unlock: unlock,
        onCorruption: onCorruption,
        glitch: function(){ play(glitch2, 0.9 + Math.random()*0.3); },
        stat: function(){ play(static2, 0.9 + Math.random()*0.3); },
        thud: function(){ play(thud, 1); }
      };
    })();

    document.addEventListener("pointerdown", function(){
      AUDIO.unlock();
    }, { once: true });

    /* ======================
       GLITCH / CORRUPTION
====================== */
    var corruption = 0;

    function setCorruption(v){
      corruption = Math.max(0, Math.min(100, v));
      document.body.classList.toggle("glitch-on", corruption > 0);
      document.body.classList.toggle("glitch-1", corruption >= 10);
      document.body.classList.toggle("glitch-2", corruption >= 30);
      document.body.classList.toggle("glitch-3", corruption >= 55);
      document.body.classList.toggle("glitch-4", corruption >= 75);
      AUDIO.onCorruption(corruption);
    }
    function addCorruption(delta){ setCorruption(corruption + delta); }
    function glitchBurst(strength){
      var before = corruption;
      setCorruption(Math.max(before, strength));
      setTimeout(function(){ setCorruption(before); }, 220);
    }

    /* ======================
       STATE
    ====================== */
    var stage = 1;
    var clicks = 0;
    var lastClick = 0;
    var CLICK_COOLDOWN = 650;

    var MAX_COMPLIANT_RATIO = 0.40;  // must be < 40% to progress
    var MIN_CHOICES_BEFORE_CHECK = 10;
    var choiceTotal = 0;
    var choiceCompliant = 0;

    var resistanceScore = 0;
    function difficultyBoost() {
      return Math.max(0, Math.min(4, resistanceScore));
    }

    // Task completion gate
    var tasksDone = 0;
    var MIN_TASKS_BEFORE_FINAL = 10;
    var finalUnlocked = false;

    function recordChoice(isCompliant) {
      choiceTotal++;
      if (isCompliant) choiceCompliant++;

      if (choiceTotal >= MIN_CHOICES_BEFORE_CHECK) {
        var ratio = choiceCompliant / choiceTotal;
        if (ratio > MAX_COMPLIANT_RATIO) {
          doReset(
            "TOO COMPLIANT",
            "Compliance threshold exceeded.\n\ncompliant: " + choiceCompliant +
            "\ntotal: " + choiceTotal +
            "\nratio: " + Math.round(ratio * 100) + "%\n\nReinitializing simulation…"
          );
          return false;
        }
      }
      return true;
    }

    function maybeUnlockFinal(){
      if (finalUnlocked) return;
      if (tasksDone < MIN_TASKS_BEFORE_FINAL) return;

      // If we reached here, compliance is <= 40% (otherwise reset already happened)
      finalUnlocked = true;
      hideChoices();
      playLines([
        `System: "COMPLIANCE REPORT GENERATED."`,
        `System: "COMPLIANCE BELOW THRESHOLD."`,
        `Security: "…So you tried."`,
        `Security: "Fine."`,
        `Security: "You want out?"`,
        `Security: "Hack the mainframe. Erase yourself."`
      ]).then(function(){
        openFinalModal("");
      });
    }

    /* ======================
       TURNSTILE
    ====================== */
    var tsWidgetId = null;
    var tsToken = null;

    function ensureTurnstile() {
      if (tsWidgetId !== null) return;

      if (!window.turnstile) {
        setTimeout(ensureTurnstile, 100);
        return;
      }

      turnstileBox.innerHTML = "";
      tsWidgetId = window.turnstile.render(turnstileBox, {
        sitekey: "0x4AAAAAACN_lQF6Hw5BHs2u",
        theme: "dark",
        callback: function (token) { tsToken = token; },
        "expired-callback": function () { tsToken = null; },
        "error-callback": function () { tsToken = null; },
        "refresh-expired": "auto",
        retry: "auto"
      });
    }

    function getTurnstileToken() {
      if (!window.turnstile || tsWidgetId === null) return tsToken;
      var t = window.turnstile.getResponse(tsWidgetId);
      return t || tsToken;
    }

    function resetTurnstile() {
      if (window.turnstile && tsWidgetId !== null) window.turnstile.reset(tsWidgetId);
      tsToken = null;
    }

    /* ======================
       FINAL MODAL FLOW
    ====================== */
    var finalDiscordName = "";
    var finalAnswerText = "";

    function openFinalModal(prefillDiscord) {
      finalErr.textContent = "";
      finalOverlay.classList.remove("hidden");
      finalOverlay.setAttribute("aria-hidden", "false");

      finalDiscord.value = prefillDiscord || finalDiscordName || "";
      finalAnswer.value = finalAnswerText || "";

      ensureTurnstile();
      resetTurnstile();
    }

    function closeFinalModal() {
      finalOverlay.classList.add("hidden");
      finalOverlay.setAttribute("aria-hidden", "true");
    }

    finalCancel.onclick = function(){ closeFinalModal(); };

    finalVerify.onclick = function(){
      finalErr.textContent = "";

      finalDiscordName = (finalDiscord.value || "").trim();
      finalAnswerText = (finalAnswer.value || "").trim();

      if (!finalDiscordName) {
        finalErr.textContent = "Discord username required.";
        return;
      }

      var token = getTurnstileToken();
      if (!token) {
        finalErr.textContent = "Please complete the verification checkbox.";
        return;
      }

      closeFinalModal();
      startHackTask();
    };

    /* ======================
       HACK TASK
    ====================== */
    var FILES = [
      {
        name: "logs/boot.log",
        lines: [
          "BOOT: init sequence start",
          "CFG: load profile",
          "TRACE: session fingerprint = 8f1c-0a9d",
          "TRACE: user cache pinned",
          "NOTE: do not remove core lines",
          "AUDIT: mirror enabled",
          "AUDIT: upload pending",
          "BOOT: init sequence complete"
        ],
        targets: [3, 6, 7]
      },
      {
        name: "user/profile.cfg",
        lines: [
          "user.id = unknown",
          "user.handle = DiscordUser",
          "permissions = limited",
          "telemetry = on",
          "retention = forever",
          "escape.flag = false",
          "notes = 'subject attempted exit'"
        ],
        targets: [4, 5, 6]
      },
      {
        name: "sys/cache.tmp",
        lines: [
          "cache: build=cf-pages",
          "cache: layer=memory",
          "cache: record=user_actions",
          "cache: record=clickstream",
          "cache: record=session_map",
          "cache: record=turnstile_token",
          "cache: purge=disabled"
        ],
        targets: [4, 5, 6]
      }
    ];

    var activeFileIndex = 0;
    var selected = {}; // map index -> true

    function renderFile(idx) {
      activeFileIndex = idx;
      selected = {};

      addCorruption(4);
      if (corruption >= 55) glitchBurst(65);

      var f = FILES[idx];
      hackFilename.textContent = f.name;
      hackTargets.textContent = " (target lines: " + f.targets.join(", ") + ")";
      hackStatus.textContent = "Select ONLY the highlighted target lines, then delete.";

      hackLines.innerHTML = "";
      f.lines.forEach(function (txt, i) {
        var ln = i + 1;

        var row = document.createElement("div");
        row.className = "hack-line";
        if (f.targets.indexOf(ln) !== -1) row.classList.add("target");

        var left = document.createElement("div");
        left.className = "hack-ln";
        left.textContent = String(ln);

        var right = document.createElement("div");
        right.className = "hack-txt";
        right.textContent = txt;

        row.appendChild(left);
        row.appendChild(right);

        row.onclick = function () {
          if (selected[i]) {
            delete selected[i];
            row.classList.remove("selected");
            addCorruption(1);
          } else {
            selected[i] = true;
            row.classList.add("selected");
            addCorruption(2);
          }

          if (corruption >= 55 && Math.random() < 0.22) {
            AUDIO.stat();
            glitchBurst(75);
          }
        };

        hackLines.appendChild(row);
      });
    }

    function resetHack() {
      renderFile(activeFileIndex);
    }

    document.querySelectorAll(".hack-filebtn").forEach(function(btn){
      btn.addEventListener("click", function(){
        AUDIO.glitch();
        var idx = Number(btn.getAttribute("data-file") || "0");
        renderFile(idx);
      });
    });

    hackReset.onclick = function(){ resetHack(); };

    hackDelete.onclick = async function () {
      var f = FILES[activeFileIndex];

      // selected lines
      var selectedLines = Object.keys(selected).map(function(k){ return Number(k) + 1; }).sort(function(a,b){ return a-b; });
      var targets = f.targets.slice().sort(function(a,b){ return a-b; });

      var ok = (selectedLines.length === targets.length);
      if (ok) {
        for (var i = 0; i < targets.length; i++) {
          if (selectedLines[i] !== targets[i]) { ok = false; break; }
        }
      }

      if (!ok) {
        hackStatus.textContent = "Wrong lines. Workstation locked. Reset required.";
        addCorruption(12);
        AUDIO.stat();
        AUDIO.glitch();
        glitchBurst(90);
        setTimeout(resetHack, 700);
        return;
      }

      // delete in reverse order
      var delIdx = Object.keys(selected).map(function(k){ return Number(k); }).sort(function(a,b){ return b-a; });
      for (var d = 0; d < delIdx.length; d++) f.lines.splice(delIdx[d], 1);

      hackStatus.textContent = "Lines deleted. Finalizing wipe…";
      addCorruption(18);
      AUDIO.glitch();
      glitchBurst(95);

      try {
        var token = getTurnstileToken();
        var res = await fetch("/api/complete", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            discord: finalDiscordName,
            answer: finalAnswerText,
            turnstile: token
          })
        });

        var data = await res.json().catch(function(){ return {}; });
        if (!res.ok) {
          hackStatus.textContent = "Server rejected completion. Reset and try again.";
          return;
        }

        var code = data.code || "";
        sessionStorage.setItem("escape_code", code);
        sessionStorage.setItem("escape_user", finalDiscordName);

        setCorruption(98);
        AUDIO.thud();
        AUDIO.glitch();
        window.location.href = "/escaped.html";
      } catch (e) {
        hackStatus.textContent = "Network error. Reset and try again.";
      }
    };

    function startHackTask() {
      setCorruption(12);
      hackUser.textContent = "USER: " + finalDiscordName;
      hackRoom.classList.remove("hidden");
      renderFile(0);
    }

    window.__OPEN_FINAL_STEP__ = function(){ openFinalModal(finalDiscordName); };

    /* ======================
       TASK RUNNER
    ====================== */
    var taskContext = {
      taskPrimary: taskPrimary,
      taskSecondary: taskSecondary,
      taskBody: taskBody,
      showTaskUI: showTaskUI,
      doReset: doReset,
      difficultyBoost: difficultyBoost
    };

    async function runSteps(steps) {
      for (var i = 0; i < steps.length; i++) {
        var step = steps[i];

        if (step.say) { await playLines(step.say); continue; }

        if (step.task) {
          var fn = TASKS[step.task];
          if (fn) {
            await fn(taskContext, step.args || {});
            tasksDone++;
            maybeUnlockFinal();
          }
          continue;
        }

        if (step.filler) {
          var count = Number(step.filler.count || 1);
          var poolName = String(step.filler.pool || "filler_standard");
          var pool = (DIALOGUE.fillerPools && DIALOGUE.fillerPools[poolName]) ? DIALOGUE.fillerPools[poolName] : [];
          for (var k = 0; k < count; k++) {
            if (!pool.length) break;
            var pick = pool[Math.floor(Math.random() * pool.length)];
            if (pick.say) await playLines(pick.say);
            if (pick.task && pick.task.id) {
              var fn2 = TASKS[pick.task.id];
              if (fn2) {
                await fn2(taskContext, pick.task.args || {});
                tasksDone++;
                maybeUnlockFinal();
              }
            }
          }
        }
      }
    }

    /* ======================
       SIM ENTRY
    ====================== */
    async function openSimRoom() {
      stage = 99;
      simRoom.classList.remove("hidden");
      hideChoices();
      taskUI.classList.add("hidden");
      simText.textContent = "";

      await playLines(DIALOGUE.intro);
      showChoices();
    }

    /* ======================
       CHOICES
    ====================== */
    choiceNeed.addEventListener("click", async function () {
      if (!recordChoice(true)) return;
      resistanceScore = Math.max(0, resistanceScore - 1);

      hideChoices();
      await playLines(DIALOGUE.branches.need.preface);
      await runSteps(DIALOGUE.branches.need.steps);
      if (!finalUnlocked) showChoices();
    });

    choiceLie.addEventListener("click", async function () {
      if (!recordChoice(true)) return;

      hideChoices();
      await playLines(DIALOGUE.branches.lie.preface);
      await runSteps(DIALOGUE.branches.lie.steps);
      if (!finalUnlocked) showChoices();
    });

    choiceRun.addEventListener("click", async function () {
      if (!recordChoice(false)) return;
      resistanceScore = Math.min(6, resistanceScore + 1);

      hideChoices();
      await playLines(DIALOGUE.branches.run.preface);
      await runSteps(DIALOGUE.branches.run.steps);
      if (!finalUnlocked) showChoices();
    });

    function isCountableClick(e) {
      var t = e.target;
      if (!t) return true;
      if (t.closest("button, input, textarea, select, label, a, pre, img")) return false;
      return true;
    }

    /* ======================
       CRACKS (simple placeholder)
    ====================== */
    var crackBuilt = false;
    function ensureCracks() {
      if (crackBuilt) return;
      cracks.innerHTML = "<svg viewBox='0 0 1000 1000' preserveAspectRatio='none' xmlns='http://www.w3.org/2000/svg'></svg>";
      crackBuilt = true;
    }
    function showCrackStage() {
      ensureCracks();
      cracks.classList.remove("hidden");
      cracks.classList.add("show");
    }
    function shatterToSim() {
      AUDIO.thud();
      AUDIO.glitch();
      cracks.classList.add("flash", "shatter");
      document.body.classList.add("sim-transition");
      setTimeout(function () {
        cracks.classList.add("hidden");
        openSimRoom();
      }, 650);
    }

    /* ======================
       LANDING CLICK
    ====================== */
    document.addEventListener("click", function (e) {
      if (stage !== 1) return;
      if (!isCountableClick(e)) return;

      var now = Date.now();
      if (now - lastClick < CLICK_COOLDOWN) return;
      lastClick = now;

      clicks++;

      if (clicks === 4) showCrackStage();

      if (clicks >= 9) {
        stage = 2;
        systemBox.classList.remove("hidden");

        l1.textContent = "That isn’t how this page is supposed to be used.";
        var t2 = msToRead(l1.textContent);
        setTimeout(function () { l2.textContent = "You weren’t meant to interact with this."; }, t2);

        var t3 = t2 + msToRead("You weren’t meant to interact with this.");
        setTimeout(function () { l3.textContent = "Stop."; }, t3);

        var tShatter = t3 + msToRead("Stop.") + 650;
        setTimeout(shatterToSim, tShatter);
      }
    });
  }

  boot();
})();
