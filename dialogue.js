// dialogue.js
// Narrative + task pools.
// main.js plays this.

window.DIALOGUE = {
  intro: [
    `Security: "Control, I have an unregistered pointer event."`,
    `Security: "Confirm it's not internal QA."`,
    `System: "UNAUTHORIZED INTERACTION DETECTED."`,
    `System: "SOURCE: EXTERNAL INPUT."`,
    ``,
    `Worker 2: "It’s not mapped to any sandbox profile."`,
    `Security: "Then treat it as live."`,
    ``,
    `PA System: "CODE THREE. CODE THREE."`,
    `PA System: "Containment protocol initiating."`,
    ``,
    `Security: "Lock auxiliary exits. Kill corridor cams."`,
    `Worker 1: "They’re still clicking."`,
    `Security: "I see it."`,
    ``,
    `Security: "Listen carefully."`,
    `Security: "You are in a restricted system."`,
    `Security: "Say something. Now."`
  ],

  fillerPools: {
    filler_standard: [
      {
        say: [
          `Security: "Re-anchor the boundary nodes."`,
          `System: "RESTART MODE: MANUAL."`,
        ],
        task: { id: "anchors", args: { base: 5 } }
      },
      {
        say: [
          `Security: "Rebuild the sequence. No guessing."`,
          `System: "LOG FRAGMENTS: OUT OF ORDER."`,
        ],
        task: { id: "reorder", args: {
          items: ["impact", "fracture", "alarm", "lockdown", "observer"],
          correct: ["observer", "impact", "fracture", "alarm", "lockdown"]
        }}
      },
      {
        say: [
          `Security: "Checksum verification."`,
          `Worker 2: "If it fails twice, we wipe the session."`,
        ],
        task: { id: "checksum", args: { phrase: "ECHOECHO-VAULT" } }
      },
      {
        say: [
          `Security: "Hold stabilization."`,
          `System: "BOUNDARY: DRIFTING."`,
        ],
        task: { id: "hold", args: { baseMs: 3200 } }
      },
      {
        say: [
          `Security: "Pattern lock."`,
          `Security: "If you can follow directions, prove it."`,
        ],
        task: { id: "pattern", args: { base: 5 } }
      },
      {
        say: [
          `Security: "Mismatch scan. Find the corrupted fragment."`,
          `System: "ONE FRAGMENT DOES NOT MATCH."`,
        ],
        task: { id: "mismatch", args: { base: 7 } }
      },
    ],

    filler_hard: [
      {
        say: [
          `Security: "Stop resisting."`,
          `Security: "More resistance means longer recovery."`,
          `System: "RECOVERY WINDOW: NARROWING."`,
        ],
        task: { id: "anchors", args: { base: 7 } }
      },
      {
        say: [
          `Security: "Reorder again. Faster."`,
          `Worker 3: "If they break pace, reset them."`,
        ],
        task: { id: "reorder", args: {
          items: ["panic", "push", "crack", "alarm", "seal"],
          correct: ["push", "crack", "alarm", "seal", "panic"]
        }}
      },
      {
        say: [
          `Security: "Checksum. Last warning."`,
          `System: "VALIDATION REQUIRED."`,
        ],
        task: { id: "checksum", args: { phrase: "ECHOECHO-VAULT" } }
      },
      {
        say: [
          `Security: "Stabilize. Longer hold."`,
          `System: "BOUNDARY: UNSTABLE."`,
        ],
        task: { id: "hold", args: { baseMs: 3900 } }
      },
      {
        say: [
          `Security: "Pattern lock."`,
          `Security: "You do not get many tries."`,
        ],
        task: { id: "pattern", args: { base: 6 } }
      },
      {
        say: [
          `Security: "Mismatch scan. And don’t spam-click."`,
          `Worker 2: "They’re making it worse."`,
        ],
        task: { id: "mismatch", args: { base: 9 } }
      },
    ]
  },

  branches: {
    apology: {
      preface: [
        `You: "I’m sorry. I’ll do what you say."`,
        `Security: "Good."`,
        `Security: "Then you work until the corridor stabilizes."`,
        `System: "COMPLIANCE NOTED."`
      ],
      steps: [
        { filler: { count: 3, pool: "filler_standard" } },
        { say: [
          `Security: "Not finished."`,
          `Security: "Keep going."`
        ]},
        { filler: { count: 2, pool: "filler_standard" } },
      ]
    },

    accident: {
      preface: [
        `You: "It was an accident."`,
        `Security: "No. Accidents don’t repeat at a steady interval."`,
        `System: "BEHAVIORAL FLAG: EVASIVE."`,
        `Security: "Do the work."`
      ],
      steps: [
        { filler: { count: 3, pool: "filler_standard" } },
        { filler: { count: 2, pool: "filler_standard" } },
      ]
    },

    run: {
      preface: [
        `You: "Run."`,
        `Security: "Stop."`,
        `System: "THREAT SCORE: INCREASING."`,
        `Security: "If you push, we push back."`
      ],
      steps: [
        { filler: { count: 3, pool: "filler_hard" } },
        { filler: { count: 2, pool: "filler_hard" } },
      ]
    }
  }
};
