// dialogue.js (FULL REPLACEMENT)
// Exposes window.DIALOGUE used by main.js
// Uses ONLY pack5 task IDs (prevents "Missing task" spam)

window.DIALOGUE = {
  intro: [
    "Emma (Security): You're not supposed to be here.",
    "Emma (Security): This page is under revision. Close it.",
    "You: ...",
    "Emma (Security): Don't touch anything."
  ],

  // keep choiceBeats minimal (your main.js runs these before steps)
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
          "Liam (Worker): Lying might help get you through some parts…",
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
      "System: Retention window closing.",
      "System: Trace frequency increased.",
      "System: Attention window narrowing.",
      "System: Do not pause."
    ],
    filler_worker_pressure: [
      "Liam (Worker): Quiet hands.",
      "Liam (Worker): Small steps.",
      "Liam (Worker): Don’t be clever.",
      "Liam (Worker): Just pass through."
    ],
    filler_security_pressure: [
      "Emma (Security): Stop testing me.",
      "Emma (Security): Follow procedure.",
      "Emma (Security): You're burning time.",
      "Emma (Security): Keep moving."
    ],
    filler_run: [
      "System: Running is noisy.",
      "System: Noise attracts audits.",
      "Emma (Security): You're leaving a trail."
    ],
    filler_run_hard: [
      "System: Trace density increased.",
      "System: You are not outrunning the log.",
      "Emma (Security): You're not fast enough."
    ]
  },

  // Enforced loop: say -> choice -> task (10 cycles)
  steps: [
    { say: ["System: RESTART REQUIRED.", "System: Establishing boundary anchors…"] },

    { say: ["System: Give me something simple."] },
    { choice: { complyLabel: "Okay.", lieLabel: "…sure.", runLabel: "No." } },
    { task: "keypad_4" },

    { say: ["System: Next. No mistakes."] },
    { choice: { complyLabel: "Proceed.", lieLabel: "I already did.", runLabel: "Stop." } },
    { task: "mirror_match" },

    { say: ["Emma (Security): Cut the right one and don’t talk."] },
    { choice: { complyLabel: "Understood.", lieLabel: "I know.", runLabel: "Run." } },
    { task: "wire_cut" },

    { say: ["System: Calibrate attention. Highest value."] },
    { choice: { complyLabel: "Fine.", lieLabel: "Whatever.", runLabel: "No." } },
    { task: "highest_number" },

    { say: ["Liam (Worker): Still. Inside the box."] },
    { choice: { complyLabel: "Okay.", lieLabel: "I am.", runLabel: "I won’t." } },
    { task: "steady_hand" },

    { say: ["System: Route selection. Only one port is allowed."] },
    { choice: { complyLabel: "Selecting.", lieLabel: "Already done.", runLabel: "Skip." } },
    { task: "port_select" },

    { say: ["System: Sync. Hit zero."] },
    { choice: { complyLabel: "Ready.", lieLabel: "I’m ready.", runLabel: "No." } },
    { task: "click_on_zero" },

    { say: ["System: Private route only."] },
    { choice: { complyLabel: "Okay.", lieLabel: "Sure.", runLabel: "Run." } },
    { task: "private_ip" },

    { say: ["System: Checksum. Fast math."] },
    { choice: { complyLabel: "Do it.", lieLabel: "Easy.", runLabel: "No." } },
    { task: "sum_chunks" },

    { say: ["Emma (Security): Sanitise it. Don’t leave vowels."] },
    { choice: { complyLabel: "Copy.", lieLabel: "I know.", runLabel: "Stop." } },
    { task: "devowel" },

    // After 10 tasks, your main.js triggers the “almost done” → final modal sequence.
    { say: ["System: …"] }
  ]
};
