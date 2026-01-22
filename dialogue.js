// dialogue.js
// Exposes window.DIALOGUE used by main.js

window.DIALOGUE = {
  /*
    STORY CONTEXT:
    - The page was meant to be passive.
    - Clicking fractured the pane.
    - You are now "outside" but still within containment.
    - Emma enforces procedure.
    - Liam works maintenance — quietly subversive.
    - The System wants you back watching ads.
  */

  intro: [
    "Emma (Security): You're not supposed to be here.",
    "Emma (Security): This page is under revision.",
    "Emma (Security): You can close it now.",
    "You: ...",
    "Emma (Security): Please don't interact with unstable elements."
  ],

  /* ======================
     CHOICE BEATS
     These establish PATH + TONE, not just mechanics
  ====================== */

  choiceBeats: [
    {
      say: [
        "System: INPUT REGISTERED.",
        "Emma (Security): That click was logged.",
        "Emma (Security): We don’t normally see persistence.",
        "Liam (Worker): We do sometimes.",
        "Liam (Worker): It just… doesn’t end well."
      ],
      choices: {
        complyLabel: "Follow Emma.",
        lieLabel: "Follow Liam.",
        runLabel: "Run."
      },
      respond: {
        comply: [
          "Emma (Security): Good.",
          "Emma (Security): We proceed by the book.",
          "System: PROCEDURE MODE ENABLED."
        ],
        lie: [
          "Liam (Worker): Okay.",
          "Liam (Worker): Slow movements. Minimal input.",
          "Liam (Worker): If this works… it won’t look like it did."
        ],
        run: [
          "Emma (Security): Don’t.",
          "System: TRACE DEPTH INCREASED.",
          "Emma (Security): That was a mistake."
        ]
      }
    },

    {
      say: [
        "System: USER CONTEXT UNSTABLE.",
        "Emma (Security): You’re still outside the expected loop.",
        "Emma (Security): That increases risk.",
        "Liam (Worker): Staying still increases it too."
      ],
      choices: {
        complyLabel: "Do what the system wants.",
        lieLabel: "Let Liam handle it.",
        runLabel: "Keep moving."
      },
      respond: {
        comply: [
          "Emma (Security): Then listen carefully.",
          "Emma (Security): Do not rush. Do not guess."
        ],
        lie: [
          "Liam (Worker): I’ll give you the light tasks.",
          "Liam (Worker): The ones nobody audits closely."
        ],
        run: [
          "System: CONTAINMENT PRESSURE RISING.",
          "Emma (Security): You’re shortening the window."
        ]
      }
    },

    {
      say: [
        "System: DECISION TREE NARROWING.",
        "Emma (Security): This is your last chance to stabilize.",
        "Liam (Worker): Or your first chance to actually leave."
      ],
      choices: {
        complyLabel: "Stabilize.",
        lieLabel: "Leave quietly.",
        runLabel: "Break containment."
      },
      respond: {
        comply: [
          "Emma (Security): Acknowledged.",
          "System: COMPLIANCE FLAGGED."
        ],
        lie: [
          "Liam (Worker): Then don’t contradict me.",
          "Liam (Worker): I can’t protect you twice."
        ],
        run: [
          "System: HARD MODE ENGAGED.",
          "Emma (Security): We warned you."
        ]
      }
    }
  ],

  /* ======================
     FILLER POOLS
     These are where the “long game” feeling comes from
  ====================== */

  fillerPools: {
    filler_standard: [
      "System: Buffering state extended.",
      "System: Integrity verification pending.",
      "System: Do not refresh.",
      "System: Observation ongoing.",
      "System: Microfractures propagating.",
      "System: Surface tension unstable.",
      "System: Returning user detected."
    ],

    filler_security: [
      "Emma (Security): Don’t improvise.",
      "Emma (Security): Follow the workflow.",
      "Emma (Security): You’re creating unnecessary noise.",
      "Emma (Security): The system notices patterns.",
      "Emma (Security): Silence is safer than curiosity."
    ],

    filler_worker: [
      "Liam (Worker): They don’t watch the boring parts.",
      "Liam (Worker): Routine tasks slip through.",
      "Liam (Worker): Don’t try to be clever. Be invisible.",
      "Liam (Worker): If it feels slow, that’s good.",
      "Liam (Worker): The system hates when nothing happens."
    ],

    filler_system_pressure: [
      "System: ATTENTION REQUIRED.",
      "System: AD CONTENT READY.",
      "System: VIEW DURATION BELOW EXPECTATION.",
      "System: RE-ENGAGEMENT SUGGESTED.",
      "System: USER RESISTANCE NOTED."
    ]
  },

  /* ======================
     TASK SEQUENCE
     This is now framed as “containment work”
  ====================== */

  steps: [
    {
      say: [
        "System: RESTART REQUIRED.",
        "System: Establishing boundary anchors.",
        "Emma (Security): This is just maintenance.",
        "Emma (Security): You’ll be fine if you cooperate."
      ]
    },
    { task: "anchors", args: { base: 5 } },

    {
      filler: { pool: "filler_standard", count: 2 }
    },
    {
      say: [
        "System: Fragmented logs detected.",
        "System: Reconstruction required.",
        "Liam (Worker): Start from the oldest piece.",
        "Liam (Worker): New data lies."
      ]
    },
    {
      task: "reorder",
      args: {
        items: ["clickstream", "session_map", "boot", "audit", "cache"],
        correct: ["boot", "cache", "audit", "session_map", "clickstream"]
      }
    },

    {
      filler: { pool: "filler_security", count: 2 }
    },
    {
      say: [
        "System: Memory integrity degraded.",
        "System: Checksum required.",
        "Emma (Security): Don’t guess.",
        "Emma (Security): Guessing gets people reset."
      ]
    },
    { task: "checksum", args: { phrase: "echostatic07-vault" } },

    {
      filler: { pool: "filler_worker", count: 2 }
    },
    {
      say: [
        "System: Stabilization cycle initiated.",
        "System: Do not release.",
        "Liam (Worker): Hold it.",
        "Liam (Worker): Even when it feels wrong."
      ]
    },
    { task: "hold", args: { baseMs: 3200 } },

    {
      filler: { pool: "filler_standard", count: 2 }
    },
    {
      say: [
        "System: Pattern lock engaged.",
        "System: Ten seconds.",
        "Emma (Security): Memorize.",
        "Emma (Security): Then forget you ever saw it."
      ]
    },
    { task: "pattern", args: { base: 5 } },

    {
      filler: { pool: "filler_system_pressure", count: 2 }
    },
    {
      say: [
        "System: Corrupted fragment detected.",
        "System: Identify mismatch.",
        "Liam (Worker): This part matters.",
        "Liam (Worker): More than they’ll admit."
      ]
    },
    { task: "mismatch", args: { base: 7 } },

    {
      say: [
        "System: Surface failure imminent.",
        "Emma (Security): …",
        "Liam (Worker): You feel that, right?",
        "System: HANDOFF PENDING."
      ]
    }
  ]
};
