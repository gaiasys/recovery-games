/* =========================================================
   TELEMETRY MODULE (Session & Engagement Tracking)
========================================================= */

const TELEMETRY_KEY = "recoveryGameTelemetry";
const TELEMETRY_DEFAULTS = {
  sessionCount: 0,
  cumulativeAttemptCount: 0,
  lastSessionEnd: null,
  lastSessionStart: null,
  lastSessionDuration: 0,
  lastSessionInterval: null,
  sessionFrequency: 0,
  lastCompletionStatus: null,
  lastExitType: null
};

function loadTelemetryStore() {
  try {
    return { ...TELEMETRY_DEFAULTS, ...JSON.parse(localStorage.getItem(TELEMETRY_KEY) || '{}') };
  } catch (e) {
    return { ...TELEMETRY_DEFAULTS };
  }
}

function saveTelemetryStore(store) {
  localStorage.setItem(TELEMETRY_KEY, JSON.stringify(store));
}

function startTelemetrySession() {
  const store = loadTelemetryStore();
  const now = Date.now();
  store.sessionCount += 1;
  store.lastSessionStart = now;
  if (store.lastSessionEnd) {
    store.lastSessionInterval = now - store.lastSessionEnd;
  }
  saveTelemetryStore(store);
}

function endTelemetrySession({ completed = false, exitType = "normal" } = {}) {
  const store = loadTelemetryStore();
  const now = Date.now();
  store.lastSessionEnd = now;
  if (store.lastSessionStart) {
    store.lastSessionDuration = now - store.lastSessionStart;
  }
  store.lastCompletionStatus = completed ? "completed" : "quit";
  store.lastExitType = exitType;
  saveTelemetryStore(store);
}

function incrementAttempt(withinSession = true) {
  const store = loadTelemetryStore();
  store.cumulativeAttemptCount += 1;
  saveTelemetryStore(store);
}

function getTelemetrySummary() {
  const store = loadTelemetryStore();
  return {
    sessionCount: store.sessionCount,
    cumulativeAttemptCount: store.cumulativeAttemptCount,
    lastSessionStart: store.lastSessionStart,
    lastSessionEnd: store.lastSessionEnd,
    lastSessionDuration: store.lastSessionDuration,
    lastSessionInterval: store.lastSessionInterval,
    lastCompletionStatus: store.lastCompletionStatus,
    lastExitType: store.lastExitType
  };
}

// Start session on page load
startTelemetrySession();

// End session on page unload (normal or forced close)
window.addEventListener("beforeunload", function (e) {
  // If game is completed, set completed=true, else quit
  const completed = window.__gameSessionCompleted === true;
  // If timeout or forced, you can set exitType accordingly (extend as needed)
  endTelemetrySession({ completed, exitType: "normal" });
});

// Helper to mark session as completed (call this when user finishes all runs)
function markGameSessionCompleted() {
  window.__gameSessionCompleted = true;
  endTelemetrySession({ completed: true, exitType: "normal" });
}

// Helper to mark session as quit (call this on quit/exit)
function markGameSessionQuit(exitType = "quit") {
  window.__gameSessionCompleted = false;
  endTelemetrySession({ completed: false, exitType });
}

// Example: increment attempt when a run starts
function onGameAttemptStart() {
  incrementAttempt();
}

// You can use getTelemetrySummary() to access metrics for debugging or analytics

/* =========================================================
   DOM REFERENCES
========================================================= */

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const setupTitle = document.getElementById("setupTitle");
const setupSub = document.getElementById("setupSub");
const setupOverlay = document.getElementById("setupOverlay");
const questionnaireGrid = document.getElementById("questionnaireGrid");
const startGameBtn = document.getElementById("startGameBtn");
const endSessionBtn = document.getElementById("endSessionBtn");
const runAgainBtn = document.getElementById("runAgainBtn");
const setupError = document.getElementById("setupError");

const scenarioModal = document.getElementById("scenarioModal");
const scenarioCard = document.querySelector(".scenario-card");
const scenarioTitle = document.getElementById("scenarioTitle");
const scenarioText = document.getElementById("scenarioText");
const scenarioMeta = document.getElementById("scenarioMeta");
const scenarioHint = document.getElementById("scenarioHint");
const scenarioChoices = document.getElementById("scenarioChoices");
const scenarioResultBox = document.getElementById("scenarioResultBox");
const scenarioFeedback = document.getElementById("scenarioFeedback");
const scenarioOutcome = document.getElementById("scenarioOutcome");
const scenarioContinueBtn = document.getElementById("scenarioContinueBtn");

const hudLevel = document.getElementById("hudLevel");
const hudEnergy = document.getElementById("hudEnergy");
const hudScore = document.getElementById("hudScore");
const hudCaught = document.getElementById("hudCaught");
const hudSafeZone = document.getElementById("hudSafeZone");
const hudFocus = document.getElementById("hudFocus");
const hudTool = document.getElementById("hudTool");

const prevStepBtn = document.getElementById("prevStepBtn");
const nextStepBtn = document.getElementById("nextStepBtn");
const surveyStepLabel = document.getElementById("surveyStepLabel");
const surveyProgressFill = document.getElementById("surveyProgressFill");
const surveyStageTitle = document.getElementById("surveyStageTitle");
const surveyStageSub = document.getElementById("surveyStageSub");
const buildSnapshotPanel = document.getElementById("buildSnapshotPanel");
const choicesPanel = document.getElementById("choicesPanel");

/* =========================================================
   CONFIG
========================================================= */

const PLAYER_BASE_SPEED = 2.35;
const BEST_SPEED = 2.85;
const WORST_SPEED = 1.7;
const EFFECT_MS = 2500;

const STARTING_STABILITY = 6;
const TOTAL_RUNS = 3;

const WRAP_SCENARIO_CHANCE = 0.35;
const WRAP_SCENARIO_COOLDOWN_MS = 60000;

const SAFE_ZONE_PROMPT_COOLDOWN_MS = 30000;
const SAFE_ZONE_REPEAT_MS = 60000;

const THREAT_SCENARIO_COOLDOWN_MS = 60000;
const THREAT_SCENARIO_CHECK_MS = 3000;
const THREAT_SCENARIO_ROLL = 0.06;

const GLOBAL_MODAL_COOLDOWN_MS = 8000;
const CATCH_STABILITY_LOSS = 2;

const DANGER_DISTANCE = 92;
const NEAR_MISS_DISTANCE = 28;

const CELL_SIZE = 12;
const PORTAL = {
  y: 305,
  h: 56
};

const GRID_COLS = Math.ceil(canvas.width / CELL_SIZE);
const GRID_ROWS = Math.ceil(canvas.height / CELL_SIZE);

const MAX_ACTIVE_PROTECTIVE = 2;
const MAX_ACTIVE_RISK = 4;
const PROTECTIVE_SPAWN_MIN_MS = 6200;
const PROTECTIVE_SPAWN_MAX_MS = 8500;
const RISK_SPAWN_MIN_MS = 2200;
const RISK_SPAWN_MAX_MS = 4500;
const FACTOR_LIFETIME_MS = 8500;

const PLAYER_DRAW = { w: 30, h: 40 };

const CHASER_DRAW_BY_SKIN = {
  solar: { w: 45, h: 40 },
  ember: { w: 45, h: 40 },
  frost: { w: 60, h: 40 }
};

const FACTOR_DRAW = { w: 40, h: 40 };

/* Relentless chaser tuning: chasers stay on pressure and do not peel away from the player. */
const THREAT_SPEED_PHASES = [1.18, 1.34, 1.5, 1.66];
const CHASE_DURATION = 10000;
const SCATTER_DURATION = 0;
const SCATTER_SPEED_MULTIPLIER = 1.0;

const THREAT_LEVELS = [
  { time: 0, activeChasers: 2, speed: 1.18, label: "Level 1" },
  { time: 35, activeChasers: 3, speed: 1.34, label: "Level 2" },
  { time: 75, activeChasers: 4, speed: 1.5, label: "Level 3" },
  { time: 110, activeChasers: 4, speed: 1.66, label: "Level 4" }
];

const COLORS = {
  wallFill: "#16324A",
  wallInner: "#224E73",
  wallCore: "#8BEAFF",
  wallGlow: "rgba(93, 231, 255, 0.18)",

  player: "#7CFF3A",
  playerBorder: "#D9FF7A",
  playerInvulnerable: "#B7FF8A",

  chaserBody: "#0B1020",
  chaserGlows: ["#5DE7FF", "#FFD95A", "#FF7AD9", "#FF6B6B"],
  chaserAlertGlow: "rgba(255, 90, 90, 0.95)",

  safeFill: "rgba(20, 55, 35, 0.82)",
  schoolBorder: "#8BEAFF",
  familyBorder: "#FFD95A",
  peerBorder: "#C689FF",

  wrapBorder: "#5DE7FF",
  wrapStripe: "#F4F8FF",
  questionAccent: "#FFD95A",

  protective: "#67FF94",
  risk: "#FF7A7A",
  protectiveGlow: "rgba(103, 255, 148, 0.95)",
  riskGlow: "rgba(255, 90, 90, 0.95)",
  factorBg: "rgba(10, 25, 40, 0.94)"
};

/* =========================================================
   SURVEY SCHEMAS / STATIC DATA
========================================================= */

const preSurveySchema = [
  {
    key: "challengePriority",
    title: "Big Challenges",
    description: "Pick which challenge is hardest for this character.",
    options: [
      { value: "peer", label: "Peer Pressure" },
      { value: "facts", label: "Knowing the Facts" },
      { value: "personal", label: "Handling Big Feelings" }
    ]
  },
  {
    key: "defensePriority",
    title: "Your Recovery Power",
    description: "Pick what happens right after your character gets caught.",
    options: [
      { value: "refusal_skills", label: "Saying No" },
      { value: "environmental_control", label: "Changing Your Surroundings" },
      { value: "social_agency", label: "Speaking Up for Yourself" }
    ]
  },
  {
    key: "recoveryPriority",
    title: "Ways to Reset",
    description: "Pick which coping tool helps your character reset fastest.",
    options: [
      { value: "stress_management", label: "Calming Down" },
      { value: "creative_outlets", label: "Creative Activities" },
      { value: "physical_activity", label: "Movement" }
    ]
  },
  {
    key: "safeZonePriority",
    title: "Your Safe Places",
    description: "Pick which safe zone gives your character the strongest protection and support.",
    options: [
      { value: "school", label: "School" },
      { value: "family", label: "Home" },
      { value: "peer", label: "Friends" }
    ]
  },
  {
    key: "factFindingTool",
    title: "Ways to Find the Truth",
    description: "Pick the best way for this character to learn what is true and safe.",
    options: [
      { value: "direct_knowledge", label: "What You Already Know" },
      { value: "external_research", label: "Looking It Up" },
      { value: "collaborative_problem_solving", label: "Working It Out Together" }
    ]
  },
  {
    key: "cheatCode",
    title: "Special Helps",
    description: "Pick the extra help this character needs most.",
    options: [
      { value: "strategic_planning", label: "Planning Ahead" },
      { value: "internal_motivation", label: "Inner Strength" },
      { value: "situational_awareness", label: "Paying Attention" }
    ]
  }
];

const postSurveySchema = [
  {
    key: "challengePriority",
    title: "Big Challenges After the Run",
    description: "After the run, pick which challenge still needs the most help.",
    options: [
      { value: "peer", label: "Peer Pressure" },
      { value: "facts", label: "Knowing the Facts" },
      { value: "personal", label: "Handling Big Feelings" }
    ]
  },
  {
    key: "defensePriority",
    title: "Protection Skills After the Run",
    description: "After the run, pick which protection skill still matters most.",
    options: [
      { value: "refusal_skills", label: "Saying No" },
      { value: "environmental_control", label: "Changing Your Surroundings" },
      { value: "social_agency", label: "Speaking Up for Yourself" }
    ]
  },
  {
    key: "recoveryPriority",
    title: "Reset Tools After the Run",
    description: "After the run, pick which coping tool should be strengthened most.",
    options: [
      { value: "stress_management", label: "Calming Down" },
      { value: "creative_outlets", label: "Creative Activities" },
      { value: "physical_activity", label: "Movement" }
    ]
  },
  {
    key: "safeZonePriority",
    title: "Safe Places After the Run",
    description: "After the run, pick which safe place matters most now.",
    options: [
      { value: "school", label: "School" },
      { value: "family", label: "Home" },
      { value: "peer", label: "Friends" }
    ]
  },
  {
    key: "factFindingTool",
    title: "Truth-Finding After the Run",
    description: "After the run, pick the best way to learn what is true and safe next time.",
    options: [
      { value: "direct_knowledge", label: "What You Already Know" },
      { value: "external_research", label: "Looking It Up" },
      { value: "collaborative_problem_solving", label: "Working It Out Together" }
    ]
  },
  {
    key: "cheatCode",
    title: "Special Helps After the Run",
    description: "After the run, pick the extra help that would matter most next time.",
    options: [
      { value: "strategic_planning", label: "Planning Ahead" },
      { value: "internal_motivation", label: "Inner Strength" },
      { value: "situational_awareness", label: "Paying Attention" }
    ]
  }
];

function makeChoice(label, kind, feedback) {
  return { label, kind, feedback };
}

const safeZoneQuestions = {
  school: [
    {
      id: "school_fact_vaping",
      type: "safe",
      title: "School Check-In",
      category: "facts",
      text: "A student says vaping is harmless because it is “just flavor.” What is the safest thing to say?",
      hint: "Use real health facts, not rumors or guesses.",
      correctIndex: 1,
      choices: [
        { label: "A. If it smells better, it must be safer." },
        { label: "B. Vaping can still hurt the brain and body, especially for kids and teens." },
        { label: "C. It does not matter if everyone else is doing it." }
      ]
    },
    {
      id: "school_fact_pressure",
      type: "safe",
      title: "School Check-In",
      category: "facts",
      text: "Someone says, “Trying something once can’t hurt you.” What is the safest answer?",
      hint: "Even one time can still be risky.",
      correctIndex: 2,
      choices: [
        { label: "A. That is probably true if your friends say it is okay." },
        { label: "B. It only matters if an adult finds out." },
        { label: "C. Even one time can still be harmful, and pressure does not make it safe." }
      ]
    }
  ],
  family: [
    {
      id: "family_support_stress",
      type: "safe",
      title: "Home Check-In",
      category: "personal",
      text: "You feel really overwhelmed after an argument at home. What is the strongest next step?",
      hint: "First, try to calm down, then reach out to someone safe.",
      correctIndex: 0,
      choices: [
        { label: "A. Use a coping skill and talk to a trusted adult when you are ready." },
        { label: "B. Keep it all inside and hope the feeling disappears." },
        { label: "C. Make a risky choice to escape the feeling." }
      ]
    },
    {
      id: "family_support_helpseek",
      type: "safe",
      title: "Home Check-In",
      category: "personal",
      text: "Stress is building and you feel out of control. What helps most right now?",
      hint: "First, try to calm down, then reach out to someone safe.",
      correctIndex: 1,
      choices: [
        { label: "A. Hide it so nobody worries." },
        { label: "B. Pause, calm your body, and reach out to someone safe." },
        { label: "C. Do something risky to change your mood fast." }
      ]
    }
  ],
  peer: [
    {
      id: "peer_refusal_group",
      type: "safe",
      title: "Friend Check-In",
      category: "peer",
      text: "Friends pressure you to go somewhere unsafe after school. What is the best move?",
      hint: "A clear no and staying with safe people helps protect you.",
      correctIndex: 2,
      choices: [
        { label: "A. Go with them so they stop teasing you." },
        { label: "B. Walk away alone and keep it to yourself." },
        { label: "C. Say no clearly and stay with the safer group." }
      ]
    },
    {
      id: "peer_refusal_redirect",
      type: "safe",
      title: "Friend Check-In",
      category: "peer",
      text: "A friend wants you to join a risky challenge for attention. Which response is strongest?",
      hint: "Say no clearly and help steer the group to something safer.",
      correctIndex: 1,
      choices: [
        { label: "A. Join so you do not feel left out." },
        { label: "B. Refuse and suggest something safer instead." },
        { label: "C. Stay quiet and wait to see what everyone else does." }
      ]
    }
  ]
};

