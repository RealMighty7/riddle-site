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

    const OPTIONAL_IDS = [
      "viewerToken",
      "launchBtn",
      "launchStatus",
      "adminPanel",
      "adminTask",
      "adminAnswer",
      "adminStoredAnswer",
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

    /* ====================== LANDING ASSETS ====================== */
    const IMAGE_POOL = Array.from({ length: 12 }, (_, i) => `/assets/img${i + 1}.jpg`);
    document.querySelectorAll(".adImg").forEach((img) => {
      img.src = IMAGE_POOL[Math.floor(Math.random() * IMAGE_POOL.length)];
    });

    /* ====================== SFX ====================== */
    function playSfx(name, opts = {}) {
      if (typeof window.playSfx === "function") {
        const map = {
          glitch1: "glitch",
          glitch2: "glitch",
          static1: "static",
          static2: "staticSoft",
        };
        const id = map[name] || name;
        try { window.playSfx(id, opts); } catch {}
      }
    }

    /* ====================== VIEWER TOKEN LOCK (until launch) ====================== */
    let launchArmed = false;

    if (viewerToken) {
      viewerToken.disabled = true;
      viewerToken.value = "";
    }

    function armLaunch() {
      if (launchArmed) return;
      launchArmed = true;

      if (viewerToken) {
        viewerToken.disabled = false;
        viewerToken.focus();
      }

      // first click also counts toward cracks (your request)
      // (launch button handler calls registerLandingClick)
    }

    /* ======================
       ADMIN ACCESS (SHA-256)
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
      document.dispatchEvent(new CustomEvent("admin:enabled"));
    }

    if (viewerToken) {
      viewerToken.addEventListener("input", async () => {
        if (!launchArmed) return; // ✅ can’t type/use token until launch clicked

        const v = viewerToken.value.trim();
        if (!v || v.length < 8) return;

        let h = "";
        try { h = await sha256(v); }
        catch (e) { console.warn("[admin] sha256 failed", e); return; }

        if (h === ADMIN_HASH) grantAdmin();
      });
    }

    // global skip flag consumed by the task runner
    window.__ADMIN_FORCE_OK = false;

    function initAdminPanel() {
      const panel = document.getElementById("adminPanel");
      if (!panel) return;
      panel.classList.remove("hidden");

      if (panel.parentElement !== document.body) document.body.appendChild(panel);

      const elTask = document.getElementById("adminTask");
      const elArgs = document.getElementById("adminAnswer");
      const elStored = document.getElementById("adminStoredAnswer");
      const btnSkip = document.getElementById("adminSkip");
      const btnToggle = document.getElementById("adminToggle");

      btnToggle?.addEventListener("click", () => {
        const willHide = !panel.classList.contains("hidden");
        if (willHide) {
          try { document.activeElement?.blur?.(); } catch {}
        }
        panel.classList.toggle("hidden");
        panel.setAttribute("aria-hidden", panel.classList.contains("hidden") ? "true" : "false");
        btnToggle.textContent = panel.classList.contains("hidden") ? "show" : "hide";
      });

      btnSkip?.addEventListener("click", () => {
        window.__ADMIN_FORCE_OK = true;
        document.dispatchEvent(new CustomEvent("admin:skip", { bubbles: true }));
        panel.setAttribute("aria-hidden", "false");
        try { document.activeElement?.blur?.(); } catch {}
      });

      document.addEventListener("admin:task", (e) => {
        const id = e?.detail?.taskId || "—";
        const args = e?.detail?.args ? JSON.stringify(e.detail.args) : "—";
        if (elTask) elTask.textContent = id;
        if (elArgs) elArgs.textContent = args;
      });

      document.addEventListener("admin:answer", (e) => {
        const ans = e?.detail?.answer;
        if (!elStored) return;
        elStored.textContent = ans == null ? "—" : String(ans);
      });
    }

    document.addEventListener("admin:enabled", () => {
      const sys = document.getElementById("system");
      if (sys) sys.textContent = "admin context detected.";
      initAdminPanel();
    });

    /* ====================== AUDIO UNLOCK ====================== */
    let audioUnlocked = false;

    async function unlockAudio() {
      if (audioUnlocked) return;
      audioUnlocked = true;

      try {
        if (window.AudioPlayer?.unlock) await window.AudioPlayer.unlock();
      } catch (e) {
        console.warn("[audio] unlock failed:", e);
      }
    }

    window.addEventListener("pointerdown", unlockAudio, { once: true, capture: true });
    window.addEventListener("keydown", unlockAudio, { once: true, capture: true });

    /* ====================== TIMING ====================== */
    const WPM = 300;
    const MS_PER_WORD = 60000 / WPM;

    function wordsCount(s) {
      return String(s || "").trim().split(/\s+/).filter(Boolean).length;
    }
    function msToRead(line) {
      const w = wordsCount(line);
      if (!w) return 650;
      return Math.max(1100, w * MS_PER_WORD + 650);
    }

    /* ====================== STATE ====================== */
    let stage = 1;          // 1 = landing clickable, 99 = sim
    let clicks = 0;
    let lastClick = 0;
    const CLICK_COOLDOWN = 650;

    const CRACK_AT = [15, 17, 19, 21];
    const SHATTER_AT = 22;

    // Compliance after 10 choices:
    // comply => +1 compliance
    // lie    => +1 resistance
    // run    => +2 resistance
    const COMPLIANCE_LIMIT = 0.30;
    const MIN_CHOICES_BEFORE_CHECK = 10;
    let choiceTotal = 0;
    let compliancePoints = 0;
    let resistancePoints = 0;

    /* ====================== UTIL ====================== */
    function wait(ms) {
      return new Promise((r) => setTimeout(r, ms));
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

    function glitchPulse() {
      playSfx("glitch", { volume: 0.55, overlap: true });
      cracks.classList.add("flash");
      setTimeout(() => cracks.classList.remove("flash"), 220);
    }

    /* ======================
       VOICE LAYER (your existing audio_player.js)
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
        try { VO?.stopCurrent?.(); } catch {}
      },
    };

    /* ====================== OUTPUT PIPE ====================== */
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

      await Promise.all([
        typeLineIntoSim(printed, typingMs),
        voPromise
      ]);
    }

    async function playLines(lines) {
      for (const line of lines || []) {
        await emitLine(line);
        await wait(80);
      }
    }

    /* ======================
       TASK CONTEXT + ANSWER HOOK
    ====================== */
    let lastAnswer = null;

    const taskContext = {
      taskPrimary,
      taskSecondary,
      taskBody,
      setAnswer(ans) {
        lastAnswer = ans;
        document.dispatchEvent(new CustomEvent("admin:answer", { detail: { answer: ans } }));
      },
      getAnswer() {
        return lastAnswer;
      },
      showTaskUI(title, desc) {
        document.body.classList.add("task-open");
        simRoom.classList.add("hidden");

        taskUI.classList.remove("hidden");
        taskTitle.textContent = title;
        taskDesc.textContent = desc;
        taskBody.innerHTML = "";

        taskSecondary.classList.add("hidden");
        taskPrimary.disabled = false;

        els.taskActions?.classList.remove("hidden");
      },
      doReset,
      difficultyBoost() { return 0; }, // (your packs can ignore or overwrite later)
      penalize() {},
      glitch: glitchPulse,
    };

    /* ====================== CHOICE HANDLING + COMPLIANCE CHECK ====================== */
    function checkComplianceOrReset() {
      if (choiceTotal < MIN_CHOICES_BEFORE_CHECK) return true;

      const denom = Math.max(1, compliancePoints + resistancePoints);
      const ratio = compliancePoints / denom;

      if (ratio >= COMPLIANCE_LIMIT) {
        doReset(
          "TOO COMPLIANT",
          `Compliance threshold exceeded.

compliance: ${compliancePoints}
resistance: ${resistancePoints}
ratio: ${(ratio * 100).toFixed(0)}%

Reinitializing simulation…`
        );
        return false;
      }
      return true;
    }

    function waitForChoice() {
      return new Promise((resolve) => {
        const cleanup = () => {
          choiceNeed.onclick = null;
          choiceLie.onclick = null;
          choiceRun.onclick = null;
        };
        choiceNeed.onclick = () => { cleanup(); resolve("comply"); };
        choiceLie.onclick = () => { cleanup(); resolve("lie"); };
        choiceRun.onclick = () => { cleanup(); resolve("run"); };
      });
    }

    async function runSteps(steps) {
      for (const step of steps) {
        if (step.say) {
          document.body.classList.remove("task-open");
          simRoom.classList.remove("hidden");
          taskUI.classList.add("hidden");
          await playLines(step.say);
          continue;
        }

        if (step.choice) {
          document.body.classList.remove("task-open");
          simRoom.classList.remove("hidden");
          taskUI.classList.add("hidden");

          const labels = step.choice;
          if (labels?.complyLabel) choiceNeed.textContent = labels.complyLabel;
          if (labels?.lieLabel) choiceLie.textContent = labels.lieLabel;
          if (labels?.runLabel) choiceRun.textContent = labels.runLabel;
          simChoices.classList.remove("hidden");

          const choice = await waitForChoice();
          simChoices.classList.add("hidden");

          choiceTotal++;
          if (choice === "comply") compliancePoints += 1;
          else if (choice === "lie") resistancePoints += 1;
          else resistancePoints += 2;

          if (!checkComplianceOrReset()) return;
          continue;
        }

        if (step.task) {
          document.dispatchEvent(new CustomEvent("admin:task", {
            detail: { taskId: step.task, args: step.args || null }
          }));

          if (window.__ADMIN_FORCE_OK) {
            window.__ADMIN_FORCE_OK = false;
            await wait(200);
            continue;
          }

          const fn = TASKS[step.task];
          if (!fn) {
            await playLines([`System: PROCEDURE MISSING (${step.task}).`]);
            continue;
          }

          document.body.classList.add("task-open");
          simRoom.classList.add("hidden");
          simChoices.classList.add("hidden");

          lastAnswer = null;
          const res = await fn(taskContext, step.args || {});
          if (res && typeof res === "object" && "answer" in res && lastAnswer == null) {
            taskContext.setAnswer(res.answer);
          }

          taskUI.classList.add("hidden");
          document.body.classList.remove("task-open");
          simRoom.classList.remove("hidden");

          await wait(250);
          continue;
        }

        if (step.filler) {
          // keep simple for now; you said you’ll rewrite dialogue later
          continue;
        }
      }
    }

    /* ====================== SIM FLOW ====================== */
    async function openSimRoom() {
      stage = 99;

      await unlockAudio();

      document.body.classList.add("in-sim");
      subs?.classList.remove("hidden");

      simRoom.classList.remove("hidden");
      taskUI.classList.add("hidden");
      simChoices.classList.add("hidden");
      hackRoom.classList.add("hidden");

      simText.textContent = "";
      playSfx("static1", { volume: 0.25, overlap: false });

      await playLines(DIALOGUE.intro);
      await runSteps(DIALOGUE.steps);
    }

    /* ======================
       CRACKS: progressive, builds off existing (no shifting)
    ====================== */
    let crackStage = 0;
    let crackSeed = 0;
    let crackRng = null;

    const endpoints = []; // {x,y} where we can branch next

    function rngFactory(seed) {
      let t = seed >>> 0;
      return () => {
        t += 0x6d2b79f5;
        let x = Math.imul(t ^ (t >>> 15), 1 | t);
        x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
      };
    }

    function pickEndpoint() {
      if (!endpoints.length) return { x: 500, y: 500 };
      return endpoints[Math.floor(crackRng() * endpoints.length)];
    }

    function clampPt(p) {
      return {
        x: Math.max(-60, Math.min(1060, p.x)),
        y: Math.max(-60, Math.min(1060, p.y)),
      };
    }

    function makeBranchPath(start, steps, stepLen, jitter) {
      let x = start.x, y = start.y;
      let ang = crackRng() * Math.PI * 2;

      const pts = [`M ${x.toFixed(1)} ${y.toFixed(1)}`];

      for (let i = 0; i < steps; i++) {
        ang += (crackRng() - 0.5) * jitter;
        x += Math.cos(ang) * stepLen * (0.75 + crackRng() * 0.7);
        y += Math.sin(ang) * stepLen * (0.75 + crackRng() * 0.7);
        const p = clampPt({ x, y });
        x = p.x; y = p.y;
        pts.push(`L ${x.toFixed(1)} ${y.toFixed(1)}`);
      }

      // last point becomes a new endpoint we can branch from
      endpoints.push({ x, y });

      return pts.join(" ");
    }

    function addSeg(svg, d) {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "seg");
    
      const pUnder = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pUnder.setAttribute("d", d);
      pUnder.setAttribute("class", "crack-path crack-under");
    
      const pLine = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pLine.setAttribute("d", d);
      pLine.setAttribute("class", "crack-path crack-line");
    
      const pGlint = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pGlint.setAttribute("d", d);
      pGlint.setAttribute("class", "crack-path crack-glint");
      pGlint.style.opacity = crackRng() < 0.35 ? "0.85" : "0.0";
    
      g.appendChild(pUnder);
      g.appendChild(pLine);
      g.appendChild(pGlint);
      svg.appendChild(g);
    
      // draw-on animation (uses dash)
      [pUnder, pLine, pGlint].forEach((p) => {
        try {
          const len = p.getTotalLength();
          p.style.strokeDasharray = String(len);
          p.style.strokeDashoffset = String(len);
          requestAnimationFrame(() => {
            p.style.strokeDashoffset = "0";
          });
        } catch {}
      });
    }

    function ensureCracks() {
      if (crackRng) return;
    
      crackSeed = (Date.now() ^ ((Math.random() * 1e9) | 0)) >>> 0;
      crackRng = rngFactory(crackSeed);
    
      // Make sure the SVG has the right viewbox but DON'T clear it again later.
      try {
        cracks.setAttribute("viewBox", "0 0 1000 1000");
        cracks.setAttribute("preserveAspectRatio", "none");
      } catch {}
    
      endpoints.length = 0;
    
      // seed a few “spines” so later stages can branch off them
      const seeds = [
        { x: 320 + crackRng() * 90, y: 280 + crackRng() * 90 },
        { x: 680 + crackRng() * 90, y: 320 + crackRng() * 90 },
        { x: 360 + crackRng() * 90, y: 720 + crackRng() * 90 },
        { x: 720 + crackRng() * 90, y: 740 + crackRng() * 90 },
      ];
    
      for (const s of seeds) {
        const d = makeBranchPath(s, 10 + Math.floor(crackRng() * 8), 22 + crackRng() * 14, 1.25 + crackRng() * 0.8);
        addSeg(cracks, d);
      }
    
      // a couple small interior fractures (still fixed, not re-randomized)
      for (let i = 0; i < 6; i++) {
        const s = { x: 140 + crackRng() * 720, y: 140 + crackRng() * 720 };
        const d = makeBranchPath(s, 4 + Math.floor(crackRng() * 4), 10 + crackRng() * 10, 2.1 + crackRng() * 1.1);
        addSeg(cracks, d);
      }
    }

    function setCrackStage(n) {
      crackStage = clamp(n, 0, 4);
    
      document.body.classList.toggle("crack1", crackStage >= 1);
      document.body.classList.toggle("crack2", crackStage >= 2);
      document.body.classList.toggle("crack3", crackStage >= 3);
      document.body.classList.toggle("crack4", crackStage >= 4);
    
      try { cracks.setAttribute("data-stage", String(crackStage)); } catch {}
      try { glassFX?.setAttribute("data-stage", String(crackStage)); } catch {}
    }

