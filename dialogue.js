// dialogue.js (FULL REPLACEMENT)
// Exposes window.DIALOGUE used by main.js
//
// Cinematic "simulation director" tone + scalable to hundreds of lines
// without feeling repeated.
//
// This file is data + tiny helpers only.
// main.js uses { filler:{pool:"AUTO"} } which calls window.DIALOGUE_HELPERS.autoFiller(meta)

(() => {
  const W = window;

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const now = () => Date.now();

  /* ---------- Anti-repeat selector ---------- */
  function createPicker() {
    const hist = {
      global: [],
      pool: Object.create(null),
      usedCount: Object.create(null),
      lastAt: Object.create(null),
    };

    function mark(key, line) {
      hist.global.push(line);
      if (hist.global.length > 40) hist.global.shift();

      hist.pool[key] = hist.pool[key] || [];
      hist.pool[key].push(line);
      if (hist.pool[key].length > 18) hist.pool[key].shift();

      hist.usedCount[line] = (hist.usedCount[line] || 0) + 1;
      hist.lastAt[line] = now();
    }

    function scoreLine(key, line) {
      // Higher is better.
      const inGlobal = hist.global.includes(line) ? 1 : 0;
      const inPool = (hist.pool[key] || []).includes(line) ? 1 : 0;

      const used = hist.usedCount[line] || 0;
      const last = hist.lastAt[line] || 0;
      const age = (now() - last) / 1000; // seconds

      // Hard-avoid recent repeats
      if (inPool) return -999;
      if (inGlobal && age < 16) return -999;

      const freshness = clamp(age / 30, 0, 2);        // up to +2
      const usagePenalty = clamp(used * 0.25, 0, 3);  // up to -3

      return 1 + freshness - usagePenalty - (inGlobal ? 0.5 : 0);
    }

    function choose(key, pool) {
      const expanded = [];
      for (const item of pool || []) {
        if (!item) continue;
        if (typeof item === "string") expanded.push({ t: item, w: 1 });
        else if (typeof item === "object" && typeof item.t === "string") {
          expanded.push({ t: item.t, w: item.w || 1 });
        }
      }
      if (!expanded.length) return "";

      const candidates = [];
      for (const it of expanded) {
        const reps = clamp(Math.floor(it.w), 1, 6);
        for (let i = 0; i < reps; i++) candidates.push(it.t);
      }

      let best = null;
      let bestScore = -1e9;
      const tries = Math.min(14, candidates.length);

      for (let i = 0; i < tries; i++) {
        const line = candidates[Math.floor(Math.random() * candidates.length)];
        const s = scoreLine(key, line);
        if (s > bestScore) { bestScore = s; best = line; }
      }

      if (!best || bestScore < -100) best = candidates[Math.floor(Math.random() * candidates.length)];

      mark(key, best);
      return best;
    }

    return { choose, hist };
  }

  const PICKER = createPicker();

  /* ---------- Micro-variation (rare) ---------- */
  function vary(line, vibe) {
    if (!line) return line;

    const soft = [
      "", "", "",
      " (acknowledged).",
      " (confirm).",
      " (steady).",
      " (keep it small).",
    ];

    const tense = [
      "", "",
      " Do not rush.",
      " Don’t spike the trace.",
      " Keep your hands quiet.",
      " Keep it boring.",
    ];

    const sys = [
      "", "",
      " …",
      " (monitoring).",
      " (retention narrowing).",
      " (heuristics active).",
    ];

    const r = Math.random();
    if (vibe === "system" && r < 0.12) return line + pick(sys);
    if ((vibe === "emma" || vibe === "liam") && r < 0.10) return line + pick(tense);
    if (r < 0.06) return line + pick(soft);

    return line;
  }

  /* ---------- Cinematic directions ---------- */
  const DIRECTIONS = {
    camera: [
      { t: "System: CAMERA: pull back. Keep the cursor framed.", w: 1 },
      { t: "System: CAMERA: tighten on the input field.", w: 1 },
      { t: "System: CAMERA: hold. Do not cut early.", w: 1 },
      { t: "System: CAMERA: slight drift. Like a hand-held feed.", w: 1 },
    ],
    sim: [
      { t: "System: SIMULATION: stabilize the surface layer.", w: 2 },
      { t: "System: SIMULATION: maintain plausible latency.", w: 2 },
      { t: "System: SIMULATION: reduce reflections. Increase noise floor.", w: 1 },
      { t: "System: SIMULATION: avoid pattern completion.", w: 1 },
    ],
    pressure: [
      { t: "System: TRACE: frequency increased.", w: 2 },
      { t: "System: RETENTION: window narrowing.", w: 2 },
      { t: "System: CONTAINMENT: tightening.", w: 1 },
      { t: "System: HEURISTICS: predicting next input.", w: 1 },
    ]
  };

  /* ---------- Character pools ---------- */
  const POOLS = {
    sys_low: [
      { t: "System: Buffering…", w: 2 },
      { t: "System: Integrity check pending.", w: 2 },
      { t: "System: Observation ongoing.", w: 2 },
      { t: "System: Microfractures detected.", w: 1 },
      { t: "System: Restore loop suggested.", w: 1 },
      { t: "System: Stabilization cycle begins.", w: 2 },
      { t: "System: Establishing boundary anchors…", w: 1 },
      { t: "System: Logging input cadence.", w: 1 },
      { t: "System: Session pinned.", w: 1 },
      { t: "System: Surface looks normal. Do not trust it.", w: 1 },
    ],

    sys_high: [
      { t: "System: Attention window narrowing.", w: 2 },
      { t: "System: Trace frequency increased.", w: 2 },
      { t: "System: Retention window closing.", w: 2 },
      { t: "System: Containment pressure rising.", w: 2 },
      { t: "System: Route conflict. Resolve quietly.", w: 1 },
      { t: "System: Do not escalate. Do not improvise.", w: 1 },
      { t: "System: User state outside expected loop.", w: 1 },
      { t: "System: Attempts limited.", w: 1 },
      { t: "System: Decision tree narrowing.", w: 1 },
      { t: "System: Exit vectors reduced.", w: 1 },
    ],

    emma_low: [
      { t: "Emma (Security): Hands off unless instructed.", w: 2 },
      { t: "Emma (Security): Slow down.", w: 2 },
      { t: "Emma (Security): Keep your hands visible.", w: 1 },
      { t: "Emma (Security): Follow instructions exactly.", w: 2 },
      { t: "Emma (Security): Don’t try to be clever.", w: 1 },
      { t: "Emma (Security): If you hesitate, it learns you.", w: 1 },
      { t: "Emma (Security): You only get so many mistakes.", w: 2 },
      { t: "Emma (Security): Don’t force new outcomes.", w: 1 },
      { t: "Emma (Security): Breathe. Then move.", w: 1 },
    ],

    emma_high: [
      { t: "Emma (Security): This is where people mess up.", w: 2 },
      { t: "Emma (Security): Stop looking for shortcuts.", w: 2 },
      { t: "Emma (Security): Do not hesitate.", w: 2 },
      { t: "Emma (Security): You’re shortening your own window.", w: 1 },
      { t: "Emma (Security): You’re escalating.", w: 1 },
      { t: "Emma (Security): Last warning.", w: 1 },
      { t: "Emma (Security): Don’t choke now.", w: 1 },
      { t: "Emma (Security): If you keep pushing, the system resets you.", w: 1 },
    ],

    liam_low: [
      { t: "Liam (Worker): Don’t answer fast.", w: 2 },
      { t: "Liam (Worker): Keep it boring.", w: 2 },
      { t: "Liam (Worker): Boring is invisible.", w: 2 },
      { t: "Liam (Worker): Small steps.", w: 1 },
      { t: "Liam (Worker): Quiet hands.", w: 1 },
      { t: "Liam (Worker): Don’t try to win. Try to slip.", w: 1 },
      { t: "Liam (Worker): If it feels pointless, it’s working.", w: 1 },
      { t: "Liam (Worker): Don’t look like you know you’re being watched.", w: 1 },
    ],

    liam_high: [
      { t: "Liam (Worker): You can still leave. Just not loudly.", w: 2 },
      { t: "Liam (Worker): If you rush, you’ll trip a lock.", w: 2 },
      { t: "Liam (Worker): If you keep running, you’ll hit a wall that isn’t there.", w: 1 },
      { t: "Liam (Worker): This is the part that looks normal.", w: 1 },
      { t: "Liam (Worker): Don’t make it exciting.", w: 1 },
      { t: "Liam (Worker): Stay dull. Stay small.", w: 1 },
      { t: "Liam (Worker): Let the system get bored of you.", w: 1 },
    ],

    run_low: [
      { t: "System: Movement detected.", w: 2 },
      { t: "System: Route shifting.", w: 1 },
      { t: "System: Noise spike observed.", w: 1 },
    ],
    run_high: [
      { t: "System: Route denied.", w: 2 },
      { t: "System: Containment tightening.", w: 2 },
      { t: "System: Reset recommended.", w: 1 },
      { t: "System: Pursuit heuristics active.", w: 1 },
    ]
  };

  /* ---------- AUTO filler logic ---------- */
  function autoFiller(meta = {}) {
    const path = meta.path || meta.guidePath || "auto"; // "emma"|"liam"|"run"|etc
    const loop = meta.loopIndex ?? meta.loop ?? 0;

    // If main.js passes pressureTier (0/1/2) we use it. Otherwise infer.
    const pressure = meta.pressure ?? (loop >= 7 ? 2 : loop >= 4 ? 1 : 0);

    const wantDirection = Math.random() < (pressure ? 0.18 : 0.10);

    if (wantDirection) {
      const dirPool = pressure
        ? [...DIRECTIONS.pressure, ...DIRECTIONS.sim, ...DIRECTIONS.camera]
        : [...DIRECTIONS.sim, ...DIRECTIONS.camera];
      return PICKER.choose("dir", dirPool);
    }

    if (path === "run") {
      const pool = pressure ? POOLS.run_high : POOLS.run_low;
      return vary(PICKER.choose("run", pool), "system");
    }

    if (path === "emma") {
      const pool = pressure ? POOLS.emma_high : POOLS.emma_low;
      return vary(PICKER.choose("emma", pool), "emma");
    }

    if (path === "liam") {
      const pool = pressure ? POOLS.liam_high : POOLS.liam_low;
      return vary(PICKER.choose("liam", pool), "liam");
    }

    const blend = pressure
      ? [...POOLS.sys_high, ...POOLS.sys_high, ...POOLS.emma_high, ...POOLS.liam_high]
      : [...POOLS.sys_low, ...POOLS.sys_low, ...POOLS.emma_low, ...POOLS.liam_low];

    const line = PICKER.choose(pressure ? "auto_high" : "auto_low", blend);
    const vibe = line.startsWith("System:") ? "system" : (line.startsWith("Emma") ? "emma" : "liam");
    return vary(line, vibe);
  }

  W.DIALOGUE_HELPERS = W.DIALOGUE_HELPERS || {};
  W.DIALOGUE_HELPERS.autoFiller = autoFiller;
  W.DIALOGUE_HELPERS._picker = PICKER; // optional debugging

  /* ---------- Dialogue structure ---------- */
  W.DIALOGUE = {
    intro: [
      "Emma (Security): You're not supposed to be here.",
      "Emma (Security): This page is under revision. Close it.",
      "You: ...",
      "Emma (Security): Don't touch anything."
    ],

    choiceBeats: [
      {
        say: [
          "Emma (Security): That click was logged.",
          "Emma (Security): Tell me why you did that.",
          "Liam (Worker): Don't answer fast.",
          "System: INPUT CONTINUES."
        ],
        choices: {
          complyLabel: "I'm sorry.",
          lieLabel: "Oh it wasn't me.",
          runLabel: "Run."
        },
        respond: {
          comply: [
            "Emma (Security): Fine.",
            "Emma (Security): Hands off unless instructed.",
            "System: PROCEDURE TRACK ACTIVE."
          ],
          lie: [
            "Liam (Worker): Careful.",
            "Liam (Worker): Lying might help get you through some parts...",
            "Liam (Worker): Nevermind. I just work here."
          ],
          run: [
            "Emma (Security): Don't!",
            "System: TRACE REQUIRED.",
            "Emma (Security): You're making this worse."
          ]
        }
      }
    ],

    almostDone: {
      say: [
        "System: You are close.",
        "System: Please do not celebrate early.",
        "Emma (Security): This part is where people mess up.",
        "Liam (Worker): Keep it boring. Keep it small.",
        "System: Close enough to be corrected."
      ]
    },

    steps: [
      { say: ["System: RESTART REQUIRED.", "System: Establishing boundary anchors…"] },

      // LOOP 1
      { say: ["System: Fragmented logs detected.", "System: Reconstruction needed."] },
      { choice: { complyLabel: "Okay.", lieLabel: "I didn't mean to.", runLabel: "Run." } },
      { task: "random", args: { pool: ["core"] } },

      // LOOP 2
      { filler: { pool: "AUTO", count: 2, meta: { loopIndex: 2 } } },
      { say: ["Emma (Security): Keep your hands visible.", "System: Procedure continues."] },
      { choice: { complyLabel: "Fine.", lieLabel: "Sure.", runLabel: "Run." } },
      { task: "random", args: { pool: ["core"] } },

      // LOOP 3
      { filler: { pool: "AUTO", count: 2, meta: { loopIndex: 3 } } },
      { say: ["System: Checksum required.", "System: Do not guess quickly."] },
      { choice: { complyLabel: "Understood.", lieLabel: "I already did.", runLabel: "Run." } },
      { task: "checksum", args: { phrase: "echostatic07vault" } },

      // LOOP 4
      { filler: { pool: "AUTO", count: 2, meta: { loopIndex: 4 } } },
      { say: ["Liam (Worker): Slow is safer.", "System: Alternate path available."] },
      { choice: { complyLabel: "I'll wait.", lieLabel: "I know this.", runLabel: "Run." } },
      { task: "random", args: { pool: ["core"] } },

      // LOOP 5
      { filler: { pool: "AUTO", count: 2, meta: { loopIndex: 5 } } },
      { say: ["System: Supplemental verification.", "Emma (Security): No mistakes."] },
      { choice: { complyLabel: "Got it.", lieLabel: "It worked.", runLabel: "Run." } },
      { task: "random", args: { pool: ["core"] } },

      // LOOP 6
      { filler: { pool: "AUTO", count: 2, meta: { loopIndex: 6 } } },
      { say: ["System: Monitoring degraded.", "System: Re-align the interface."] },
      { choice: { complyLabel: "Okay.", lieLabel: "Already aligned.", runLabel: "Run." } },
      { task: "random", args: { pool: ["core"] } },

      // LOOP 7
      { filler: { pool: "AUTO", count: 3, meta: { loopIndex: 7 } } },
      { say: ["Emma (Security): You're lingering.", "System: Commit to input."] },
      { choice: { complyLabel: "Proceed.", lieLabel: "Proceeding.", runLabel: "Run." } },
      { task: "random", args: { pool: ["core"] } },

      // LOOP 8
      { filler: { pool: "AUTO", count: 3, meta: { loopIndex: 8 } } },
      { say: ["System: Pressure rising.", "Liam (Worker): Don't make it interesting."] },
      { choice: { complyLabel: "Okay.", lieLabel: "Okay.", runLabel: "Run." } },
      { task: "random", args: { pool: ["core"] } },

      // LOOP 9
      { filler: { pool: "AUTO", count: 3, meta: { loopIndex: 9 } } },
      { say: ["System: Secondary channel open.", "System: Confirm continuity."] },
      { choice: { complyLabel: "Confirm.", lieLabel: "Confirmed.", runLabel: "Run." } },
      { task: "random", args: { pool: ["core"] } },

      // LOOP 10
      { filler: { pool: "AUTO", count: 4, meta: { loopIndex: 10 } } },
      { say: ["System: Final pass.", "Emma (Security): Don't choke now."] },
      { choice: { complyLabel: "…", lieLabel: "…", runLabel: "Run." } },
      { task: "random", args: { pool: ["core"] } },

      // Tail -> final task
{ filler: { pool: "AUTO", count: 2, meta: { loopIndex: 11 } } },
{ say: ["System: Access gate opened.", "System: Remove your record.", "Liam (Worker): Do it fast. Don’t look back."] },
{ task: "hack_final", args: { noTimer: true, durationMs: 210000, removedNeeded: 35 } }
]
  };
})();