const wrapScenarios = [
  {
    id: "peer_recess_pressure",
    type: "scenario",
    title: "Quick Choice",
    category: "peer",
    text: "Recess Pressure: Two older kids tell you to come behind the gym with them and say, “Don’t be a baby.”",
    hint: "The safest choice keeps you with safe people and out of isolated places.",
    choices: [
      makeChoice(
        "A. Go with them so they stop teasing you.",
        "risky",
        "That puts you in a risky, isolated situation. A safer choice is to stay with your group and say no clearly."
      ),
      makeChoice(
        "B. Stay with your group and say, “No, I’m not going.”",
        "best",
        "Great choice. You said no clearly and stayed with safe people."
      ),
      makeChoice(
        "C. Make an excuse and leave without answering.",
        "neutral",
        "You got away from the pressure, but you ended up alone. A stronger choice is to stay with your group and say no clearly."
      )
    ]
  },
  {
    id: "peer_online_challenge",
    type: "scenario",
    title: "Quick Choice",
    category: "peer",
    text: "Online Challenge: Friends are filming a risky challenge for social media and say you have to do it to be included.",
    hint: "The strongest choice keeps you safe and does not depend on other people’s approval.",
    choices: [
      makeChoice(
        "A. Do it so people will notice you online.",
        "risky",
        "That puts your safety at risk for attention. Online approval is not worth getting hurt."
      ),
      makeChoice(
        "B. Refuse and suggest a safer challenge instead.",
        "best",
        "Great choice. You protected yourself and helped steer the group toward something safer."
      ),
      makeChoice(
        "C. Step away without saying anything.",
        "neutral",
        "You kept yourself safe, but a stronger response would be to say no clearly and suggest something safer."
      )
    ]
  },
  {
    id: "personal_bad_day_support",
    type: "scenario",
    title: "Quick Choice",
    category: "personal",
    text: "Bad Day at School: You feel embarrassed and angry. Another student says they know something that will help you “stop caring.”",
    hint: "The strongest choice connects stress to coping and support, not escape.",
    choices: [
      makeChoice(
        "A. Try what they offer so you can calm down fast.",
        "risky",
        "That is a high-risk choice based on wanting fast relief. Quick escape can create bigger problems."
      ),
      makeChoice(
        "B. Go talk to the counselor, teacher, or another trusted adult.",
        "best",
        "Great choice. You connected your feelings to real support, which is safer and stronger."
      ),
      makeChoice(
        "C. Walk away and keep all your feelings to yourself.",
        "neutral",
        "You avoided the risky offer, but keeping it all in can make stress build. Getting support would be stronger."
      )
    ]
  },
  {
    id: "personal_after_argument",
    type: "scenario",
    title: "Quick Choice",
    category: "personal",
    text: "After an argument at home, you feel overwhelmed and want the feeling to go away right now.",
    hint: "Strong choices protect your body, your goals, and your future.",
    choices: [
      makeChoice(
        "A. Do something risky just to change how you feel fast.",
        "risky",
        "That may bring quick relief, but it creates new risks and does not solve the problem."
      ),
      makeChoice(
        "B. Use a coping skill and ask a trusted adult for help if you still feel overwhelmed.",
        "best",
        "Great choice. You used self-control and reached for support before things got worse."
      ),
      makeChoice(
        "C. Shut down and pretend nothing is wrong.",
        "neutral",
        "That avoids the moment, but it does not help you calm down. Coping plus support is stronger."
      )
    ]
  },
  {
    id: "facts_myth_friend",
    type: "scenario",
    title: "Quick Choice",
    category: "facts",
    text: "A classmate says, “It’s safe if it’s only once, and anyway everybody does it.”",
    hint: "Use health facts, not popularity.",
    choices: [
      makeChoice(
        "A. Believe them because if lots of people do it, it must be okay.",
        "risky",
        "Popularity does not make something safe. A lot of people doing something does not make it healthy."
      ),
      makeChoice(
        "B. Say that one-time use can still be harmful and pressure does not make it safe.",
        "best",
        "Great choice. You used real health facts instead of following the crowd."
      ),
      makeChoice(
        "C. Stay quiet because maybe they know more than you do.",
        "neutral",
        "You avoided agreeing, but you did not use the facts. A stronger choice is to name the risk clearly."
      )
    ]
  },
  {
    id: "facts_secret_problem",
    type: "scenario",
    title: "Quick Choice",
    category: "facts",
    text: "Someone tells you the best way to stay safe is to keep risky situations secret so adults do not overreact.",
    hint: "Real safety builds support, not secrecy.",
    choices: [
      makeChoice(
        "A. Keep it secret so the problem stays small.",
        "risky",
        "Keeping it secret usually makes risk worse. Problems can grow when no safe adult knows what is happening."
      ),
      makeChoice(
        "B. Reach out to a trusted adult because support lowers danger.",
        "best",
        "Great choice. Safety works better when you bring in trusted support."
      ),
      makeChoice(
        "C. Wait and see if it fixes itself.",
        "neutral",
        "That avoids acting right away, but it leaves the risk in place. Getting support is stronger."
      )
    ]
  }
];

const threatScenarios = [
  {
    id: "threat_after_school_split",
    type: "scenario",
    title: "What Would You Do?",
    category: "peer",
    text: "A friend wants you to skip practice and hang out behind a store. Another friend asks you to come to team drills instead.",
    hint: "When pressure rises, choose the option that keeps you with safe people and on track with your goals.",
    choices: [
      makeChoice(
        "A. Go behind the store so nobody thinks you are boring.",
        "risky",
        "That choice increases risk and pulls you away from healthy support."
      ),
      makeChoice(
        "B. Go to team drills and stay with the safer group.",
        "best",
        "Great choice. You stayed with a healthy activity and kept your goals on track."
      ),
      makeChoice(
        "C. Leave both and go home without telling anyone why.",
        "neutral",
        "You avoided the risky option, but you also lost support. Staying with the safer group is stronger."
      )
    ]
  },
  {
    id: "threat_hallway_offer",
    type: "scenario",
    title: "What Would You Do?",
    category: "personal",
    text: "You are stressed before class. Someone offers something that will “help you chill fast.”",
    hint: "The strongest answer protects your body and uses coping or support instead.",
    choices: [
      makeChoice(
        "A. Take it because you want the stress gone right now.",
        "risky",
        "That is a high-risk choice based on wanting quick relief."
      ),
      makeChoice(
        "B. Say no and ask to talk with a trusted adult or counselor.",
        "best",
        "Great choice. You stayed in control and reached for real support."
      ),
      makeChoice(
        "C. Ignore them and hold everything in until later.",
        "neutral",
        "You avoided the offer, but holding everything in is not strong coping. Getting support would be better."
      )
    ]
  },
  {
    id: "threat_fact_fast_fix",
    type: "scenario",
    title: "What Would You Do?",
    category: "facts",
    text: "Someone says, “This is safer than dealing with your feelings. It works fast, so it’s basically a smart fix.”",
    hint: "Fast relief is not the same as safety. Use real health facts.",
    choices: [
      makeChoice(
        "A. Believe them because fast relief must mean it works.",
        "risky",
        "Fast relief does not make something safe. A risky shortcut can create bigger problems."
      ),
      makeChoice(
        "B. Say that using something to escape feelings is risky and real coping is safer.",
        "best",
        "Great choice. You used real health facts to reject the false claim."
      ),
      makeChoice(
        "C. Say maybe they are right and you can decide later.",
        "neutral",
        "You did not fully agree, but you also did not challenge the risky idea. Using the facts is stronger."
      )
    ]
  }
];

const copingTools = [
  { id: "stress_management", label: "Stress Management", description: "Take a breath, slow down, and regulate." },
  { id: "creative_outlets", label: "Creative Outlets", description: "Shift into a healthy hobby or expressive activity." },
  { id: "physical_activity", label: "Physical Activity", description: "Move your body and redirect your energy." }
];

const protectiveFactorPool = [
  { id: "achievement", label: "Achievement", color: "#67FF94", effect: { speedBoost: 0.18, durationMs: 2200 } },
  { id: "family_support", label: "Family Support", color: "#FFD95A", effect: { shieldMs: 2500 } },
  { id: "health_protection", label: "Health Protection", color: "#8BEAFF", effect: { shieldMs: 1800 } },
  { id: "healthy_nutrition", label: "Healthy Nutrition", color: "#7FFFD4", effect: { speedBoost: 0.12, durationMs: 2200 } },
  { id: "learning_growth", label: "Learning Growth", color: "#5DE7FF", effect: { clearLag: true, speedBoost: 0.08, durationMs: 2200 } },
  { id: "restful_sleep", label: "Restful Sleep", color: "#9BCBFF", effect: { clearLag: true, speedBoost: 0.1, durationMs: 2200 } },
  { id: "self_awareness", label: "Self Awareness", color: "#C689FF", effect: { speedBoost: 0.14, durationMs: 2200 } }
];

const riskFactorPool = [
  { id: "alcohol_exposure", label: "Alcohol Exposure", color: "#FF7A7A", effect: { speedPenalty: 0.25, durationMs: 2200 } },
  { id: "conflict_stress", label: "Conflict Stress", color: "#FF9B6B", effect: { speedPenalty: 0.2, durationMs: 2200 } },
  { id: "mental_overload", label: "Mental Overload", color: "#FFD166", effect: { speedPenalty: 0.18, durationMs: 2200 } },
  { id: "social_harm", label: "Social Harm", color: "#FF6B6B", effect: { speedPenalty: 0.22, durationMs: 2400 } }
];

const factorSpawnPoints = [
  { x: 108, y: 102 },
  { x: 368, y: 102 },
  { x: 612, y: 102 },
  { x: 122, y: 247 },
  { x: 563, y: 247 },
  { x: 160, y: 390 },
  { x: 330, y: 390 },
  { x: 610, y: 390 },
  { x: 140, y: 580 },
  { x: 480, y: 580 }
];

const wallSegments = [
  { x: 13, y: 0, w: 829, h: 28 },
  { x: 15, y: 642, w: 828, h: 28 },

  { x: 10, y: 6, w: 28, h: PORTAL.y - 6 },
  { x: 12, y: PORTAL.y + PORTAL.h, w: 28, h: 667 - (PORTAL.y + PORTAL.h) },

  { x: 817, y: 6, w: 28, h: PORTAL.y - 6 },
  { x: 822, y: PORTAL.y + PORTAL.h, w: 28, h: 667 - (PORTAL.y + PORTAL.h) },

  { x: 84, y: 69, w: 164, h: 19 },
  { x: 84, y: 69, w: 19, h: 85 },
  { x: 164, y: 143, w: 196, h: 19 },
  { x: 84, y: 213, w: 178, h: 19 },
  { x: 342, y: 143, w: 19, h: 162 },
  { x: 15, y: 286, w: 165, h: 19 },
  { x: 260, y: 286, w: 101, h: 19 },

  { x: 332, y: 69, w: 155, h: 19 },
  { x: 568, y: 69, w: 188, h: 19 },
  { x: 737, y: 69, w: 19, h: 85 },
  { x: 423, y: 143, w: 252, h: 19 },
  { x: 515, y: 213, w: 235, h: 19 },
  { x: 423, y: 143, w: 19, h: 162 },
  { x: 423, y: 286, w: 182, h: 19 },
  { x: 703, y: 286, w: 136, h: 19 },

  { x: 84, y: 361, w: 132, h: 19 },
  { x: 296, y: 361, w: 65, h: 19 },
  { x: 84, y: 361, w: 19, h: 86 },
  { x: 164, y: 430, w: 120, h: 19 },
  { x: 342, y: 361, w: 19, h: 165 },
  { x: 188, y: 508, w: 173, h: 19 },
  { x: 84, y: 518, w: 19, h: 86 },
  { x: 84, y: 585, w: 277, h: 19 },

  { x: 423, y: 361, w: 312, h: 19 },
  { x: 423, y: 361, w: 19, h: 165 },
  { x: 515, y: 436, w: 161, h: 19 },
  { x: 657, y: 436, w: 19, h: 168 },
  { x: 423, y: 508, w: 147, h: 19 },
  { x: 423, y: 585, w: 180, h: 19 },
  { x: 737, y: 436, w: 19, h: 168 }
];

const safeSpaces = [
  { x: 763, y: 18, w: 62, h: 56, type: "school", label: "SCHOOL", border: COLORS.schoolBorder },
  { x: 30, y: 600, w: 62, h: 56, type: "family", label: "FAMILY", border: COLORS.familyBorder },
  { x: 360, y: 305, w: 62, h: 56, type: "peer", label: "PEER", border: COLORS.peerBorder }
];

const playerSpawn = { x: 50, y: 320 };

const chaserSpawns = [
  { x: 785, y: 132 },
  { x: 785, y: 540 },
  { x: 50, y: 110 },
  { x: 50, y: 540 }
];

/* =========================================================
   RUNTIME STATE
========================================================= */

let appPhase = "pre";
let postSurveyResults = null;
let lastRunEndReason = "chances_depleted";

const playerProfile = {
  challengePriority: ["peer", "facts", "personal"],
  defensePriority: ["refusal_skills", "environmental_control", "social_agency"],
  recoveryPriority: ["stress_management", "creative_outlets", "physical_activity"],
  safeZonePriority: ["school", "family", "peer"],
  factFindingTool: ["direct_knowledge", "external_research", "collaborative_problem_solving"],
  cheatCode: ["strategic_planning", "internal_motivation", "situational_awareness"]
};

const telemetry = {
  sessionStart: Date.now(),
  sessionEnd: null,
  sessionCount: 1,
  currentRunNumber: 1,
  cumulativeAttemptCount: 1,
  movementCount: 0,
  collisionCount: 0,
  wrapCount: 0,
  timesCaught: 0,
  safeSpaceEntries: 0,
  totalSafeSpaceMs: 0,
  dangerZoneEntries: 0,
  nearMisses: 0,
  highestLevelReached: 1,
  chaserProximityHits: 0,
  scenarioCount: 0,
  scenarioLatenciesMs: [],
  copingSelectionLatenciesMs: [],
  safeZoneQuestionLatenciesMs: [],
  safeZoneCorrect: 0,
  safeZoneWrong: 0,
  decisionQualities: [],
  eventLog: []
};

const factorTelemetry = {
  protectiveCollected: 0,
  riskHit: 0,
  blockedRiskHit: 0,
  totalRiskPointLoss: 0,
  protectiveByType: {},
  riskByType: {}
};

const playerState = {
  stability: STARTING_STABILITY,
  protectivePoints: 0,
  currentSafeZone: null,
  lastSupportPromptAt: 0,
  lastSelectedCopingTool: null
};

const player = {
  x: playerSpawn.x,
  y: playerSpawn.y,
  w: 18,
  h: 22,
  speed: PLAYER_BASE_SPEED,
  invulnerableUntil: 0
};

const chasers = chaserSpawns.map((spawn, index) => ({
  spawnX: spawn.x,
  spawnY: spawn.y,
  x: spawn.x,
  y: spawn.y,
  w: 16,
  h: 16,
  speed: 1.0,
  active: index === 0,
  path: [],
  nextPathAt: 0,
  stuckFrames: 0,
  lastX: spawn.x,
  lastY: spawn.y
}));

const keys = {};
const effectState = {
  speedUntil: 0,
  shieldUntil: 0
};

const safeZonePromptHistory = {
  school: 0,
  family: 0,
  peer: 0
};

const safeZoneEntryBonusHistory = {
  school: 0,
  family: 0,
  peer: 0
};

const SAFE_ZONE_ENTRY_BONUS_COOLDOWN_MS = 15000;
const threatState = {
  inDanger: false,
  nearestDistance: Infinity,
  lastNearMissAt: 0,
  lastThreatScenarioAt: 0,
  lastThreatScenarioCheckAt: 0
};

let gameStarted = false;
let scenarioOpen = false;
let currentThreatLevel = 0;
let levelBannerUntil = 0;
let levelBannerText = "";
let pendingResolution = null;
let playerWasInSafeSpace = false;
let currentSafeZoneType = null;
let chaserPassability = null;
let activeProtectiveFactors = [];
let activeRiskFactors = [];
let nextProtectiveSpawnAt = 0;
let nextRiskSpawnAt = 0;
let modalContext = null;
let lastFrameTime = performance.now();
let lastModalAt = 0;
let lastWrapScenarioAt = 0;
let pickupTexts = [];
let pickupBursts = [];

const CHASER_SKIN_ORDER = ["solar", "ember", "frost", "solar"];

function makeSprite(src) {
  const img = new Image();

  img.onload = () => {
    console.log("LOADED:", src, img.naturalWidth + "x" + img.naturalHeight);
  };

  img.onerror = () => {
    console.error("FAILED:", src);
  };

  img.src = src;
  return img;
}

