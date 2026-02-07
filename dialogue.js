// dialogue.js
// Exposes window.DIALOGUE used by main.js
// Builds a 20-task run:
//   dialogue → first choice (locks path) → task, repeated
//   first 10 tasks from packs 1-5, next 10 from packs 6-7

(() => {
  const rand = (n) => Math.floor(Math.random() * n);
  const pick = (arr) => arr[rand(arr.length)];
  const shuffle = (arr) => arr.slice().sort(() => Math.random() - 0.5);

  // Packs 1-5 (intro procedures): 20 variants per pack, generated in tasks.js
  const PACKS_1_5 = {
    1: (window.TASK_POOLS && window.TASK_POOLS.pack1) || [],
    2: (window.TASK_POOLS && window.TASK_POOLS.pack2) || [],
    3: (window.TASK_POOLS && window.TASK_POOLS.pack3) || [],
    4: (window.TASK_POOLS && window.TASK_POOLS.pack4) || [],
    5: (window.TASK_POOLS && window.TASK_POOLS.pack5) || [],
  };

  // Packs 6-7 (interactive puzzles)
  const PACKS_6_7 = {
    6: [
      "p6_rotors",
      "p6_wordsplice",
      "p6_freqdial",
      "p6_morse",
      "p6_gridtap",
      "p6_switchboard",
      "p6_checksum2",
      "p6_sequence",
      "p6_matchpairs",
      "p6_hexpad",
    ],
    7: [
      "p7_minisudoku",
      "p7_memoryflash",
      "p7_sortstack",
      "p7_ciphershift",
      "p7_parity",
      "p7_patternflip",
      "p7_keymaze",
      "p7_anagram",
      "p7_gridroute",
      "p7_timerlock",
    ],
  };

  function buildFirstTen() {
    // Exactly 10 tasks: choose 2 random variants from each pack 1-5.
    const picked = [];
    for (let p = 1; p <= 5; p++) {
      const list = shuffle(PACKS_1_5[p] || []);
      picked.push(...list.slice(0, 2).map((id) => ({ id, pack: p })));
    }
    return shuffle(picked);
  }

  function buildSecondTen() {
    // 10 tasks: choose 5 from pack6 and 5 from pack7 (no duplicates), shuffle.
    const p6 = shuffle(PACKS_6_7[6]).slice(0, 5);
    const p7 = shuffle(PACKS_6_7[7]).slice(0, 5);
    const all = shuffle(p6.concat(p7));
    return all.map((id) => ({ id, pack: PACKS_6_7[6].includes(id) ? 6 : 7 }));
  }

  function preLineForTask(taskId) {
    // Per-path variants. Kept short to avoid desync.
    const sys = [
      `System: Procedure '${taskId}' queued. Execute without deviation.`,
    ];
    const emma = [
      `Emma (Security): Stay sharp. '${taskId}' is watching for mistakes.`,
    ];
    const liam = [
      `Liam (Worker): '${taskId}'. Don’t rush — pick your moves.`,
    ];
    return { sys, emma, liam };
  }

  const firstTen = buildFirstTen();
  const secondTen = buildSecondTen();

  const steps = [];

  // Establishment
  steps.push({
    say: {
      sys: [
        "System: SIMULATION WORKERS ROOM — initializing.",
        "System: Attention is the currency. Your inputs are the fee.",
      ],
      emma: [
        "Emma (Security): Whoever you are — you don’t belong in here.",
        "Emma (Security): Keep order and you’ll get through.",
      ],
      liam: [
        "Liam (Worker): Hey… breathe. Slow is safe.",
        "Liam (Worker): If you want out, you’ll have to push back.",
      ],
    }
  });

  // First choice locks the path (handled in main.js)
  steps.push({
    say: [
      "System: Compliance requested.",
      "System: Choose response.",
    ]
  });
  steps.push({
    choice: {
      complyLabel: "Comply.",
      lieLabel: "Resist (carefully).",
      runLabel: "Resist (fully).",
    }
  });

  steps.push({
    say: {
      sys: [
        "System: Guidance channel: PRIMARY.",
        "System: Do not improvise.",
      ],
      emma: [
        "Emma (Security): Fine. I’ll keep you alive — but I need control.",
        "Emma (Security): Follow my timing.",
      ],
      liam: [
        "Liam (Worker): Okay. We do this the hard way.",
        "Liam (Worker): When it tightens, you push.",
      ],
    }
  });

  // 10 intro tasks (packs 1-5)
  firstTen.forEach((t, i) => {
    steps.push({ say: preLineForTask(t.id) });
    steps.push({ task: t.id, args: { meta: { pack: t.pack, qIndex: i + 1 } } });
  });

  steps.push({
    say: {
      sys: ["System: Intro procedures complete. Escalation granted."],
      emma: ["Emma (Security): Now it stops being polite."],
      liam: ["Liam (Worker): This part bites. Keep moving."],
    }
  });

  // 10 interactive puzzles (packs 6-7)
  secondTen.forEach((t, i) => {
    steps.push({ say: preLineForTask(t.id) });
    steps.push({ task: t.id, args: { meta: { pack: t.pack, qIndex: i + 11 } } });
  });

  steps.push({
    say: {
      sys: [
        "System: Evaluation complete.",
        "System: Preparing final procedure.",
      ],
      emma: [
        "Emma (Security): I can’t hold this open long.",
        "Emma (Security): If you’re going to do it — do it now.",
      ],
      liam: [
        "Liam (Worker): Window’s open.",
        "Liam (Worker): Delete yourself from their script.",
      ],
    }
  });

  // Gate decides whether hack runs.
  steps.push({ check: "escapeGate" });

  window.DIALOGUE = {
    intro: [
      "System: Unauthorized viewer session detected.",
      "System: This endpoint is under revision. External access is not intended.",
      "Emma (Security): Don’t click anything you don’t understand.",
      "Liam (Worker): …slow is safe.",
    ],
    steps,
  };
})();
