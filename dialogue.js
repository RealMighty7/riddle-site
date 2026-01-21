// dialogue.js
// All narrative + quest steps. main.js "plays" this.
// Steps can be:
// { say: [ ...lines ] }
// { task: "anchors"|"reorder"|"checksum"|"hold"|"pattern"|"mismatch", args: {...} }
// { filler: { count: N, pool: "filler_standard"|"filler_hard" } }

window.DIALOGUE = {
  intro: [
    `Security: "All stations, freeze."`,
    `Security: "Confirm breach classification."`,
    `System: "UNAUTHORIZED OBSERVER DETECTED."`,
    `System: "SOURCE: EXTERNAL INTERACTION."`,
    ``,
    `Worker 2: "It doesn’t match any internal profile."`,
    `Security: "Then treat it as unknown."`,
    `Security: "You. Do not move."`,
    ``,
    `PA System: "CODE 3. CODE 3."`,
    `PA System: "Initiating containment protocols."`,
    ``,
    `Security: "DEFCON 4."`,
    `Security: "Lock auxiliary exits. Disable corridor cameras."`,
    ``,
    `Worker 1: "You’re not supposed to be here."`,
    `Worker 1: "You were meant to be solving puzzles."`,
    ``,
    `Security: "This is your only warning."`,
    `Security: "Further interaction will be classified as hostile."`,
    ``,
    `Worker 3: "If they leave right now, it seals."`,
    `Security: "Then they won’t leave right now."`,
    ``,
    `Security: "Choose your statement."`,
    `Security: "We are listening."`
  ],

  // Pools used by { filler: {count, pool:"..."} }
  fillerPools: {
    filler_standard: [
      {
        say: [
          `System: "RECOVERY MODE: MANUAL."`,
          `Worker 2: "The reboot is old. It needs hands."`,
          `Security: "No commentary. Assign tasks."`,
        ],
        task: { id: "anchors", args: { base: 5 } }
      },
      {
        say: [
          `Security: "Reconstruct the log. No mistakes."`,
          `System: "FRAGMENTS: OUT OF ORDER."`,
        ],
        task: { id: "reorder", args: {
          items: ["impact", "fracture", "alarm", "lockdown", "observer"],
          correct: ["observer", "impact", "fracture", "alarm", "lockdown"]
        }}
      },
      {
        say: [
          `Security: "Checksum verification."`,
          `System: "INPUT REQUIRED."`,
        ],
        task: { id: "checksum", args: { phrase: "ECHOECHO-VAULT" } }
      },
      {
        say: [
          `Security: "Stabilize the boundary. Hold."`,
          `Worker 1: "If it slips, we start over."`,
        ],
        task: { id: "hold", args: { baseMs: 3000 } }
      },
      {
        say: [
          `Security: "Pattern gate. Confirm you can follow."`,
          `System: "SHORT-TERM MEMORY TEST."`,
        ],
        task: { id: "pattern", args: { base: 5 } }
      },
      {
        say: [
          `Security: "Mismatch scan. Find the corruption."`,
          `System: "ONE FRAGMENT IS WRONG."`,
        ],
        task: { id: "mismatch", args: { base: 7 } }
      },
    ],

    // harder filler used when player is more resistant
    filler_hard: [
      {
        say: [
          `Security: "You’re destabilizing the corridor."`,
          `Security: "So you will work longer."`,
          `System: "RECOVERY WINDOW: NARROW."`,
        ],
        task: { id: "anchors", args: { base: 7 } }
      },
      {
        say: [
          `Security: "Reorder again. Faster."`,
          `Worker 3: "If they loop it, we wipe them."`,
        ],
        task: { id: "reorder", args: {
          items: ["panic", "push", "crack", "alarm", "seal"],
          correct: ["push", "crack", "alarm", "seal", "panic"]
        }}
      },
      {
        say: [
          `Security: "Checksum. Last chance."`,
          `System: "REQUIRED."`,
        ],
        task: { id: "checksum", args: { phrase: "ECHOECHO-VAULT" } }
      },
      {
        say: [
          `Security: "Stabilize. Longer hold."`,
          `System: "BOUNDARY: UNSTABLE."`,
        ],
        task: { id: "hold", args: { baseMs: 3600 } }
      },
      {
        say: [
          `Security: "Pattern lock. You don’t get many tries."`,
          `System: "ATTEMPTS LIMITED."`,
        ],
        task: { id: "pattern", args: { base: 6 } }
      },
      {
        say: [
          `Security: "Mismatch scan. If you guess wrong, we reset."`,
          `Worker 2: "That’s… harsh."`,
          `Security: "So are breaches."`,
        ],
        task: { id: "mismatch", args: { base: 9 } }
      },
    ]
  },

  branches: {
    // Compliant
    need: {
      preface: [
        `You: "I need something first."`,
        `Security: "Correct."`,
        `Security: "Compliance is the only language this corridor recognizes."`,
        `System: "RESTART TRIGGERED BY BOUNDARY DAMAGE."`,
        `System: "RECOVERY MODE: MANUAL."`
      ],
      steps: [
        { say: [
          `Security: "You will comply with restart chores until containment stabilizes."`,
          `Worker 2: "If they follow, we can reseal it cleanly."`,
          `Security: "Begin."`,
        ]},
        { filler: { count: 3, pool: "filler_standard" } },
        { say: [
          `System: "PHASE CHECK: INCOMPLETE."`,
          `Security: "Not done."`,
          `Security: "Again."`
        ]},
        { filler: { count: 2, pool: "filler_standard" } },
        { say: [
          `System: "PHASE 1: STABLE."`,
          `Security: "Good."`,
          `Security: "Do not confuse survival for permission."`
        ]}
      ]
    },

    // Compliant-ish (still “following the dialogue”)
    lie: {
      preface: [
        `You: "I clicked by accident."`,
        `Security: "No."`,
        `Security: "Accidents do not produce controlled fractures."`,
        `System: "BEHAVIORAL FLAG: DECEPTIVE."`,
        `Security: "Manual restart chores. Now."`
      ],
      steps: [
        { filler: { count: 3, pool: "filler_standard" } },
        { say: [
          `Worker 1: "They’re still here."`,
          `Security: "Of course they are."`,
          `Security: "Next phase."`
        ]},
        { filler: { count: 2, pool: "filler_standard" } },
        { say: [
          `System: "PHASE 1: STABLE."`,
          `Security: "Better."`,
          `Security: "Try honesty next time."`
        ]}
      ]
    },

    // Non-compliant
    run: {
      preface: [
        `You: "Run."`,
        `Security: "Stop."`,
        `Security: "Escalation noted."`,
        `System: "THREAT SCORE: INCREASING."`,
        `Security: "If you resist, we make the chores heavier."`
      ],
      steps: [
        { filler: { count: 3, pool: "filler_hard" } },
        { say: [
          `Security: "Containment isn’t clean."`,
          `Worker 3: "They keep pushing."`,
          `Security: "Then keep them busy."`
        ]},
        { filler: { count: 2, pool: "filler_hard" } },
        { say: [
          `System: "PHASE 1: STABLE."`,
          `Security: "You’re unstable."`,
          `Security: "But you’re useful."`
        ]}
      ]
    }
  }
};
