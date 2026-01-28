// dialogue.js (FULL REPLACEMENT)
// Exposes window.DIALOGUE used by main.js

window.DIALOGUE = {
  intro: [
    "Emma (Security): You're not supposed to be here.",
    "Emma (Security): This page is under revision. Close it.",
    "You: ...",
    "Emma (Security): Don't touch anything."
  ],

  fillerPools: {
    filler_standard: [
      "System: Buffering…",
      "System: Integrity check pending.",
      "System: Observation ongoing.",
      "System: Microfractures detected.",
      "System: Restore loop suggested."
    ],
    filler_security: [
      "Emma (Security): Don't improvise.",
      "Emma (Security): Slow down.",
      "Emma (Security): The system remembers patterns.",
      "Emma (Security): You only get so many mistakes."
    ],
    filler_worker: [
      "Liam (Worker): Keep it boring.",
      "Liam (Worker): Boring is invisible.",
      "Liam (Worker): Don't try to win. Try to slip.",
      "Liam (Worker): If it feels pointless, it's working."
    ],
    filler_system_pressure: [
      "System: Retention window closing.",
      "System: Trace frequency increased.",
      "System: Your cursor pattern is loud.",
      "System: Reduce variance."
    ]
  },

  // main.js will use this for the very first choice beat if you keep it,
  // but the new alternating loop below uses "choice" steps instead.
  choiceBeats: [],

  // 10 cycles of: say -> choice -> task
  steps: [
    { say: ["System: RESTART REQUIRED.", "System: Establishing boundary anchors…"] },

    // cycle 1
    { say: ["Emma (Security): Don’t touch anything unless instructed."] },
    { choice: { complyLabel: "ok.", lieLabel: "sure.", runLabel: "run." } },
    { task: "random", args: { pool: ["core", "pack1"] } },

    // cycle 2
    { say: ["Liam (Worker): Keep it boring. Don’t stand out."] },
    { choice: { complyLabel: "…", lieLabel: "fine.", runLabel: "run." } },
    { task: "random", args: { pool: ["pack1", "pack2"] } },

    // cycle 3
    { say: ["System: Memory integrity degraded.", "System: Checksum required."] },
    { choice: { complyLabel: "verify", lieLabel: "stall", runLabel: "run" } },
    { task: "checksum", args: { phrase: "echostatic07vault" } },

    // cycle 4
    { say: ["Emma (Security): You’re clicking like you want attention."] },
    { choice: { complyLabel: "stop", lieLabel: "accident", runLabel: "run" } },
    { task: "random", args: { pool: ["pack2", "pack3"] } },

    // cycle 5
    { say: ["System: Supplemental verification."] },
    { choice: { complyLabel: "continue", lieLabel: "continue", runLabel: "run" } },
    { task: "random", args: { pool: ["pack3"] } },

    // cycle 6
    { say: ["Liam (Worker): If you can’t be brave, be boring."] },
    { choice: { complyLabel: "boring", lieLabel: "boring", runLabel: "run" } },
    { task: "random", args: { pool: ["pack3", "pack4"] } },

    // cycle 7
    { say: ["Emma (Security): Procedure is narrowing."] },
    { choice: { complyLabel: "ok", lieLabel: "ok", runLabel: "run" } },
    { task: "random", args: { pool: ["pack4"] } },

    // cycle 8
    { say: ["System: Attention window narrowing."] },
    { choice: { complyLabel: "hold", lieLabel: "hold", runLabel: "run" } },
    { task: "random", args: { pool: ["pack4", "pack5"] } },

    // cycle 9
    { say: ["System: Monitoring degraded.", "System: Apply corrective input."] },
    { choice: { complyLabel: "do it", lieLabel: "do it", runLabel: "run" } },
    { task: "random", args: { pool: ["pack5"] } },

    // cycle 10
    { say: ["Emma (Security): You’re almost out of time."] },
    { choice: { complyLabel: "continue", lieLabel: "continue", runLabel: "run" } },
    { task: "random", args: { pool: ["pack5"] } },

    { say: ["System: …"] }
  ]
};
