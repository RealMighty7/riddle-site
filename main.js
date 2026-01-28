// main.js (FULL REPLACEMENT)
(() => {
  function boot() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot, { once: true });
      return;
    }

    function clamp(n, a, b) {
      return Math.max(a, Math.min(b, n));
    }

    const DIALOGUE = window.DIALOGUE;
    const TASKS = window.TASKS;

    if (!DIALOGUE || !TASKS) {
      console.error("Missing dialogue.js or tasks.js. Check script order.");
      return;
    }

    /* ====================== ELEMENTS ====================== */
    const REQUIRED_IDS = [
      "system",
      "cracks",
      "glassFX",
      "subs",
      "subsName",
      "subsText",
      "simRoom",
      "simText",
      "simChoices",
      "choiceNeed",
      "choiceLie",
      "choiceRun",
      "taskUI",
      "taskTitle",
      "taskDesc",
      "taskBody",
      "taskPrimary",
      "taskSecondary",
      "resetOverlay",
      "resetTitle",
      "resetBody",
      "finalOverlay",
      "finalDiscord",
      "finalCancel",
      "finalVerify",
      "finalErr",
      "turnstileBox",
      "hackRoom",
      "hackUser",
      "hackTargets",
      "hackFilename",
      "hackLines",
      "hackDelete",
      "hackReset",
      "hackStatus",
    ];

    // Optional (safe if missing)
    const OPTIONAL_IDS = [
      "viewerToken",
      "viewerFake",
      "viewerState",
      "launchBtn",
      "launchStatus",
      "adminPanel",
      "adminTask",
      "adminAnswer",
      "adminSkip",
      "adminToggle",
      "taskActions",
      "timestamp",
      "build",
    ];

    const ids = [...REQUIRED_IDS, ...OPTIONAL_IDS];
    const els = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));

    const missingRequired = REQUIRED_IDS.filter((id) => !els[id]);
    if (missingRequired.length) {
      console.error("Missing required element IDs:", missingRequired);
      return;
    }

    const systemBox = els.system;
    const cracks = els.cracks;
    const glassFX = els.glassFX;

    const simRoom = els.simRoom;
    const simText = els.simText;
    const simChoices = els.simChoices;
    const choiceNeed = els.choiceNeed;
    const choiceLie = els.choiceLie;
    const choiceRun = els.choiceRun;

    const taskUI = els.taskUI;
    const taskTitle = els.taskTitle;
    const taskDesc = els.taskDesc;
    const taskBody = els.taskBody;
    const taskPrimary = els.taskPrimary;
    const taskSecondary = els.taskSecondary;

    const resetOverlay = els.resetOverlay;
    const resetTitle = els.resetTitle;
    const resetBody = els.resetBody;

    const finalOverlay = els.finalOverlay;
    const finalDiscord = els.finalDiscord;
    const finalCancel = els.finalCancel;
    const finalVerify = els.finalVerify;
    const finalErr = els.finalErr;
    const turnstileBox = els.turnstileBox;

    const hackRoom = els.hackRoom;
    const hackUser = els.hackUser;
    const hackTargets = els.hackTargets;
    const hackFilename = els.hackFilename;
    const hackLines = els.hackLines;
    const hackDelete = els.hackDelete;
    const hackReset = els.hackReset;
    const hackStatus = els.hackStatus;

    const subs = els.subs;
    const subsName = els.subsName;
    const subsText = els.subsText;

    const viewerToken = els.viewerToken;

    resetOverlay.classList.add("hidden");
    systemBox.textContent = "This page is currently under revision.";

    /* ====================== SAFE SFX ====================== */
    function playSfx(name, opts = {}) {
      if (typeof window.playSfx === "function") {
        const map = {
          glitch1: "glitch",
          glitch2: "glitch",
          static1: "static",
          static2: "staticSoft",
        };
        const id = map[name] || name;
        try {
          window.playSfx(id, opts);
        } catch {}
      }
    }

    /* ====================== LANDING ASSETS ====================== */
    const IMAGE_POOL = Array.from({ length: 12 }, (_, i) => `/assets/img${i + 1}.jpg`);
    document.querySelectorAll(".adImg").forEach((img) => {
      img.src = IMAGE_POOL[Math.floor(Math.random() * IMAGE_POOL.length)];
    });

    /* ======================
       ADMIN ACCESS
    ====================== */
    const ADMIN_HASH =
      "27fedb02589c0bacf10ecdda0d63486573fa76350d2edf7ee6e6e6cc35858c44";

    async function sha256(str) {
      const buf = new TextEncoder().encode(str);
      const hash = await crypto.subtle.digest("SHA-256", buf);
      return [...new Uint8Array(hash)]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }

    function grantAdmin() {
      if (document.body.classList.contains("admin")) return;
      document.body.classList.add("admin");
      console.log("%c[admin] elevated access granted", "color:#8cbcff");

      if (document.getElementById("adminPanel")) {
        try {
          initAdminPanel();
        } catch (e) {
          console.warn("[admin] panel init failed", e);
        }
      }

      document.dispatchEvent(new CustomEvent("admin:enabled"));
    }

    if (viewerToken) {
      viewerToken.addEventListener("input", async () => {
        const v = viewerToken.value.trim();
        if (!v || v.length < 8) return;

        let h = "";
        try {
          h = await sha256(v);
        } catch (e) {
          console.warn("[admin] sha256 failed (non-secure context?)", e);
          return;
        }

        if (h === ADMIN_HASH) grantAdmin();
      });
    }

    document.addEventListener("admin:enabled", () => {
      const sys = document.getElementById("system");
      if (sys) sys.textContent = "admin context detected.";
    });

    function initAdminPanel() {
      const panel = document.getElementById("adminPanel");
      if (!panel) return;
      panel.classList.remove("hidden");

      if (panel.parentElement !== document.body) document.body.appendChild(panel);

      const elTask = document.getElementById("adminTask");
      const elAns = document.getElementById("adminAnswer");
      const btnSkip = document.getElementById("adminSkip");
      const btnToggle = document.getElementById("adminToggle");

      (function makeDraggable(panelEl, handleEl) {
        if (!panelEl || !handleEl) return;

        const PAD = 10;
        const clampToViewport = () => {
          const vw = document.documentElement.clientWidth;
          const vh = document.documentElement.clientHeight;
          const w = panelEl.offsetWidth;
          const h = panelEl.offsetHeight;

          let left = parseFloat(panelEl.style.left || `${PAD}`);
          let top = parseFloat(panelEl.style.top || `${PAD}`);

          left = Math.max(PAD, Math.min(vw - w - PAD, left));
          top = Math.max(PAD, Math.min(vh - h - PAD, top));

          panelEl.style.left = `${left}px`;
          panelEl.style.top = `${top}px`;
        };

        panelEl.style.position = "fixed";
        panelEl.style.zIndex = "9999";

        try {
          const saved = JSON.parse(localStorage.getItem("adminPanelPos") || "null");
          if (saved && typeof saved.left === "number" && typeof saved.top === "number") {
            panelEl.style.left = `${saved.left}px`;
            panelEl.style.top = `${saved.top}px`;
          }
        } catch {}

        if (!panelEl.style.left) panelEl.style.left = "18px";
        if (!panelEl.style.top) panelEl.style.top = "18px";
        clampToViewport();

        let dragging = false;
        let startX = 0,
          startY = 0;
        let baseLeft = 0,
          baseTop = 0;

        const onDown = (e) => {
          const t = e.target;
          if (t && t.closest && t.closest("button, input, textarea, select, a")) return;

          dragging = true;
          handleEl.setPointerCapture?.(e.pointerId);

          startX = e.clientX;
          startY = e.clientY;

          baseLeft = parseFloat(panelEl.style.left || "0");
          baseTop = parseFloat(panelEl.style.top || "0");

          handleEl.style.cursor = "grabbing";
          e.preventDefault();
        };

        const onMove = (e) => {
          if (!dragging) return;

          const dx = e.clientX - startX;
          const dy = e.clientY - startY;

          panelEl.style.left = `${baseLeft + dx}px`;
          panelEl.style.top = `${baseTop + dy}px`;

          clampToViewport();
        };

        const onUp = () => {
          if (!dragging) return;
          dragging = false;
          handleEl.style.cursor = "grab";

          try {
            localStorage.setItem(
              "adminPanelPos",
              JSON.stringify({
                left: parseFloat(panelEl.style.left || "0"),
                top: parseFloat(panelEl.style.top || "0"),
              })
            );
          } catch {}
        };

        handleEl.style.cursor = "grab";
        handleEl.addEventListener("pointerdown", onDown);
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);

        window.addEventListener("resize", clampToViewport);

        handleEl.addEventListener("dblclick", () => {
          panelEl.style.left = "18px";
          panelEl.style.top = "18px";
          clampToViewport();
        });
      })(panel, panel.querySelector(".adminHead"));

      btnToggle?.addEventListener("click", () => {
        const willHide = !panel.classList.contains("hidden");
        if (willHide) {
          try {
            document.activeElement?.blur?.();
          } catch {}
        }
        panel.classList.toggle("hidden");
        panel.setAttribute("aria-hidden", panel.classList.contains("hidden") ? "true" : "false");
        btnToggle.textContent = panel.classList.contains("hidden") ? "show" : "hide";
      });

      btnSkip?.addEventListener("click", () => {
        window.__ADMIN_FORCE_OK = true;
        document.dispatchEvent(new CustomEvent("admin:skip", { bubbles: true }));
        panel.setAttribute("aria-hidden", "false");
        try {
          document.activeElement?.blur?.();
        } catch {}
      });

      document.addEventListener("admin:task", (e) => {
        const id = e?.detail?.taskId || "—";
        if (elTask) elTask.textContent = id;
        if (elAns) elAns.textContent = "—";
      });

      document.addEventListener("admin:hint", (e) => {
        const hint = e?.detail?.hint;
        if (!hint) return;
        if (elTask && e?.detail?.taskId) elTask.textContent = e.detail.taskId;
        if (elAns) elAns.textContent = String(hint);
      });
    }

    /* ====================== AUDIO UNLOCK ====================== */
    let audioUnlocked = false;

    async function unlockAudio() {
      if (audioUnlocked) return;
      audioUnlocked = true;

      try {
        if (window.AudioPlayer?.unlock) await window.AudioPlayer.unlock();
      } catch (e) {
        console.warn("[audio] VO unlock failed:", e);
      }

      try {
        const any = document.querySelector("audio");
        if (any) {
          any.muted = true;
          await any.play().catch(() => {});
          any.pause();
          any.currentTime = 0;
          any.muted = false;
        }
      } catch {}
      console.log("[audio] unlocked");
    }

    window.addEventListener("pointerdown", unlockAudio, { once: true, capture: true });
    window.addEventListener("keydown", unlockAudio, { once: true, capture: true });

    /* ====================== TIMING ====================== */
    const WPM = 300;
    const MS_PER_WORD = 60000 / WPM;

    function wordsCount(s) {
      return String(s || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
    }

    function msToRead(line) {
      const w = wordsCount(line);
      if (!w) return 650;
      return Math.max(1100, w * MS_PER_WORD + 650);
    }

    /* ====================== STATE ====================== */
    let stage = 1;
    let clicks = 0;
    let lastClick = 0;
    const CLICK_COOLDOWN = 650;

    const CRACK_AT = [15, 17, 19, 21];
    const SHATTER_AT = 22;

    const MAX_COMPLIANT_RATIO = 0.40;
    const MIN_CHOICES_BEFORE_CHECK = 10;
    let choiceTotal = 0;
    let choiceCompliant = 0;

    let resistanceScore = 0;
    let tasksCompleted = 0;
    function difficultyBoost() {
      const late = tasksCompleted >= 10;
      const base = Math.max(0, Math.min(6, resistanceScore));
      return late ? base + 1 : base;
    }

    /* ====================== TIMERS ====================== */
    let timers = [];
    function clearTimers() {
      timers.forEach((t) => clearTimeout(t));
      timers = [];
    }

    /* ======================
       VOICE LAYER
    ====================== */
    let VO = null;
    let VO_READY = false;

    function handleVoiceTag(tag) {
      if (tag === "breath") playSfx("static", { volume: 0.08, overlap: true });
      if (tag === "calm") {
        if (subs) subs.classList.add("calm");
        setTimeout(() => subs && subs.classList.remove("calm"), 900);
      }
    }

    function stripSpeakerPrefix(s) {
      return String(s || "").replace(/^\s*[^:]{1,32}:\s*/, "");
    }

    function normalizeForMatch(s) {
      return String(s || "")
        .replace(/\{[a-zA-Z0-9_]+\}/g, "")
        .replace(/^\s*\[\d{1,4}\]\s*/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
    }

    function getIdFromLine(rawLine) {
      const raw = String(rawLine || "");

      const m = raw.match(/^\s*\[(\d{1,4})\]\s*/);
      if (m) return String(m[1]).padStart(4, "0");

      if (!VO || !VO.byId) return null;

      const targetA = normalizeForMatch(raw);
      const targetB = normalizeForMatch(stripSpeakerPrefix(raw));

      for (const [id, line] of VO.byId.entries()) {
        const textRaw = line.text_raw ?? line.text ?? "";
        const candA = normalizeForMatch(textRaw);
        const candB = normalizeForMatch(stripSpeakerPrefix(textRaw));
        if (candA === targetA || candA === targetB || candB === targetA || candB === targetB) {
          return String(id).padStart(4, "0");
        }
      }
      return null;
    }

    window.AudioPlayer = {
      _audioChain: Promise.resolve(),
      async init() {
        if (VO_READY) return;

        if (!window.VoiceBank) {
          console.warn("VoiceBank not found. Make sure /audio_player.js loads before /main.js.");
          return;
        }

        VO = new window.VoiceBank({
          voicesUrl: "/audio/data/voices.json",
          onTag: (tagName) => handleVoiceTag(tagName),
        });

        VO.bindSubtitleUI({ nameEl: subsName, subtitleEl: subsText });

        await VO.load();
        VO_READY = true;
      },

      async unlock() {
        try {
          await this.init();
          if (VO && VO.unlockAudio) await VO.unlockAudio();
        } catch (e) {
          console.warn("AudioPlayer.unlock failed:", e);
        }
      },

      async playLine(rawLine) {
        await this.init();
        if (!VO) return Promise.resolve();

        const id = getIdFromLine(rawLine);
        if (!id) return Promise.resolve();

        this._audioChain = this._audioChain
          .then(() => VO.playById(id, { volume: 1.0, baseHoldMs: 160, stopPrevious: false }))
          .catch(() => {});
        return this._audioChain;
      },

      stop() {
        try {
          VO?.stopCurrent?.();
        } catch {}
      },
    };

    /* ====================== OUTPUT PIPE ====================== */
    function wait(ms) {
      return new Promise((r) => setTimeout(r, ms));
    }

    async function typeLineIntoSim(text, ms) {
      const s = String(text || "");
      if (!s) {
        simText.textContent += "\n";
        simText.scrollTop = simText.scrollHeight;
        return;
      }

      const minMs = 450;
      const total = Math.max(minMs, ms | 0);
      const chars = [...s];
      const per = total / Math.max(1, chars.length);

      for (let i = 0; i < chars.length; i++) {
        simText.textContent += chars[i];
        simText.scrollTop = simText.scrollHeight;
        await wait(per);
      }
      simText.textContent += "\n";
      simText.scrollTop = simText.scrollHeight;
    }

    function getTypingMsForLine(rawLine) {
      try {
        const id = getIdFromLine(rawLine);
        if (id && VO && VO.byId) {
          const meta = VO.byId.get(id);
          const d = Number(meta?.duration_sec ?? meta?.durationSec ?? meta?.duration ?? 0);
          if (Number.isFinite(d) && d > 0) return Math.floor(d * 1000);
        }
      } catch {}
      return msToRead(rawLine);
    }

    async function emitLine(line) {
      const raw = String(line || "");
      const printed = raw.replace(/^\s*\[\d{1,4}\]\s*/, "");

      const voPromise =
        window.AudioPlayer && typeof window.AudioPlayer.playLine === "function"
          ? window.AudioPlayer.playLine(raw)
          : Promise.resolve();

      const typingMs = getTypingMsForLine(raw);
      await typeLineIntoSim(printed, typingMs);

      try {
        await voPromise;
      } catch {}
    }

    async function playLines(lines) {
      clearTimers();
      for (const line of lines || []) {
        await emitLine(line);
        await wait(80);
      }
    }

    /* ====================== UI helpers ====================== */
    els.taskActions?.classList.add("hidden");

    function showChoices(labels) {
      if (labels?.complyLabel) choiceNeed.textContent = labels.complyLabel;
      if (labels?.lieLabel) choiceLie.textContent = labels.lieLabel;
      if (labels?.runLabel) choiceRun.textContent = labels.runLabel;

      simChoices.classList.remove("hidden");
      taskUI.classList.add("hidden");
      els.taskActions?.classList.add("hidden");
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

      els.taskActions?.classList.remove("hidden");
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

    function recordChoice(isCompliant) {
      choiceTotal++;
      if (isCompliant) choiceCompliant++;

      if (choiceTotal >= MIN_CHOICES_BEFORE_CHECK) {
        const ratio = choiceCompliant / choiceTotal;
        if (ratio > MAX_COMPLIANT_RATIO) {
          doReset(
            "TOO COMPLIANT",
            `Compliance threshold exceeded.

compliant: ${choiceCompliant}
total: ${choiceTotal}
ratio: ${(ratio * 100).toFixed(0)}%

Reinitializing simulation…`
          );
          return false;
        }
      }
      return true;
    }

    function penalize(amount = 1, note = "") {
      resistanceScore = Math.min(12, resistanceScore + Math.max(0, amount));
      if (note && !taskUI.classList.contains("hidden")) {
        const div = document.createElement("div");
        div.style.marginTop = "10px";
        div.style.opacity = "0.85";
        div.style.color = "rgba(255,190,190,.95)";
        div.textContent = `${note} (resistance: ${resistanceScore})`;
        taskBody.appendChild(div);
      }
    }

    function glitchPulse() {
      playSfx("glitch", { volume: 0.55, overlap: true });
      cracks.classList.add("flash");
      setTimeout(() => cracks.classList.remove("flash"), 220);

      try {
        taskUI.classList.remove("is-ok");
        taskUI.classList.add("is-error");
        setTimeout(() => taskUI.classList.remove("is-error"), 240);
      } catch {}
    }

    /* ====================== TURNSTILE ====================== */
    let tsWidgetId = null;
    let tsToken = null;

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
        callback: (token) => {
          tsToken = token;
        },
        "expired-callback": () => {
          tsToken = null;
        },
        "error-callback": () => {
          tsToken = null;
        },
      });
    }

    function getTurnstileToken() {
      if (!window.turnstile || tsWidgetId === null) return tsToken;
      const t = window.turnstile.getResponse(tsWidgetId);
      return t || tsToken;
    }

    function resetTurnstile() {
      if (window.turnstile && tsWidgetId !== null) window.turnstile.reset(tsWidgetId);
      tsToken = null;
    }

    /* ====================== FINAL MODAL ====================== */
    let finalDiscordName = "";

    function openFinalModal(prefillDiscord = "") {
      finalErr.textContent = "";
      finalOverlay.classList.remove("hidden");
      finalOverlay.setAttribute("aria-hidden", "false");
      finalDiscord.value = prefillDiscord || finalDiscordName || "";
      ensureTurnstile();
      resetTurnstile();
    }

    function closeFinalModal() {
      finalOverlay.classList.add("hidden");
      finalOverlay.setAttribute("aria-hidden", "true");
    }

    finalCancel.onclick = () => closeFinalModal();

    finalVerify.onclick = async () => {
      finalErr.textContent = "";
      finalDiscordName = (finalDiscord.value || "").trim();

      if (!finalDiscordName) {
        finalErr.textContent = "Discord username required.";
        return;
      }

      const token = getTurnstileToken();
      if (!token) {
        finalErr.textContent = "Please complete the verification checkbox.";
        return;
      }

      closeFinalModal();
      startHackTask();
    };

    /* ====================== HACK TASK ====================== */
    const FILES = [
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
          "BOOT: init sequence complete",
        ],
        targets: [3, 6, 7],
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
          "notes = 'subject attempted exit'",
        ],
        targets: [4, 5, 6],
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
          "cache: purge=disabled",
        ],
        targets: [4, 5, 6],
      },
    ];

    let activeFileIndex = 0;
    let selected = new Set();

    function forceHackTopLayer() {
      hackRoom.style.position = "fixed";
      hackRoom.style.inset = "0";
      hackRoom.style.zIndex = "2000";
      hackRoom.style.margin = "0";
      hackRoom.style.width = "100%";
      hackRoom.style.overflow = "auto";
    }

    function renderFile(idx) {
      activeFileIndex = idx;
      selected = new Set();
      const f = FILES[idx];

      hackFilename.textContent = f.name;
      hackStatus.textContent = "Select ONLY the highlighted target lines, then delete.";
      hackTargets.textContent = ` (target lines: ${f.targets.join(", ")})`;

      hackLines.innerHTML = "";
      f.lines.forEach((txt, i) => {
        const ln = i + 1;
        const row = document.createElement("div");
        row.className = "hack-line";
        if (f.targets.includes(ln)) row.classList.add("target");

        const left = document.createElement("div");
        left.className = "hack-ln";
        left.textContent = String(ln);

        const right = document.createElement("div");
        right.className = "hack-txt";
        right.textContent = txt;

        row.appendChild(left);
        row.appendChild(right);

        row.onclick = () => {
          if (selected.has(i)) {
            selected.delete(i);
            row.classList.remove("selected");
          } else {
            row.classList.add("selected");
            selected.add(i);
          }
        };

        hackLines.appendChild(row);
      });
    }

    function resetHack() {
      renderFile(activeFileIndex);
    }

    const hackFileBtns = Array.from(document.querySelectorAll(".hack-filebtn"));
    hackFileBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        hackFileBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const idx = Number(btn.getAttribute("data-file") || "0");
        renderFile(idx);
      });
    });
    if (hackFileBtns[0]) hackFileBtns[0].classList.add("active");

    hackReset.onclick = resetHack;

    hackDelete.onclick = async () => {
      const f = FILES[activeFileIndex];
      const selectedLines = Array.from(selected)
        .map((i) => i + 1)
        .sort((a, b) => a - b);
      const targets = f.targets.slice().sort((a, b) => a - b);

      const ok =
        selectedLines.length === targets.length &&
        selectedLines.every((v, i) => v === targets[i]);

      if (!ok) {
        hackStatus.textContent = "Wrong lines. Workstation locked. Reset required.";
        glitchPulse();
        setTimeout(resetHack, 700);
        return;
      }

      const delIdx = Array.from(selected).sort((a, b) => b - a);
      for (const i of delIdx) f.lines.splice(i, 1);

      hackStatus.textContent = "Lines deleted. Finalizing wipe…";
      playSfx("thud", { volume: 0.45, overlap: true });

      try {
        const token = getTurnstileToken();

        const res = await fetch("/api/complete", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            discord: finalDiscordName,
            answer: "N/A",
            turnstile: token,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          hackStatus.textContent = "Server rejected completion. Reset and try again.";
          glitchPulse();
          return;
        }

        const code = data.code || "";
        sessionStorage.setItem("escape_code", code);
        sessionStorage.setItem("escape_user", finalDiscordName);
        window.location.href = "/escaped.html";
      } catch {
        hackStatus.textContent = "Network error. Reset and try again.";
        glitchPulse();
      }
    };

    function startHackTask() {
      simChoices.classList.add("hidden");
      taskUI.classList.add("hidden");
      els.taskActions?.classList.add("hidden");

      forceHackTopLayer();

      hackUser.textContent = `USER: ${finalDiscordName}`;
      hackRoom.classList.remove("hidden");
      renderFile(0);
    }

    /* ====================== TASK RUNNER ====================== */
    const taskContext = {
      taskPrimary,
      taskSecondary,
      taskBody,
      showTaskUI,
      doReset,
      difficultyBoost,
      penalize,
      glitch: glitchPulse,
    };

    let guidePath = "unknown"; // "emma" | "liam" | "run" | "unknown"

    function chooseFillerPool() {
      if (guidePath === "run") return resistanceScore >= 6 ? "filler_run_hard" : "filler_run";
      if (guidePath === "emma") return resistanceScore >= 6 ? "filler_security_pressure" : "filler_security";
      if (guidePath === "liam") return resistanceScore >= 6 ? "filler_worker_pressure" : "filler_worker";
      if (resistanceScore >= 7) return "filler_system_pressure";
      if (resistanceScore >= 3) return "filler_standard";
      return "filler_security";
    }

    let almostDoneTriggered = false;
    async function maybeAlmostDonePhase() {
      if (almostDoneTriggered) return;
      if (tasksCompleted < 10) return;

      almostDoneTriggered = true;

      const pool = DIALOGUE.almostDone?.say || [
        "System: You are close.",
        "System: Please do not celebrate early.",
        "Emma (Security): This part is where people mess up.",
        "Liam (Worker): Keep it boring. Keep it small.",
      ];
      await playLines(pool);

      const endPoolName = chooseFillerPool();
      const endPool = DIALOGUE.fillerPools?.[endPoolName] || [];
      if (endPool.length) {
        const pick1 = endPool[Math.floor(Math.random() * endPool.length)];
        const pick2 = endPool[Math.floor(Math.random() * endPool.length)];
        await playLines([String(pick1), String(pick2)]);
      }

      openFinalModal(finalDiscordName);
    }

    async function runSteps(steps) {
      for (const step of steps) {
        if (step.say) {
          await playLines(step.say);
          continue;
        }

        if (step.task) {
          const fn = TASKS[step.task];
          if (!fn) {
            console.warn("[sim] Missing task:", step.task, step.args || {});
            await playLines([`System: PROCEDURE MISSING (${step.task}).`]);
            continue;
          }

          await fn(taskContext, step.args || {});
          tasksCompleted++;
          await maybeAlmostDonePhase();
          continue;
        }

        if (step.filler) {
          const count = Number(step.filler.count || 1);
          let poolName = String(step.filler.pool || "filler_standard");
          if (poolName === "AUTO") poolName = chooseFillerPool();

          const pool = DIALOGUE.fillerPools?.[poolName] || [];
          for (let i = 0; i < count; i++) {
            if (!pool.length) break;
            const pick = pool[Math.floor(Math.random() * pool.length)];
            if (typeof pick === "string") await playLines([pick]);
            else if (pick?.say) await playLines(pick.say);
          }
          continue;
        }
      }
    }

    /* ====================== SIM FLOW ====================== */
    async function openSimRoom() {
      stage = 99;

      await unlockAudio();

      document.body.classList.add("in-sim");

      // IMPORTANT: remove .hidden so CSS can position it (you were keeping it display:none)
      subs?.classList.remove("hidden");

      simRoom.classList.remove("hidden");
      taskUI.classList.add("hidden");
      simChoices.classList.add("hidden");
      hackRoom.classList.add("hidden");

      simText.textContent = "";
      playSfx("static1", { volume: 0.25, overlap: false });

      await playLines(DIALOGUE.intro);
      await runChoiceBeats();
      await runSteps(DIALOGUE.steps);
    }

    function waitForChoice() {
      return new Promise((resolve) => {
        const cleanup = () => {
          choiceNeed.onclick = null;
          choiceLie.onclick = null;
          choiceRun.onclick = null;
        };
        choiceNeed.onclick = () => {
          cleanup();
          resolve("comply");
        };
        choiceLie.onclick = () => {
          cleanup();
          resolve("lie");
        };
        choiceRun.onclick = () => {
          cleanup();
          resolve("run");
        };
      });
    }

    async function runChoiceBeats() {
      for (let i = 0; i < (DIALOGUE.choiceBeats || []).length; i++) {
        const beat = DIALOGUE.choiceBeats[i];

        await playLines(beat.say || []);
        showChoices(beat.choices);

        const choice = await waitForChoice();

        if (i === 0) {
          if (choice === "comply") guidePath = "emma";
          else if (choice === "lie") guidePath = "liam";
          else guidePath = "run";
        }

        if (choice === "comply") {
          if (!recordChoice(true)) return;
          resistanceScore = Math.max(0, resistanceScore - 1);
        } else if (choice === "lie") {
          if (!recordChoice(true)) return;
          resistanceScore = Math.min(12, resistanceScore + 0);
        } else {
          if (!recordChoice(false)) return;
          resistanceScore = Math.min(12, resistanceScore + 2);
        }
        hideChoices();
        await playLines(beat.respond && beat.respond[choice] ? beat.respond[choice] : []);
      }
    }

    /* ======================
       CRACKS (4 staged) + GLASS FALL -> SIM
    ====================== */
    document.addEventListener("selectstart", (e) => {
      const t = e.target;
      const el = t && t.nodeType === 1 ? t : t?.parentElement || null;

      if (el && el.closest && el.closest("input, textarea")) return;

      if (stage === 1 || document.body.classList.contains("sim-transition")) {
        e.preventDefault();
      }
    });

    let crackBuilt = false;
    let crackStage = 0;

    function rand(seed) {
      let t = seed >>> 0;
      return () => {
        t += 0x6d2b79f5;
        let x = Math.imul(t ^ (t >>> 15), 1 | t);
        x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
      };
    }

    function makePathFromCenter(rng, cx, cy, steps, stepLen, jitter) {
      let x = cx,
        y = cy;
      let ang = rng() * Math.PI * 2;
      const pts = [`M ${x.toFixed(1)} ${y.toFixed(1)}`];

      for (let i = 0; i < steps; i++) {
        ang += (rng() - 0.5) * jitter;
        x += Math.cos(ang) * stepLen * (0.75 + rng() * 0.7);
        y += Math.sin(ang) * stepLen * (0.75 + rng() * 0.7);
        x = Math.max(-60, Math.min(1060, x));
        y = Math.max(-60, Math.min(1060, y));
        pts.push(`L ${x.toFixed(1)} ${y.toFixed(1)}`);
      }
      return pts.join(" ");
    }

    function addSeg(svg, d, rank) {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "seg");
      g.setAttribute("data-rank", String(rank));

      const pUnder = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pUnder.setAttribute("d", d);
      pUnder.setAttribute("class", "crack-path crack-under pending");

      const pLine = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pLine.setAttribute("d", d);
      pLine.setAttribute("class", "crack-path crack-line pending");

      const pGlint = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pGlint.setAttribute("d", d);
      pGlint.setAttribute("class", "crack-path crack-glint pending");
      pGlint.style.opacity = "0.0";

      g.appendChild(pUnder);
      g.appendChild(pLine);
      g.appendChild(pGlint);
      svg.appendChild(g);

      [pUnder, pLine, pGlint].forEach((p) => {
        try {
          const len = p.getTotalLength();
          p.style.strokeDasharray = String(len);
          p.style.strokeDashoffset = String(len);
          p.style.setProperty("--dash", String(len));
        } catch {}
      });

      if (Math.random() < 0.35) pGlint.style.opacity = "0.85";
    }

    function ensureCracks() {
      if (crackBuilt) return;

      const seed = (Date.now() ^ (Math.random() * 1e9)) & 0xffffffff;
      const rng = rand(seed);

      cracks.innerHTML = "";

      const paneCount = 18;

      // Build SVG cracks (ranked 1..4 so we can reveal in stages)
      let svg = cracks;
      const isSvg = svg && svg.namespaceURI === "http://www.w3.org/2000/svg";

      if (!isSvg) {
        // If #cracks is a div, we create an svg inside it
        cracks.innerHTML = "";
        svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 1000 1000");
        svg.setAttribute("preserveAspectRatio", "none");
        svg.style.width = "100%";
        svg.style.height = "100%";
        cracks.appendChild(svg);
      } else {
        svg.innerHTML = "";
        svg.setAttribute("viewBox", "0 0 1000 1000");
        svg.setAttribute("preserveAspectRatio", "none");
      }

      // Multiple origins so it feels like “panes” reflecting/duplicating
      const origins = [
        { x: 320 + rng() * 90, y: 280 + rng() * 90, bias: 1 },
        { x: 680 + rng() * 90, y: 320 + rng() * 90, bias: 2 },
        { x: 360 + rng() * 90, y: 720 + rng() * 90, bias: 3 },
        { x: 720 + rng() * 90, y: 740 + rng() * 90, bias: 4 },
      ];

      // Main “spines”
      for (let i = 0; i < origins.length; i++) {
        const o = origins[i];
        const spineSteps = 12 + Math.floor(rng() * 10);
        const spineLen = 26 + rng() * 18;
        const spineJitter = 1.25 + rng() * 0.8;

        const d = makePathFromCenter(rng, o.x, o.y, spineSteps, spineLen, spineJitter);

        // rank: make earlier stages get fewer, thicker spines
        const rank = (i % 4) + 1;
        addSeg(svg, d, rank);

        // Branches off spine
        const branchCount = 3 + Math.floor(rng() * 4);
        for (let b = 0; b < branchCount; b++) {
          const bx = o.x + (rng() - 0.5) * 240;
          const by = o.y + (rng() - 0.5) * 240;

          const steps = 6 + Math.floor(rng() * 8);
          const stepLen = 14 + rng() * 10;
          const jitter = 1.8 + rng() * 1.0;

          const bd = makePathFromCenter(rng, bx, by, steps, stepLen, jitter);

          // heavier weighting toward later stages for branch clutter
          const rPick = rng();
          const brRank = rPick < 0.28 ? 2 : rPick < 0.58 ? 3 : 4;
          addSeg(svg, bd, brRank);
        }
      }

      // Extra micro-fractures (mostly later stages)
      for (let i = 0; i < paneCount; i++) {
        const cx = 120 + rng() * 760;
        const cy = 120 + rng() * 760;
        const steps = 3 + Math.floor(rng() * 5);
        const stepLen = 10 + rng() * 10;
        const jitter = 2.4 + rng() * 1.2;

        const d = makePathFromCenter(rng, cx, cy, steps, stepLen, jitter);
        const rank = rng() < 0.15 ? 2 : rng() < 0.55 ? 3 : 4;
        addSeg(svg, d, rank);
      }

      crackBuilt = true;
      setCrackStage(0);
    }

    function setCrackStage(n) {
      crackStage = clamp(n, 0, 4);

      // body hooks for CSS (optional)
      document.body.classList.toggle("crack1", crackStage >= 1);
      document.body.classList.toggle("crack2", crackStage >= 2);
      document.body.classList.toggle("crack3", crackStage >= 3);
      document.body.classList.toggle("crack4", crackStage >= 4);

      cracks.setAttribute?.("data-stage", String(crackStage));
      if (glassFX) glassFX.setAttribute?.("data-stage", String(crackStage));

      const segs = cracks.querySelectorAll?.(".seg") || [];
      segs.forEach((g) => {
        const rank = Number(g.getAttribute("data-rank") || "4");
        const reveal = rank <= crackStage;

        g.querySelectorAll("path").forEach((p) => {
          if (reveal) {
            p.classList.remove("pending");
            p.classList.add("active");
            // animate draw-in
            try {
              requestAnimationFrame(() => {
                p.style.strokeDashoffset = "0";
              });
            } catch {}
          } else {
            p.classList.add("pending");
            p.classList.remove("active");
            // reset to hidden
            try {
              const len = p.style.getPropertyValue("--dash") || p.getTotalLength?.() || 0;
              p.style.strokeDashoffset = String(len);
            } catch {}
          }
        });
      });
    }

    function maybeAdvanceCracks() {
      // stage thresholds
      const next =
        clicks >= CRACK_AT[3] ? 4 :
        clicks >= CRACK_AT[2] ? 3 :
        clicks >= CRACK_AT[1] ? 2 :
        clicks >= CRACK_AT[0] ? 1 : 0;

      if (next !== crackStage) {
        setCrackStage(next);
        playSfx("glitch1", { volume: 0.22, overlap: true });
        cracks.classList.add("pulse");
        setTimeout(() => cracks.classList.remove("pulse"), 220);
      }
    }

    async function shatterAndEnterSim() {
      if (document.body.classList.contains("sim-transition")) return;
      document.body.classList.add("sim-transition");

      playSfx("glassBreak", { volume: 0.65, overlap: false });
      cracks.classList.add("shatter");
      glassFX?.classList.add("shatter");

      // small delay for visual
      await wait(520);

      // hide landing bits if you have them (safe if missing)
      document.querySelectorAll(".landingOnly").forEach((n) => n.classList.add("hidden"));

      await openSimRoom();
    }

    function isClickableTarget(e) {
      const t = e.target;
      if (!t) return true;
      if (t.closest && t.closest("input, textarea, select, button, a, label")) return false;
      if (t.closest && t.closest("#finalOverlay, #hackRoom, #taskUI, #adminPanel")) return false;
      return true;
    }

    function registerLandingClick(e) {
      if (stage !== 1) return;
      if (document.body.classList.contains("sim-transition")) return;
      if (!isClickableTarget(e)) return;

      const now = Date.now();
      if (now - lastClick < CLICK_COOLDOWN) return;
      lastClick = now;

      ensureCracks();

      clicks++;
      playSfx("mclick", { volume: 0.35, overlap: true });

      maybeAdvanceCracks();

      if (clicks >= SHATTER_AT) {
        shatterAndEnterSim();
      }
    }

    // Build cracks lazily (first interaction), but safe to prime:
    ensureCracks();

    // Register clicks anywhere on the landing
    document.addEventListener("pointerdown", registerLandingClick, { passive: true });

    /* ====================== BOOT UI ====================== */
    // If you have a launch button, allow it to also count as clicks (but not required)
    els.launchBtn?.addEventListener("click", (e) => {
      // treat as a landing click (honors cooldown)
      registerLandingClick(e);
    });

    // Basic timestamp tick if you have it
    if (els.timestamp) {
      const tick = () => {
        const d = new Date();
        els.timestamp.textContent = d.toLocaleString();
      };
      tick();
      setInterval(tick, 1000);
    }

    // start in landing mode
    stage = 1;
  }

  boot();
})();
