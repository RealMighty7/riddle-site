// dialogue.js
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

  branches: {
    need: {
      preface: [
        `You: "I need something first."`,
        `Security: "Correct."`,
        `Security: "Compliance is the only language this corridor recognizes."`
      ],
      quest: [
        { say: [
          `Security: "Good. You understand procedure."`,
          `Security: "You will comply with restart protocol until containment stabilizes."`,
          `System: "RESTART TRIGGERED BY BOUNDARY DAMAGE."`,
          `System: "RECOVERY MODE: MANUAL."`,
          `Worker 2: "We can salvage this if they follow instructions."`,
          `Security: "No commentary. Keep it clinical."`
        ]},
        { task: "anchors", args: { base: 5 } },

        { say: [
          `System: "ANCHOR SYNC: PARTIAL."`,
          `Security: "Continue."`,
          `Security: "Reconstruct the event timeline."`
        ]},
        { task: "reorder", args: {
          items: ["impact", "fracture", "alarm", "lockdown", "observer"],
          correct: ["observer", "impact", "fracture", "alarm", "lockdown"]
        }},

        { say: [
          `Security: "Checksum verification."`,
          `Worker 3: "Wrong input loops the failure state."`,
          `Security: "Then don’t be wrong."`
        ]},
        { task: "checksum", args: { phrase: "ECHOECHO-VAULT" } },

        { say: [
          `Security: "Stabilize. Hold it."`,
          `System: "BOUNDARY INTEGRITY: DEGRADED."`
        ]},
        { task: "hold", args: { baseMs: 3000 } },

        { say: [
          `System: "RESTART PHASE 1 COMPLETE."`,
          `Security: "Do not celebrate."`,
          `Security: "Proceed."`
        ]}
      ]
    },

    lie: {
      preface: [
        `You: "I clicked by accident."`,
        `Security: "No."`,
        `Security: "Accidents do not produce controlled fractures."`
      ],
      quest: [
        { say: [
          `System: "BEHAVIORAL FLAG: DECEPTIVE."`,
          `Security: "You will correct that."`,
          `Security: "Manual restart chores. Now."`
        ]},
        { task: "anchors", args: { base: 6 } },

        { say: [
          `Security: "Timeline reconstruction."`,
          `Worker 2: "They’re… actually doing it."`,
          `Security: "Of course they are. They want out."`
        ]},
        { task: "pattern", args: { base: 5 } },

        { say: [
          `Security: "Checksum."`,
          `System: "REQUIRED: PHRASE MATCH."`
        ]},
        { task: "checksum", args: { phrase: "ECHOECHO-VAULT" } },

        { say: [
          `Security: "Stabilize."`,
          `Security: "Hold it. Don’t let go."`
        ]},
        { task: "hold", args: { baseMs: 3400 } },

        { say: [
          `System: "RESTART PHASE 1 COMPLETE."`,
          `Security: "Better."`,
          `Security: "Don’t waste my time again."`
        ]}
      ]
    },

    run: {
      preface: [
        `You: "Run."`,
        `Security: "Stop."`,
        `Security: "Escalation noted."`
      ],
      quest: [
        { say: [
          `System: "THREAT SCORE: INCREASING."`,
          `Security: "Keep them busy. Keep them contained."`,
          `Worker 1: "If they panic, it collapses the corridor."`,
          `Security: "Then don’t let them panic."`
        ]},
        { task: "anchors", args: { base: 7 } },

        { say: [
          `Security: "Stabilize. Now."`,
          `System: "BOUNDARY STILL UNSTABLE."`
        ]},
        { task: "hold", args: { baseMs: 3600 } },

        { say: [
          `Security: "Scan mismatch."`,
          `Security: "Find the corrupted fragment."`
        ]},
        { task: "mismatch", args: { base: 7 } },

        { say: [
          `Security: "Reconstruct the timeline."`,
          `Worker 3: "If it loops, you start over."`
        ]},
        { task: "reorder", args: {
          items: ["panic", "push", "crack", "alarm", "seal"],
          correct: ["push", "crack", "alarm", "seal", "panic"]
        }},

        { say: [
          `Security: "Checksum. Last chance."`,
          `System: "REQUIRED."`
        ]},
        { task: "checksum", args: { phrase: "ECHOECHO-VAULT" } },

        { say: [
          `System: "RESTART PHASE 1 COMPLETE."`,
          `Security: "You’re unstable, but you’re useful."`,
          `Security: "Proceed."`
        ]}
      ]
    }
  }
};