// ✅ this is the “build off existing cracks” behavior:
// each stage adds NEW branches from existing endpoints; nothing is cleared or moved.
function growCracksForStage(stageToAdd) {
  ensureCracks();

  // branch count per stage (tweakable)
  const addCount =
    stageToAdd === 1 ? 10 :
    stageToAdd === 2 ? 14 :
    stageToAdd === 3 ? 18 :
    22;

  for (let i = 0; i < addCount; i++) {
    const base = pickEndpoint();
    // slight offset so it looks like it *continues* rather than restarts
    const start = {
      x: base.x + (crackRng() - 0.5) * 24,
      y: base.y + (crackRng() - 0.5) * 24,
    };

    const steps = 4 + Math.floor(crackRng() * (stageToAdd + 3));
    const stepLen = 10 + crackRng() * (10 + stageToAdd * 6);
    const jitter = 1.5 + crackRng() * (1.0 + stageToAdd * 0.35);

    const d = makeBranchPath(start, steps, stepLen, jitter);
    addSeg(cracks, d);
  }
}

function maybeAdvanceCracks() {
  const next =
    clicks >= CRACK_AT[3] ? 4 :
    clicks >= CRACK_AT[2] ? 3 :
    clicks >= CRACK_AT[1] ? 2 :
    clicks >= CRACK_AT[0] ? 1 : 0;

  if (next <= crackStage) return;

  // advance one stage at a time so growth feels progressive
  for (let s = crackStage + 1; s <= next; s++) {
    setCrackStage(s);
    growCracksForStage(s);
  }

  playSfx("glitch1", { volume: 0.22, overlap: true });
  cracks.classList.add("pulse");
  setTimeout(() => cracks.classList.remove("pulse"), 220);
}

