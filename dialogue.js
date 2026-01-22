// dialogue.js
// More grounded / “real” sounding dialogue.
// Choices are now: apologize / accident / run.

window.DIALOGUE = {
  intro: [
    `Security: "Stop clicking."`,
    `System: "UNAUTHORIZED INPUT DETECTED."`,
    `System: "INTERACTION SOURCE: EXTERNAL USER."`,
    ``,
    `Tech: "It’s not a normal session. It’s… watching through the surface."`,
    `Security: "So it's a breach."`,
    `Security: "Lock the hallway feed. Cut the corridor cameras."`,
    ``,
    `PA: "Code Three. Repeat: Code Three."`,
    `System: "CONTAINMENT ROUTINE: MANUAL OVERRIDE REQUIRED."`,
    ``,
    `Security: "Listen carefully."`,
    `Security: "You can cooperate, or you can make this worse."`,
    `Security: "State your intent."`
  ],

  fillerPools: {
    filler_standard: [
      {
        say: [
          `Security: "Stabilize the boundary anchors. Do not miss any."`,
          `System: "ANCHOR NODES: DESYNCED."`
        ],
        task: { id: "anchors", args: { base: 5 } }
      },
      {
        say: [
          `Security: "Rebuild the timeline. The log is scrambled."`,
          `System: "EVENT FRAGMENTS: OUT OF ORDER."`
        ],
        task: { id: "reorder", args: {
          items: ["impact", "fracture", "alarm", "lockdown", "observer"],
          correct: ["observer", "impact", "fracture", "alarm", "lockdown"]
        }}
      },
      {
        say: [
          `Security: "Verify checksum. If it’s wrong, we restart."`,
          `System: "INPUT REQUIRED."`
        ],
        task: { id: "checksum", args: { phrase: "echostatic07vault" } }
      },
      {
        say: [
          `Security: "Hold the stabilizer. Do not let go."`,
          `Tech: "If it drops, the corridor resets."`
        ],
        task: { id: "hold", args: { baseMs: 3200 } }
      },
      {
        say: [
          `Security: "Pattern lock. You get one clean pass."`,
          `System: "SHORT-TERM MEMORY VALIDATION."`
        ],
        task: { id: "pattern", args: { base: 5 } }
      },
      {
        say: [
          `Security: "Mismatch scan. One fragment is corrupted."`,
          `System: "FIND THE OUTLIER."`
        ],
        task: { id: "mismatch", args: { base: 7 } }
      },
    ],

    filler_hard: [
      {
        say: [
          `Security: "You’re pushing the boundary. We’re raising difficulty."`,
          `System: "RECOVERY WINDOW: NARROWING."`
        ],
        task: { id: "anchors", args: { base: 7 } }
      },
      {
        say: [
          `Security: "Reorder again. Faster. No excuses."`,
          `Tech: "They keep stressing the glass…"`,
        ],
        task: { id: "reorder", args: {
          items: ["panic", "push", "crack", "alarm", "seal"],
          correct: ["push", "crack", "alarm", "seal", "panic"]
        }}
      },
      {
        say: [
          `Security: "Checksum. Don’t guess."`,
          `System: "REQUIRED."`
        ],
        task: { id: "checksum", args: { phrase: "echostatic07vault" } }
      },
      {
        say: [
          `Security: "Longer hold. If you drop it, we start over."`,
          `System: "BOUNDARY: UNSTABLE."`
        ],
        task: { id: "hold", args: { baseMs: 3800 } }
      },
      {
        say: [
          `Security: "Pattern lock. You will not brute force it."`,
          `System: "ATTEMPTS LIMITED."`
        ],
        task: { id: "pattern", args: { base: 6 } }
      },
      {
        say: [
          `Security: "Mismatch scan. Wrong answer triggers lockdown."`,
          `Tech: "That’s… a little extreme."`,
          `Security: "So is a breach."`
        ],
        task: { id: "mismatch", args: { base: 9 } }
      },
    ]
  },

  branches: {
    apologize: {
      preface: [
        `You: "I’m sorry. I’ll do what you say."`,
        `Security: "Good. Then follow directions."`,
        `System: "CONTAINMENT: MANUAL TASKS REQUIRED."`
      ],
      steps: [
        { say: [`Security: "Start the recovery chores. Slow and clean."`] },
        { filler: { count: 3, pool: "filler_standard" } },
        { say: [
          `Tech: "Stability is improving."`,
          `Security: "Keep them busy."`
        ]},
        { filler: { count: 2, pool: "filler_standard" } },
        { say: [
          `System: "PHASE CHECK: STABLE."`,
          `Security: "Don’t confuse stable with safe."`
        ]}
      ]
    },

    accident: {
      preface: [
        `You: "It was an accident."`,
        `Security: "Accidents don’t repeat nine times."`,
        `Security: "But fine. We’ll treat you like you don’t understand."`,
        `System: "RECOVERY MODE: TRAINING PATH."`
      ],
      steps: [
        { filler: { count: 3, pool: "filler_standard" } },
        { say: [
          `Security: "You’re still here."`,
          `Security: "So keep working."`
        ]},
        { filler: { count: 2, pool: "filler_standard" } },
        { say: [
          `System: "PHASE CHECK: STABLE."`,
          `Security: "Try the truth next time."`
        ]}
      ]
    },

    run: {
      preface: [
        `You: "Run."`,
        `Security: "No."`,
        `Security: "You do that again and we hard reset the corridor."`,
        `System: "THREAT SCORE: INCREASING."`,
        `System: "DIFFICULTY: ESCALATION APPLIED."`
      ],
      steps: [
        { filler: { count: 3, pool: "filler_hard" } },
        { say: [
          `Tech: "They’re resisting."`,
          `Security: "Then keep the workload high."`
        ]},
        { filler: { count: 2, pool: "filler_hard" } },
        { say: [
          `System: "PHASE CHECK: STABLE."`,
          `Security: "You’re not stable."`,
          `Security: "But you’re contained."`
        ]}
      ]
    }
  }
};