const sprites = {
  player: {
    idle: makeSprite("assets/player/sprig_idle.png"),
    run: [
      makeSprite("assets/player/sprig_run_01.png"),
      makeSprite("assets/player/sprig_run_02.png"),
      makeSprite("assets/player/sprig_run_03.png"),
      makeSprite("assets/player/sprig_run_04.png"),
      makeSprite("assets/player/sprig_run_05.png"),
      makeSprite("assets/player/sprig_run_06.png")
    ]
  },
  chasers: {
    solar: {
      normal: makeSprite("assets/chasers/solar_chaser.png"),
      alert: makeSprite("assets/chasers/solar_chaser_alert.png")
    },
    ember: {
      normal: makeSprite("assets/chasers/ember_chaser.png"),
      alert: makeSprite("assets/chasers/ember_chaser_alert.png")
    },
    frost: {
      normal: makeSprite("assets/chasers/frost_chaser.png"),
      alert: makeSprite("assets/chasers/frost_chaser_alert.png")
    }
  },
  protective: {
    achievement: makeSprite("assets/protective/protective_achievement.png"),
    family_support: makeSprite("assets/protective/protective_family_support.png"),
    health_protection: makeSprite("assets/protective/protective_health_protection.png"),
    healthy_nutrition: makeSprite("assets/protective/protective_healthy_nutrition.png"),
    learning_growth: makeSprite("assets/protective/protective_learning_growth.png"),
    restful_sleep: makeSprite("assets/protective/protective_restful_sleep.png"),
    self_awareness: makeSprite("assets/protective/protective_self_awareness.png")
  },
  risk: {
    alcohol_exposure: makeSprite("assets/risk/risk_alcohol_exposure.png"),
    conflict_stress: makeSprite("assets/risk/risk_conflict_stress.png"),
    mental_overload: makeSprite("assets/risk/risk_mental_overload.png"),
    social_harm: makeSprite("assets/risk/risk_social_harm.png")
  }
};

const sfx = {
  pointGain: new Audio("assets/sfx/win3.mp3"),
  pointLoss: new Audio("assets/sfx/wrong2.mp3"),
  chanceLoss: new Audio("assets/sfx/wrong_strong.mp3"),
  bigWin: new Audio("assets/sfx/win6.mp3")
};

Object.entries(sfx).forEach(([name, sound]) => {
  sound.preload = "auto";

  sound.addEventListener("canplaythrough", () => {
    console.log("loaded:", name, sound.src);
  });

  sound.addEventListener("error", () => {
    console.error("file error:", name, sound.src, sound.error);
  });
});

function playSound(sound, volume = 0.4) {
  if (!sound) return;

  sound.pause();
  sound.currentTime = 0;
  sound.volume = volume;

  sound.play()
    .then(() => console.log("playing:", sound.src))
    .catch((err) => console.error("audio failed:", sound.src, err));
}

const playerAnim = {
  frameIndex: 0,
  frameTimer: 0,
  frameDelay: 90,
  lastX: player.x,
  lastY: player.y,
  moving: false
};

/* =========================================================
   GENERAL HELPERS
========================================================= */

function getPrimaryProfileChoice(value) {
  return Array.isArray(value) ? value[0] : value;
}

function getActiveFactFindingTool() {
  return getPrimaryProfileChoice(playerProfile.factFindingTool);
}

function getActiveCheatCode() {
  return getPrimaryProfileChoice(playerProfile.cheatCode);
}

