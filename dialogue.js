/*
 dialogue.js — REBUILT
 Lore-driven, non-expository, weighted chorus (System / Emma / Liam)
 Tasks are NEVER described in dialogue.
 Tasks are bracketed by a non-voiced system tag.
*/

window.DIALOGUE = (() => {

  // Utility: lines can be strings or weighted objects.
  // main.js resolves which voice speaks based on compliance/resistance weights.
  const intro = [
    "System: SESSION INITIALIZED.",
    "Emma: Stay still. This will go faster if you don’t rush it.",
    "Liam: …You’re already inside.",
    "System: SUBJECT DETECTED.",
  ];

  // Generic reactions (used across steps)
  const react = {
    system: [
      "System: INPUT CONSISTENCY NOTED.",
      "System: VARIANCE WITHIN ACCEPTABLE RANGE.",
      "System: CONFIRMATION RECEIVED.",
      "System: PATTERN STABILIZING.",
      "System: RE-EVALUATING PARAMETERS.",
    ],
    emma: [
      "Emma: Don’t overthink it. Just keep moving.",
      "Emma: You’re making this harder than it needs to be.",
      "Emma: Slow down. Follow the order.",
      "Emma: That’s… fine. Continue.",
      "Emma: I need you to stay predictable.",
    ],
    liam: [
      "Liam: Interesting.",
      "Liam: That still counted.",
      "Liam: You didn’t do what it expected.",
      "Liam: Patterns don’t like being watched.",
      "Liam: Don’t fix it. Let it sit.",
    ],
  };

  // Non-voiced task tag helper (rendered by UI, not spoken)
  function taskTag(name) {
    return { __taskTag: true, name };
  }

  // 20-step loop: dialogue → task tag → task
  const steps = [];

  for (let i = 1; i <= 20; i++) {
    steps.push(
      {
        say: [
          // Chorus-style: engine will bias who appears more often
          { system: react.system[i % react.system.length] },
          { emma: react.emma[i % react.emma.length] },
          { liam: react.liam[i % react.liam.length] },
        ],
      },
      taskTag(`TASK_${i}`),
      {
        task: `task_${i}`, // resolved in tasks.js
        args: { index: i },
      }
    );
  }

  const preHack = [
    "System: EVALUATION INCOMPLETE.",
    "Emma: …This shouldn’t still be running.",
    "Liam: Yeah. That’s the point.",
  ];

  const hackRoom = [
    "System: UNAUTHORIZED ACCESS.",
    "Emma: Wait— this isn’t a task.",
    "Liam: It is. Just not one for you.",
  ];

  const escape = [
    "System: SUBJECT STATUS…",
    "System: …",
    "Emma: I don’t see you anymore.",
    "Liam: That’s because you’re not here.",
  ];

  return {
    intro,
    steps,
    preHack,
    hackRoom,
    escape,
  };
})();
