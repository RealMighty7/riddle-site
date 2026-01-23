// dialogue.js
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
    },
    {
      say: [
        "System: USER STATE OUTSIDE EXPECTED LOOP.",
        "Emma (Security): You're still interacting.",
        "Liam (Worker): If you stop now, it'll just patch over you."
      ],
      choices: {
        complyLabel: "Stabilize.",
        lieLabel: "Try to stealthly escape.",
        runLabel: "Keep moving."
      },
      respond: {
        comply: [
          "Emma (Security): Then follow instructions exactly.",
          "Emma (Security): No improvising."
        ],
        lie: [
          "Liam (Worker): Good.",
          "Liam (Worker): We'll take the routes nobody audits."
        ],
        run: [
          "System: CONTAINMENT PRESSURE RISING.",
          "Emma (Security): You're shortening your own window."
        ]
      }
    },
    {
      say: [
        "Emma (Security): Last warning.",
        "System: DECISION TREE NARROWING.",
        "Liam (Worker): You can still leave. Just not loudly."
      ],
      choices: {
        complyLabel: "Do it clean.",
        lieLabel: "Do it quiet.",
        runLabel: "Do it hard."
      },
      respond: {
        comply: [
          "Emma (Security): Acknowledged.",
          "System: COMPLIANCE NOTED."
        ],
        lie: [
          "Liam (Worker): Then don't contradict me.",
          "Liam (Worker): I can’t cover you twice."
        ],
        run: [
          "System: ATTEMPTS LIMITED.",
          "Emma (Security): You're choosing the hard mode."
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
    filler_system_pressure: [
      "System: ATTENTION REQUIRED.",
      "System: AD CONTENT READY.",
      "System: VIEW TIME BELOW EXPECTATION.",
      "System: RE-ENGAGEMENT RECOMMENDED.",
      "System: USER RESISTANCE NOTED."
    ],
    filler_security_pressure: [
      "Emma (Security): You're escalating.",
      "Emma (Security): Stop forcing new outcomes.",
      "Emma (Security): If you keep pushing, the system resets you.",
      "System: COMPLIANCE WINDOW NARROWING."
    ],
    filler_worker_pressure: [
      "Liam (Worker): You're being watched now.",
      "Liam (Worker): Don't look like you know that.",
      "Liam (Worker): If you rush, you'll trip a lock.",
      "System: HEURISTICS ACTIVE."
    ],
    filler_run: [
      "System: TRACKING MOTION.",
      "System: PREDICTING NEXT INPUT.",
      "Emma (Security): You're not faster than a lock.",
      "Liam (Worker): You're making noise."
    ],
    filler_run_hard: [
      "System: ROUTES COLLAPSING.",
      "System: EXIT VECTORS REMOVED.",
      "Emma (Security): You feel that? It's closing.",
      "Liam (Worker): If you keep running, you'll run into a wall that isn't there."
    ]
  },

  almostDone: {
    say: [
      "System: …",
      "System: You are close.",
      "System: Close enough to be corrected.",
      "Emma (Security): This is the part where people get comfortable.",
      "Emma (Security): Comfort is what the loop feeds on.",
      "Liam (Worker): Don't celebrate.",
      "Liam (Worker): Just finish the work.",
      "System: FINALIZATION PATH AVAILABLE."
    ]
  },

  steps: [
    { say: ["System: RESTART REQUIRED.", "System: Establishing boundary anchors…"] },
    { task: "anchors", args: { base: 5 } },

    { filler: { pool: "AUTO", count: 2 } },
    { say: ["System: Fragmented logs detected.", "System: Reconstruction needed."] },
    {
      task: "reorder",
      args: {
        items: ["clickstream", "session_map", "boot", "audit", "cache"],
        correct: ["boot", "cache", "audit", "session_map", "clickstream"]
      }
    },

    { filler: { pool: "AUTO", count: 2 } },
    { say: ["System: Memory integrity degraded.", "System: Checksum required."] },
    { task: "checksum", args: { phrase: "echostatic07-vault" } },

    { filler: { pool: "AUTO", count: 2 } },
    { say: ["System: Stabilization cycle begins.", "System: Do not release."] },
    { task: "hold", args: { baseMs: 3200 } },

    { filler: { pool: "AUTO", count: 2 } },
    { say: ["System: Pattern lock engaged.", "System: 10 seconds to memorize."] },
    { task: "pattern", args: { base: 5 } },

    { filler: { pool: "AUTO", count: 2 } },
    { say: ["System: Corrupted fragment detected.", "System: Identify mismatch."] },
    { task: "mismatch", args: { base: 7 } },

    { filler: { pool: "AUTO", count: 1 } },
    { say: ["Liam (Worker): Keep it boring.", "System: PROCEDURE AVAILABLE."] },
    { task: "confirm_signal" },

    { filler: { pool: "AUTO", count: 1 } },
    { task: "choose_boring" },

    { filler: { pool: "AUTO", count: 1 } },
    { task: "memory_3" },

    { filler: { pool: "AUTO", count: 1 } },
    { task: "backspace_clean" },

    { filler: { pool: "AUTO", count: 1 } },
    { task: "two_step" },

    { say: ["System: Surface failure imminent.", "Emma (Security): ...", "System: HANDOFF."] }
        // dialogue.js (inside steps)
    { filler: { pool: "AUTO", count: 1 } },
    { say: ["System: Supplemental procedure required."] },
    { task: "random", args: { pool: ["pack4", "pack5"] } },
    
    { filler: { pool: "AUTO", count: 1 } },
    { task: "random", args: { pool: ["core", "pack4", "pack5"] } },
  ]
};