function logEvent(type, data = {}) {
  telemetry.eventLog.push({
    ts: Date.now(),
    type,
    level: currentThreatLevel + 1,
    stability: playerState.stability,
    protectivePoints: Number(playerState.protectivePoints.toFixed(2)),
    x: Math.round(player.x),
    y: Math.round(player.y),
    ...data
  });
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function hitsWall(rect) {
  return wallSegments.some((wall) => rectsOverlap(rect, wall));
}

function hitsSafeSpace(rect) {
  return safeSpaces.some((safe) => rectsOverlap(rect, safe));
}

function getSafeZoneAtRect(rect) {
  return safeSpaces.find((safe) => rectsOverlap(rect, safe)) || null;
}

function isInSafeSpace(entity) {
  return !!getSafeZoneAtRect(entity);
}

function getSurvivalSeconds() {
  return Math.floor((Date.now() - telemetry.sessionStart) / 1000);
}

function getChallengeSettings(category) {
  const rank = playerProfile.challengePriority.indexOf(category);

  if (rank === 0) {
    return { weight: 7, scoreMultiplier: 2.5 };
  }

  if (rank === 1) {
    return { weight: 3, scoreMultiplier: 1.5 };
  }

  return { weight: 1, scoreMultiplier: 1 };
}

function getChallengeRankMultiplier(category) {
  return getChallengeSettings(category).scoreMultiplier;
}

function getSafePlaceSettings(zoneType) {
  const rank = playerProfile.safeZonePriority.indexOf(zoneType);

  if (rank === 0) {
    return {
      healOnEntry: 0,
      shieldMs: 1400,
      bonusQuestionStability: 0
    };
  }

  if (rank === 1) {
    return {
      healOnEntry: 0,
      shieldMs: 700,
      bonusQuestionStability: 0
    };
  }

  return {
    healOnEntry: 0,
    shieldMs: 0,
    bonusQuestionStability: 0
  };
}

function getSafeZoneRankBonus(zoneType) {
  return getSafePlaceSettings(zoneType).bonusQuestionStability;
}

function getReadableTool(id) {
  const tool = copingTools.find((t) => t.id === id);
  return tool ? tool.label : "None";
}

function getRankWeightFromOrderedList(list, value) {
  const idx = list.indexOf(value);
  if (idx === 0) return 2;
  if (idx === 1) return 1;
  return 0.5;
}

function getRecoveryWeight(toolId) {
  return getRankWeightFromOrderedList(playerProfile.recoveryPriority, toolId);
}

function getTopDefenseMechanism() {
  return playerProfile.defensePriority[0];
}

function getDefenseSettings() {
  const topDefense = getTopDefenseMechanism();

  if (topDefense === "refusal_skills") {
    return {
      catchLossReduction: 1,
      invulnerableMs: 1500,
      shieldMs: 0,
      speedBurst: 0.12,
      speedBurstMs: 1200
    };
  }

  if (topDefense === "environmental_control") {
    return {
      catchLossReduction: 0,
      invulnerableMs: 2500,
      shieldMs: 0,
      speedBurst: 0.18,
      speedBurstMs: 1400
    };
  }

  return {
    catchLossReduction: 0,
    invulnerableMs: 1500,
    shieldMs: 2400,
    speedBurst: 0,
    speedBurstMs: 0
  };
}

function getRecoverySettings(toolId) {
  const rank = getRecoveryWeight(toolId);

  if (toolId === "stress_management") {
    return rank === 2
      ? {
          stabilityGain: 0,
          speedBoost: 0.1,
          durationMs: 2200,
          clearLag: true,
          bonusProtectivePoints: 0,
          invulnerableMs: 0
        }
      : rank === 1
      ? {
          stabilityGain: 0,
          speedBoost: 0.06,
          durationMs: 1800,
          clearLag: true,
          bonusProtectivePoints: 0,
          invulnerableMs: 0
        }
      : {
          stabilityGain: 0,
          speedBoost: 0.03,
          durationMs: 1400,
          clearLag: false,
          bonusProtectivePoints: 0,
          invulnerableMs: 0
        };
  }

  if (toolId === "creative_outlets") {
    return rank === 2
      ? {
          stabilityGain: 0,
          speedBoost: 0.12,
          durationMs: 3000,
          clearLag: false,
          bonusProtectivePoints: 1,
          invulnerableMs: 0
        }
      : rank === 1
      ? {
          stabilityGain: 0,
          speedBoost: 0.07,
          durationMs: 2200,
          clearLag: false,
          bonusProtectivePoints: 0.5,
          invulnerableMs: 0
        }
      : {
          stabilityGain: 0,
          speedBoost: 0.03,
          durationMs: 1500,
          clearLag: false,
          bonusProtectivePoints: 0,
          invulnerableMs: 0
        };
  }

  return rank === 2
    ? {
        stabilityGain: 0,
        speedBoost: 0.2,
        durationMs: 2200,
        clearLag: false,
        bonusProtectivePoints: 0,
        invulnerableMs: 900
      }
    : rank === 1
    ? {
        stabilityGain: 0,
        speedBoost: 0.12,
        durationMs: 1800,
        clearLag: false,
        bonusProtectivePoints: 0,
        invulnerableMs: 500
      }
    : {
        stabilityGain: 0,
        speedBoost: 0.05,
        durationMs: 1400,
        clearLag: false,
        bonusProtectivePoints: 0,
        invulnerableMs: 0
      };
}

function getTruthToolSettings() {
  const tool = getActiveFactFindingTool();

  if (tool === "direct_knowledge") {
    return {
      showHint: false,
      teamInputAccuracy: 0,
      correctBonusStability: 0,
      wrongPenaltyStability: 0
    };
  }

  if (tool === "external_research") {
    return {
      showHint: true,
      teamInputAccuracy: 0,
      correctBonusStability: 0,
      wrongPenaltyStability: 0
    };
  }

  return {
    showHint: true,
    teamInputAccuracy: 0.75,
    correctBonusStability: 0,
    wrongPenaltyStability: 0
  };
}

function getSpecialHelpSettings() {
  const help = getActiveCheatCode();

  if (help === "strategic_planning") {
    return {
      protectiveSpawnMultiplier: 0.85,
      riskSpawnMultiplier: 1.15,
      questionRewardBonus: 0.5,
      dangerSlowMultiplier: 1
    };
  }

  if (help === "internal_motivation") {
    return {
      protectiveSpawnMultiplier: 1,
      riskSpawnMultiplier: 1,
      questionRewardBonus: 1,
      dangerSlowMultiplier: 1
    };
  }

  return {
    protectiveSpawnMultiplier: 1,
    riskSpawnMultiplier: 1,
    questionRewardBonus: 0,
    dangerSlowMultiplier: 0.9
  };
}

function applySafeZoneEntryEffect(zoneType) {
  const now = Date.now();

  if (now - safeZoneEntryBonusHistory[zoneType] < SAFE_ZONE_ENTRY_BONUS_COOLDOWN_MS) {
    return;
  }

  safeZoneEntryBonusHistory[zoneType] = now;

  const safePlace = getSafePlaceSettings(zoneType);

  if (safePlace.healOnEntry) {
    adjustStability(safePlace.healOnEntry);
  }

  if (safePlace.shieldMs) {
    grantShield(safePlace.shieldMs);
  }

  logEvent("safe_place_bonus_applied", {
    zoneType,
    healOnEntry: safePlace.healOnEntry,
    shieldMs: safePlace.shieldMs
  });
}

function applyRecoveryToolEffect(toolId) {
  const settings = getRecoverySettings(toolId);
  const weight = getRecoveryWeight(toolId);

  if (settings.clearLag) {
    clearLag();
  }

  if (settings.stabilityGain) {
    adjustStability(settings.stabilityGain);
  }

  if (settings.bonusProtectivePoints) {
    adjustProtectivePoints(settings.bonusProtectivePoints);
  }

  if (settings.speedBoost) {
    boostPlayer(PLAYER_BASE_SPEED + settings.speedBoost, settings.durationMs);
  }

  if (settings.invulnerableMs) {
    player.invulnerableUntil = Math.max(
      player.invulnerableUntil,
      Date.now() + settings.invulnerableMs
    );
  }

  return {
    stabilityGain: settings.stabilityGain,
    speedBoost: settings.speedBoost,
    durationMs: settings.durationMs,
    weight
  };
}

function getCatchStabilityLoss() {
  const defense = getDefenseSettings();
  return Math.max(1, CATCH_STABILITY_LOSS - defense.catchLossReduction);
}

function applyPostCatchDefenseEffect() {
  const topDefense = getTopDefenseMechanism();
  const defense = getDefenseSettings();

  player.invulnerableUntil = Math.max(
    player.invulnerableUntil,
    Date.now() + defense.invulnerableMs
  );

  if (defense.shieldMs) {
    grantShield(defense.shieldMs);
  }

  if (defense.speedBurst) {
    boostPlayer(PLAYER_BASE_SPEED + defense.speedBurst, defense.speedBurstMs);
  }

  logEvent("defense_effect_applied", {
    defense: topDefense,
    invulnerableMs: defense.invulnerableMs,
    shieldMs: defense.shieldMs || 0,
    speedBurst: defense.speedBurst || 0
  });
}

function weightedPickByPriority(items, priorityOrder, keyName) {
  const weights = {
    [priorityOrder[0]]: 6,
    [priorityOrder[1]]: 3,
    [priorityOrder[2]]: 1
  };

  const bag = [];

  items.forEach((item) => {
    let weight = weights[item[keyName]] || 1;

    if (keyName === "category") {
      weight = getChallengeSettings(item[keyName]).weight;
    }

    for (let i = 0; i < weight; i++) {
      bag.push(item);
    }
  });

  return bag[Math.floor(Math.random() * bag.length)];
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* =========================================================
   SURVEY UI
========================================================= */

const SURVEY_STEP_KEYS = [
  ["challengePriority", "defensePriority"],
  ["recoveryPriority", "safeZonePriority"],
  ["factFindingTool", "cheatCode"]
];

const SURVEY_STEP_META = {
  pre: [
    {
      title: "Pick What Makes the Game Hard",
      description: "Choose your character’s biggest challenge and what helps after a monster hit."
    },
    {
      title: "Pick What Helps You Feel Better",
      description: "Choose how your character resets and which safe place helps most."
    },
    {
      title: "Pick Your Extra Game Help",
      description: "Choose how your character learns what is true and what extra help they get."
    }
  ],
  post: [
    {
      title: "What Was Hard?",
      description: "After the run, pick which challenge and after-hit help mattered most."
    },
    {
      title: "What Helped?",
      description: "After the run, pick which reset tool and safe place helped most."
    },
    {
      title: "What Do You Need Next Time?",
      description: "After the run, pick which truth tool and extra help would matter most next time."
    }
  ]
};

const SURVEY_GROUP_META = {
  challengePriority: {
    icon: "✦",
    theme: "theme-core",
    summary: "Biggest Challenge"
  },
  defensePriority: {
    icon: "🛡",
    theme: "theme-defense",
    summary: "Best Protection"
  },
  recoveryPriority: {
    icon: "❤",
    theme: "theme-recovery",
    summary: "Best Reset Tool"
  },
  safeZonePriority: {
    icon: "◎",
    theme: "theme-support",
    summary: "Best Safe Place"
  },
  factFindingTool: {
    icon: "🔎",
    theme: "theme-knowledge",
    summary: "Best Way to Find the Truth"
  },
  cheatCode: {
    icon: "⚡",
    theme: "theme-assist",
    summary: "Special Help"
  }
};

let currentSurveySchema = [];
let currentSurveyStep = 0;
let currentSurveyDraft = {};

function createEmptySurveyDraft(schema) {
  const draft = {};
  schema.forEach((group) => {
    draft[group.key] = {};
  });
  return draft;
}

function getCurrentStepGroups(schema) {
  const stepKeys = SURVEY_STEP_KEYS[currentSurveyStep];
  return schema.filter((group) => stepKeys.includes(group.key));
}

function getGroupByKey(groupKey) {
  return currentSurveySchema.find((group) => group.key === groupKey);
}

function getOptionLabel(groupKey, value) {
  const group = getGroupByKey(groupKey);
  if (!group) return value;

  const option = group.options.find((item) => item.value === value);
  return option ? option.label : value;
}

function getSelectedRank(groupKey, optionValue) {
  const draft = currentSurveyDraft[groupKey] || {};
  const entry = Object.entries(draft).find(([, value]) => value === optionValue);
  return entry ? Number(entry[0]) : null;
}

function setRankSelection(groupKey, optionValue, rank) {
  const existing = { ...(currentSurveyDraft[groupKey] || {}) };
  const currentRank = getSelectedRank(groupKey, optionValue);
  const isSameClick = currentRank === rank;

  Object.keys(existing).forEach((key) => {
    if (existing[key] === optionValue) delete existing[key];
  });

  delete existing[rank];

  if (!isSameClick) {
    existing[rank] = optionValue;
  }

  currentSurveyDraft[groupKey] = existing;
  setupError.textContent = "";
  renderQuestionnaire(currentSurveySchema);
}

function isGroupComplete(groupKey) {
  const draft = currentSurveyDraft[groupKey] || {};
  return Boolean(draft[1] && draft[2] && draft[3]);
}

function getRankedValues(groupKey) {
  const draft = currentSurveyDraft[groupKey] || {};

  if (!draft[1] || !draft[2] || !draft[3]) {
    throw new Error("Please complete all rankings before continuing.");
  }

  return [draft[1], draft[2], draft[3]];
}

function validateStep(stepIndex = currentSurveyStep) {
  const stepKeys = SURVEY_STEP_KEYS[stepIndex];
  const incomplete = stepKeys.some((key) => !isGroupComplete(key));

  if (incomplete) {
    throw new Error("Please finish this step before continuing.");
  }
}

function renderQuestionCard(group) {
  const meta = SURVEY_GROUP_META[group.key] || {
    icon: "•",
    theme: "",
    summary: group.title
  };

  return `
    <div class="question-card ${meta.theme}">
      <div class="question-title-row">
        <span class="question-icon">${meta.icon}</span>
        <h3>${group.title}</h3>
      </div>
      <p>${group.description}</p>

      <div class="rank-list">
        ${group.options
          .map((option) => {
            const selectedRank = getSelectedRank(group.key, option.value);

            return `
              <div class="rank-row">
                <div class="rank-row-copy">
                  <label class="rank-label">${option.label}</label>
                </div>

                <div class="rank-chip-group">
                  <button
                    type="button"
                    class="rank-chip ${selectedRank === 1 ? "is-rank-1" : ""}"
                    data-rank-group="${group.key}"
                    data-option="${option.value}"
                    data-rank="1"
                  >
                    Most
                  </button>

                  <button
                    type="button"
                    class="rank-chip ${selectedRank === 2 ? "is-rank-2" : ""}"
                    data-rank-group="${group.key}"
                    data-option="${option.value}"
                    data-rank="2"
                  >
                    Next
                  </button>

                  <button
                    type="button"
                    class="rank-chip ${selectedRank === 3 ? "is-rank-3" : ""}"
                    data-rank-group="${group.key}"
                    data-option="${option.value}"
                    data-rank="3"
                  >
                    Least
                  </button>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function bindRankChipLogic() {
  const chips = document.querySelectorAll(".rank-chip");

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const groupKey = chip.dataset.rankGroup;
      const optionValue = chip.dataset.option;
      const rank = Number(chip.dataset.rank);
      setRankSelection(groupKey, optionValue, rank);
    });
 
}

function renderBuildSummary() {
  const stepGroups = getCurrentStepGroups(currentSurveySchema);

  buildSnapshotPanel.innerHTML = `
    <div class="build-panel-card">
      <h3>Build Snapshot</h3>
      <div class="build-summary-list">
        <div class="build-summary-item">
          <span class="build-summary-label">Step</span>
          <span class="build-summary-value">${currentSurveyStep + 1} of ${SURVEY_STEP_KEYS.length}</span>
        </div>

        <div class="build-summary-item">
          <span class="build-summary-label">Completed Cards</span>
          <span class="build-summary-value">
            ${stepGroups.filter((group) => isGroupComplete(group.key)).length} of ${stepGroups.length}
          </span>
        </div>
      </div>
    </div>
  `;

  choicesPanel.innerHTML = `
    <div class="build-panel-card compact-choices-card">
      <h3>Your Choices So Far</h3>

      <div class="choices-summary-list">
        ${currentSurveySchema
          .map((group) => {
            const meta = SURVEY_GROUP_META[group.key] || { summary: group.title };
            const complete = isGroupComplete(group.key);

            const value = complete
              ? getOptionLabel(group.key, getRankedValues(group.key)[0])
              : "Not finished";

            return `
              <div class="choices-summary-row ${complete ? "is-complete" : "is-pending"}">
                <div class="choices-summary-dot"></div>

                <div class="choices-summary-text">
                  <span class="choices-summary-label">${meta.summary}</span>
                  <span class="choices-summary-value">${value}</span>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function updateSurveyStepChrome() {
  const stepMeta =
    appPhase === "post" ? SURVEY_STEP_META.post : SURVEY_STEP_META.pre;

  const totalSteps = stepMeta.length;
  const currentMeta = stepMeta[currentSurveyStep];

  surveyStepLabel.textContent = `Step ${currentSurveyStep + 1} of ${totalSteps}`;
  surveyStageTitle.textContent = currentMeta.title;
  surveyStageSub.textContent = currentMeta.description;
  surveyProgressFill.style.width = `${((currentSurveyStep + 1) / totalSteps) * 100}%`;

  if (endSessionBtn) endSessionBtn.classList.add("hidden");
  if (runAgainBtn) runAgainBtn.classList.add("hidden");

  prevStepBtn.style.display = "inline-flex";
  prevStepBtn.disabled = currentSurveyStep === 0;
  nextStepBtn.style.display =
    currentSurveyStep === totalSteps - 1 ? "none" : "inline-flex";
  startGameBtn.style.display =
    currentSurveyStep === totalSteps - 1 ? "inline-flex" : "none";
}

function renderQuestionnaire(schema) {
  currentSurveySchema = schema;
  const stepGroups = getCurrentStepGroups(schema);
  questionnaireGrid.innerHTML = stepGroups.map(renderQuestionCard).join("");

  bindRankChipLogic();
  renderBuildSummary();
  updateSurveyStepChrome();
}

function readSurvey(schema) {
  const result = {};

  schema.forEach((group) => {
    result[group.key] = getRankedValues(group.key);
  });

  return result;
}

function openPreSurvey() {
  appPhase = "pre";
  currentSurveyStep = 0;
  currentSurveySchema = preSurveySchema;
  currentSurveyDraft = createEmptySurveyDraft(preSurveySchema);

  setupTitle.textContent = "Get Ready for Your Run";
  setupSub.textContent =
    "Use the next 3 steps to choose what helps your character stay safe, calm, and strong.";
  startGameBtn.textContent = "Start Run";
  setupError.textContent = "";

  renderQuestionnaire(preSurveySchema);
  setupOverlay.classList.remove("hidden");
}

function openPostSurvey(reason = "completed") {
  appPhase = "post";
  telemetry.sessionEnd = Date.now();
  currentSurveyStep = 0;
  currentSurveySchema = postSurveySchema;
  currentSurveyDraft = createEmptySurveyDraft(postSurveySchema);

  setupTitle.textContent = "Think Back on Your Run";
  setupSub.textContent =
    "Look back at what helped, what got hard, and what would help even more next time.";
  startGameBtn.textContent = "Finish Reflection";
  setupError.textContent = "";

  renderQuestionnaire(postSurveySchema);
  setupOverlay.classList.remove("hidden");

  logEvent("post_survey_opened", { reason });
}

function getPostRunPrimaryReflectionText(groupKey) {
  if (!postSurveyResults || !Array.isArray(postSurveyResults[groupKey]) || !postSurveyResults[groupKey].length) {
    return "Not answered";
  }

  const group = postSurveySchema.find((item) => item.key === groupKey) ||
    preSurveySchema.find((item) => item.key === groupKey);

  if (!group) {
    return postSurveyResults[groupKey][0];
  }

  const topValue = postSurveyResults[groupKey][0];
  const match = group.options.find((option) => option.value === topValue);
  return match ? match.label : topValue;
}

function openEndedState() {
  appPhase = "ended";
  playSound(sfx.bigWin, 0.45);

  setupTitle.textContent = "Session Finished";
  setupSub.textContent =
    "This 3-run session is done. You can start a new 3-run session with the same build.";
  surveyStepLabel.textContent = "Session Finished";
  surveyStageTitle.textContent = "All Done";
  surveyStageSub.textContent =
    "Choose Start New 3-Run Session whenever you want to play again.";
  surveyProgressFill.style.width = "100%";
  setupError.textContent = "";

  prevStepBtn.style.display = "none";
  nextStepBtn.style.display = "none";
  startGameBtn.style.display = "none";
  if (endSessionBtn) endSessionBtn.classList.add("hidden");
  if (runAgainBtn) {
    runAgainBtn.textContent = "Start New 3-Run Session";
    runAgainBtn.classList.remove("hidden");
  }

  questionnaireGrid.innerHTML = `
    <div class="question-card theme-support">
      <div class="question-title-row">
        <span class="question-icon">✓</span>
        <h3>Session Finished</h3>
      </div>
      <p>Your 3-run session is complete. Select <strong>Start New 3-Run Session</strong> whenever you want to play again.</p>
    </div>
  `;

  buildSnapshotPanel.innerHTML = `
    <div class="build-panel-card">
      <h3>Final Snapshot</h3>
      <div class="build-summary-list">
        <div class="build-summary-item">
          <span class="build-summary-label">Total Protective Points</span>
          <span class="build-summary-value">${playerState.protectivePoints.toFixed(2)}</span>
        </div>

        <div class="build-summary-item">
          <span class="build-summary-label">Monster Hits</span>
          <span class="build-summary-value">${telemetry.timesCaught}</span>
        </div>

        <div class="build-summary-item">
          <span class="build-summary-label">Last Reflection</span>
          <span class="build-summary-value">${getPostRunPrimaryReflectionText("challengePriority")}</span>
        </div>
      </div>
    </div>
  `;

  choicesPanel.innerHTML = "";

  setupOverlay.classList.remove("hidden");
  logEvent("session_ended_on_post_screen");
}

if (prevStepBtn) {
  prevStepBtn.addEventListener("click", () => {
    if (currentSurveyStep === 0) return;
    currentSurveyStep -= 1;
    setupError.textContent = "";
    renderQuestionnaire(currentSurveySchema);
  });
}

if (nextStepBtn) {
  nextStepBtn.addEventListener("click", () => {
    try {
      validateStep(currentSurveyStep);
      currentSurveyStep += 1;
      setupError.textContent = "";
      renderQuestionnaire(currentSurveySchema);
    } catch (error) {
      setupError.textContent = error.message;
    }
  });
}

/* =========================================================
   SESSION FLOW
========================================================= */

function endRun(reason = "chances_depleted") {
  if (!gameStarted) return;

  gameStarted = false;
  appPhase = "post";
  telemetry.sessionEnd = Date.now();
  lastRunEndReason = reason;

  logEvent("run_ended", { reason });
  openPostSurvey(reason);

  // If this was the last run, mark session as completed
  if (telemetry.currentRunNumber >= TOTAL_RUNS || reason === "completed") {
    markGameSessionCompleted();
  }
}

function updateFocusHUD() {
  hudFocus.textContent = `Strongest Safe Place: ${playerProfile.safeZonePriority[0].toUpperCase()}`;
}

function updateHUD() {
  hudLevel.textContent = `Level: ${currentThreatLevel + 1}`;
  hudEnergy.textContent = `Chances Left: ${playerState.stability}`;
  hudScore.textContent = `Protective Points: ${playerState.protectivePoints.toFixed(2)}`;
  hudCaught.textContent = `Monster Hits: ${telemetry.timesCaught}`;
  hudSafeZone.textContent = `Safe Place: ${playerState.currentSafeZone ? playerState.currentSafeZone.toUpperCase() : "NONE"}`;
  hudFocus.textContent = `Strongest Safe Place: ${playerProfile.safeZonePriority[0].toUpperCase()}`;
  hudTool.textContent = `Coping Tool: ${getReadableTool(playerState.lastSelectedCopingTool)}`;
}

function startRunLoop(source = "manual") {
  appPhase = "game";
  gameStarted = true;

  scenarioOpen = false;
  pendingResolution = null;
  modalContext = null;

  setupError.textContent = "";
  setupOverlay.classList.add("hidden");
  scenarioModal.classList.add("hidden");
  scenarioCard.classList.remove("is-answered");
  scenarioChoices.classList.remove("hidden");
  scenarioResultBox.classList.add("hidden");
  scenarioChoices.innerHTML = "";
  scenarioFeedback.textContent = "";
  scenarioOutcome.textContent = "";
  scenarioHint.classList.add("hidden");
  scenarioHint.textContent = "";
  scenarioMeta.textContent = "";

  lastModalAt = 0;
  lastWrapScenarioAt = 0;
  lastFrameTime = performance.now();

  safeZonePromptHistory.school = 0;
  safeZonePromptHistory.family = 0;
  safeZonePromptHistory.peer = 0;

  resetPlayer();
  resetChasers();
  buildPassability();

  updateHUD();
  draw();

  logEvent("run_started", {
    source,
    runNumber: telemetry.currentRunNumber
  });
}

function openPostRunDecision(reason = "chances_depleted") {
  appPhase = "post_complete";

  const roundSummary = getRoundSummaryData();
  const playBand = getPlaySummaryBand(roundSummary);

  setupTitle.textContent = "Run Summary";
  setupSub.textContent =
    `Run ${telemetry.currentRunNumber} of ${TOTAL_RUNS} is complete. Review how the run went, then choose your next step.`;

  surveyStepLabel.textContent = "Run Summary";
  surveyStageTitle.textContent = playBand.title;
  surveyStageSub.textContent = playBand.text;
  surveyProgressFill.style.width = "100%";
  setupError.textContent = "";

  prevStepBtn.style.display = "none";
  nextStepBtn.style.display = "none";
  startGameBtn.style.display = "none";

  if (endSessionBtn) endSessionBtn.classList.remove("hidden");
  if (runAgainBtn) {
    runAgainBtn.textContent =
      telemetry.currentRunNumber < TOTAL_RUNS
        ? `Start Run ${telemetry.currentRunNumber + 1}`
        : "No Runs Left";
    runAgainBtn.classList.toggle("hidden", telemetry.currentRunNumber >= TOTAL_RUNS);
  }

  const collectedMarkup = `
    ${renderFactorSummaryRows(roundSummary.protectiveByType, [
      "health_protection",
      "healthy_nutrition",
      "achievement",
      "family_support",
      "restful_sleep",
      "self_awareness",
      "learning_growth"
    ])}
    ${renderFactorSummaryRows(roundSummary.riskByType, [
      "alcohol_exposure",
      "social_harm",
      "conflict_stress",
      "mental_overload"
    ])}
  `;

  questionnaireGrid.innerHTML = `
    <div class="question-card theme-core">
      <div class="question-title-row">
        <span class="question-icon">★</span>
        <h3>${playBand.title}</h3>
      </div>
      <p>${playBand.text}</p>
    </div>

    <div class="question-card theme-support">
      <div class="question-title-row">
        <span class="question-icon">↻</span>
        <h3>What Do You Want to Do Next?</h3>
      </div>
      <p>${
        telemetry.currentRunNumber < TOTAL_RUNS
          ? `Select <strong>Start Run ${telemetry.currentRunNumber + 1}</strong> to keep going, or <strong>Finish</strong> to stop here.`
          : `All 3 runs are complete. Select <strong>Finish</strong> to close the session.`
      }</p>
    </div>

    <div class="question-card theme-knowledge" style="grid-column: 1 / -1;">
      <div class="question-title-row">
        <span class="question-icon">◈</span>
        <h3>Here’s What You Collected</h3>
      </div>
      <p>This run included the following helpful and risky factors.</p>

      <div class="build-summary-list">
        ${
          collectedMarkup.trim()
            ? collectedMarkup
            : `
              <div class="build-summary-item">
                <span class="build-summary-label">No factor pickups recorded</span>
                <span class="build-summary-value">This run ended before any protective or risk items were collected.</span>
              </div>
            `
        }
      </div>
    </div>
  `;

  buildSnapshotPanel.innerHTML = `
    <div class="build-panel-card">
      <h3>What Happened This Run</h3>

      <div class="build-summary-list">
        <div class="build-summary-item">
          <span class="build-summary-label">Run End</span>
          <span class="build-summary-value">${reason === "chances_depleted" ? "No Chances Left" : "Completed"}</span>
        </div>

        <div class="build-summary-item">
          <span class="build-summary-label">Ending Protective Points</span>
          <span class="build-summary-value">${roundSummary.endingProtectivePoints}</span>
        </div>

        <div class="build-summary-item">
          <span class="build-summary-label">Helpful Items Collected</span>
          <span class="build-summary-value">${roundSummary.protectiveCollected}</span>
        </div>

        <div class="build-summary-item">
          <span class="build-summary-label">Risk Items Hit</span>
          <span class="build-summary-value">${roundSummary.riskHit}</span>
        </div>

        <div class="build-summary-item">
          <span class="build-summary-label">Points Lost from Risk Items</span>
          <span class="build-summary-value">${roundSummary.totalRiskPointLoss}</span>
        </div>

        <div class="build-summary-item">
          <span class="build-summary-label">Monster Hits</span>
          <span class="build-summary-value">${telemetry.timesCaught}</span>
        </div>
      </div>
    </div>
  `;

  choicesPanel.innerHTML = `
    <div class="build-panel-card" style="margin-top: 12px;">
      <h3>What You Said After the Run</h3>
      <div class="build-summary-list">
        <div class="build-summary-item">
          <span class="build-summary-label">Biggest Challenge</span>
          <span class="build-summary-value">${getPostRunPrimaryReflectionText("challengePriority")}</span>
        </div>

        <div class="build-summary-item">
          <span class="build-summary-label">Best Reset Tool</span>
          <span class="build-summary-value">${getPostRunPrimaryReflectionText("recoveryPriority")}</span>
        </div>

        <div class="build-summary-item">
          <span class="build-summary-label">Most Helpful Safe Place</span>
          <span class="build-summary-value">${getPostRunPrimaryReflectionText("safeZonePriority")}</span>
        </div>
      </div>
    </div>
  `;

  setupOverlay.classList.remove("hidden");

  logEvent("post_run_choice_opened", {
    reason,
    roundSummary
  });
}

/* =========================================================
   PLAYER EFFECTS / SCORING
========================================================= */

function boostPlayer(speedValue, durationMs) {
  player.speed = speedValue;
  effectState.speedUntil = Date.now() + durationMs;
}

function slowPlayer(speedValue, durationMs) {
  player.speed = speedValue;
  effectState.speedUntil = Date.now() + durationMs;
}

function clearLag() {
  player.speed = PLAYER_BASE_SPEED;
  effectState.speedUntil = 0;
}

function grantShield(ms) {
  effectState.shieldUntil = Math.max(effectState.shieldUntil, Date.now() + ms);
}

function hasShield() {
  return Date.now() < effectState.shieldUntil;
}

function updateEffects() {
  if (Date.now() > effectState.speedUntil) {
    player.speed = PLAYER_BASE_SPEED;
  }
}

function adjustStability(delta) {
  const before = playerState.stability;
  playerState.stability = Math.max(0, Math.min(12, playerState.stability + delta));

  const actualDelta = playerState.stability - before;

  if (actualDelta < 0) {
    playSound(sfx.chanceLoss, 0.5);
  }
}

function adjustProtectivePoints(delta) {
  const before = playerState.protectivePoints;
  playerState.protectivePoints = Math.max(0, playerState.protectivePoints + delta);

  const actualDelta = playerState.protectivePoints - before;

  if (actualDelta > 0) {
    playSound(sfx.pointGain, 0.32);
  } else if (actualDelta < 0) {
    playSound(sfx.pointLoss, 0.38);
  }
}

/* =========================================================
   SCENARIO / MODAL SYSTEM
========================================================= */

function maybeTriggerWrapScenario() {
  const now = Date.now();

  if (
    !gameStarted ||
    scenarioOpen ||
    now - lastWrapScenarioAt < WRAP_SCENARIO_COOLDOWN_MS
  ) {
    return;
  }

  if (Math.random() > WRAP_SCENARIO_CHANCE) {
    return;
  }

  const scenario = weightedPickByPriority(
    wrapScenarios,
    playerProfile.challengePriority,
    "category"
  );

  const opened = openQuestionModal(scenario, {
    requireCoping: true,
    source: "wrap"
  });

  if (opened) {
    lastWrapScenarioAt = now;
  }
}

function maybeTriggerThreatScenario() {
  const now = Date.now();

  if (
    !gameStarted ||
    scenarioOpen ||
    hasShield() ||
    !threatState.inDanger ||
    now - threatState.lastThreatScenarioAt < THREAT_SCENARIO_COOLDOWN_MS
  ) {
    return;
  }

  if (now - threatState.lastThreatScenarioCheckAt < THREAT_SCENARIO_CHECK_MS) {
    return;
  }

  threatState.lastThreatScenarioCheckAt = now;

  if (Math.random() > THREAT_SCENARIO_ROLL) {
    return;
  }

  const scenario = weightedPickByPriority(
    threatScenarios,
    playerProfile.challengePriority,
    "category"
  );

  const opened = openQuestionModal(scenario, {
    requireCoping: true,
    source: "threat"
  });

  if (opened) {
    threatState.lastThreatScenarioAt = now;
  }
}

function updateThreatTracking() {
  const nearest = getNearestActiveChaserDistance();
  threatState.nearestDistance = nearest;
  const inDangerNow =
    nearest < DANGER_DISTANCE &&
    !isInSafeSpace(player) &&
    !hasShield();

  if (inDangerNow && !threatState.inDanger) {
    telemetry.dangerZoneEntries++;
    telemetry.chaserProximityHits++;
    logEvent("danger_zone_enter", { nearestDistance: Math.round(nearest) });
  }

  if (
    nearest < NEAR_MISS_DISTANCE &&
    !isInSafeSpace(player) &&
    !hasShield() &&
    Date.now() - threatState.lastNearMissAt > 1600 &&
    Date.now() > player.invulnerableUntil
  ) {
    telemetry.nearMisses++;
    threatState.lastNearMissAt = Date.now();
    logEvent("near_miss", { nearestDistance: Math.round(nearest) });
  }

  threatState.inDanger = inDangerNow;
  if (threatState.inDanger) {
    maybeTriggerThreatScenario();
  }
}

function pickWrongIndex(correctIndex, total) {
  const options = [];
  for (let i = 0; i < total; i++) {
    if (i !== correctIndex) options.push(i);
  }
  return options[Math.floor(Math.random() * options.length)];
}

function getQuestionHint(question) {
  const truth = getTruthToolSettings();

  if (truth.showHint && question.hint) {
    return question.hint;
  }

  if (getActiveFactFindingTool() === "direct_knowledge") {
    return "Direct Knowledge is active. No hint is shown, so you rely on what you already know.";
  }

  if (getActiveFactFindingTool() === "collaborative_problem_solving") {
    return "Collaborative Problem Solving is active. Your team can help, but you still need to think for yourself.";
  }

  return "";
}

function openQuestionModal(question, options = {}) {
  const now = Date.now();

  if (!gameStarted || scenarioOpen || now - lastModalAt < GLOBAL_MODAL_COOLDOWN_MS) {
    return false;
  }

  lastModalAt = now;
  scenarioOpen = true;
  pendingResolution = null;

  for (const key in keys) {
    keys[key] = false;
  }

  modalContext = {
    question,
    source: options.source || "manual",
    zoneType: options.zoneType || null,
    requireCoping: !!options.requireCoping,
    step: options.requireCoping ? "coping" : "question",
    copingShownAt: performance.now(),
    questionShownAt: options.requireCoping ? null : performance.now(),
    selectedCopingTool: null
  };

  logEvent("modal_open", {
    modalType: question.type,
    questionId: question.id,
    source: modalContext.source,
    zoneType: modalContext.zoneType
  });

  renderModalStep();
  scenarioModal.classList.remove("hidden");
  return true;
}

function renderModalStep() {
  const question = modalContext.question;

  scenarioChoices.innerHTML = "";
  scenarioChoices.classList.remove("hidden");
  scenarioResultBox.classList.add("hidden");
  scenarioFeedback.textContent = "";
  scenarioOutcome.textContent = "";
  scenarioOutcome.className = "outcome-pill";
  scenarioHint.classList.add("hidden");
  scenarioHint.textContent = "";

  if (modalContext.step === "coping") {
    scenarioTitle.textContent = "Choose a Coping Tool";
    scenarioText.textContent = question.text;
    scenarioMeta.textContent = "Select how your character will steady themselves before choosing.";

    copingTools.forEach((tool) => {
      const button = document.createElement("button");
      button.textContent = `${tool.label}: ${tool.description}`;
      button.className = "secondary";
      button.addEventListener("click", () => {
        const latency = Math.round(performance.now() - modalContext.copingShownAt);
        telemetry.copingSelectionLatenciesMs.push(latency);
        playerState.lastSelectedCopingTool = tool.id;
        modalContext.selectedCopingTool = tool.id;

        const recoveryEffect = applyRecoveryToolEffect(tool.id);

        modalContext.step = "question";
        modalContext.questionShownAt = performance.now();

        logEvent("coping_tool_selected", {
          questionId: question.id,
          copingTool: tool.id,
          latencyMs: latency,
          recoveryWeight: recoveryEffect.weight,
          stabilityGain: recoveryEffect.stabilityGain,
          speedBoost: recoveryEffect.speedBoost
        });

        renderModalStep();
      });
      scenarioChoices.appendChild(button);
    });

    return;
  }

  scenarioTitle.textContent = question.title;
  scenarioText.textContent = question.text;

  if (question.type === "safe") {
    scenarioMeta.textContent = `Safe Zone Support: ${modalContext.zoneType.toUpperCase()}`;
  } else if (modalContext.selectedCopingTool) {
    scenarioMeta.textContent = `Challenge Focus: ${question.category.toUpperCase()} | Coping Tool: ${getReadableTool(modalContext.selectedCopingTool)}`;
  } else {
    scenarioMeta.textContent = `Challenge Focus: ${question.category.toUpperCase()}`;
  }

  const hintText = getQuestionHint(question);
  if (hintText) {
    scenarioHint.textContent = hintText;
    scenarioHint.classList.remove("hidden");
  }

  if (getActiveFactFindingTool() === "collaborative_problem_solving") {
    const helpButton = document.createElement("button");
    helpButton.textContent = "Use Team Input";
    helpButton.className = "tertiary";
    helpButton.addEventListener("click", () => {
      const isCorrect = Math.random() < getTruthToolSettings().teamInputAccuracy;
      let choiceIndex = 0;

      if (question.type === "safe") {
        choiceIndex = isCorrect
          ? question.correctIndex
          : pickWrongIndex(question.correctIndex, question.choices.length);
      } else {
        const bestIndex = question.choices.findIndex((c) => c.kind === "best");
        const riskyIndex = question.choices.findIndex((c) => c.kind === "risky");
        choiceIndex = isCorrect ? bestIndex : riskyIndex;
      }

      handleQuestionAnswer(question, choiceIndex, true);
    });
    scenarioChoices.appendChild(helpButton);
  }

  question.choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.textContent = choice.label;
    button.addEventListener("click", () => {
      handleQuestionAnswer(question, index, false);
    });
    scenarioChoices.appendChild(button);
  });
}

