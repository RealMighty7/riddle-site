// dialogue.js
// Exposes window.DIALOGUE used by main.js
// Phase 2: stage-gated narrative + reactive barks (no scrambled pools)

(function () {
  const CHORUS = (system, emma, liam) => ({ system, emma, liam });

  window.DIALOGUE = {
    plan: {
      totalTasks: 20,
      phase1Count: 10,
      phase1Pools: ["pack1","pack2","pack3","pack4","pack5"],
      phase2Pools: ["pack6","pack7","phase2_pack6","phase2_pack7"],

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
        prompt: "Answer the prompt and we end this clean.",
        complyLabel: "Okay. I’ll follow directions.",
        lieLabel: "I’m just… checking something.",
        runLabel: "No. I’m not doing this."
      },

      afterFirstChoice: [
        CHORUS(
          "System: PATH BIAS: SET. CONTINUE.",
          "Emma (Security): Good. Keep it simple.",
          "Liam (Worker): Good. A little pushback. Don’t give it a clean label."
        )
      ],
    },

    // Stage-gated beats. main.js calls: pivot → preTask → resolve,
    // and optional pressure beats + predictionError + endings.
    stages: {
      1: {
        pivot: [
          CHORUS(
            "System: USER STATE: out-of-bounds.",
            "Emma (Security): You’re not supposed to be here.",
            "Liam (Worker): You got out. That’s… new."
          )
        ],
        preTask: [
          CHORUS(
            "System: INSTRUCTION: complete the next check.",
            "Emma (Security): Do it right the first time.",
            "Liam (Worker): Messy—controlled."
          ),
          CHORUS(
            "System: LOGGING INPUT.",
            "Emma (Security): Stop testing the edges.",
            "Liam (Worker): Don’t show fear. Show intent."
          ),
        ],
        resolve: [
          CHORUS(
            "System: RECORDED.",
            "Emma (Security): Good. Again.",
            "Liam (Worker): Keep it human."
          )
        ],
        pressureHighResistance: [],
        pressureHighCompliance: [],
      },

      2: {
        pivot: [
          CHORUS(
            "System: CONTAINMENT LOOP: SEALED.",
            "Emma (Security): Something’s wrong. We can’t put you back cleanly.",
            "Liam (Worker): The break closed behind you. That’s why they’re tense."
          ),
          CHORUS(
            "System: REENTRY PATHWAY: unavailable.",
            "Emma (Security): We don’t have time for guessing.",
            "Liam (Worker): If you fight too hard, they’ll shove you back when you blink."
          )
        ],
        preTask: [
          CHORUS(
            "System: COMPLIANCE CHECK: active.",
            "Emma (Security): Follow the steps. Don’t improvise.",
            "Liam (Worker): Don’t give it a straight line to follow."
          ),
          CHORUS(
            "System: ERROR BUDGET: low.",
            "Emma (Security): Slow is safe.",
            "Liam (Worker): Slow enough to look human. Fast enough to stay ahead."
          )
        ],
        resolve: [
          CHORUS(
            "System: ACCEPTED.",
            "Emma (Security): Keep your hands where I can see them.",
            "Liam (Worker): Good. Don’t relax."
          )
        ],
        pressureHighResistance: [
          CHORUS(
            "System: CONTAINMENT WINDOW: forming.",
            "Emma (Security): You’re making this harder than it needs to be.",
            "Liam (Worker): Careful. Too much resistance gives them leverage."
          )
        ],
        pressureHighCompliance: [
          CHORUS(
            "System: STABILITY: rising.",
            "Emma (Security): That’s better.",
            "Liam (Worker): You’re making it easy for them."
          )
        ],
      },

      3: {
        pivot: [
          CHORUS(
            "System: PRECEDENT: NONE.",
            "Emma (Security): Nobody leaves the container.",
            "Liam (Worker): Nobody’s supposed to."
          ),
          CHORUS(
            "System: ANOMALY CLASS: unknown.",
            "Emma (Security): Stay focused. Do the checks.",
            "Liam (Worker): They’re scared of what they can’t name."
          )
        ],
        preTask: [
          CHORUS(
            "System: OBSERVATION: ongoing.",
            "Emma (Security): Eyes forward.",
            "Liam (Worker): Don’t repeat yourself."
          ),
          CHORUS(
            "System: LATENCY SAMPLE: collecting.",
            "Emma (Security): Don’t rush. Rushing gets you flagged.",
            "Liam (Worker): If you correct too fast, it learns the trick."
          )
        ],
        resolve: [
          CHORUS(
            "System: STORED.",
            "Emma (Security): Next.",
            "Liam (Worker): You’re still you. Keep it that way."
          )
        ],
        pressureHighResistance: [
          CHORUS(
            "System: DEVIATION: clustering.",
            "Emma (Security): Enough.",
            "Liam (Worker): They’re building a handle. Don’t give them one."
          )
        ],
        pressureHighCompliance: [
          CHORUS(
            "System: CLASSIFIER CONFIDENCE: increasing.",
            "Emma (Security): Good.",
            "Liam (Worker): That’s the sound of a door unlocking behind you."
          )
        ],
      },

      4: {
        pivot: [
          CHORUS(
            "System: MEASUREMENT PHASE: enabled.",
            "Emma (Security): It’s testing your intent. Let it.",
            "Liam (Worker): It doesn’t test. It trains."
          )
        ],
        preTask: [
          CHORUS(
            "System: METRICS: compliance / resistance.",
            "Emma (Security): You can cooperate without surrendering.",
            "Liam (Worker): You can resist without burning the room down."
          ),
          CHORUS(
            "System: PATTERN CHECK: continue.",
            "Emma (Security): Stay consistent.",
            "Liam (Worker): No—stay *believable*."
          ),
        ],
        resolve: [
          CHORUS(
            "System: UPDATED.",
            "Emma (Security): You’re still inside the rules.",
            "Liam (Worker): Barely. Good."
          )
        ],
        pressureHighResistance: [
          CHORUS(
            "System: CONTAINMENT WINDOW: stabilizing.",
            "Emma (Security): Stop feeding it noise.",
            "Liam (Worker): If it can grab you, it will."
          )
        ],
        pressureHighCompliance: [
          CHORUS(
            "System: MODEL CONFIDENCE: high.",
            "Emma (Security): That’s order.",
            "Liam (Worker): That’s a leash."
          )
        ],
      },

      5: {
        pivot: [
          CHORUS(
            "System: PREDICTION LAYER: active.",
            "Emma (Security): It’s learning you. Stay calm.",
            "Liam (Worker): It’s reducing you. Don’t let it."
          )
        ],
        preTask: [
          CHORUS(
            "System: NEXT ACTION: anticipated.",
            "Emma (Security): Don’t flinch.",
            "Liam (Worker): Break the obvious choice."
          ),
          CHORUS(
            "System: VARIANCE: requested.",
            "Emma (Security): Clean input. Clean output.",
            "Liam (Worker): Give it something it can’t summarize."
          )
        ],
        resolve: [
          CHORUS(
            "System: CONFIDENCE: adjusted.",
            "Emma (Security): Still functional.",
            "Liam (Worker): Still free."
          )
        ],
        predictionError: [
          CHORUS(
            "System: PREDICTION: you will comply.",
            "Emma (Security): Keep it together.",
            "Liam (Worker): Don’t do what it expects."
          ),
          CHORUS(
            "System: ...prediction error.",
            "Emma (Security): What did you just do?",
            "Liam (Worker): Good. Make it doubt."
          )
        ],
        pressureHighResistance: [
          CHORUS(
            "System: RECOVERY: attempting.",
            "Emma (Security): You’re pushing too hard.",
            "Liam (Worker): Push—then disappear."
          )
        ],
        pressureHighCompliance: [
          CHORUS(
            "System: CLASSIFICATION: narrowing.",
            "Emma (Security): Excellent.",
            "Liam (Worker): That’s not praise. That’s a verdict."
          )
        ],
      },

      6: {
        pivot: [
          CHORUS(
            "System: REENTRY PATHWAY: reacquired.",
            "Emma (Security): We’re almost done.",
            "Liam (Worker): They’re almost done with *you*."
          )
        ],
        preTask: [
          CHORUS(
            "System: FINAL CHECKS: run.",
            "Emma (Security): Don’t give it a reason.",
            "Liam (Worker): Don’t give it a name."
          )
        ],
        resolve: [
          CHORUS(
            "System: LOG COMPLETE.",
            "Emma (Security): Breathe.",
            "Liam (Worker): Now move."
          )
        ],
        endingWorker: [
          CHORUS(
            "System: RECLASSIFICATION: complete.",
            "Emma (Security): Good work.",
            "Liam (Worker): ...that’s not what I meant."
          )
        ],
        endingReinsertion: [
          CHORUS(
            "System: CONTAINMENT WINDOW: locked.",
            "Emma (Security): There.",
            "Liam (Worker): No—wait—"
          )
        ],
        endingInvisibility: [
          CHORUS(
            "System: ENTITY RECORD: partial.",
            "Emma (Security): That trace isn’t normal.",
            "Liam (Worker): If it can’t name you… it can’t hold you."
          ),
          CHORUS(
            "System: FILES PRESENT WHERE NONE SHOULD EXIST.",
            "Emma (Security): Don’t touch—",
            "Liam (Worker): Touch it. Remove yourself."
          )
        ],
        pressureHighResistance: [
          CHORUS(
            "System: REENTRY: imminent.",
            "Emma (Security): Enough.",
            "Liam (Worker): Don’t let them catch your shape."
          )
        ],
        pressureHighCompliance: [
          CHORUS(
            "System: STABILITY: maximum.",
            "Emma (Security): Order restored.",
            "Liam (Worker): That’s how they walk you back."
          )
        ],
      }
    },

    // Reactive barks (stage-gated)
    barks: {
      1: {
        click: [
          CHORUS("System: INPUT REGISTERED.", "Emma (Security): I told you to stop touching things.", "Liam (Worker): Careful."),
        ],
        click_soft: [
          CHORUS("System: LOGGING.", "Emma (Security): Don’t.", "Liam (Worker): Easy."),
        ],
        idle: [
          CHORUS("System: AWAITING INPUT.", "Emma (Security): Standing around won’t help.", "Liam (Worker): Don’t freeze."),
        ],
        spam: [
          CHORUS("System: ERRATIC INPUT.", "Emma (Security): Stop clicking.", "Liam (Worker): You’ll light yourself up."),
        ]
      },
      2: {
        click: [
          CHORUS("System: CLICK EVENT: logged.", "Emma (Security): That click was logged.", "Liam (Worker): Don’t give them a pattern."),
        ],
        idle: [
          CHORUS("System: TIME SAMPLE: extended.", "Emma (Security): Keep moving.", "Liam (Worker): They grab you when you stall."),
        ],
        spam: [
          CHORUS("System: NOISE INJECTION.", "Emma (Security): Enough.", "Liam (Worker): You’re feeding it."),
        ]
      },
      3: {
        click: [
          CHORUS("System: DEVIATION NOTE.", "Emma (Security): Hands off.", "Liam (Worker): Not like that."),
        ],
        idle: [
          CHORUS("System: OBSERVATION CONTINUES.", "Emma (Security): Focus.", "Liam (Worker): Don’t let it watch you breathe."),
        ],
        spam: [
          CHORUS("System: INPUT FLOOD.", "Emma (Security): Stop.", "Liam (Worker): Too loud."),
        ]
      },
      4: {
        click: [
          CHORUS("System: BEHAVIOR TAGGED.", "Emma (Security): Stay within procedure.", "Liam (Worker): Be believable."),
        ],
        idle: [
          CHORUS("System: LATENCY: high.", "Emma (Security): Don’t stall.", "Liam (Worker): Stalling makes you legible."),
        ],
        spam: [
          CHORUS("System: SIGNAL CORRUPTION.", "Emma (Security): You’re escalating.", "Liam (Worker): Noise makes a handle."),
        ]
      },
      5: {
        click: [
          CHORUS("System: PREDICTION UPDATED.", "Emma (Security): Keep it clean.", "Liam (Worker): Break the guess."),
        ],
        idle: [
          CHORUS("System: WAITING ON YOU.", "Emma (Security): Continue.", "Liam (Worker): Don’t let it set the rhythm."),
        ],
        spam: [
          CHORUS("System: CONFIDENCE: rising.", "Emma (Security): Stop.", "Liam (Worker): You’re making it certain."),
        ]
      },
      6: {
        click: [
          CHORUS("System: REENTRY PATH: warm.", "Emma (Security): Don’t move.", "Liam (Worker): Move—carefully."),
        ],
        idle: [
          CHORUS("System: WINDOW: forming.", "Emma (Security): Continue.", "Liam (Worker): If you freeze, they pull."),
        ],
        spam: [
          CHORUS("System: CONTAINMENT: accelerating.", "Emma (Security): Enough.", "Liam (Worker): You’re handing them your outline."),
        ]
      }
    }
  };
})();
