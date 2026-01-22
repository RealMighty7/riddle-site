// dialogue.js
// Exposes window.DIALOGUE used by main.js

window.DIALOGUE = {
  intro: [
    "Security: You're not supposed to be here.",
    "Security: This page is under revision. Close it.",
    "You: ...",
    "Security: Don't touch anything."
  ],

  // After each beat: show 3 choices, then respond based on choice
  choiceBeats: [
    {
      say: [
        "Security: That click was logged.",
        "Security: Tell me why you did that."
      ],
      choices: {
        complyLabel: "I'm sorry. I’ll stop.",
        lieLabel: "It was an accident.",
        runLabel: "Run."
      },
      respond: {
        comply: [
          "Security: Good. Hands off.",
          "Security: Stay still."
        ],
        lie: [
          "Security: Accidents don't repeat.",
          "Security: Watch yourself."
        ],
        run: [
          "Security: Don't.",
          "System: TRACE REQUIRED.",
          "Security: You're making this worse."
        ]
      }
    },
    {
      say: [
        "Security: You're still interacting.",
        "Security: You're triggering safeguards."
      ],
      choices: {
        complyLabel: "Okay. I’ll cooperate.",
        lieLabel: "I didn’t mean to.",
        runLabel: "Run."
      },
      respond: {
        comply: [
          "Security: Then prove it.",
          "Security: Do what the system asks."
        ],
        lie: [
          "Security: Intent doesn’t matter here.",
          "Security: Outcome does."
        ],
        run: [
          "Security: Stop.",
          "System: RECOVERY WINDOW NARROW.",
          "Security: You feel that? That’s containment."
        ]
      }
    },
    {
      say: [
        "Security: Last warning.",
        "Security: One more mistake and you lose the window."
      ],
      choices: {
        complyLabel: "Tell me what to do.",
        lieLabel: "I won’t touch anything else.",
        runLabel: "Run."
      },
      respond: {
        comply: [
          "Security: Fine.",
          "Security: Follow instructions exactly."
        ],
        lie: [
          "Security: You'll say anything to buy time.",
          "Security: We'll see."
        ],
        run: [
          "Security: You're choosing the hard way.",
          "System: ATTEMPTS LIMITED."
        ]
      }
    }
  ],

  fillerPools: {
    filler_standard: [
      "System: Buffering…",
      "System: Integrity check pending.",
      "Security: Don't improvise.",
      "Security: You're leaving traces.",
      "System: Surface tension unstable.",
      "System: Microfractures detected."
    ]
  },

  steps: [
    { say: ["System: RESTART REQUIRED.", "System: Establishing boundary anchors…"] },
    { task: "anchors", args: { base: 5 } },

    { filler: { pool: "filler_standard", count: 2 } },
    { say: ["System: Fragmented logs detected.", "System: Reconstruction needed."] },
    { task: "reorder", args: {
      items: ["clickstream", "session_map", "boot", "audit", "cache"],
      correct: ["boot", "cache", "audit", "session_map", "clickstream"]
    }},

    { filler: { pool: "filler_standard", count: 2 } },
    { say: ["System: Memory integrity degraded.", "System: Checksum required."] },
    { task: "checksum", args: { phrase: "echostatic07-vault" } },

    { filler: { pool: "filler_standard", count: 2 } },
    { say: ["System: Stabilization cycle begins.", "System: Do not release."] },
    { task: "hold", args: { baseMs: 3200 } },

    { filler: { pool: "filler_standard", count: 2 } },
    { say: ["System: Pattern lock engaged.", "System: 10 seconds to memorize."] },
    { task: "pattern", args: { base: 5 } },

    { filler: { pool: "filler_standard", count: 2 } },
    { say: ["System: Corrupted fragment detected.", "System: Identify mismatch."] },
    { task: "mismatch", args: { base: 7 } },

    { say: ["System: Surface failure imminent.", "Security: ...", "System: HANDOFF."] }
  ]
};