function handleQuestionAnswer(question, choiceIndex, usedCollaboration) {
  const buttons = scenarioChoices.querySelectorAll("button");
  buttons.forEach((btn) => {
    btn.disabled = true;
    btn.style.opacity = "0.6";
    btn.style.cursor = "not-allowed";
  });

  const latency = Math.round(
    performance.now() - (modalContext.questionShownAt || performance.now())
  );

  telemetry.scenarioLatenciesMs.push(latency);
  telemetry.scenarioCount++;

  if (question.type === "safe") {
    telemetry.safeZoneQuestionLatenciesMs.push(latency);
  }

  const result = resolveQuestionOutcome(question, choiceIndex, latency, usedCollaboration);

  scenarioChoices.classList.add("hidden");
  scenarioHint.classList.add("hidden");
  scenarioHint.textContent = "";
  scenarioCard.classList.add("is-answered");

  scenarioResultBox.classList.remove("hidden");
  scenarioFeedback.textContent = result.feedback;
  scenarioOutcome.textContent = result.outcomeText;
  scenarioOutcome.className =
    "outcome-pill " +
    (result.outcomeType === "reward"
      ? "outcome-reward"
      : result.outcomeType === "lag"
      ? "outcome-lag"
      : "outcome-neutral");

  pendingResolution = result.apply;
}

function resolveQuestionOutcome(question, choiceIndex, latency, usedCollaboration) {
  const multiplier = getChallengeRankMultiplier(question.category);
  const source = modalContext.source;
  const selectedCopingTool = modalContext.selectedCopingTool || null;
  const truth = getTruthToolSettings();
  const special = getSpecialHelpSettings();

  if (question.type === "scenario") {
    const choice = question.choices[choiceIndex];
    const qualityMap = { best: 2, neutral: 1, risky: 0 };
    const quality = qualityMap[choice.kind];

    telemetry.decisionQualities.push({
      questionId: question.id,
      quality,
      source
    });

    let protectivePointsDelta = 0;
    let stabilityDelta = 0;
    let outcomeType = "neutral";
    let outcomeText = "No Major Shift";
    let feedback = choice.feedback;

    if (choice.kind === "best") {
  protectivePointsDelta += 2 * multiplier + special.questionRewardBonus;
      outcomeType = "reward";
      outcomeText = `Reward: +${(2 * multiplier + special.questionRewardBonus).toFixed(1)} Protective Points`
    } else if (choice.kind === "neutral") {
      protectivePointsDelta += 0.5 * multiplier;
      outcomeType = "neutral";
      outcomeText = `Steady Choice: +${(0.5 * multiplier).toFixed(1)} Protective Points`;
    } else {
      protectivePointsDelta -= 1;
      stabilityDelta -= 1;
      outcomeType = "lag";
      outcomeText = "Penalty: -1 Protective Point, -1 Chance";
    }

    return {
      feedback,
      outcomeText,
      outcomeType,
      apply: () => {
        adjustProtectivePoints(protectivePointsDelta);
        adjustStability(stabilityDelta);

        if (choice.kind === "best") {
          boostPlayer(BEST_SPEED, EFFECT_MS);
        } else if (choice.kind === "risky") {
          slowPlayer(WORST_SPEED, EFFECT_MS);
        }

        logEvent("scenario_answered", {
          questionId: question.id,
          source,
          category: question.category,
          answerKind: choice.kind,
          copingTool: selectedCopingTool,
          latencyMs: latency,
          usedCollaboration,
          protectivePointsDelta,
          stabilityDelta
        });
      }
    };
  }

  const isCorrect = choiceIndex === question.correctIndex;
  let protectivePointsDelta = 0;
  let stabilityDelta = 0;
  let outcomeType = "neutral";
  let outcomeText = "";
  let feedback = "";

  if (isCorrect) {
  telemetry.safeZoneCorrect++;
  protectivePointsDelta += 1 * multiplier + special.questionRewardBonus;
     outcomeType = "reward";
    outcomeText = `Safe Zone Reward: +${(1 * multiplier + special.questionRewardBonus).toFixed(1)} Protective Points`;
    feedback = "Correct. That support choice helped you stay safer and make a healthier decision.";
  } else {
    telemetry.safeZoneWrong++;
    protectivePointsDelta -= 1;
    stabilityDelta -= 1;
    outcomeType = "lag";
    outcomeText = "Safe Zone Miss: -1 Protective Point, -1 Chance";
    feedback = "Not quite. This safe place would have helped more with making a healthier choice.";
  }

  return {
    feedback,
    outcomeText,
    outcomeType,
    apply: () => {
      adjustProtectivePoints(protectivePointsDelta);
      adjustStability(stabilityDelta);

      logEvent("safe_zone_question_answered", {
        questionId: question.id,
        zoneType: modalContext.zoneType,
        category: question.category,
        isCorrect,
        copingTool: selectedCopingTool,
        latencyMs: latency,
        usedCollaboration,
        protectivePointsDelta,
        stabilityDelta
      });
    }
  };
}

function closeScenario() {
  scenarioOpen = false;
  scenarioModal.classList.add("hidden");
  scenarioChoices.classList.remove("hidden");
  scenarioResultBox.classList.add("hidden");
  scenarioChoices.innerHTML = "";
  scenarioFeedback.textContent = "";
  scenarioOutcome.textContent = "";
  scenarioOutcome.className = "outcome-pill";
  scenarioHint.classList.add("hidden");
  scenarioCard.classList.remove("is-answered");
  scenarioHint.textContent = "";
  scenarioMeta.textContent = "";
  modalContext = null;
}

/* =========================================================
   MOVEMENT / COLLISION
========================================================= */

function applyHorizontalWrap(rect) {
  const wrapped = { ...rect, didWrap: false };
  const leftPortalX = 10;
  const rightPortalX = 822;

  if (rect.x + rect.w <= leftPortalX) {
    wrapped.x = rightPortalX - rect.w;
    wrapped.didWrap = true;
  } else if (rect.x >= rightPortalX) {
    wrapped.x = leftPortalX;
    wrapped.didWrap = true;
  }

  return wrapped;
}

function clampVertical(entity) {
  const topLimit = 28;
  const bottomLimit = 642 - entity.h;

  if (entity.y < topLimit) entity.y = topLimit;
  if (entity.y > bottomLimit) entity.y = bottomLimit;
}

function tryMove(entity, dx, dy, options = {}) {
  const {
    blockSafeSpaces = false,
    countWrap = false,
    allowWrap = false
  } = options;

  let moved = false;

  if (dx !== 0) {
    let nextX = { ...entity, x: entity.x + dx };

    if (allowWrap) {
      nextX = applyHorizontalWrap(nextX);
    }

    const blockedByWall = hitsWall(nextX);
    const blockedBySafe = blockSafeSpaces && hitsSafeSpace(nextX);

    if (!blockedByWall && !blockedBySafe) {
      entity.x = nextX.x;
      moved = true;

      if (nextX.didWrap && countWrap) {
        telemetry.wrapCount++;
        logEvent("portal_wrap");
        maybeTriggerWrapScenario();
      }
    } else if (entity === player) {
      telemetry.collisionCount++;
    }
  }

  if (dy !== 0) {
    const nextY = { ...entity, y: entity.y + dy };
    const blockedByWall = hitsWall(nextY);
    const blockedBySafe = blockSafeSpaces && hitsSafeSpace(nextY);

    if (!blockedByWall && !blockedBySafe) {
      entity.y = nextY.y;
      clampVertical(entity);
      moved = true;
    } else if (entity === player) {
      telemetry.collisionCount++;
    }
  }

  return moved;
}

