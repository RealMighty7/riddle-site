// dialogue.js
window.DIALOGUE = {
  intro: [
    `Security: "All stations, freeze."`,
    `Security: "Confirm breach classification."`,
    // ...
  ],

  branches: {
    need: {
      preface: [
        `You: "I need something first."`,
        `Security: "Correct."`,
      ],
      phase1: [
        // lines shown between tasks
      ],
      // later: phase2, phase3, etc
    },

    lie: {
      preface: [
        `You: "I clicked by accident."`,
        `Security: "No."`,
      ],
      phase1: [],
    },

    run: {
      preface: [
        `You: "Run."`,
        `Security: "Stop."`,
      ],
      phase1: [],
    }
  }
};
