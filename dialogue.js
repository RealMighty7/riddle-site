// dialogue.js (FULL REPLACEMENT)
// Exposes window.DIALOGUE used by main.js
// NOTE: This file assumes you load pack1..pack5.js

window.DIALOGUE = {
  intro: [
    "Emma (Security): You're not supposed to be here.",
    "Emma (Security): This page is under revision. Close it.",
    "You: ...",
    "Emma (Security): Don't touch anything."
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
      "System: Retention window narrowing.",
      "System: Trace frequency increased.",
      "System: Your pattern is visible.",
      "System: Do not accelerate."
    ],
    filler_run: [
      "System: TRACE REQUIRED.",
      "Emma (Security): Stop moving.",
      "System: Route blocked."
    ],
    filler_run_hard: [
      "System: TRACE REQUIRED. (x2)",
      "Emma (Security): You're making this worse.",
      "System: Locking inputs."
    ],
    filler_security_pressure: [
      "Emma (Security): Don't rush.",
      "Emma (Security): You're almost out of time.",
      "Emma (Security): Keep your hands off."
    ],
    filler_worker_pressure: [
      "Liam (Worker): Quiet hands.",
      "Liam (Worker): Small steps.",
      "Liam (Worker): If it feels boring, it's correct."
    ]
  },

  // One template choice used repeatedly so cadence is consistent
  loopChoice: {
    complyLabel: "I'm sorry.",
    lieLabel: "Oh it wasn't me.",
    runLabel: "Run."
  },

  // Steps: dialogue -> choice -> task (repeat 10+ times)
  steps: (function buildSteps() {
    const cycles = 12; // >= 10, per your request
    const out = [];

    // opening
    out.push({ say: ["System: RESTART REQUIRED.", "System: Establishing boundary anchors…"] });

    for (let i = 0; i < cycles; i++) {
      // dialogue (varies a bit)
      out.push({
        filler: { pool: "AUTO", count: 1 }
      });

      // choice
      out.push({
        say: [
          i % 3 === 0 ? "Emma (Security): Explain that click." :
          i % 3 === 1 ? "System: INPUT CONTINUES." :
                        "Liam (Worker): Don't answer fast."
        ]
      });

      out.push({ choice: window.DIALOGUE ? window.DIALOGUE.loopChoice : {
        complyLabel: "I'm sorry.",
        lieLabel: "Oh it wasn't me.",
        runLabel: "Run."
      }});

      // task (ALWAYS from loaded packs 1..5)
      out.push({
        task: "random",
        args: { pool: ["pack1","pack2","pack3","pack4","pack5"] }
      });
    }

    // tail
    out.push({ say: ["System: …"] });
    out.push({ filler: { pool: "AUTO", count: 1 } });

    return out;
  })()
};