function movePlayer() {
  let dx = 0;
  let dy = 0;

  if (keys.arrowup || keys.w) dy -= player.speed;
  if (keys.arrowdown || keys.s) dy += player.speed;
  if (keys.arrowleft || keys.a) dx -= player.speed;
  if (keys.arrowright || keys.d) dx += player.speed;

  if (dx !== 0 || dy !== 0) {
    telemetry.movementCount++;
  }

  if (dx !== 0) {
    tryMove(player, dx, 0, { countWrap: true, allowWrap: true });
  }
  if (dy !== 0) {
    tryMove(player, 0, dy, { countWrap: true, allowWrap: true });
  }
}

/* =========================================================
   PATHFINDING / CHASERS
========================================================= */

function cellIndex(col, row) {
  return row * GRID_COLS + col;
}

function snapEntityCenterToCell(entity, col, row) {
  const center = cellCenter(col, row);
  entity.x = center.x - entity.w / 2;
  entity.y = center.y - entity.h / 2;
}

function cellCenter(col, row) {
  return {
    x: col * CELL_SIZE + CELL_SIZE / 2,
    y: row * CELL_SIZE + CELL_SIZE / 2
  };
}

function pointToCell(x, y) {
  const col = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(x / CELL_SIZE)));
  const row = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(y / CELL_SIZE)));
  return { col, row };
}

function isCellPassable(col, row, blockSafeSpaces = true) {
  const center = cellCenter(col, row);
  const probe = {
    x: center.x - 8,
    y: center.y - 8,
    w: 16,
    h: 16
  };

  if (hitsWall(probe)) return false;
  if (blockSafeSpaces && hitsSafeSpace(probe)) return false;
  return true;
}

function buildPassability() {
  chaserPassability = new Array(GRID_COLS * GRID_ROWS).fill(false);
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      chaserPassability[cellIndex(col, row)] = isCellPassable(col, row, true);
    }
  }
}

function findNearestPassableCell(col, row) {
  if (chaserPassability[cellIndex(col, row)]) {
    return { col, row };
  }

  for (let radius = 1; radius <= 4; radius++) {
    for (let r = row - radius; r <= row + radius; r++) {
      for (let c = col - radius; c <= col + radius; c++) {
        if (c < 0 || r < 0 || c >= GRID_COLS || r >= GRID_ROWS) continue;
        if (chaserPassability[cellIndex(c, r)]) {
          return { col: c, row: r };
        }
      }
    }
  }

  return { col, row };
}

function getNeighbors(col, row) {
  const neighbors = [];
  const deltas = [
    { dc: 1, dr: 0 },
    { dc: -1, dr: 0 },
    { dc: 0, dr: 1 },
    { dc: 0, dr: -1 }
  ];

  for (const { dc, dr } of deltas) {
    const nc = col + dc;
    const nr = row + dr;
    if (nc < 0 || nr < 0 || nc >= GRID_COLS || nr >= GRID_ROWS) continue;
    if (chaserPassability[cellIndex(nc, nr)]) {
      neighbors.push({ col: nc, row: nr });
    }
  }

  return neighbors;
}

function findPath(startRect, goalRect) {
  const startCenter = {
    x: startRect.x + startRect.w / 2,
    y: startRect.y + startRect.h / 2
  };
  const goalCenter = {
    x: goalRect.x + goalRect.w / 2,
    y: goalRect.y + goalRect.h / 2
  };

  let start = pointToCell(startCenter.x, startCenter.y);
  let goal = pointToCell(goalCenter.x, goalCenter.y);

  start = findNearestPassableCell(start.col, start.row);
  goal = findNearestPassableCell(goal.col, goal.row);

  const startIdx = cellIndex(start.col, start.row);
  const goalIdx = cellIndex(goal.col, goal.row);

  if (startIdx === goalIdx) return [];

  const queue = [startIdx];
  const visited = new Array(GRID_COLS * GRID_ROWS).fill(false);
  const parent = new Array(GRID_COLS * GRID_ROWS).fill(-1);
  visited[startIdx] = true;

  let found = false;
  let head = 0;

  while (head < queue.length) {
    const current = queue[head++];
    if (current === goalIdx) {
      found = true;
      break;
    }

    const row = Math.floor(current / GRID_COLS);
    const col = current % GRID_COLS;

    for (const n of getNeighbors(col, row)) {
      const nextIdx = cellIndex(n.col, n.row);
      if (visited[nextIdx]) continue;
      visited[nextIdx] = true;
      parent[nextIdx] = current;
      queue.push(nextIdx);
    }
  }

  if (!found) return [];

  const path = [];
  let current = goalIdx;

  while (current !== startIdx && current !== -1) {
    const row = Math.floor(current / GRID_COLS);
    const col = current % GRID_COLS;
    path.push({ col, row });
    current = parent[current];
  }

  path.reverse();
  return path;
}

function getPhaseIndex() {
  const t = getSurvivalSeconds();
  if (t < 45) return 0;
  if (t < 90) return 1;
  if (t < 135) return 2;
  return 3;
}

function getScatterTargetRect(index) {
  const targets = [
    { x: 48, y: 48, w: 16, h: 16 },
    { x: canvas.width - 64, y: 48, w: 16, h: 16 },
    { x: 48, y: canvas.height - 64, w: 16, h: 16 },
    { x: canvas.width - 64, y: canvas.height - 64, w: 16, h: 16 }
  ];

  return targets[index % targets.length];
}

function snapChaserToNearestPassableCell(chaser) {
  const centerX = chaser.x + chaser.w / 2;
  const centerY = chaser.y + chaser.h / 2;

  let { col, row } = pointToCell(centerX, centerY);
  ({ col, row } = findNearestPassableCell(col, row));

  const center = cellCenter(col, row);
  chaser.x = center.x - chaser.w / 2;
  chaser.y = center.y - chaser.h / 2;
  chaser.path = [];
  chaser.nextPathAt = 0;
  chaser.stuckFrames = 0;
  chaser.lastX = chaser.x;
  chaser.lastY = chaser.y;
}

function moveChasers() {
  if (isInSafeSpace(player)) return;

  const phase = getPhaseIndex();
  const basePhaseSpeed = THREAT_SPEED_PHASES[phase];

  const cycleLength = CHASE_DURATION + SCATTER_DURATION;
  const sessionTime = Date.now() - telemetry.sessionStart;
  const cyclePos = sessionTime % cycleLength;
  const inScatter = cyclePos >= CHASE_DURATION;

  for (let index = 0; index < chasers.length; index++) {
    const chaser = chasers[index];
    if (!chaser.active) continue;

    let effectiveSpeed = inScatter
      ? basePhaseSpeed * SCATTER_SPEED_MULTIPLIER
      : basePhaseSpeed;

    const special = getSpecialHelpSettings();
    if (
      threatState.inDanger &&
      playerState.stability <= 2 &&
      special.dangerSlowMultiplier < 1
    ) {
      effectiveSpeed *= special.dangerSlowMultiplier;
    }

    chaser.speed = effectiveSpeed;

    const targetRect = inScatter ? getScatterTargetRect(index) : player;
    const now = Date.now();

    if (now >= chaser.nextPathAt || !chaser.path || chaser.path.length === 0) {
      chaser.path = findPath(chaser, targetRect);
      chaser.nextPathAt = now + 140;
    }

    let movedThisFrame = false;

    if (chaser.path && chaser.path.length > 0) {
      const nextCell = chaser.path[0];
      const target = cellCenter(nextCell.col, nextCell.row);

      const chaserCenterX = chaser.x + chaser.w / 2;
      const chaserCenterY = chaser.y + chaser.h / 2;
      const dx = target.x - chaserCenterX;
      const dy = target.y - chaserCenterY;

      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      const snapThreshold = Math.max(1.5, chaser.speed + 0.35);

      if (absDx <= snapThreshold && absDy <= snapThreshold) {
        snapEntityCenterToCell(chaser, nextCell.col, nextCell.row);
        chaser.path.shift();
        movedThisFrame = true;
      } else {
        let moved = false;

        if (absDx > 1 && absDy <= 1.25) {
          moved = tryMove(chaser, Math.sign(dx) * Math.min(absDx, chaser.speed), 0, {
            blockSafeSpaces: true,
            allowWrap: false
          });
        } else if (absDy > 1 && absDx <= 1.25) {
          moved = tryMove(chaser, 0, Math.sign(dy) * Math.min(absDy, chaser.speed), {
            blockSafeSpaces: true,
            allowWrap: false
          });
        } else {
          const moveX = Math.sign(dx) * Math.min(absDx, chaser.speed);
          const moveY = Math.sign(dy) * Math.min(absDy, chaser.speed);

          if (absDx >= absDy) {
            moved =
              tryMove(chaser, moveX, 0, {
                blockSafeSpaces: true,
                allowWrap: false
              }) ||
              tryMove(chaser, 0, moveY, {
                blockSafeSpaces: true,
                allowWrap: false
              });
          } else {
            moved =
              tryMove(chaser, 0, moveY, {
                blockSafeSpaces: true,
                allowWrap: false
              }) ||
              tryMove(chaser, moveX, 0, {
                blockSafeSpaces: true,
                allowWrap: false
              });
          }
        }

        if (moved) {
          movedThisFrame = true;
        } else {
          chaser.path = [];
          chaser.nextPathAt = 0;
        }
      }
    }

    const barelyMoved =
      Math.abs(chaser.x - chaser.lastX) < 0.2 &&
      Math.abs(chaser.y - chaser.lastY) < 0.2;

    if (!movedThisFrame || barelyMoved) {
      chaser.stuckFrames += 1;
    } else {
      chaser.stuckFrames = 0;
    }

    chaser.lastX = chaser.x;
    chaser.lastY = chaser.y;

    if (chaser.stuckFrames >= 3) {
      snapChaserToNearestPassableCell(chaser);
    }
  }
}

function resetChasers() {
  for (const chaser of chasers) {
    chaser.x = chaser.spawnX;
    chaser.y = chaser.spawnY;
    chaser.path = [];
    chaser.nextPathAt = 0;
    chaser.stuckFrames = 0;
    chaser.lastX = chaser.spawnX;
    chaser.lastY = chaser.spawnY;
  }

  if (chasers[0]) {
    snapChaserToNearestPassableCell(chasers[0]);
  }
}

/* =========================================================
   FACTOR SYSTEM
========================================================= */

function scheduleNextProtectiveSpawn() {
  const special = getSpecialHelpSettings();
  nextProtectiveSpawnAt =
    Date.now() +
    Math.floor(
      randomBetween(PROTECTIVE_SPAWN_MIN_MS, PROTECTIVE_SPAWN_MAX_MS) *
        special.protectiveSpawnMultiplier
    );
}

function scheduleNextRiskSpawn() {
  const special = getSpecialHelpSettings();
  nextRiskSpawnAt =
    Date.now() +
    Math.floor(
      randomBetween(RISK_SPAWN_MIN_MS, RISK_SPAWN_MAX_MS) *
        special.riskSpawnMultiplier
    );
}

function makeFactorInstance(def, x, y, type) {
  return {
    ...def,
    type,
    x,
    y,
    w: 24,
    h: 24,
    collected: false,
    spawnedAt: Date.now(),
    expiresAt: Date.now() + FACTOR_LIFETIME_MS
  };
}

function isSpawnPointValid(point) {
  const rect = { x: point.x, y: point.y, w: 18, h: 18 };
  if (hitsWall(rect)) return false;
  if (hitsSafeSpace(rect)) return false;
  return true;
}

function getUnusedSpawnPoints() {
  return factorSpawnPoints.filter((point) => {
    if (!isSpawnPointValid(point)) return false;

    const testRect = { x: point.x, y: point.y, w: 18, h: 18 };

    const occupiedByProtective = activeProtectiveFactors.some(
      (factor) => !factor.collected && rectsOverlap(testRect, factor)
    );

    const occupiedByRisk = activeRiskFactors.some(
      (factor) => !factor.collected && rectsOverlap(testRect, factor)
    );

    const overlapsPlayer = rectsOverlap(testRect, player);
    const overlapsChaser = chasers.some(
      (chaser) => chaser.active && rectsOverlap(testRect, chaser)
    );

    return !occupiedByProtective && !occupiedByRisk && !overlapsPlayer && !overlapsChaser;
  });
}

function spawnSingleFactor(type) {
  const openPoints = shuffle(getUnusedSpawnPoints());
  if (openPoints.length === 0) return;

  const point = openPoints[0];

  if (type === "protective") {
    const def = protectiveFactorPool[Math.floor(Math.random() * protectiveFactorPool.length)];
    activeProtectiveFactors.push(makeFactorInstance(def, point.x, point.y, "protective"));
  } else {
    const def = riskFactorPool[Math.floor(Math.random() * riskFactorPool.length)];
    activeRiskFactors.push(makeFactorInstance(def, point.x, point.y, "risk"));
  }
}

function pruneExpiredFactors() {
  const now = Date.now();

  activeProtectiveFactors = activeProtectiveFactors.filter(
    (factor) => !factor.collected && now < factor.expiresAt
  );

  activeRiskFactors = activeRiskFactors.filter(
    (factor) => !factor.collected && now < factor.expiresAt
  );
}

function updateFactorSpawning() {
  const now = Date.now();

  pruneExpiredFactors();

  const activeProtectiveCount = activeProtectiveFactors.filter((f) => !f.collected).length;
  const activeRiskCount = activeRiskFactors.filter((f) => !f.collected).length;

  if (now >= nextProtectiveSpawnAt && activeProtectiveCount < MAX_ACTIVE_PROTECTIVE) {
    spawnSingleFactor("protective");
    scheduleNextProtectiveSpawn();
  }

  if (now >= nextRiskSpawnAt && activeRiskCount < MAX_ACTIVE_RISK) {
    spawnSingleFactor("risk");
    scheduleNextRiskSpawn();
  }
}

function spawnFactors() {
  activeProtectiveFactors = [];
  activeRiskFactors = [];
  scheduleNextProtectiveSpawn();
  scheduleNextRiskSpawn();
  spawnSingleFactor("protective");
  spawnSingleFactor("risk");
}

function getProtectivePickupDetail(factor) {
  if (factor.effect.shieldMs) return "Shield";
  if (factor.effect.clearLag && factor.effect.speedBoost) return "Recover + Speed";
  if (factor.effect.clearLag) return "Recover";
  if (factor.effect.speedBoost) return "Speed Up";
  return "+1 Protective Point";
}

function getRiskPickupDetail(factor, blocked = false) {
  if (blocked) return "Blocked";
  if (factor.effect.speedPenalty) return "Slowed";
  return "Pressure Hit";
}

function spawnPickupText(x, y, text, color) {
  pickupTexts.push({
    x,
    y,
    text,
    color,
    life: 1300,
    maxLife: 1300,
    riseSpeed: 0.025
  });
}

function spawnPickupBurst(x, y, color) {
  pickupBursts.push({
    x,
    y,
    color,
    life: 420,
    maxLife: 420,
    startRadius: 8,
    endRadius: 24,
    lineWidth: 3
  });
}

function triggerPickupFX(factor, detailText, color) {
  const cx = factor.x + factor.w / 2;
  const cy = factor.y + factor.h / 2;

  spawnPickupText(cx, cy - 6, `${factor.label}: ${detailText}`, color);
  spawnPickupBurst(cx, cy, color);
}

function updatePickupFX(deltaMs) {
  pickupTexts = pickupTexts
    .map((item) => ({
      ...item,
      life: item.life - deltaMs,
      y: item.y - item.riseSpeed * deltaMs
    }))
    .filter((item) => item.life > 0);

  pickupBursts = pickupBursts
    .map((item) => ({
      ...item,
      life: item.life - deltaMs
    }))
    .filter((item) => item.life > 0);
}

