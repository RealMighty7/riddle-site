// dialogue.js
// Exposes window.DIALOGUE used by main.js
// Steps drive the full sim narrative + task progression.

(() => {
  window.DIALOGUE = {
    intro: [
      "System: Unauthorized viewer session detected.",
      "System: This endpoint is under revision. External access is not intended.",
      "Emma (Security): Don't click anything you don't understand.",
      "Liam (Worker): ...slow is safe."
    ],

    // The simulation runs as a scripted sequence of steps.
    // Supported step shapes:
    // { say:[...] }  { choice:{ complyLabel, lieLabel, runLabel } }  { task:"id", args:{} }  { filler:{count,pool,meta} }
    
    steps: [
      // --- Establishment ---
      { say: [
        "System: SIMULATION WORKERS ROOM — initializing.",
        "System: Booting…",
        "System: Please wait…",
        "Emma (Security): Whoever you are — you don’t belong in here.",
        "Liam (Worker): Hey. Don’t panic. Just… follow the prompts. Slow is safe."
      ]},

      // --- Intro loop: dialogue → task (10) ---
      { say: [
        "System: Calibration required.",
        "Emma (Security): Your input is being recorded.",
        "Liam (Worker): First one’s simple. Don’t rush it."
      ]},
      { task: "checksum", args: { phrase: "echostatic07vault" } },

      { say: [
        "System: Pulse monitor online.",
        "Liam (Worker): Keep your rhythm steady. It matters."
      ]},
      { task: "pulse" },

      { choice: { complyLabel: "Do what it says.", lieLabel: "Pretend you didn’t see it.", runLabel: "Push past it." }},

      { say: [
        "System: Alignment drift detected.",
        "Emma (Security): If you slip, containment tightens.",
        "Liam (Worker): Center everything. Perfectly."
      ]},
      { task: "align" },

      { say: [
        "System: Mirror channel opened.",
        "Liam (Worker): Repeat exactly. No improvising."
      ]},
      { task: "mirror" },

      { say: [
        "System: Pressure test.",
        "Emma (Security): Hold. Don’t flinch."
      ]},
      { task: "hold" },

      { say: [
        "System: Scrub filter required.",
        "Liam (Worker): All switches on. Clean pass."
      ]},
      { task: "scrub" },

      { say: [
        "System: Splice token issued.",
        "Emma (Security): Type only what’s requested."
      ]},
      { task: "splice" },

      { choice: { complyLabel: "Stay compliant.", lieLabel: "Signal Liam.", runLabel: "Interfere." }},

      { say: [
        "System: Trace sequence armed.",
        "Liam (Worker): In order. Don’t miss a node."
      ]},
      { task: "trace" },

      { say: [
        "System: Offset gate.",
        "Emma (Security): You’re being tested for speed and accuracy."
      ]},
      { task: "offset" },

      { say: [
        "System: Mask selection required.",
        "Liam (Worker): There’s a rule. It’s not a guess."
      ]},
      { task: "mask" },

      // --- Phase 2: harder interactive pack ---
      { say: [
        "System: Intro sequence complete.",
        "System: Escalation permitted.",
        "Emma (Security): This is where people break.",
        "Liam (Worker): Or where they get out. One step at a time."
      ]},

      { task: "wires" },
      { say: [ "System: Routing layer unlocked." ]},
      { task: "router" },

      { say: [ "System: Tile map loaded." ]},
      { task: "jigsaw" },

      { say: [ "System: Pattern lock armed." ]},
      { task: "patternlock" },

      { say: [ "System: Frequency window narrowing." ]},
      { task: "freq_match" },

      { say: [ "System: Memory grid enabled." ]},
      { task: "grid_memory" },

      { say: [ "System: Cipher keypad offered." ]},
      { task: "cipherpad" },

      { say: [ "System: Calibration zone unstable." ]},
      { task: "calibration" },

      { say: [ "System: Diff merge required." ]},
      { task: "diff_merge" },

      { say: [ "System: Port list published." ]},
      { task: "ports" },

      // --- Final hack ---
      { say: [
        "System: Final procedure required.",
        "Emma (Security): Do NOT attempt to delete anything.",
        "Liam (Worker): Delete only the flagged lines. If one escapes, you lose the window."
      ]},
      { task: "hack_final" },
    ]
,
  };

  // Optional helper filler; main.js will call this if present.
  window.DIALOGUE_HELPERS = window.DIALOGUE_HELPERS || {};
})();
