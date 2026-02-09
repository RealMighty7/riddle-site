// dialogue.js
// Exposes window.DIALOGUE used by main.js
// Design:
// - No task IDs in spoken dialogue.
// - "UI:" lines are visual-only (main.js prints instantly, no TTS).
// - Character presence is a tag-team: main.js dynamically picks System/Emma/Liam lines
//   from CHORUS objects based on compliance vs resistance.

(function () {
  const CHORUS = (system, emma, liam) => ({ system, emma, liam });

  window.DIALOGUE = {
    // main.js prefers DIALOGUE.plan when present.
    plan: {
      intro: [
        CHORUS(
          "System: SESSION DETECTED. You are not scheduled.",
          "Emma (Security): Hey. Stop touching the panel.",
          "Liam (Worker): ...don’t panic. Just breathe."
        ),
        CHORUS(
          "System: COMPLIANCE CHECK: pending.",
          "Emma (Security): I can log this as a mistake if you behave.",
          "Liam (Worker): If you freeze up, it notices. Keep moving."
        ),
        CHORUS(
          "System: NOTICE: this endpoint is restricted.",
          "Emma (Security): Look at me. Answer the prompt and we’re done.",
          "Liam (Worker): They don’t care who you are—only what you look like to the model."
        ),
      ],

      firstChoice: {
        complyLabel: "Okay. I’ll follow directions.",
        lieLabel: "I’m just… checking something.",
        runLabel: "No. I’m not doing this."
      },

      afterFirstChoice: [
        CHORUS(
          "System: PATH BIAS SET. CONTINUE.",
          "Emma (Security): Fine. Keep it clean and I’ll keep it quiet.",
          "Liam (Worker): Good. A little pushback. Don’t give it a clean label."
        ),
      ],

      // These repeat over tasks; main.js loops them.
      taskBeats: [
        CHORUS(
          "System: INSTRUCTION: complete the next check.",
          "Emma (Security): Simple. Do it right the first time.",
          "Liam (Worker): Make it messy—but controlled."
        ),
        CHORUS(
          "System: ERROR BUDGET: low.",
          "Emma (Security): Don’t rush. Rushing is how people get flagged.",
          "Liam (Worker): Yeah—slow enough to look human, fast enough to stay ahead."
        ),
        CHORUS(
          "System: STATUS: observing.",
          "Emma (Security): You’re being watched. That’s not a metaphor.",
          "Liam (Worker): They watch patterns. Give them patterns that disagree."
        ),
        CHORUS(
          "System: CORRECTION REQUIRED.",
          "Emma (Security): If you slip, fix it clean.",
          "Liam (Worker): If you slip, don’t correct the *same* way twice."
        ),
        CHORUS(
          "System: CLASSIFIER CONFIDENCE: updating.",
          "Emma (Security): Keep your hands steady.",
          "Liam (Worker): Keep your story inconsistent—but believable."
        ),
      ],

      totalTasks: 20,
      phase1Count: 10,
      phase1Pools: ["pack1", "pack2", "pack3", "pack4", "pack5"],
      phase2Pools: ["pack6", "pack7"],

      afterTasks: [
        CHORUS(
          "System: EVALUATION COMPLETE. SUBJECT: unresolved.",
          "Emma (Security): Twenty checks. That should have been enough…",
          "Liam (Worker): It still can’t settle on you. Good. That’s the opening."
        ),
        CHORUS(
          "System: REMEDIATION: escalation.",
          "Emma (Security): It’s going to push you into the back-room terminal.",
          "Liam (Worker): When it does—delete the thing it keeps grabbing. Delete *you*."
        ),
      ],
    },
  };
})();