function drawPickupFX() {
  ctx.save();

  for (const burst of pickupBursts) {
    const progress = 1 - burst.life / burst.maxLife;
    const radius =
      burst.startRadius + (burst.endRadius - burst.startRadius) * progress;
    const alpha = 1 - progress;

    ctx.beginPath();
    ctx.arc(burst.x, burst.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = burst.color.replace("0.95", `${Math.max(0.18, alpha)}`);
    ctx.lineWidth = Math.max(1, burst.lineWidth * (1 - progress * 0.45));
    ctx.stroke();
  }

  for (const item of pickupTexts) {
    const alpha = Math.max(0, item.life / item.maxLife);
    ctx.globalAlpha = alpha;
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(5, 11, 18, 0.85)";
    ctx.strokeText(item.text, item.x, item.y);

    ctx.fillStyle = item.color;
    ctx.fillText(item.text, item.x, item.y);
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

function applyProtectiveFactor(factor) {
  factorTelemetry.protectiveCollected++;
  factorTelemetry.protectiveByType[factor.id] =
    (factorTelemetry.protectiveByType[factor.id] || 0) + 1;

  if (factor.effect.clearLag) {
    clearLag();
  }

  if (factor.effect.speedBoost) {
    boostPlayer(
      PLAYER_BASE_SPEED + factor.effect.speedBoost,
      factor.effect.durationMs || 2200
    );
  }

  if (factor.effect.shieldMs) {
    grantShield(factor.effect.shieldMs);
  }

  adjustProtectivePoints(1);

  triggerPickupFX(
    factor,
    getProtectivePickupDetail(factor),
    COLORS.protectiveGlow
  );

  logEvent("protective_factor", {
    factorId: factor.id,
    factorLabel: factor.label
  });
}

function applyRiskFactor(factor) {
  factorTelemetry.riskHit++;
  factorTelemetry.riskByType[factor.id] =
    (factorTelemetry.riskByType[factor.id] || 0) + 1;

  if (hasShield()) {
    factorTelemetry.blockedRiskHit++;

    triggerPickupFX(
      factor,
      "Blocked",
      COLORS.protectiveGlow
    );

    logEvent("risk_factor_blocked", {
      factorId: factor.id,
      factorLabel: factor.label
    });
    return;
  }

  if (factor.effect.speedPenalty) {
    slowPlayer(
      Math.max(1.6, PLAYER_BASE_SPEED - factor.effect.speedPenalty),
      factor.effect.durationMs || 2200
    );
  }

  const drained = drainProtectivePoints(RISK_POINT_DRAIN);
  factorTelemetry.totalRiskPointLoss += drained;

  triggerPickupFX(
    factor,
    drained > 0 ? `-${drained} Protective Point${drained === 1 ? "" : "s"}` : "Pressure Hit",
    COLORS.riskGlow
  );

  logEvent("risk_factor", {
    factorId: factor.id,
    factorLabel: factor.label,
    protectivePointsLost: drained
  });
}

function checkFactorInteractions() {
  for (const factor of activeProtectiveFactors) {
    if (!factor.collected && rectsOverlap(player, factor)) {
      factor.collected = true;
      applyProtectiveFactor(factor);
    }
  }

  for (const factor of activeRiskFactors) {
    if (!factor.collected && rectsOverlap(player, factor)) {
      factor.collected = true;
      applyRiskFactor(factor);
    }
  }
}

/* =========================================================
   FACTOR SUMMARY COPY
========================================================= */

const RISK_POINT_DRAIN = 1;

const factorSummaryCopy = {
  achievement: {
    title: "Achievement Factors",
    description:
      "This factor represents knowing the facts and understanding how to stay safe. When you have good information, it is easier to make smart choices and avoid pressure."
  },
  family_support: {
    title: "Support Factors",
    description:
      "This factor symbolizes support from trusted people. Feeling connected helps you stay grounded, manage emotions, and bounce back when things get tough."
  },
  health_protection: {
    title: "Health Factors",
    description:
      "This factor represents safety, boundaries, and strong support. It helps you stay steady when things get stressful. Picking it up makes you feel more protected and ready to handle challenges."
  },
  healthy_nutrition: {
    title: "Nutrition Factors",
    description:
      "This factor stands for taking care of your body and making healthy decisions. It boosts your ability to stay focused and calm, which makes the whole run easier."
  },
  restful_sleep: {
    title: "Sleep Factors",
    description:
      "This factor represents rest, calm, and emotional balance. When you are regulated, you think more clearly and make stronger decisions."
  },
  self_awareness: {
    title: "Self-Awareness Factors",
    description:
      "This factor represents noticing what you feel, what you think, and what your body is telling you in the moment. It helps you catch early warning signs, understand your reactions, and choose a response on purpose instead of just reacting."
  },
  learning_growth: {
    title: "Learning Factors",
    description:
      "This factor represents learning, growth, and using information to recover from pressure. It helps clear confusion and get you back on track."
  },

  alcohol_exposure: {
    title: "Tempting Shortcut (Fiery Orb)",
    description:
      "This factor looks exciting or helpful at first, but it actually makes things harder later. It represents choices that feel good in the moment but lead to more pressure or confusion down the road."
  },
  social_harm: {
    title: "High Risk Alert (Red Triangle)",
    description:
      "This factor represents clear danger or unsafe pressure. It makes the run harder right away and drains your Protective Points quickly."
  },
  conflict_stress: {
    title: "Conflict or Peer Pressure (Red vs Blue Figures)",
    description:
      "This factor stands for arguments, conflict, or people pushing you toward unsafe choices. It increases stress and makes it harder to stay in control."
  },
  mental_overload: {
    title: "Mental Load or Confusion (Brain Icon)",
    description:
      "This factor represents misinformation, confusion, or feeling mentally overwhelmed. When your brain is overloaded, it is easier to make risky decisions or miss warning signs."
  }
};

function resetFactorTelemetryCounts() {
  factorTelemetry.protectiveCollected = 0;
  factorTelemetry.riskHit = 0;
  factorTelemetry.blockedRiskHit = 0;
  factorTelemetry.totalRiskPointLoss = 0;
  factorTelemetry.protectiveByType = {};
  factorTelemetry.riskByType = {};

  protectiveFactorPool.forEach((factor) => {
    factorTelemetry.protectiveByType[factor.id] = 0;
  });

  riskFactorPool.forEach((factor) => {
    factorTelemetry.riskByType[factor.id] = 0;
  });
}

function drainProtectivePoints(amount) {
  const before = playerState.protectivePoints;
  adjustProtectivePoints(-amount);
  return Number((before - playerState.protectivePoints).toFixed(2));
}

/* =========================================================
   THREAT / SAFE ZONE TRACKING
========================================================= */

function getNearestActiveChaserDistance() {
  let nearest = Infinity;
  for (const chaser of chasers) {
    if (!chaser.active) continue;
    const playerCenterX = player.x + player.w / 2;
    const playerCenterY = player.y + player.h / 2;
    const chaserCenterX = chaser.x + chaser.w / 2;
    const chaserCenterY = chaser.y + chaser.h / 2;
    const distance = Math.hypot(playerCenterX - chaserCenterX, playerCenterY - chaserCenterY);
    if (distance < nearest) nearest = distance;
  }
  return nearest;
}

function checkCaught() {
  if (Date.now() < player.invulnerableUntil || isInSafeSpace(player) || hasShield()) return;

  for (const chaser of chasers) {
    if (!chaser.active) continue;

    if (rectsOverlap(player, chaser)) {
      telemetry.timesCaught++;

      const loss = getCatchStabilityLoss();
      adjustStability(-loss);

      logEvent("caught_by_chaser", {
        defenseTop: getTopDefenseMechanism(),
        stabilityLoss: loss
      });

      if (playerState.stability <= 0) {
        endRun("chances_depleted");
      } else {
        respawnPlayerAfterCatch();
      }
      break;
    }
  }
}

function maybePromptSafeZoneSupport(zone) {
  const now = Date.now();

  if (!zone || scenarioOpen) return;
  if (now - playerState.lastSupportPromptAt < SAFE_ZONE_PROMPT_COOLDOWN_MS) return;
  if (now - safeZonePromptHistory[zone.type] < SAFE_ZONE_REPEAT_MS) return;

  const pool = safeZoneQuestions[zone.type];
  const question = pool[Math.floor(Math.random() * pool.length)];

  const opened = openQuestionModal(question, {
    requireCoping: false,
    source: "safe_zone",
    zoneType: zone.type
  });

  if (opened) {
    playerState.lastSupportPromptAt = now;
    safeZonePromptHistory[zone.type] = now;
  }
}

function updateSafeSpaceTracking(deltaMs) {
  const zone = getSafeZoneAtRect(player);
  const inSafe = !!zone;

  if (inSafe) {
    telemetry.totalSafeSpaceMs += deltaMs;
  }

  if (inSafe && !playerWasInSafeSpace) {
    telemetry.safeSpaceEntries++;
    playerState.currentSafeZone = zone.type;
    currentSafeZoneType = zone.type;

    applySafeZoneEntryEffect(zone.type);

    logEvent("safe_zone_enter", { zoneType: zone.type });
    maybePromptSafeZoneSupport(zone);
  }

  if (!inSafe && playerWasInSafeSpace) {
    logEvent("safe_zone_exit", { zoneType: currentSafeZoneType });
    playerState.currentSafeZone = null;
    currentSafeZoneType = null;
  }

  playerWasInSafeSpace = inSafe;
}

function updateThreatLevel() {
  const survivalSeconds = getSurvivalSeconds();

  let newLevelIndex = 0;
  for (let i = 0; i < THREAT_LEVELS.length; i++) {
    if (survivalSeconds >= THREAT_LEVELS[i].time) {
      newLevelIndex = i;
    }
  }

  const levelChanged = newLevelIndex !== currentThreatLevel;
  currentThreatLevel = newLevelIndex;
  const level = THREAT_LEVELS[currentThreatLevel];

  telemetry.highestLevelReached = Math.max(
    telemetry.highestLevelReached,
    currentThreatLevel + 1
  );

  chasers.forEach((chaser, index) => {
    chaser.active = index < level.activeChasers;
    chaser.speed = level.speed;
  });

  if (levelChanged) {
    levelBannerText = `${level.label} - Pressure Rising`;
    levelBannerUntil = Date.now() + 2000;

    for (let i = 0; i < level.activeChasers; i++) {
      chasers[i].x = chasers[i].spawnX;
      chasers[i].y = chasers[i].spawnY;
      chasers[i].path = [];
      chasers[i].nextPathAt = 0;
      chasers[i].stuckFrames = 0;
      chasers[i].lastX = chasers[i].x;
      chasers[i].lastY = chasers[i].y;
    }

    logEvent("level_changed", { level: currentThreatLevel + 1 });
  }
}

/* =========================================================
   RESET / RESPAWN
========================================================= */

function resetPlayer() {
  player.x = playerSpawn.x;
  player.y = playerSpawn.y;
  player.speed = PLAYER_BASE_SPEED;
  player.invulnerableUntil = Date.now() + 1000;

  currentThreatLevel = 0;

  playerAnim.frameIndex = 0;
  playerAnim.frameTimer = 0;
  playerAnim.lastX = player.x;
  playerAnim.lastY = player.y;
  playerAnim.moving = false;

  playerState.stability = STARTING_STABILITY;
  playerState.protectivePoints = playerState.protectivePoints || 0;
  playerState.currentSafeZone = null;
  playerState.lastSupportPromptAt = 0;
  playerState.lastSelectedCopingTool = null;

  effectState.speedUntil = 0;
  effectState.shieldUntil = 0;

  threatState.inDanger = false;
  threatState.nearestDistance = Infinity;
  threatState.lastNearMissAt = 0;
  threatState.lastThreatScenarioAt = 0;
  threatState.lastThreatScenarioCheckAt = 0;
  
  safeZoneEntryBonusHistory.school = 0;
  safeZoneEntryBonusHistory.family = 0;
  safeZoneEntryBonusHistory.peer = 0;

  playerWasInSafeSpace = false;
  currentSafeZoneType = null;
  scenarioOpen = false;
  pendingResolution = null;
  modalContext = null;

  activeProtectiveFactors = [];
  activeRiskFactors = [];
  pickupTexts = [];
  pickupBursts = [];

  resetFactorTelemetryCounts();

  telemetry.sessionStart = Date.now();
  telemetry.safeSpaceEntries = 0;
  telemetry.totalSafeSpaceMs = 0;
  telemetry.movementCount = 0;
  telemetry.collisionCount = 0;
  telemetry.wrapCount = 0;
  telemetry.timesCaught = 0;
  telemetry.dangerZoneEntries = 0;
  telemetry.nearMisses = 0;
  telemetry.chaserProximityHits = 0;
  telemetry.highestLevelReached = 1;

  scheduleNextProtectiveSpawn();
  scheduleNextRiskSpawn();
  spawnSingleFactor("protective");
  spawnSingleFactor("risk");
}

function respawnPlayerAfterCatch() {
  player.x = playerSpawn.x;
  player.y = playerSpawn.y;
  player.invulnerableUntil = Date.now() + 1200;
  player.speed = PLAYER_BASE_SPEED;
  effectState.speedUntil = 0;
  effectState.shieldUntil = 0;
  playerAnim.frameIndex = 0;
  playerAnim.frameTimer = 0;
  playerAnim.lastX = player.x;
  playerAnim.lastY = player.y;
  playerAnim.moving = false;
  playerState.currentSafeZone = null;
  playerWasInSafeSpace = false;
  currentSafeZoneType = null;
  resetChasers();
  applyPostCatchDefenseEffect();
}

/* =========================================================
   RENDER HELPERS
========================================================= */

function roundedRectPath(x,  y,  w,  h,  r) {
  const radius = Math.min(r,  w / 2,  h / 2);

  ctx.beginPath();
  ctx.moveTo(x + radius,  y);
  ctx.lineTo(x + w - radius,  y);
  ctx.quadraticCurveTo(x + w,  y,  x + w,  y + radius);
  ctx.lineTo(x + w,  y + h - radius);
  ctx.quadraticCurveTo(x + w,  y + h,  x + w - radius,  y + h);
  ctx.lineTo(x + radius,  y + h);
  ctx.quadraticCurveTo(x,  y + h,  x,  y + h - radius);
  ctx.lineTo(x,  y + radius);
  ctx.quadraticCurveTo(x,  y,  x + radius,  y);
  ctx.closePath();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0,  0,  0,  canvas.height);
  gradient.addColorStop(0,  "#06101A");
  gradient.addColorStop(1,  "#030813");

  ctx.fillStyle = gradient;
  ctx.fillRect(0,  0,  canvas.width,  canvas.height);

  const vignette = ctx.createRadialGradient(
    canvas.width / 2, 
    canvas.height / 2, 
    120, 
    canvas.width / 2, 
    canvas.height / 2, 
    520
  );
  vignette.addColorStop(0,  "rgba(0,  0,  0,  0)");
  vignette.addColorStop(1,  "rgba(0,  0,  0,  0.38)");

  ctx.fillStyle = vignette;
  ctx.fillRect(0,  0,  canvas.width,  canvas.height);

  ctx.fillStyle = "rgba(255,  255,  255,  0.012)";
  ctx.fillRect(0,  PORTAL.y - 10,  canvas.width,  PORTAL.h + 20);
}

function drawSeamlessWalls() {
  ctx.save();

  ctx.shadowColor = COLORS.wallGlow;
  ctx.shadowBlur = 10;
  ctx.fillStyle = COLORS.wallFill;

  for (const wall of wallSegments) {
    const radius = Math.max(6,  Math.min(wall.w,  wall.h) / 2);
    roundedRectPath(wall.x,  wall.y,  wall.w,  wall.h,  radius);
    ctx.fill();
  }

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(93,  231,  255,  0.04)";

  for (const wall of wallSegments) {
    const radius = Math.max(6,  Math.min(wall.w,  wall.h) / 2);
    roundedRectPath(wall.x - 2,  wall.y - 2,  wall.w + 4,  wall.h + 4,  radius + 2);
    ctx.fill();
  }

  ctx.fillStyle = COLORS.wallFill;
  for (const wall of wallSegments) {
    const radius = Math.max(6,  Math.min(wall.w,  wall.h) / 2);
    roundedRectPath(wall.x,  wall.y,  wall.w,  wall.h,  radius);
    ctx.fill();
  }

  ctx.fillStyle = COLORS.wallInner;
  for (const wall of wallSegments) {
    const radius = Math.max(6,  Math.min(wall.w,  wall.h) / 2);
    roundedRectPath(
      wall.x + 2, 
      wall.y + 2, 
      wall.w - 4, 
      wall.h - 4, 
      Math.max(4,  radius - 2)
    );
    ctx.fill();
  }

  ctx.fillStyle = COLORS.wallCore;
  for (const wall of wallSegments) {
    if (wall.w >= wall.h) {
      const stripH = Math.max(3,  Math.floor(wall.h * 0.24));
      const stripY = wall.y + (wall.h - stripH) / 2;

      roundedRectPath(
        wall.x + 8, 
        stripY, 
        Math.max(8,  wall.w - 16), 
        stripH, 
        stripH / 2
      );
      ctx.fill();
    } else {
      const stripW = Math.max(3,  Math.floor(wall.w * 0.24));
      const stripX = wall.x + (wall.w - stripW) / 2;

      roundedRectPath(
        stripX, 
        wall.y + 8, 
        stripW, 
        Math.max(8,  wall.h - 16), 
        stripW / 2
      );
      ctx.fill();
    }
  }

  ctx.restore();
}

function getPlaySummaryBand(summary) {
  if (summary.protectiveCollected >= 6 && summary.riskHit <= 2) {
    return {
      title:  "Strong Protective Play", 
      text:  "You built a lot of Protective Points this run. That means you used your supports well and made strong choices under pressure."
    };
  }

  if (summary.protectiveCollected > 0 && summary.riskHit > 0 && summary.riskHit < summary.protectiveCollected) {
    return {
      title:  "Mixed Play", 
      text:  "You made several strong choices,  and you also hit a few traps. Traps are great learning moments. They show where something looked safe but was not."
    };
  }

  return {
    title:  "High Risk Pickups", 
    text:  "You faced a lot of pressure this run. Risk pickups show where things got tough. These are the best places to practice coping tools next time."
  };
}

function getRoundSummaryData() {
  return {
    protectiveCollected:  factorTelemetry.protectiveCollected, 
    riskHit:  factorTelemetry.riskHit, 
    blockedRiskHit:  factorTelemetry.blockedRiskHit, 
    totalRiskPointLoss:  Number(factorTelemetry.totalRiskPointLoss.toFixed(2)), 
    endingProtectivePoints:  Number(playerState.protectivePoints.toFixed(2)), 
    protectiveByType:  { ...factorTelemetry.protectiveByType }, 
    riskByType:  { ...factorTelemetry.riskByType }
  };
}

function getFactorImageSrc(id) {
  return sprites.protective?.[id]?.src || sprites.risk?.[id]?.src || "";
}

function renderFactorSummaryRows(countMap, ids) {
  return ids
    .filter((id) => (countMap[id] || 0) > 0)
    .map((id) => {
      const copy = factorSummaryCopy[id];
      if (!copy) return "";

      const count = countMap[id] || 0;
      const imgSrc = getFactorImageSrc(id);

      return `
        <div class="build-summary-item factor-summary-item">
          ${
            imgSrc
              ? `<img
                   class="factor-summary-image"
                   src="${imgSrc}"
                   alt="${copy.title}"
                   onerror="this.style.display='none'"
                 >`
              : ""
          }

          <div class="factor-summary-copy">
            <span class="build-summary-label">${count} ${copy.title}</span>
            <span class="build-summary-value">${copy.description}</span>
          </div>
        </div>
      `;
    })
    .join("");
}

function drawSafeSpaces() {
  for (const safe of safeSpaces) {
    ctx.save();

    const isPriority = playerProfile.safeZonePriority[0] === safe.type;
    ctx.shadowColor = safe.border;
    ctx.shadowBlur = isPriority ? 16 :  10;

    ctx.fillStyle = COLORS.safeFill;
    roundedRectPath(safe.x,  safe.y,  safe.w,  safe.h,  10);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = safe.border;
    ctx.lineWidth = isPriority ? 3 :  2;
    roundedRectPath(safe.x,  safe.y,  safe.w,  safe.h,  10);
    ctx.stroke();

    ctx.fillStyle = safe.border;
    ctx.font = "bold 13px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(safe.label,  safe.x + safe.w / 2,  safe.y + safe.h / 2);

    ctx.restore();
  }

  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
}

function drawCrosswalkActivator(x,  y,  w,  h) {
  ctx.save();

  ctx.fillStyle = "rgba(18,  45,  65,  0.95)";
  roundedRectPath(x,  y,  w,  h,  6);
  ctx.fill();

  ctx.strokeStyle = COLORS.wrapBorder;
  ctx.lineWidth = 2;
  roundedRectPath(x,  y,  w,  h,  6);
  ctx.stroke();

  const stripeCount = 4;
  const stripeW = 3;
  const gap = 3;
  const totalW = stripeCount * stripeW + (stripeCount - 1) * gap;
  const startX = x + (w - totalW) / 2;

  ctx.fillStyle = COLORS.wrapStripe;
  for (let i = 0; i < stripeCount; i++) {
    roundedRectPath(startX + i * (stripeW + gap),  y + 9,  stripeW,  h - 18,  1.5);
    ctx.fill();
  }

  ctx.fillStyle = COLORS.questionAccent;
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("?",  x + w / 2,  y + h / 2);

  ctx.restore();

  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
}

function drawPortalHints() {
  const pad = 12;
  const w = 28;
  drawCrosswalkActivator(pad,  PORTAL.y,  w,  PORTAL.h);
  drawCrosswalkActivator(canvas.width - pad - w,  PORTAL.y,  w,  PORTAL.h);
}

function spriteReady(img) {
  return img && img.complete && img.naturalWidth > 0;
}

function updatePlayerAnimation(deltaMs) {
  const moved =
    Math.abs(player.x - playerAnim.lastX) > 0.05 ||
    Math.abs(player.y - playerAnim.lastY) > 0.05;

  playerAnim.moving = moved;
  playerAnim.lastX = player.x;
  playerAnim.lastY = player.y;

  if (!moved) {
    playerAnim.frameIndex = 0;
    playerAnim.frameTimer = 0;
    return;
  }

  playerAnim.frameTimer += deltaMs;

  if (playerAnim.frameTimer >= playerAnim.frameDelay) {
    playerAnim.frameTimer = 0;
    playerAnim.frameIndex =
      (playerAnim.frameIndex + 1) % sprites.player.run.length;
  }
}

function getPlayerSprite() {
  if (!playerAnim.moving) return sprites.player.idle;
  return sprites.player.run[playerAnim.frameIndex];
}

function getChaserSprite(index) {
  const skinKey = CHASER_SKIN_ORDER[index % CHASER_SKIN_ORDER.length];
  const stateKey = threatState.inDanger ? "alert" :  "normal";
  return sprites.chasers[skinKey][stateKey];
}

function getFactorSprite(factor) {
  if (factor.type === "protective") {
    return sprites.protective[factor.id];
  }
  return sprites.risk[factor.id];
}

function drawFallbackBox(x,  y,  w,  h,  fill,  stroke) {
  ctx.save();
  ctx.fillStyle = fill;
  roundedRectPath(x,  y,  w,  h,  4);
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  roundedRectPath(x,  y,  w,  h,  4);
  ctx.stroke();
  ctx.restore();
}

function getGlowPulse(min = 10,  max = 18,  speed = 0.005) {
  const t = performance.now();
  const wave = (Math.sin(t * speed) + 1) / 2;
  return min + (max - min) * wave;
}

function drawSpriteCentered(
  sprite, 
  rect, 
  drawWidth, 
  drawHeight, 
  glowColor = null, 
  glowBlur = 0
) {
  const drawX = rect.x - (drawWidth - rect.w) / 2;
  const drawY = rect.y - (drawHeight - rect.h) / 2;

  ctx.save();

  if (glowColor) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glowBlur;
  }

  ctx.drawImage(sprite,  drawX,  drawY,  drawWidth,  drawHeight);
  ctx.restore();
}

function drawFactor(factor) {
  if (factor.collected) return;

  const sprite = getFactorSprite(factor);
  const isProtective = factor.type === "protective";
  const glowColor = isProtective ? COLORS.protectiveGlow :  COLORS.riskGlow;
  const pulseBlur = isProtective
    ? getGlowPulse(10,  18,  0.005)
    :  getGlowPulse(12,  20,  0.006);

  ctx.save();

  if (spriteReady(sprite)) {
    drawSpriteCentered(
  sprite, 
  factor, 
  FACTOR_DRAW.w, 
  FACTOR_DRAW.h, 
  glowColor, 
  pulseBlur
);
  } else {
    const fill = isProtective ? COLORS.protective :  COLORS.risk;
    drawFallbackBox(factor.x,  factor.y,  factor.w,  factor.h,  fill,  glowColor);
  }

  ctx.restore();
}

function drawNearestProtectiveLocator() {
  if (getActiveCheatCode() !== "internal_motivation" || playerState.stability > 3) return;

  let nearestFactor = null;
  let nearestDistance = Infinity;

  for (const factor of activeProtectiveFactors) {
    if (factor.collected) continue;
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    const fx = factor.x + factor.w / 2;
    const fy = factor.y + factor.h / 2;
    const dist = Math.hypot(px - fx,  py - fy);
    if (dist < nearestDistance) {
      nearestDistance = dist;
      nearestFactor = factor;
    }
  }

  if (!nearestFactor) return;

  const t = Date.now() / 180;
  const pulse = 8 + Math.sin(t) * 3;

  ctx.save();
  ctx.strokeStyle = "#ffd95a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(
    nearestFactor.x + nearestFactor.w / 2, 
    nearestFactor.y + nearestFactor.h / 2, 
    nearestFactor.w / 2 + pulse, 
    0, 
    Math.PI * 2
  );
  ctx.stroke();
  ctx.restore();
}