/* ======================
   TRANSITION: SHATTER -> SIM
====================== */
async function shatterAndEnterSim() {
  if (document.body.classList.contains("sim-transition")) return;

  document.body.classList.add("sim-transition");

  // ensure cracks are visible for the warp
  ensureCracks();
  cracks.style.opacity = "1";

  playSfx("glassBreak", { volume: 0.65, overlap: false });

  // between-state animation (styles.css uses body.into-sim)
  document.body.classList.add("into-sim");

  // hold long enough to SEE it
  await wait(900);

  await openSimRoom();

  // cleanup
  document.body.classList.remove("into-sim");
}

/* ======================
   LANDING CLICK REGISTRATION
====================== */
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

// Prime crack seed so it stays consistent (but stage 0 still invisible)
ensureCracks();

// Register clicks anywhere on landing
document.addEventListener("pointerdown", registerLandingClick, { passive: true });

/* ====================== BOOT UI ====================== */
els.launchBtn?.addEventListener("click", (e) => {
  armLaunch();           // ✅ unlock viewer token typing
  registerLandingClick(e); // ✅ also counts as a click toward cracks
});

// Timestamp tick (index also has an inline script; this keeps it consistent)
if (els.timestamp) {
  const tick = () => {
    const d = new Date();
    els.timestamp.textContent = "timestamp: " + d.toLocaleString();
  };
  tick();
  setInterval(tick, 1000);
}

// Start in landing mode
stage = 1;

  }

  boot();
})();
