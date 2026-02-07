// dialogue.js
// Exposes window.DIALOGUE used by main.js
// Structure after cracks:
//   plot dialogue → (first choice locks guide path) → [ plot → choice → taskline → task ] x20
// First 10 tasks are randomly selected from packs 1-5 (100 variants total).
// Second 10 tasks are randomly selected from packs 6-7 (interactive puzzles).

(() => {
  const shuffle = (arr) => arr.slice().sort(() => Math.random() - 0.5);
  const POOLS = window.TASK_POOLS || {};

  function pickN(pool, n) {
    const a = shuffle(Array.isArray(pool) ? pool : []);
    return a.slice(0, Math.max(0, n));
  }

  function buildFirstTen() {
    // 2 from each pack 1-5 -> 10 total
    const picked = [];
    for (let p = 1; p <= 5; p++) {
      const pool = POOLS[`pack${p}`] || [];
      pickN(pool, 2).forEach((id) => picked.push({ id, pack: p }));
    }
    return shuffle(picked);
  }

  function buildSecondTen() {
    const p6 = pickN(POOLS.pack6 || [], 5).map((id) => ({ id, pack: 6 }));
    const p7 = pickN(POOLS.pack7 || [], 5).map((id) => ({ id, pack: 7 }));
    return shuffle(p6.concat(p7));
  }

  function plotBeat(i) {
    const beats = [
      "System: Session bound. Movement logged.",
      "Emma (Security): Keep your hands visible. Follow the prompts.",
      "Liam (Worker): Don’t let it rush you. Read twice.",
      "System: Deviation increases scrutiny.",
      "Emma (Security): Order keeps you alive in here.",
      "Liam (Worker): If you fight it, do it clean.",
    ];
    return beats[i % beats.length];
  }

  function taskLead(taskId, idx, pack) {
    const packTag = pack ? `pack ${pack}` : "pack ?";
    return `System: Task ${idx + 1}/20 queued — '${taskId}' (${packTag}).`;
  }

  const firstTen = buildFirstTen();
  const secondTen = buildSecondTen();
  const run = firstTen.concat(secondTen);

  const steps = [];

  // Security-room opening (before the repeating loop)
  steps.push({
    say: [
      "System: INPUT CHANNEL OPEN.",
      "Emma (Security): You weren't scheduled for this.",
      "Liam (Worker): …keep your voice down.",
      "System: COMPLIANCE CHECK REQUIRED.",
    ],
  });

  // First choice locks the guide path (comply / resist / full)
  steps.push({
    choice: {
      lockPath: true,
      complyLabel: "Comply.",
      lieLabel: "Question.",
      runLabel: "Refuse.",
    },
  });

  // 20 rounds: plot → choice → taskline → task
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
    steps.push({ say: [taskLead(t.id, i, t.pack)] });
    steps.push({ task: t.id, args: { pack: t.pack, index: i } });
  }

  window.DIALOGUE = {
    intro: [],
    steps,
  };
})();