function drawFactors() {
  activeProtectiveFactors.forEach(drawFactor);
  activeRiskFactors.forEach(drawFactor);
  drawNearestProtectiveLocator();
}

function drawStrategicPlanningGuide() {
  if (
    getActiveCheatCode() !== "strategic_planning" ||
    !threatState.inDanger ||
    playerState.stability > 2
  ) {
    return;
  }

  let nearestSafe = null;
  let nearestDistance = Infinity;

  for (const safe of safeSpaces) {
    const sx = safe.x + safe.w / 2;
    const sy = safe.y + safe.h / 2;
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    const dist = Math.hypot(px - sx,  py - sy);
    if (dist < nearestDistance) {
      nearestDistance = dist;
      nearestSafe = safe;
    }
  }

  if (!nearestSafe) return;

  ctx.save();
  ctx.strokeStyle = "#ffd95a";
  ctx.lineWidth = 2;
  ctx.setLineDash([6,  5]);
  ctx.beginPath();
  ctx.moveTo(player.x + player.w / 2,  player.y + player.h / 2);
  ctx.lineTo(nearestSafe.x + nearestSafe.w / 2,  nearestSafe.y + nearestSafe.h / 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawPlayer() {
  ctx.save();

  const sprite = getPlayerSprite();

  if (spriteReady(sprite)) {
    if (Date.now() < player.invulnerableUntil) {
      ctx.globalAlpha = 0.75 + Math.sin(performance.now() * 0.02) * 0.15;
    }

    drawSpriteCentered(
  sprite, 
  player, 
  PLAYER_DRAW.w, 
  PLAYER_DRAW.h
);
    ctx.globalAlpha = 1;
  } else {
    const fill =
      Date.now() < player.invulnerableUntil ? COLORS.playerInvulnerable :  COLORS.player;

    drawFallbackBox(player.x,  player.y,  player.w,  player.h,  fill,  COLORS.playerBorder);
  }

  if (hasShield()) {
    ctx.strokeStyle = "#FFD95A";
    ctx.lineWidth = 2;
    roundedRectPath(player.x - 3,  player.y - 3,  player.w + 6,  player.h + 6,  6);
    ctx.stroke();
  }

  ctx.restore();
}

function drawChasers() {
  chasers.forEach((chaser,  index) => {
    if (!chaser.active) return;

    const sprite = getChaserSprite(index);
    const normalGlow = COLORS.chaserGlows[index % COLORS.chaserGlows.length];
    const alertPulse = getGlowPulse(18,  30,  0.01);
    const normalPulse = getGlowPulse(10,  15,  0.004);

    const glowColor = threatState.inDanger ? COLORS.chaserAlertGlow :  normalGlow;
    const glowBlur = threatState.inDanger ? alertPulse :  normalPulse;

    ctx.save();

    if (spriteReady(sprite)) {
      const skinKey = CHASER_SKIN_ORDER[index % CHASER_SKIN_ORDER.length];
const drawSize = CHASER_DRAW_BY_SKIN[skinKey] || { w:  45,  h:  40 };

drawSpriteCentered(
  sprite, 
  chaser, 
  drawSize.w, 
  drawSize.h, 
  glowColor, 
  glowBlur
);
    } else {
      drawFallbackBox(chaser.x,  chaser.y,  chaser.w,  chaser.h,  COLORS.chaserBody,  glowColor);
    }

    ctx.restore();
  });
}

function drawLevelBanner() {
  if (Date.now() > levelBannerUntil) return;

  ctx.save();

  const text = levelBannerText;
  ctx.font = "bold 22px Arial";
  const textWidth = ctx.measureText(text).width;
  const w = textWidth + 40;
  const h = 44;
  const x = (canvas.width - w) / 2;
  const y = 70;

  ctx.fillStyle = "rgba(8,  18,  30,  0.9)";
  roundedRectPath(x,  y,  w,  h,  12);
  ctx.fill();

  ctx.strokeStyle = "#5DE7FF";
  ctx.lineWidth = 2;
  roundedRectPath(x,  y,  w,  h,  12);
  ctx.stroke();

  ctx.fillStyle = "#EAF4FF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text,  x + w / 2,  y + h / 2);

  ctx.restore();

  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
}

function draw() {
  ctx.clearRect(0,  0,  canvas.width,  canvas.height);
  drawBackground();
  drawSeamlessWalls();
  drawPortalHints();
  drawSafeSpaces();
  drawStrategicPlanningGuide();
  drawFactors();
  drawChasers();
  drawPlayer();
  drawPickupFX();
  drawLevelBanner();
}

/* =========================================================
   MAIN UPDATE LOOP
========================================================= */

function update(deltaMs) {
  updateEffects();
  updatePickupFX(deltaMs);

  if (!gameStarted || scenarioOpen) return;

  updateThreatLevel();
  updateFactorSpawning();
  movePlayer();
  updatePlayerAnimation(deltaMs);
  moveChasers();
  updateThreatTracking();
  checkFactorInteractions();
  updateSafeSpaceTracking(deltaMs);
  checkCaught();

  if (playerState.stability <= 0) {
    endRun("chances_depleted");
    return;
  }

  /* Each run continues until stability is depleted. */
}

function loop(now) {
  const deltaMs = now - lastFrameTime;
  lastFrameTime = now;

  update(deltaMs);
  updateHUD();
  draw();

  requestAnimationFrame(loop);
}

/* =========================================================
   EVENT LISTENERS
========================================================= */

window.addEventListener("keydown",  (e) => {
  keys[e.key.toLowerCase()] = true;
});

window.addEventListener("keyup",  (e) => {
  keys[e.key.toLowerCase()] = false;
});

if (scenarioContinueBtn) {
  scenarioContinueBtn.addEventListener("click",  () => {
    if (pendingResolution) {
      pendingResolution();
      pendingResolution = null;
    }
    closeScenario();
  });
}

if (startGameBtn) {
  startGameBtn.addEventListener("click", async () => {
    try {
      await sfx.pointGain.play();
      sfx.pointGain.pause();
      sfx.pointGain.currentTime = 0;
    } catch (err) {
      console.error("audio unlock failed:", err);
    }

    try {
      if (appPhase === "pre") {
        const profile = readSurvey(preSurveySchema);

        playerProfile.challengePriority = profile.challengePriority;
        playerProfile.defensePriority = profile.defensePriority;
        playerProfile.recoveryPriority = profile.recoveryPriority;
        playerProfile.safeZonePriority = profile.safeZonePriority;
        playerProfile.factFindingTool = profile.factFindingTool;
        playerProfile.cheatCode = profile.cheatCode;

        telemetry.currentRunNumber = 1;
        playerState.protectivePoints = 0;
        updateFocusHUD();
        setupError.textContent = "";
        startRunLoop("pre_survey");
        logEvent("pre_survey_submitted", { profile });
        return;
      }

      if (appPhase === "post") {
        postSurveyResults = readSurvey(postSurveySchema);
        setupError.textContent = "";
        logEvent("post_survey_submitted", { postSurveyResults });
        openPostRunDecision(lastRunEndReason);
        return;
      }
    } catch (error) {
      setupError.textContent = error.message;
    }
  });
}



if (endSessionBtn) {
  endSessionBtn.addEventListener("click",  () => {
    if (appPhase === "post_complete" || appPhase === "post" || appPhase === "pre" || appPhase === "ended") {
      openEndedState();
      markGameSessionCompleted(); // Telemetry: mark as completed on finish
      return;
    }
    gameStarted = false;
    openEndedState();
    markGameSessionQuit(); // Telemetry: mark as quit if session ended early
  });
}


if (runAgainBtn) {
  runAgainBtn.addEventListener("click",  () => {
    if (appPhase === "ended") {
      telemetry.sessionCount += 1;
      telemetry.currentRunNumber = 1;
      playerState.protectivePoints = 0;
      startRunLoop("new_session_same_build");
      onGameAttemptStart(); // Telemetry: new session attempt
      return;
    }
    if (telemetry.currentRunNumber >= TOTAL_RUNS) return;
    telemetry.currentRunNumber += 1;
    telemetry.cumulativeAttemptCount += 1;
    startRunLoop("next_run");
    onGameAttemptStart(); // Telemetry: new run attempt
  });
}

/* =========================================================
   BOOTSTRAP
========================================================= */

ctx.imageSmoothingEnabled = true;

buildPassability();
openPreSurvey();
updateFocusHUD();
updateHUD();
draw();
requestAnimationFrame(loop);

