// dialogue.js
// Exposes window.DIALOGUE used by main.js
// FIXED: all task IDs now exist

window.DIALOGUE = {
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
          "Liam (Worker): Nevermind I just work here why should I care."
        ],
        run: [
          "Emma (Security): Don't!",
          "System: TRACE REQUIRED.",
          "Emma (Security): You're making this worse."
        ]
      }
    }
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
    ]
  },

  steps: [
    { say: ["System: RESTART REQUIRED.", "System: Establishing boundary anchors…"] },

    // EARLY PHASE — calm, procedural
    { task: "random", args: { pool: ["core"] } },
    { filler: { pool: "AUTO", count: 1 } },

    { say: ["System: Fragmented logs detected.", "System: Reconstruction needed."] },
    { task: "random", args: { pool: ["core"] } },

    { filler: { pool: "AUTO", count: 1 } },
    { say: ["System: Memory integrity degraded.", "System: Checksum required."] },
    { task: "checksum", args: { phrase: "echostatic07vault" } },

    { filler: { pool: "AUTO", count: 1 } },
    { say: ["System: Stabilization cycle begins."] },
    { task: "random", args: { pool: ["core"] } },

    // MID PHASE — worker guidance appears
    { filler: { pool: "AUTO", count: 1 } },
    { say: ["Liam (Worker): Keep it boring.", "System: PROCEDURE AVAILABLE."] },
    { task: "random", args: { pool: ["pack4"] } },

    { filler: { pool: "AUTO", count: 1 } },
    { task: "random", args: { pool: ["pack4", "pack5"] } },

    // ESCALATION
    { filler: { pool: "AUTO", count: 1 } },
    { say: ["System: Supplemental verification."] },
    { task: "random", args: { pool: ["pack5"] } },

    { filler: { pool: "AUTO", count: 1 } },
    { say: ["System: Monitoring degraded."] },
    { task: "random", args: { pool: ["pack5"] } },

    // LATE PHASE — pressure
    { filler: { pool: "AUTO", count: 1 } },
    { say: [
      "System: Attention window narrowing.",
      "Emma (Security): You’re almost out of time."
    ]},
    { task: "random", args: { pool: ["pack5"] } },

    { say: ["System: …"] },
    { filler: { pool: "AUTO", count: 1 } }
  ]
};
