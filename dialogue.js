// dialogue.js (FULL REPLACEMENT)
// Exposes window.DIALOGUE used by main.js

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
    ],

    // Optional pressure pools (safe if unused)
    filler_system_pressure: [
      "System: Retention window closing.",
      "System: Trace frequency increased.",
      "System: Mirror writes are permanent."
    ],
    filler_worker_pressure: [
      "Liam (Worker): Small steps.",
      "Liam (Worker): Quiet hands.",
      "Liam (Worker): Don't overcorrect."
    ],
    filler_security_pressure: [
      "Emma (Security): One more mistake.",
      "Emma (Security): You're being watched.",
      "Emma (Security): Stop testing the edges."
    ]
  },

  steps: [
    { say: ["System: RESTART REQUIRED.", "System: Establishing boundary anchors…"] },

    // EARLY: gentle (uses your existing random task system, if present)
    { task: "random", args: { pool: ["core"] } },
    { filler: { pool: "AUTO", count: 1 } },

    { say: ["System: Fragmented logs detected.", "System: Reconstruction needed."] },
    { task: "random", args: { pool: ["core"] } },

    { filler: { pool: "AUTO", count: 1 } },
    { say: ["System: Memory integrity degraded.", "System: Checksum required."] },
    { task: "checksum", args: { phrase: "echostatic07vault" } },

    { filler: { pool: "AUTO", count: 1 } },
    { say: ["System: Stabilization cycle begins."] },
    { task: "random", args: { pool: ["pack1"] } },

    // MID: worker guidance
    { filler: { pool: "AUTO", count: 1 } },
    { say: ["Liam (Worker): Keep it boring.", "System: PROCEDURE AVAILABLE."] },
    { task: "random", args: { pool: ["pack2"] } },

    { filler: { pool: "AUTO", count: 1 } },
    { task: "random", args: { pool: ["pack2", "pack3"] } },

    // ESCALATION
    { filler: { pool: "AUTO", count: 1 } },
    { say: ["System: Supplemental verification."] },
    { task: "random", args: { pool: ["pack3"] } },

    { filler: { pool: "AUTO", count: 1 } },
    { say: ["System: Monitoring degraded."] },
    { task: "random", args: { pool: ["pack4"] } },

    // LATE: pressure
    { filler: { pool: "AUTO", count: 1 } },
    { say: ["System: Attention window narrowing.", "Emma (Security): You’re almost out of time."] },
    { task: "random", args: { pool: ["pack4"] } },

    // --- PACK 5 INSERT (direct task ids you pasted) ---
    { filler: { pool: "AUTO", count: 1 } },
    { task: "keypad_4" },
    { filler: { pool: "AUTO", count: 1 } },
    { task: "wire_cut" },
    { filler: { pool: "AUTO", count: 1 } },
    { task: "mirror_match" },
    { filler: { pool: "AUTO", count: 1 } },
    { task: "arrow_memory" },
    { filler: { pool: "AUTO", count: 1 } },
    { task: "click_pressure" },

    { say: ["System: …"] },
    { filler: { pool: "AUTO", count: 1 } }
  ]
};
