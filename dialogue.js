// dialogue.js
// Exposes window.DIALOGUE used by main.js
// Structure after cracks:
//   plot dialogue → (first choice locks guide path) → [ plot → choice → taskline → task ] x20

(() => {
  const shuffle = (arr) => arr.slice().sort(() => Math.random() - 0.5);
  const POOLS = window.TASK_POOLS || {};

  const pickN = (pool, n) => shuffle(Array.isArray(pool) ? pool : []).slice(0, Math.max(0, n));

  function buildFirstTen() {
    // 2 from each pack 1-5 -> 10 total (100 variants total in pools)
    const picked = [];
    for (let p = 1; p <= 5; p++) {
      pickN(POOLS[`pack${p}`] || [], 2).forEach((id) => picked.push({ id, pack: p }));
    }
    return shuffle(picked);
  }

  function buildSecondTen() {
    const p6 = pickN(POOLS.pack6 || [], 5).map((id) => ({ id, pack: 6 }));
    const p7 = pickN(POOLS.pack7 || [], 5).map((id) => ({ id, pack: 7 }));
    return shuffle(p6.concat(p7));
  }

  function plotBeat(i) {
    // Same beat, different voice depending on locked guide path (system/emma/liam)
    const sys = [
      "System: Session bound. Cursor motion logged.",
      "System: Deviation increases scrutiny.",
      "System: Obedience improves stability.",
      "System: Attention is mandatory.",
    ];
    const emma = [
      "Emma (Security): Keep your hands visible. Follow the prompt, then stop.",
      "Emma (Security): Don’t improvise. I can’t cover you if you do.",
      "Emma (Security): Slow is safe. Read it once before you move.",
      "Emma (Security): You want out? Then stay orderly.",
    ];
    const liam = [
      "Liam (Worker): Don’t let it rush you. Read twice.",
      "Liam (Worker): If you’re going to fight it, do it clean.",
      "Liam (Worker): Make it think you’re cooperating. Then pivot.",
      "Liam (Worker): You’ve got one advantage — it’s predictable.",
    ];
    return { system: sys[i % sys.length], emma: emma[i % emma.length], liam: liam[i % liam.length] };
  }

  function taskLead(idx, pack) {
    // IMPORTANT: do NOT reveal task identity in dialogue (admin panel only).
    const tag = pack ? `pack ${pack}` : "pack ?";
    return {
      system: `System: Task ${idx + 1}/20 queued (${tag}).`,
      emma:   `Emma (Security): Task ${idx + 1}/20. Keep it clean.`,
      liam:   `Liam (Worker): Task ${idx + 1}/20. Stay calm.`,
    };
  }

  function taskCue(taskId, idx) {
    // A quick “task dialogue” line before the UI appears, to make the cadence obvious.
    return {
      system: "System: Execute. Confirm. Continue.",
      emma:   "Emma (Security): One action at a time. Don’t spam it.",
      liam:   "Liam (Worker): Take the point it gives you. Don’t overthink.",
    };
  }

  const run = buildFirstTen().concat(buildSecondTen());

  const steps = [];

  // Opening beat
  steps.push({
    say: [
      { system: "System: INPUT CHANNEL OPEN.", emma: "System: INPUT CHANNEL OPEN.", liam: "System: INPUT CHANNEL OPEN." },
      { system: "System: COMPLIANCE CHECK REQUIRED.", emma: "Emma (Security): You weren't scheduled for this.", liam: "Liam (Worker): …keep your voice down." },
      { system: "System: SIGNAL ACQUIRED.", emma: "System: SIGNAL ACQUIRED.", liam: "System: SIGNAL ACQUIRED." },
    ],
  });

  // First choice locks path: comply->system, resist->emma, full->liam
  steps.push({
    choice: {
      lockPath: true,
      complyLabel: "Comply.",
      lieLabel: "Question.",
      runLabel: "Refuse.",
    },
  });

  // 20 rounds
  for (let i = 0; i < run.length; i++) {
    const t = run[i];
    steps.push({ say: [plotBeat(i)] });

    steps.push({
      choice: {
        complyLabel: "Comply",
        lieLabel: "Resist",
        runLabel: "Break protocol",
      },
    });

    steps.push({ say: [taskLead(i, t.pack), taskCue(t.id, i)] });
    steps.push({ task: t.id, args: { pack: t.pack, index: i } });
  }

  window.DIALOGUE = { intro: [], steps };
})();
