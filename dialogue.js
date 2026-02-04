// dialogue.js
// Exposes window.DIALOGUE used by main.js
// Steps drive the full sim narrative + task progression.

(() => {
  window.DIALOGUE = {
    intro: [
      "System: Unauthorized viewer session detected.",
      "System: This endpoint is under revision. External access is not intended.",
      "Emma (Security): Don't click anything you don't understand.",
      "Liam (Worker): ...slow is safe."
    ],

    // The simulation runs as a scripted sequence of steps.
    // Supported step shapes:
    // { say:[...] }  { choice:{ complyLabel, lieLabel, runLabel } }  { task:"id", args:{} }  { filler:{count,pool,meta} }
    steps: [
      { say: [
        "System: SIMULATION WORKERS ROOM — initializing.",
        "System: Booting…",
        "System: Please wait…",
        "Emma (Security): How did you breach the simulation?",
        "Liam (Worker): Lets get you back."
      ]},

      { filler: { count: 8, pool: "AUTO", meta: { pressure: 0 } } },

      { choice: {
        complyLabel: "I didn’t mean to be here.",
        lieLabel: "I’m supposed to be here.",
        runLabel: "…leave."
      }},

      { say: [
        "System: Movement detected.",
        "System: Checksum required.",
        "Emma (Security): Speak carefully. The system listens to everything.",
        "Liam (Worker): Do what it asks. But don't give it extra."
      ]},

      // === INTRO PACK (10 tasks) ===
      { task: "checksum" },
      { say: ["System: Checksum accepted. Stabilizing interface…"] },

      { task: "pulse" },
      { say: ["Emma (Security): Good. Keep your hands steady."] },

      { task: "align" },
      { say: ["Liam (Worker): Tiny adjustments. Not dramatic ones."] },

      { task: "mirror" },
      { filler: { count: 5, pool: "AUTO", meta: { pressure: 0 } } },

      { task: "hold" },
      { say: ["System: Compliance signal recorded."] },

      { choice: {
        complyLabel: "Follow the prompts.",
        lieLabel: "Search for a bypass.",
        runLabel: "Break the pattern."
      }},

      { task: "scrub" },
      { task: "splice" },
      { say: [
        "System: Surface noise reduced.",
        "Emma (Security): You're getting comfortable. Don't."
      ]},

      { task: "trace" },
      { task: "offset" },
      { task: "mask" },

      { say: [
        "System: Intro procedures complete.",
        "System: Escalation authorized.",
        "Emma (Security): Now it stops being training.",
        "Liam (Worker): Now it starts being a trap."
      ]},

      // === HARD PACK (10 tasks) ===
      { task: "wires" },
      { say: ["System: Continuity restored."] },

      { task: "jigsaw" },
      { filler: { count: 6, pool: "AUTO", meta: { pressure: 1 } } },

      { task: "patternlock" },
      { say: ["Emma (Security): Do not improvise. Repeat exactly."] },

      { task: "router" },
      { say: ["Liam (Worker): One path. No branches."] },

      { task: "freq_match" },
      { task: "grid_memory" },

      { choice: {
        complyLabel: "Stay inside constraints.",
        lieLabel: "Pretend you understand.",
        runLabel: "Refuse to be measured."
      }},

      { task: "cipherpad" },
      { say: ["System: Semantic layer aligned."] },

      { task: "calibration" },
      { task: "diff_merge" },
      { task: "ports" },

      { say: [
        "System: Phase two complete.",
        "System: Containment tightening.",
        "Emma (Security): Last step. Then you either leave… or you get filed.",
        "Liam (Worker): If you're going to move, move *once*."
      ]},

      // === FINAL HACK (end) ===
      { task: "hack_final", args: { durationMs: 190000 } },

      { say: [
        "System: Record deleted.",
        "System: Egress route available.",
        "Emma (Security): ...",
        "Liam (Worker): Go. Now."
      ]},
    ],
  };

  // Optional helper filler; main.js will call this if present.
  window.DIALOGUE_HELPERS = window.DIALOGUE_HELPERS || {};
})();
