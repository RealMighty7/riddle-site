// dialogue.js (FULL REPLACEMENT)
// Exposes window.DIALOGUE used by main.js
// Cadence requirement: dialogue -> choice -> task (repeat 10x)
// Uses all 5 packs via { task:"random", args:{ pool:["packX"] } }.
// (tasks.js merges pack tasks + provides fallbacks, so this won’t “missing task” loop.)

window.DIALOGUE = {
  /* ===================== INTRO ===================== */
  intro: [
    "Emma (Security): You're not supposed to be here.",
    "Emma (Security): This page is under revision. Close it.",
    "You: ...",
    "Emma (Security): Don't touch anything."
  ],

  /* ===================== CHOICE BEATS ===================== */
  // First choice locks your guidePath in main.js (emma / liam / run)
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

  /* ===================== FILLER POOLS ===================== */
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
      "Liam (Worker): Don't try to win. Try to slip."
    ],
    filler_system_pressure: [
      "System: Attention window narrowing.",
      "System: Trace frequency increased.",
      "System: Retention window closing."
    ],
    filler_security_pressure: [
      "Emma (Security): Stop looking for shortcuts.",
      "Emma (Security): This is where people fail.",
      "Emma (Security): Do not hesitate."
    ],
    filler_worker_pressure: [
      "Liam (Worker): Don't talk.",
      "Liam (Worker): Small steps.",
      "Liam (Worker): Quiet hands."
    ],
    filler_run: [
      "System: Movement detected.",
      "System: Route conflict.",
      "System: Do not escalate."
    ],
    filler_run_hard: [
      "System: Route denied.",
      "System: Containment tightening.",
      "System: Reset recommended."
    ]
  },

  /* ===================== ALMOST DONE ===================== */
  almostDone: {
    say: [
      "System: You are close.",
      "System: Please do not celebrate early.",
      "Emma (Security): This part is where people mess up.",
      "Liam (Worker): Keep it boring. Keep it small."
    ]
  },

  /* ===================== MAIN STEPS ===================== */
  steps: [
    { say: ["System: RESTART REQUIRED.", "System: Establishing boundary anchors…"] },

    // ---- LOOP 1 ----
    { say: ["System: Fragmented logs detected.", "System: Reconstruction needed."] },
    { choice: { complyLabel: "Okay.", lieLabel: "I didn't mean to.", runLabel: "Run." } },
    { task: "random", args: { pool: ["core", "pack1"] } },

    // ---- LOOP 2 ----
    { filler: { pool: "AUTO", count: 1 } },
    { say: ["Emma (Security): Keep your hands visible.", "System: Procedure continues."] },
    { choice: { complyLabel: "Fine.", lieLabel: "Sure.", runLabel: "Run." } },
    { task: "random", args: { pool: ["pack1"] } },

    // ---- LOOP 3 ----
    { filler: { pool: "AUTO", count: 1 } },
    { say: ["System: Checksum required.", "System: Do not guess quickly."] },
    { choice: { complyLabel: "Understood.", lieLabel: "I already did.", runLabel: "Run." } },
    { task: "checksum", args: { phrase: "echostatic07vault" } },

    // ---- LOOP 4 ----
    { filler: { pool: "AUTO", count: 1 } },
    { say: ["Liam (Worker): Slow is safer.", "System: Alternate path available."] },
    { choice: { complyLabel: "I'll wait.", lieLabel: "I know this.", runLabel: "Run." } },
    { task: "random", args: { pool: ["pack2"] } },

    // ---- LOOP 5 ----
    { filler: { pool: "AUTO", count: 1 } },
    { say: ["System: Supplemental verification.", "Emma (Security): No mistakes."] },
    { choice: { complyLabel: "Got it.", lieLabel: "It worked.", runLabel: "Run." } },
    { task: "random", args: { pool: ["pack2", "pack3"] } },

    // ---- LOOP 6 ----
    { filler: { pool: "AUTO", count: 1 } },
    { say: ["System: Monitoring degraded.", "System: Re-align the interface."] },
    { choice: { complyLabel: "Okay.", lieLabel: "Already aligned.", runLabel: "Run." } },
    { task: "random", args: { pool: ["pack3"] } },

    // ---- LOOP 7 ----
    { filler: { pool: "AUTO", count: 1 } },
    { say: ["Emma (Security): You're lingering.", "System: Commit to input."] },
    { choice: { complyLabel: "Proceed.", lieLabel: "Proceeding.", runLabel: "Run." } },
    { task: "random", args: { pool: ["pack3", "pack4"] } },

    // ---- LOOP 8 ----
    { filler: { pool: "AUTO", count: 1 } },
    { say: ["System: Pressure rising.", "Liam (Worker): Don't make it interesting."] },
    { choice: { complyLabel: "Okay.", lieLabel: "Okay.", runLabel: "Run." } },
    { task: "random", args: { pool: ["pack4"] } },

    // ---- LOOP 9 ----
    { filler: { pool: "AUTO", count: 1 } },
    { say: ["System: Secondary channel open.", "System: Confirm continuity."] },
    { choice: { complyLabel: "Confirm.", lieLabel: "Confirmed.", runLabel: "Run." } },
    { task: "random", args: { pool: ["pack4", "pack5"] } },

    // ---- LOOP 10 ----
    { filler: { pool: "AUTO", count: 1 } },
    { say: ["System: Final pass.", "Emma (Security): Don't choke now."] },
    { choice: { complyLabel: "…", lieLabel: "…", runLabel: "Run." } },
    { task: "random", args: { pool: ["pack5"] } },

    // small tail
    { filler: { pool: "AUTO", count: 1 } },
    { say: ["System: …"] }
  ]
};
