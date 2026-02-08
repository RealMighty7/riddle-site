/* dialogue.js (FULL REPLACEMENT)
   Lore-forward, non-expository.
   - No task mechanics described in dialogue.
   - Before each task, a UI-only tag is printed (not spoken) like: UI: [ TASK: mirror ]
   - Chorus pools are arrays; main.js chooses one line based on current resistance/compliance balance.
*/

(() => {
  const POOL = (system, emma, liam) => ([
    `System: ${system}`,
    `Emma: ${emma}`,
    `Liam: ${liam}`,
  ]);

  window.DIALOGUE = {
    intro: [
      POOL(
        "UNAUTHORIZED VIEWER SESSION DETECTED.",
        "Don’t click anything you don’t understand.",
        "…slow is safe."
      ),
      POOL(
        "ENDPOINT UNDER REVISION. EXTERNAL ACCESS NOT INTENDED.",
        "You’re not supposed to be here. Keep your hands off.",
        "If you’re hearing me, you’ve already been marked."
      ),
      POOL(
        "SESSION BOUNDARY FAILED. CONTINUING.",
        "Breathe. Don’t make it worse.",
        "Just… don’t move like a machine."
      ),
    ],

    steps: [
      { say: [
        POOL(
          "SIMULATION WORKERS ROOM — INITIALIZING.",
          "Stay still. If you rush, it tightens.",
          "You can’t argue with it. You can only… mislead it."
        ),
        POOL(
          "INPUT WILL BE OBSERVED.",
          "It’s watching for a pattern. That’s all.",
          "If it can name you, it keeps you."
        ),
      ]},

      { choice: {
        complyLabel: "Okay. I’ll follow.",
        lieLabel: "…I’m not playing along.",
        runLabel: "No. I’m leaving."
      }},

      { say: [ POOL("CALIBRATION REQUIRED.", "Don’t perform. Just act.", "Don’t be consistent.") ]},
      { say: [ "UI: [ TASK: checksum ]" ]}, { task: "checksum", args: { phrase: "echostatic07vault" } },

      { say: [ POOL("PULSE MONITOR ONLINE.", "Steady. Predictable.", "Not too predictable.") ]},
      { say: [ "UI: [ TASK: pulse ]" ]}, { task: "pulse" },

      { say: [ POOL("ALIGNMENT DRIFT DETECTED.", "Center it and move on.", "Perfect is a trap.") ]},
      { say: [ "UI: [ TASK: align ]" ]}, { task: "align" },

      { say: [ POOL("MIRROR CHANNEL OPENED.", "No theatrics.", "It loves repeats. Starve it.") ]},
      { say: [ "UI: [ TASK: mirror ]" ]}, { task: "mirror" },

      { say: [ POOL("PRESSURE TEST.", "Hold. Don’t flinch.", "Let it think you almost did.") ]},
      { say: [ "UI: [ TASK: hold ]" ]}, { task: "hold" },

      { say: [ POOL("SCRUB FILTER REQUIRED.", "Clean pass. Keep order.", "If it stutters, let it.") ]},
      { say: [ "UI: [ TASK: scrub ]" ]}, { task: "scrub" },

      { say: [ POOL("SPLICE TOKEN ISSUED.", "Do not improvise.", "Improvise where it can’t measure.") ]},
      { say: [ "UI: [ TASK: splice ]" ]}, { task: "splice" },

      { say: [ POOL("TRACE SEQUENCE ARMED.", "In order. No detours.", "Detours are how you breathe.") ]},
      { say: [ "UI: [ TASK: trace ]" ]}, { task: "trace" },

      { say: [ POOL("OFFSET GATE.", "Don’t hesitate.", "Hesitation tells the truth.") ]},
      { say: [ "UI: [ TASK: offset ]" ]}, { task: "offset" },

      { say: [ POOL("MASK SELECTION REQUIRED.", "Choose. Commit.", "Commit… but not the same way twice.") ]},
      { say: [ "UI: [ TASK: mask ]" ]}, { task: "mask" },

      { say: [ POOL("ESCALATION PERMITTED.", "This is where people try to be perfect.", "Perfect is how it wins.") ]},

      { say: [ "UI: [ TASK: wires ]" ]}, { task: "wires" },
      { say: [ POOL("ROUTING LAYER UNLOCKED.", "Stay orderly.", "Order is just a costume.") ]},
      { say: [ "UI: [ TASK: router ]" ]}, { task: "router" },

      { say: [ "UI: [ TASK: jigsaw ]" ]}, { task: "jigsaw" },
      { say: [ POOL("PATTERN LOCK ARMED.", "Don’t drift.", "Drift on purpose.") ]},
      { say: [ "UI: [ TASK: patternlock ]" ]}, { task: "patternlock" },

      { say: [ "UI: [ TASK: freq_match ]" ]}, { task: "freq_match" },
      { say: [ POOL("MEMORY GRID ENABLED.", "Don’t panic.", "Panic makes new shapes.") ]},
      { say: [ "UI: [ TASK: grid_memory ]" ]}, { task: "grid_memory" },

      { say: [ "UI: [ TASK: cipherpad ]" ]}, { task: "cipherpad" },
      { say: [ POOL("CALIBRATION ZONE UNSTABLE.", "Keep it together.", "Let it think you can't.") ]},
      { say: [ "UI: [ TASK: calibration ]" ]}, { task: "calibration" },

      { say: [ "UI: [ TASK: diff_merge ]" ]}, { task: "diff_merge" },
      { say: [ POOL("PORT LIST PUBLISHED.", "Stop resisting.", "Resist… but sideways.") ]},
      { say: [ "UI: [ TASK: ports ]" ]}, { task: "ports" },

      { say: [
        POOL("EVALUATION INCOMPLETE.", "This shouldn’t still be running.", "Good. It can’t settle on you."),
        POOL("RETRYING CLASSIFICATION.", "Don’t give it a clean answer.", "Be the kind of wrong it can’t file."),
      ]},

      { say: [ "UI: [ TASK: hack_final ]" ]},
      { task: "hack_final" },

      { say: [
        POOL("SUBJECT STATUS: …", "I don’t… see you anymore.", "That’s because you’re not a record now."),
        POOL("SESSION CLOSED.", "Walk. Don’t look back.", "Act like you belong, and they’ll let you pass."),
      ]},
    ],
  };
})();
