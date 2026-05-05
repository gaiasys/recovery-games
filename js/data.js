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
const THREAT_SCENARIO_ROLL = 0.05;

const GLOBAL_MODAL_COOLDOWN_MS = 8000;
const CATCH_STABILITY_LOSS = 2;

const DANGER_DISTANCE = 92;
const NEAR_MISS_DISTANCE = 28;

const CELL_SIZE = 12;
const PORTAL = {
  y: 305,
  h: 56
};

function getGridDimensions(canvasWidth, canvasHeight, cellSize = CELL_SIZE) {
  return {
    cols: Math.ceil(canvasWidth / cellSize),
    rows: Math.ceil(canvasHeight / cellSize)
  };
}

const MAX_ACTIVE_PROTECTIVE = 3;
const MAX_ACTIVE_RISK = 4;
const PROTECTIVE_SPAWN_MIN_MS = 5200;
const PROTECTIVE_SPAWN_MAX_MS = 7200;
const RISK_SPAWN_MIN_MS = 3000;
const RISK_SPAWN_MAX_MS = 5200;
const FACTOR_LIFETIME_MS = 9500;

const PLAYER_DRAW = { w: 30, h: 40 };

const CHASER_NAMES = ["solar", "ember", "frost", "shade"];
const CHASER_SPEED_MULTIPLIERS = [1.08, 1.04, 1.0, 1.12];
const CHASER_DRAW_BY_SKIN = {
  solar: { w: 36, h: 24 },
  ember: { w: 36, h: 24 },
  frost: { w: 36, h: 24 },
  shade: { w: 36, h: 24 },
};

const FACTOR_DRAW = { w: 40, h: 40 };

const THREAT_LEVELS = [
  { time: 0,   activeChasers: 1, speed: 1.08, label: "Level 1" },
  { time: 25,  activeChasers: 2, speed: 1.20, label: "Level 2" },
  { time: 60,  activeChasers: 3, speed: 1.34, label: "Level 3" },
  { time: 100, activeChasers: 4, speed: 1.48, label: "Level 4" },
  { time: 140, activeChasers: 4, speed: 1.60, label: "Level 5" },
  { time: 180, activeChasers: 4, speed: 1.72, label: "Level 6" },
  { time: 225, activeChasers: 4, speed: 1.84, label: "Level 7" },
  { time: 275, activeChasers: 4, speed: 1.94, label: "Level 8" }
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
  chaserGlows: ["#5DE7FF", "#FFD95A", "#FF7AD9", "#5A1A7A"],
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
const QUESTION_CATEGORY_KEYS = ["peer", "personal", "facts"];
const QUESTION_TYPE_KEYS = ["scenario", "safe", "signal"];
const SURVEY_SCALE_OPTIONS = [
  { value: 1, label: "1 - Not at all true" },
  { value: 2, label: "2 - A little true" },
  { value: 3, label: "3 - Somewhat true" },
  { value: 4, label: "4 - Mostly true" },
  { value: 5, label: "5 - Very true" }
];

const BUILD_OPTION_LABELS = {
  challengePriority: {
    peer: "Peer Pressure",
    facts: "Knowing the Facts",
    personal: "Handling Big Feelings"
  },
  defensePriority: {
    refusal_skills: "Saying No",
    environmental_control: "Changing Your Surroundings",
    social_agency: "Speaking Up for Yourself"
  },
  recoveryPriority: {
    stress_management: "Calming Down",
    creative_outlets: "Creative Activities",
    physical_activity: "Movement"
  },
  safeZonePriority: {
    school: "School",
    family: "Home",
    peer: "Friends"
  },
  factFindingTool: {
    direct_knowledge: "What You Already Know",
    external_research: "Looking It Up",
    collaborative_problem_solving: "Working It Out Together"
  },
  cheatCode: {
    strategic_planning: "Planning Ahead",
    internal_motivation: "Inner Strength",
    situational_awareness: "Paying Attention"
  }
};

const BUILD_ALLOCATION_TOTAL = 12;
const BUILD_ALLOCATION_MIN = 1;

const PRE_RESPONSE_KEYS = [
  "challengePriority",
  "defensePriority",
  "recoveryPriority",
  "safeZonePriority",
  "factFindingTool",
  "cheatCode"
];

const preSurveySchema = [
  {
    key: "challengePriority",
    type: "allocation",
    title: "Main Challenge",
    description: "Choose what your character struggles with most.",
    options: [
      { value: "peer", label: "Peer Pressure" },
      { value: "facts", label: "Knowing the Facts" },
      { value: "personal", label: "Handling Big Feelings" }
    ]
  },
  {
    key: "defensePriority",
    type: "allocation",
    title: "Defense Style",
    description: "Choose the defense your character leans on when pressure hits.",
    options: [
      { value: "refusal_skills", label: "Saying No" },
      { value: "environmental_control", label: "Choosing Safer Places" },
      { value: "social_agency", label: "Sticking With Supportive Friends" }
    ]
  },
  {
    key: "recoveryPriority",
    type: "allocation",
    title: "Recovery Move",
    description: "Choose the move your character uses to recover fastest after stress spikes.",
    options: [
      { value: "stress_management", label: "Managing Stress" },
      { value: "creative_outlets", label: "Creative Activities" },
      { value: "physical_activity", label: "Being Active" }
    ]
  },
  {
    key: "safeZonePriority",
    type: "allocation",
    title: "Support Base",
    description: "Choose which safe zone gives your character the strongest backup.",
    options: [
      { value: "school", label: "School" },
      { value: "family", label: "Home" },
      { value: "peer", label: "Friends" }
    ]
  },
  {
    key: "factFindingTool",
    type: "allocation",
    title: "Intel Tool",
    description: "Choose how your character gathers health intel when they need the right answer fast.",
    options: [
      { value: "direct_knowledge", label: "What You Already Know" },
      { value: "external_research", label: "Looking It Up" },
      { value: "collaborative_problem_solving", label: "Working It Out Together" }
    ]
  },
  {
    key: "cheatCode",
    type: "allocation",
    title: "Power-Up",
    description: "Choose the bonus help that gives your character the biggest edge.",
    options: [
      { value: "strategic_planning", label: "Planning Ahead" },
      { value: "internal_motivation", label: "Inner Strength" },
      { value: "situational_awareness", label: "Paying Attention" }
    ]
  }
];

const POST_EXPERIENCE_KEYS = [
  "gameEnjoyment",
  "gameAttention",
  "gameBoredom",
  "gameFrustration",
  "gameRealism"
];

const postSurveySchema = [
  {
    key: "challengePriority",
    type: "allocation",
    title: "Main Challenge",
    description: "Choose what your character struggles with most.",
    options: [
      { value: "peer", label: "Peer Pressure" },
      { value: "facts", label: "Knowing the Facts" },
      { value: "personal", label: "Handling Big Feelings" }
    ]
  },
  {
    key: "defensePriority",
    type: "allocation",
    title: "Defense Style",
    description: "Choose the defense your character leans on when pressure hits.",
    options: [
      { value: "refusal_skills", label: "Saying No" },
      { value: "environmental_control", label: "Choosing Safer Places" },
      { value: "social_agency", label: "Sticking With Supportive Friends" }
    ]
  },
  {
    key: "recoveryPriority",
    type: "allocation",
    title: "Recovery Move",
    description: "Choose the move your character uses to recover fastest after stress spikes.",
    options: [
      { value: "stress_management", label: "Managing Stress" },
      { value: "creative_outlets", label: "Creative Activities" },
      { value: "physical_activity", label: "Being Active" }
    ]
  },
  {
    key: "safeZonePriority",
    type: "allocation",
    title: "Support Base",
    description: "Choose which safe zone gives your character the strongest backup.",
    options: [
      { value: "school", label: "School" },
      { value: "family", label: "Home" },
      { value: "peer", label: "Friends" }
    ]
  },
  {
    key: "factFindingTool",
    type: "allocation",
    title: "Intel Tool",
    description: "Choose how your character gathers health intel when they need the right answer fast.",
    options: [
      { value: "direct_knowledge", label: "What You Already Know" },
      { value: "external_research", label: "Looking It Up" },
      { value: "collaborative_problem_solving", label: "Working It Out Together" }
    ]
  },
  {
    key: "cheatCode",
    type: "allocation",
    title: "Power-Up",
    description: "Choose the bonus help that gives your character the biggest edge.",
    options: [
      { value: "strategic_planning", label: "Planning Ahead" },
      { value: "internal_motivation", label: "Inner Strength" },
      { value: "situational_awareness", label: "Paying Attention" }
    ]
  },
  {
    key: "gameEnjoyment",
    title: "Game Enjoyment",
    description: "I enjoyed playing the game.",
    options: SURVEY_SCALE_OPTIONS
  },
  {
    key: "gameAttention",
    title: "Game Attention",
    description: "The game kept my attention.",
    options: SURVEY_SCALE_OPTIONS
  },
  {
    key: "gameBoredom",
    title: "Game Boredom",
    description: "I felt bored while playing the game.",
    options: SURVEY_SCALE_OPTIONS
  },
  {
    key: "gameFrustration",
    title: "Game Frustration",
    description: "I felt frustrated while playing the game.",
    options: SURVEY_SCALE_OPTIONS
  },
  {
    key: "gameRealism",
    title: "Game Realism",
    description: "The situations in the game felt realistic or relevant to my life.",
    options: SURVEY_SCALE_OPTIONS
  }
];

function makeChoice(label, kind, feedback, telemetryTags = {}) {
  return { label, kind, feedback, telemetryTags };
}


/* =========================================================
   GRADE-BANDED QUESTION BANK
========================================================= */

const DEFAULT_GRADE_BAND = "7-8";
const EXACT_PLAYER_GRADE_BANDS = ["1-2", "3-4", "5-6", "7-8", "9-12"];

function normalizePlayerGradeBand(band) {
  const value = String(band || "").trim();

  if (EXACT_PLAYER_GRADE_BANDS.includes(value)) {
    return value;
  }

  if (value === "1-4") return "3-4";
  if (value === "5-8") return "7-8";
  if (value === "5-12") return "7-8";
  if (value === "6-10") return "7-8";
  if (value === "7-10") return "7-8";
  if (value === "7-12") return "9-12";

  return DEFAULT_GRADE_BAND;
}

function getGradeBandFromSearch(search = "") {
  return normalizePlayerGradeBand(
    new URLSearchParams(search).get("gradeBand") || DEFAULT_GRADE_BAND
  );
}

function createGradeBandStore(initialBand = DEFAULT_GRADE_BAND) {
  let currentGradeBand = normalizePlayerGradeBand(initialBand);

  return {
    get() {
      return currentGradeBand;
    },
    set(band) {
      if (!band) return currentGradeBand;
      currentGradeBand = normalizePlayerGradeBand(band);
      return currentGradeBand;
    }
  };
}

function questionMatchesPlayerBand(questionBand, playerBand) {
  const eligibilityMap = {
    "1-2": ["1-2", "1-4", "1-12"],
    "3-4": ["3-4", "1-4", "3-12", "1-12"],
    "5-6": ["5-6", "5-8", "5-12"],
    "7-8": ["7-8", "5-8", "5-12", "6-10", "7-10", "7-12"],
    "9-12": ["9-12", "5-12", "7-12", "1-12", "3-12"]
  };

  return (eligibilityMap[playerBand] || [playerBand]).includes(questionBand);
}

function inferredChoiceTelemetryTags(choiceText, isCorrect, category, lane) {
  const text = String(choiceText || "");
  const helpSeekingPattern =
    /(trusted adult|adult|counselor|teacher|caregiver|parent|guardian|reach out|talk to|check in|support)/i;

  return {
    helpSeeking: helpSeekingPattern.test(text),
    protectiveCue: !!isCorrect,
    riskyCue: !isCorrect,
    responseStyle: isCorrect ? "bank_correct_choice" : "bank_incorrect_choice",
    skill: String(lane || category || "general")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
  };
}

function importedCorrectLetterToIndex(letter) {
  const map = { A: 0, B: 1, C: 2 };
  return map[String(letter || "").trim().toUpperCase()] ?? null;
}

function workbookTopicTagToCategory(topicTag, playZone = "") {
  const tag = String(topicTag || "").trim();
  const zone = String(playZone || "").trim().toLowerCase();
  const explicit = {
    "Peer Influence & Refusal": "peer",
    "Protective Factors": "peer",
    "Mental Health": "personal",
    "Coping": "personal",
    "Help & Support": "personal",
    "Brain & Body": "facts",
    "Substance Risks": "facts",
    "Medication Safety": "facts",
    "Info & Myths": "facts",
    "Advocacy & Environment": "facts",
    "Treatment & Recovery": "facts",
    "Safety & Emergency": "facts"
  };
  if (explicit[tag]) return explicit[tag];
  if (zone === 'peer') return 'peer';
  if (zone === 'family') return 'personal';
  return 'facts';
}

function normalizeWorkbookBand(value) {
  return String(value || "").replace(/–/g, "-").trim();
}

function workbookPlayZoneToSource(playZone) {
  const zone = String(playZone || "").trim().toLowerCase();
  if (zone === 'school' || zone === 'family' || zone === 'peer') return 'safe_zone';
  if (zone === 'wrap') return 'wrap';
  return 'threat';
}

function workbookZoneTitle(zoneType) {
  if (zoneType === 'school') return 'School Check-In';
  if (zoneType === 'family') return 'Home Check-In';
  if (zoneType === 'peer') return 'Friend Check-In';
  return 'Check-In';
}

function workbookChoiceKind(category, correctIndex, index) {
  if (index === correctIndex) return 'best';
  if (category === 'facts') return 'risky';
  const wrongIndexes = [0, 1, 2].filter((i) => i !== correctIndex);
  return index === wrongIndexes[0] ? 'neutral' : 'risky';
}

const workbookLearningRows = [
  {
    "id": "G78W02",
    "gradeBand": "7-8",
    "playZone": "Wrap",
    "topicTag": "Treatment & Recovery",
    "question": "Why does it help to treat substance problems like health problems instead of calling someone a bad person?",
    "hint": "Look for the answer about lowering shame and increasing help-seeking.",
    "choiceA": "It makes the problem vanish faster.",
    "choiceB": "It reduces shame and makes it easier to ask for help.",
    "choiceC": "It just uses bigger words.",
    "correct": "B",
    "feedbackA": "A stronger choice is the one that brings in support and lowers risk.",
    "feedbackB": "Correct. This choice brings in support and lowers risk.",
    "feedbackC": "A stronger choice is the one that brings in support and lowers risk."
  },
  {
    "id": "G912S01",
    "gradeBand": "9-12",
    "playZone": "School",
    "topicTag": "Advocacy & Environment",
    "question": "What does stigma do in a school community?",
    "hint": "Look for the answer about shame and help-seeking.",
    "choiceA": "It keeps schools safer by labeling \"bad\" people.",
    "choiceB": "It makes people less likely to admit they are struggling or ask for help.",
    "choiceC": "It has no effect on health outcomes.",
    "correct": "B",
    "feedbackA": "A stronger choice is the one that brings in support and lowers risk.",
    "feedbackB": "Correct. This choice brings in support and lowers risk.",
    "feedbackC": "A stronger choice is the one that brings in support and lowers risk."
  },
  {
    "id": "G912W01",
    "gradeBand": "9-12",
    "playZone": "Wrap",
    "topicTag": "Treatment & Recovery",
    "question": "Why is it often strongest to treat mental health and substance use together?",
    "hint": "Look for the answer about both problems affecting each other.",
    "choiceA": "It mainly makes insurance easier.",
    "choiceB": "The problems can fuel each other, so treating both together improves recovery.",
    "choiceC": "It is newer, so it must be better.",
    "correct": "B",
    "feedbackA": "A stronger choice is the one that uses healthy coping and support.",
    "feedbackB": "Correct. This choice uses healthy coping and support.",
    "feedbackC": "A stronger choice is the one that uses healthy coping and support."
  },
  {
    "id": "G912W02",
    "gradeBand": "9-12",
    "playZone": "Wrap",
    "topicTag": "Advocacy & Environment",
    "question": "Why does neighborhood access to health care matter?",
    "hint": "Real choices depend on whether support is actually available.",
    "choiceA": "It shows which neighborhoods are safest.",
    "choiceB": "People need real access to care and support, not just good intentions.",
    "choiceC": "It lets you count how many doctors live nearby.",
    "correct": "B",
    "feedbackA": "A stronger choice is the one that brings in support and lowers risk.",
    "feedbackB": "Correct. This choice brings in support and lowers risk.",
    "feedbackC": "A stronger choice is the one that brings in support and lowers risk."
  },
  {
    "id": "G912W03",
    "gradeBand": "9-12",
    "playZone": "Wrap",
    "topicTag": "Treatment & Recovery",
    "question": "How can integrated care lower the overall cost of addiction?",
    "hint": "Think earlier treatment and fewer crises.",
    "choiceA": "By giving more medicine faster.",
    "choiceB": "By keeping people in the hospital longer.",
    "choiceC": "By treating problems earlier and reducing crises, relapses, and repeat hospital visits.",
    "correct": "C",
    "feedbackA": "A stronger choice is the one that brings in support and lowers risk.",
    "feedbackB": "A stronger choice is the one that brings in support and lowers risk.",
    "feedbackC": "Correct. This choice brings in support and lowers risk."
  },
  {
    "id": "G34F01",
    "gradeBand": "3-4",
    "playZone": "Family",
    "topicTag": "Advocacy & Environment",
    "question": "What helps build a healthy school community?",
    "hint": "Pick the answer about supportive friendships.",
    "choiceA": "Copy the same trends.",
    "choiceB": "Support friends who make healthy choices.",
    "choiceC": "Only talk to popular kids.",
    "correct": "B",
    "feedbackA": "A stronger choice is the one that brings in support and lowers risk.",
    "feedbackB": "Correct. This choice brings in support and lowers risk.",
    "feedbackC": "A stronger choice is the one that brings in support and lowers risk."
  },
  {
    "id": "G78F01",
    "gradeBand": "7-8",
    "playZone": "Family",
    "topicTag": "Advocacy & Environment",
    "question": "Why does family support matter when it comes to substance use?",
    "hint": "Look for the answer about support, structure, and connection helping people make safer choices.",
    "choiceA": "Because family controls every choice you make.",
    "choiceB": "Because it is easier to blame someone else.",
    "choiceC": "Because support, structure, and connection can help people make safer choices.",
    "correct": "C",
    "feedbackA": "Not quite. Healthy family support is not about controlling every choice. It is about guidance, care, and structure.",
    "feedbackB": "Not quite. Blaming someone does not reduce risk or help them make safer choices.",
    "feedbackC": "Correct. Family support can lower risk by giving people connection, structure, and help making safer choices."
  },
  {
    "id": "G78S01",
    "gradeBand": "7-8",
    "playZone": "School",
    "topicTag": "Advocacy & Environment",
    "question": "Your school wants a Wellness Room. How could that help students?",
    "hint": "Look for the answer that shows how a support space can help students calm down, reset, and use healthy coping skills.",
    "choiceA": "It is just a nap room.",
    "choiceB": "It gives students a place to reset, regulate emotions, and use healthy coping skills.",
    "choiceC": "It is only for talking about problems.",
    "correct": "B",
    "feedbackA": "Not quite. A Wellness Room is more than a place to nap. It is meant to help students calm down and cope in healthy ways.",
    "feedbackB": "Correct. A Wellness Room can help students calm down, regulate emotions, and use healthy coping skills before stress gets bigger.",
    "feedbackC": "Not quite. Talking can happen there, but the room also helps students calm down and use coping tools."
  },
  {
    "id": "G56S03",
    "gradeBand": "5-6",
    "playZone": "School",
    "topicTag": "Brain & Body",
    "question": "Why is alcohol especially unsafe for kids?",
    "hint": "Look for the answer based on facts, not pressure or rumors.",
    "choiceA": "Kids are less affected than adults.",
    "choiceB": "It only hurts people who drink every day.",
    "choiceC": "It can slow important brain and body functions while the brain is still developing.",
    "correct": "C",
    "feedbackA": "Kids are not protected from alcohol’s effects.",
    "feedbackB": "Alcohol can be dangerous even without everyday use.",
    "feedbackC": "Correct. Alcohol can slow important functions in a still-developing brain and body."
  },
  {
    "id": "G1-2S01",
    "gradeBand": "1-2",
    "playZone": "School",
    "topicTag": "Coping",
    "question": "You feel nervous before a school play. What can help?",
    "hint": "Pick the choice that helps your body calm down.",
    "choiceA": "Hide by yourself.",
    "choiceB": "Take three slow breaths.",
    "choiceC": "Run until you are too tired.",
    "correct": "B",
    "feedbackA": "A stronger choice is the one that uses healthy coping and support.",
    "feedbackB": "Correct. This choice uses healthy coping and support.",
    "feedbackC": "A stronger choice is the one that uses healthy coping and support."
  },
  {
    "id": "G1-2W01",
    "gradeBand": "1-2",
    "playZone": "Wrap",
    "topicTag": "Coping",
    "question": "Why can playing outside help when you feel sad?",
    "hint": "Pick the answer about helping your brain and body feel better.",
    "choiceA": "It helps your brain and body feel better.",
    "choiceB": "It guarantees you will feel happy.",
    "choiceC": "It makes you taller.",
    "correct": "A",
    "feedbackA": "Correct. This choice uses healthy coping and support.",
    "feedbackB": "A stronger choice is the one that uses healthy coping and support.",
    "feedbackC": "A stronger choice is the one that uses healthy coping and support."
  },
  {
    "id": "G1-2W02",
    "gradeBand": "1-2",
    "playZone": "Wrap",
    "topicTag": "Coping",
    "question": "You feel very sad or angry. What is a healthy tool you can use?",
    "hint": "Pick the choice that brings in a trusted adult.",
    "choiceA": "Keep it secret.",
    "choiceB": "Talk to a trusted adult.",
    "choiceC": "Eat lots of sweets.",
    "correct": "B",
    "feedbackA": "A stronger choice is the one that uses healthy coping and support.",
    "feedbackB": "Correct. This choice uses healthy coping and support.",
    "feedbackC": "A stronger choice is the one that uses healthy coping and support."
  },
  {
    "id": "G1-2W03",
    "gradeBand": "1-2",
    "playZone": "Wrap",
    "topicTag": "Coping",
    "question": "Why is exercise good for a stressed brain?",
    "hint": "Look for the answer that shows how exercise can help your body and brain feel calmer.",
    "choiceA": "It helps your body and brain calm down.",
    "choiceB": "It makes you the strongest.",
    "choiceC": "It helps you avoid homework.",
    "correct": "A",
    "feedbackA": "Correct. Exercise can help lower stress by helping your body and brain calm down.",
    "feedbackB": "Not quite. Exercise can help build strength, but this question is asking how it helps with stress.",
    "feedbackC": "Not quite. Exercise does not make homework go away. It helps by supporting your body and brain when you feel stressed."
  },
  {
    "id": "G34S01",
    "gradeBand": "3-4",
    "playZone": "School",
    "topicTag": "Coping",
    "question": "You are nervous before a big test. What can help you calm down?",
    "hint": "Choose a coping tool that slows your body down.",
    "choiceA": "Pretend it does not matter.",
    "choiceB": "Use slow counting or breathing.",
    "choiceC": "Study with a friend right then.",
    "correct": "B",
    "feedbackA": "A stronger choice is the one that uses healthy coping and support.",
    "feedbackB": "Correct. This choice uses healthy coping and support.",
    "feedbackC": "A stronger choice is the one that uses healthy coping and support."
  },
  {
    "id": "G34S02",
    "gradeBand": "3-4",
    "playZone": "School",
    "topicTag": "Coping",
    "question": "A project feels hard, so you take a short walk and try again. What is that?",
    "hint": "Look for the answer about a healthy reset.",
    "choiceA": "Putting it off.",
    "choiceB": "A healthy coping strategy.",
    "choiceC": "Breaking rules.",
    "correct": "B",
    "feedbackA": "A stronger choice is the one that uses healthy coping and support.",
    "feedbackB": "Correct. This choice uses healthy coping and support.",
    "feedbackC": "A stronger choice is the one that uses healthy coping and support."
  },
  {
    "id": "G34W02",
    "gradeBand": "3-4",
    "playZone": "Wrap",
    "topicTag": "Coping",
    "question": "Why do credible health sources matter?",
    "hint": "Pick the answer about safe choices and real facts.",
    "choiceA": "So you can sound smarter than friends.",
    "choiceB": "Wrong info can lead to unsafe choices.",
    "choiceC": "So you can find a cheat code for school.",
    "correct": "B",
    "feedbackA": "A stronger choice is the one that uses healthy coping and support.",
    "feedbackB": "Correct. This choice uses healthy coping and support.",
    "feedbackC": "A stronger choice is the one that uses healthy coping and support."
  },
  {
    "id": "G34W03",
    "gradeBand": "3-4",
    "playZone": "Wrap",
    "topicTag": "Coping",
    "question": "Why look for .gov or .edu sites when checking health facts?",
    "hint": "Pick the answer about fact-based information.",
    "choiceA": "They have the best memes.",
    "choiceB": "They load faster.",
    "choiceC": "They often provide fact-based information.",
    "correct": "C",
    "feedbackA": "A stronger choice is the one that uses healthy coping and support.",
    "feedbackB": "A stronger choice is the one that uses healthy coping and support.",
    "feedbackC": "Correct. This choice uses healthy coping and support."
  },
  {
    "id": "G56F02",
    "gradeBand": "5-6",
    "playZone": "Family",
    "topicTag": "Coping",
    "question": "After a stressful night at home, what can help you calm your body in a healthy way?",
    "hint": "Pick the choice that slows the moment down and uses healthy coping or support.",
    "choiceA": "Use a breathing or grounding skill and check in with an adult.",
    "choiceB": "Pretend nothing is wrong and stay upset all day.",
    "choiceC": "Copy risky behavior you saw online to distract yourself.",
    "correct": "A",
    "feedbackA": "Yes. Healthy coping and support are stronger than hiding or doing something risky.",
    "feedbackB": "Ignoring stress does not usually help your body calm down.",
    "feedbackC": "Risky behavior can make a hard situation worse, not better."
  },
  {
    "id": "G56S06",
    "gradeBand": "5-6",
    "playZone": "School",
    "topicTag": "Coping",
    "question": "You feel your body getting tense before a big test. What is the healthiest school strategy?",
    "hint": "Pick the choice that slows the moment down and uses healthy coping or support.",
    "choiceA": "Use a breathing or grounding tool and ask for help if you need it.",
    "choiceB": "Skip class without telling anyone.",
    "choiceC": "Use something unsafe to “calm down fast.”",
    "correct": "A",
    "feedbackA": "Yes. Healthy coping and asking for help are strong school strategies.",
    "feedbackB": "Skipping class usually adds more stress later.",
    "feedbackC": "Unsafe shortcuts can make a stressful day more dangerous."
  },
  {
    "id": "G58W02",
    "gradeBand": "5-8",
    "playZone": "Wrap",
    "topicTag": "Coping",
    "question": "Which is a good community resource when you need help?",
    "hint": "Pick the answer with a real local helper.",
    "choiceA": "A group chat with friends.",
    "choiceB": "A youth center or school counselor.",
    "choiceC": "A celebrity's social media page.",
    "correct": "B",
    "feedbackA": "A stronger choice is the one that uses healthy coping and support.",
    "feedbackB": "Correct. This choice uses healthy coping and support.",
    "feedbackC": "A stronger choice is the one that uses healthy coping and support."
  },
  {
    "id": "G58W03",
    "gradeBand": "5-8",
    "playZone": "Wrap",
    "topicTag": "Coping",
    "question": "You use a substance to make stress go away. Why can that backfire?",
    "hint": "Look for the answer about stress getting worse and healthy coping not growing.",
    "choiceA": "It mainly costs money.",
    "choiceB": "It does not build healthy coping, and stress can get worse.",
    "choiceC": "It only matters if a parent finds out.",
    "correct": "B",
    "feedbackA": "A stronger choice is the one that uses healthy coping and support.",
    "feedbackB": "Correct. This choice uses healthy coping and support.",
    "feedbackC": "A stronger choice is the one that uses healthy coping and support."
  },
  {
    "id": "G58W04",
    "gradeBand": "5-8",
    "playZone": "Wrap",
    "topicTag": "Coping",
    "question": "How can a mentor help?",
    "hint": "Pick the answer about support and healthier choices.",
    "choiceA": "They can support you through challenges and healthier choices.",
    "choiceB": "They do your homework for you.",
    "choiceC": "They give you money to solve problems.",
    "correct": "A",
    "feedbackA": "Correct. This choice uses healthy coping and support.",
    "feedbackB": "A stronger choice is the one that uses healthy coping and support.",
    "feedbackC": "A stronger choice is the one that uses healthy coping and support."
  },
  {
    "id": "G78W01",
    "gradeBand": "7-8",
    "playZone": "Wrap",
    "topicTag": "Coping",
    "question": "You notice you are using social media or gaming for most of the day to avoid feeling lonely. Why is that not a healthy long-term coping strategy?",
    "hint": "Look for the answer about avoiding the feeling instead of actually dealing with it.",
    "choiceA": "It wastes time you could use for homework.",
    "choiceB": "It means screens are always bad.",
    "choiceC": "It may distract from loneliness for a little while, but it does not build real connection or healthy coping skills.",
    "correct": "C",
    "feedbackA": "Not quite. Time may matter, but the bigger issue is that this avoids the feeling instead of helping you work through loneliness in a healthy way.",
    "feedbackB": "Not quite. Screens are not always bad. The problem is using them to avoid feelings instead of building healthier coping skills and real connection.",
    "feedbackC": "Correct. This kind of coping may distract you for a short time, but it does not solve loneliness or build the skills and connection that really help."
  },
  {
    "id": "G912F02",
    "gradeBand": "9-12",
    "playZone": "Family",
    "topicTag": "Coping",
    "question": "After a tense conflict at home, which next step is strongest if you feel the urge to numb out?",
    "hint": "Pick the answer that reduces risk and connects to healthy coping or real support.",
    "choiceA": "Use a coping skill and reach out to a trusted adult, mentor, or counselor.",
    "choiceB": "Take whatever is nearby to shut the feeling off fast.",
    "choiceC": "Isolate and avoid everyone for days.",
    "correct": "A",
    "feedbackA": "Correct. Regulating first and reaching out is safer than numbing out.",
    "feedbackB": "Quick escape can create new problems instead of solving the old one.",
    "feedbackC": "Isolation can deepen stress and cut you off from support."
  },
  {
    "id": "G912P01",
    "gradeBand": "9-12",
    "playZone": "Peer",
    "topicTag": "Coping",
    "question": "You have strong anxiety, and a friend offers you one of their anti-anxiety pills. Why is that dangerous?",
    "hint": "Pick the answer about medical risk and misuse, not just rules.",
    "choiceA": "The main issue is only that it might be expired.",
    "choiceB": "Someone else's sedative can slow breathing and can lead to misuse or withdrawal.",
    "choiceC": "It always makes you stop caring about everything.",
    "correct": "B",
    "feedbackA": "A stronger choice is the one that uses healthy coping and support.",
    "feedbackB": "Correct. This choice uses healthy coping and support.",
    "feedbackC": "A stronger choice is the one that uses healthy coping and support."
  },
  {
    "id": "G912W04",
    "gradeBand": "9-12",
    "playZone": "Wrap",
    "topicTag": "Coping",
    "question": "Which example shows strong stress management?",
    "hint": "Look for noticing triggers early and using healthy routines before stress spikes.",
    "choiceA": "Hiding negative feelings so you look calm.",
    "choiceB": "Waiting for a crisis to see how strong you are.",
    "choiceC": "Noticing triggers early and using coping, sleep, and exercise before stress spikes.",
    "correct": "C",
    "feedbackA": "A stronger choice is the one that uses healthy coping and support.",
    "feedbackB": "A stronger choice is the one that uses healthy coping and support.",
    "feedbackC": "Correct. This choice uses healthy coping and support."
  },
  {
    "id": "G912W05",
    "gradeBand": "9-12",
    "playZone": "Wrap",
    "topicTag": "Coping",
    "question": "If you are deeply depressed and want to \"numb out,\" why is using substances risky?",
    "hint": "Pick the answer about worsening depression, lower judgment, and higher risk.",
    "choiceA": "It only makes you sleepy and miss out on fun.",
    "choiceB": "It can worsen depression, lower judgment, and raise the risk of dependence or self-harm.",
    "choiceC": "It is better to just wait without asking for help.",
    "correct": "B",
    "feedbackA": "A stronger choice is the one that uses healthy coping and support.",
    "feedbackB": "Correct. This choice uses healthy coping and support.",
    "feedbackC": "A stronger choice is the one that uses healthy coping and support."
  },
  {
    "id": "G912W06",
    "gradeBand": "9-12",
    "playZone": "Wrap",
    "topicTag": "Coping",
    "question": "Which example shows strong recovery support in a stressful time?",
    "hint": "Pick the answer that reduces risk and connects to healthy coping or real support.",
    "choiceA": "Having coping skills, supportive people, and safe places you can use.",
    "choiceB": "Only relying on yourself so no one can let you down.",
    "choiceC": "Avoiding all stressful situations forever.",
    "correct": "A",
    "feedbackA": "Correct. This choice uses healthy coping and support.",
    "feedbackB": "A stronger choice is the one that uses healthy coping and support.",
    "feedbackC": "A stronger choice is the one that uses healthy coping and support."
  },
  {
    "id": "G1-2S02",
    "gradeBand": "1-2",
    "playZone": "School",
    "topicTag": "Brain & Body",
    "question": "What can alcohol do to breathing?",
    "hint": "Look for the answer that shows alcohol can make breathing less safe.",
    "choiceA": "It can make breathing less safe.",
    "choiceB": "It can help you breathe better.",
    "choiceC": "It only changes how breath smells.",
    "correct": "A",
    "feedbackA": "Correct. Alcohol can slow breathing down, which can make the body less safe.",
    "feedbackB": "Not quite. Alcohol does not help the body breathe better. It can actually make breathing slower.",
    "feedbackC": "Not quite. Smell is not the main danger here. The bigger problem is that alcohol can make breathing less safe."
  },
  {
    "id": "G1-2S03",
    "gradeBand": "1-2",
    "playZone": "School",
    "topicTag": "Brain & Body",
    "question": "When alcohol is in the body, what can happen to thinking and moving?",
    "hint": "Look for the answer that shows the brain and body may work more slowly.",
    "choiceA": "They speed up.",
    "choiceB": "Alcohol does not affect the brain, just the body.",
    "choiceC": "They can slow down, so the brain and body do not work together as well.",
    "correct": "C",
    "feedbackA": "Not quite. Alcohol does not make the brain and body work faster. It can slow them down.",
    "feedbackB": "Not quite. Alcohol affects the brain too, not just the body. That is why thinking, moving, and reactions can slow down.",
    "feedbackC": "Correct. Alcohol can slow the brain and body down, so they do not work together as well."
  },
  {
    "id": "G1-2S04",
    "gradeBand": "1-2",
    "playZone": "School",
    "topicTag": "Brain & Body",
    "question": "Your brain sends messages to your heart and lungs. What can alcohol do to those messages?",
    "hint": "Look for the answer that shows alcohol can slow important body messages down.",
    "choiceA": "Make them bounce around.",
    "choiceB": "Slow them down.",
    "choiceC": "Make them go faster and faster.",
    "correct": "B",
    "feedbackA": "Not quite. “Bounce around” is not what really happens. Alcohol can slow the messages the brain sends to the body.",
    "feedbackB": "Correct. Alcohol can slow brain messages down, which can make breathing and other body functions less safe.",
    "feedbackC": "Not quite. Alcohol does not make those messages faster. It can make them slower."
  },
  {
    "id": "G34S03",
    "gradeBand": "3-4",
    "playZone": "School",
    "topicTag": "Brain & Body",
    "question": "Alcohol is a depressant. What does that mean?",
    "hint": "Look for the answer that explains what alcohol does to how the brain and body work.",
    "choiceA": "It always makes people cry.",
    "choiceB": "It slows how the brain and body work.",
    "choiceC": "It makes muscles shrink right away.",
    "correct": "B",
    "feedbackA": "Not quite. “Depressant” does not mean it makes someone sad or cry. It means it slows how the brain and body work.",
    "feedbackB": "Correct. Alcohol is called a depressant because it slows how the brain and body work.",
    "feedbackC": "Not quite. A depressant does not shrink muscles. It means the brain and body work more slowly."
  },
  {
    "id": "G34S04",
    "gradeBand": "3-4",
    "playZone": "School",
    "topicTag": "Brain & Body",
    "question": "What can alcohol do to messages in your brain?",
    "hint": "Look for the answer that says messages slow down.",
    "choiceA": "Slow them down.",
    "choiceB": "Make them super fast.",
    "choiceC": "Help every message work better.",
    "correct": "A",
    "feedbackA": "Correct. This choice uses real health facts and trustworthy information.",
    "feedbackB": "A stronger choice is the one that uses real health facts and trustworthy information.",
    "feedbackC": "A stronger choice is the one that uses real health facts and trustworthy information."
  },
  {
    "id": "G34S05",
    "gradeBand": "3-4",
    "playZone": "School",
    "topicTag": "Brain & Body",
    "question": "How can alcohol affect brain messages?",
    "hint": "Choose the answer about brain parts not working together as well.",
    "choiceA": "It makes every message louder.",
    "choiceB": "It flips day and night.",
    "choiceC": "It can block messages so brain parts do not work together well.",
    "correct": "C",
    "feedbackA": "A stronger choice is the one that uses real health facts and trustworthy information.",
    "feedbackB": "A stronger choice is the one that uses real health facts and trustworthy information.",
    "feedbackC": "Correct. This choice uses real health facts and trustworthy information."
  },
  {
    "id": "G34S06",
    "gradeBand": "3-4",
    "playZone": "School",
    "topicTag": "Brain & Body",
    "question": "Why is it dangerous when alcohol affects the part of the brain that controls breathing and heartbeat?",
    "hint": "Pick the answer about body functions that keep you alive.",
    "choiceA": "You only lose balance for a minute.",
    "choiceB": "Because breathing and heartbeat keep you alive.",
    "choiceC": "Because it makes homework harder.",
    "correct": "B",
    "feedbackA": "A stronger choice is the one that uses real health facts and trustworthy information.",
    "feedbackB": "Correct. This choice uses real health facts and trustworthy information.",
    "feedbackC": "A stronger choice is the one that uses real health facts and trustworthy information."
  },
  {
    "id": "G58S01",
    "gradeBand": "5-8",
    "playZone": "School",
    "topicTag": "Brain & Body",
    "question": "What can alcohol do to the part of your brain that helps you make good decisions?",
    "hint": "Look for the answer about weaker judgment and riskier choices.",
    "choiceA": "It can weaken judgment and lead to riskier choices.",
    "choiceB": "It always makes decisions better.",
    "choiceC": "It only changes old memories.",
    "correct": "A",
    "feedbackA": "Correct. This choice brings in support and lowers risk.",
    "feedbackB": "A stronger choice is the one that brings in support and lowers risk.",
    "feedbackC": "A stronger choice is the one that brings in support and lowers risk."
  },
  {
    "id": "G58W01",
    "gradeBand": "5-8",
    "playZone": "Wrap",
    "topicTag": "Brain & Body",
    "question": "How can alcohol affect your brain?",
    "hint": "Look for the answer about slower thinking, balance, or reaction time.",
    "choiceA": "It can slow judgment, balance, and reaction time.",
    "choiceB": "It makes you forget your name.",
    "choiceC": "It only changes your sense of smell.",
    "correct": "A",
    "feedbackA": "Correct. This choice uses real health facts and trustworthy information.",
    "feedbackB": "A stronger choice is the one that uses real health facts and trustworthy information.",
    "feedbackC": "A stronger choice is the one that uses real health facts and trustworthy information."
  },
  {
    "id": "G78S02",
    "gradeBand": "7-8",
    "playZone": "School",
    "topicTag": "Brain & Body",
    "question": "Why is substance use risky for a teenager's brain?",
    "hint": "Pick the answer about teen brains still developing.",
    "choiceA": "Teen brains are already fully developed.",
    "choiceB": "Teen brains are still developing, so substances can affect learning, memory, and judgment.",
    "choiceC": "Teen brains are only affected if use becomes daily.",
    "correct": "B",
    "feedbackA": "A stronger choice is the one that uses real health facts and trustworthy information.",
    "feedbackB": "Correct. This choice uses real health facts and trustworthy information.",
    "feedbackC": "A stronger choice is the one that uses real health facts and trustworthy information."
  },
  {
    "id": "G78S03",
    "gradeBand": "7-8",
    "playZone": "School",
    "topicTag": "Brain & Body",
    "question": "Why can marijuana interfere with brain communication?",
    "hint": "Look for the answer about disrupted brain signals.",
    "choiceA": "It makes every thought disappear.",
    "choiceB": "It turns off the brain completely.",
    "choiceC": "It can disrupt brain signals, which can hurt thinking, memory, and reaction time.",
    "correct": "C",
    "feedbackA": "A stronger choice is the one that uses real health facts and trustworthy information.",
    "feedbackB": "A stronger choice is the one that uses real health facts and trustworthy information.",
    "feedbackC": "Correct. This choice uses real health facts and trustworthy information."
  },
  {
    "id": "G912S05",
    "gradeBand": "9-12",
    "playZone": "School",
    "topicTag": "Brain & Body",
    "question": "How does chronic substance use change the brain?",
    "hint": "Pick the answer about the brain needing the substance more to feel normal.",
    "choiceA": "The brain makes less of its own reward chemicals, so everyday life can feel less satisfying.",
    "choiceB": "The brain becomes more excited by ordinary pleasures.",
    "choiceC": "The brain loses stored memories permanently.",
    "correct": "A",
    "feedbackA": "Correct. This choice uses real health facts and trustworthy information.",
    "feedbackB": "A stronger choice is the one that uses real health facts and trustworthy information.",
    "feedbackC": "A stronger choice is the one that uses real health facts and trustworthy information."
  },
  {
    "id": "G912S06",
    "gradeBand": "9-12",
    "playZone": "School",
    "topicTag": "Substance Risks",
    "question": "What is the danger of mixing two or more drugs?",
    "hint": "Look for the answer about multiplied toxicity and overdose risk.",
    "choiceA": "It only makes the high last longer.",
    "choiceB": "It can multiply toxicity and raise the risk of overdose or breathing failure.",
    "choiceC": "It is only dangerous if one drug is illegal.",
    "correct": "B",
    "feedbackA": "A stronger choice is the one that uses real health facts and trustworthy information.",
    "feedbackB": "Correct. This choice uses real health facts and trustworthy information.",
    "feedbackC": "A stronger choice is the one that uses real health facts and trustworthy information."
  },
  {
    "id": "G912S07",
    "gradeBand": "9-12",
    "playZone": "School",
    "topicTag": "Brain & Body",
    "question": "How can repeated drug use change the brain's reward system?",
    "hint": "Look for the answer grounded in evidence, not myths or social pressure.",
    "choiceA": "The brain makes more dopamine to keep up with the drug.",
    "choiceB": "The brain becomes less responsive, so everyday things can feel less rewarding without the substance.",
    "choiceC": "Dopamine turns into another chemical that makes you sad.",
    "correct": "B",
    "feedbackA": "No. The brain usually becomes less responsive, not more.",
    "feedbackB": "Correct. Repeated use can make normal rewards feel weaker without the substance.",
    "feedbackC": "No. That is not how dopamine works."
  },
  {
    "id": "G912S08",
    "gradeBand": "9-12",
    "playZone": "School",
    "topicTag": "Substance Risks",
    "question": "Why is mixing alcohol and sedatives so dangerous?",
    "hint": "Pick the answer about both substances slowing breathing.",
    "choiceA": "It makes you overly energetic.",
    "choiceB": "Both slow the brain and body, which can shut down breathing.",
    "choiceC": "They cancel each other out.",
    "correct": "B",
    "feedbackA": "A stronger choice is the one that uses real health facts and trustworthy information.",
    "feedbackB": "Correct. This choice uses real health facts and trustworthy information.",
    "feedbackC": "A stronger choice is the one that uses real health facts and trustworthy information."
  },
  {
    "id": "G1-2F01",
    "gradeBand": "1-2",
    "playZone": "Family",
    "topicTag": "Help & Support",
    "question": "Who should you talk to if you have a question about medicine?",
    "hint": "Pick the helper who knows how to keep your body safe.",
    "choiceA": "Ask a friend about it.",
    "choiceB": "Ask a doctor, nurse, or grown-up.",
    "choiceC": "Ask someone online.",
    "correct": "B",
    "feedbackA": "A stronger choice is the one that brings in support and lowers risk.",
    "feedbackB": "Correct. This choice brings in support and lowers risk.",
    "feedbackC": "A stronger choice is the one that brings in support and lowers risk."
  },
  {
    "id": "G1-2P02",
    "gradeBand": "1-2",
    "playZone": "Peer",
    "topicTag": "Help & Support",
    "question": "You are worried about a friend's health. Who can help?",
    "hint": "Pick a real helper at school.",
    "choiceA": "Someone you meet at the park.",
    "choiceB": "A teacher or school counselor.",
    "choiceC": "A TV character.",
    "correct": "B",
    "feedbackA": "A stronger choice is the one that brings in support and lowers risk.",
    "feedbackB": "Correct. This choice brings in support and lowers risk.",
    "feedbackC": "A stronger choice is the one that brings in support and lowers risk."
  },
  {
    "id": "G56F01",
    "gradeBand": "5-6",
    "playZone": "Family",
    "topicTag": "Help & Support",
    "question": "A child tells a caregiver, “I’m overwhelmed.” Which caregiver response is most helpful?",
    "hint": "Choose the option that lowers risk and brings in support if needed.",
    "choiceA": "“You’re fine. Don’t talk about it.”",
    "choiceB": "“Let’s listen, breathe, and make a plan together.”",
    "choiceC": "“Just keep it to yourself.”",
    "correct": "B",
    "feedbackA": "Shutting down the conversation makes it harder to help.",
    "feedbackB": "Correct. Listening and making a plan builds safety and trust.",
    "feedbackC": "Keeping big feelings bottled up can make stress feel heavier."
  },
  {
    "id": "G56F03",
    "gradeBand": "5-6",
    "playZone": "Family",
    "topicTag": "Help & Support",
    "question": "You are really stressed after a hard day. What is the healthiest next move?",
    "hint": "Pick the choice that slows the moment down and uses healthy coping or support.",
    "choiceA": "Talk to a trusted adult and use a coping skill",
    "choiceB": "Keep it secret and hope it disappears",
    "choiceC": "Use alcohol or marijuana to try to escape the feeling.",
    "correct": "A",
    "feedbackA": "You chose the safest next step. Healthy coping and trusted support can lower risk.",
    "feedbackB": "A stronger next step is to use healthy coping and reach out to a trusted adult.",
    "feedbackC": "A stronger next step is to use healthy coping and reach out to a trusted adult."
  },
  {
    "id": "G56P02",
    "gradeBand": "5-6",
    "playZone": "Peer",
    "topicTag": "Help & Support",
    "question": "You notice a friend seems down and stops doing activities they like. What is the best move?",
    "hint": "Pick the answer that shows care and brings in trusted help.",
    "choiceA": "Give them space and say nothing.",
    "choiceB": "Tell them you care and ask a trusted adult to help.",
    "choiceC": "Tell other kids about it.",
    "correct": "B",
    "feedbackA": "A stronger choice is the one that brings in support and lowers risk.",
    "feedbackB": "Correct. This choice brings in support and lowers risk.",
    "feedbackC": "A stronger choice is the one that brings in support and lowers risk."
  },
  {
    "id": "G56P06",
    "gradeBand": "5-6",
    "playZone": "Peer",
    "topicTag": "Help & Support",
    "question": "A friend is upset and wants to do something risky to feel better. What is the best way to help?",
    "hint": "Choose the option that lowers risk and brings in support if needed.",
    "choiceA": "Dare them to do it quickly and get it over with.",
    "choiceB": "Stay with them and go to a trusted adult together.",
    "choiceC": "Leave and post about it later.",
    "correct": "B",
    "feedbackA": "Daring a friend increases risk instead of helping.",
    "feedbackB": "Yes. Staying close and getting help is a strong friend move.",
    "feedbackC": "Leaving and posting does not solve the problem or keep your friend safe."
  },
  {
    "id": "G912F01",
    "gradeBand": "9-12",
    "playZone": "Family",
    "topicTag": "Help & Support",
    "question": "What is one protective effect of a strong relationship with a caring adult?",
    "hint": "Choose the option that reduces harm and improves safety.",
    "choiceA": "Better self-regulation and stronger future plans.",
    "choiceB": "Guaranteed freedom from stress.",
    "choiceC": "Less need to think through decisions.",
    "correct": "A",
    "feedbackA": "Correct. Caring adult relationships can strengthen self-control and planning.",
    "feedbackB": "Support helps, but it does not erase every stressor.",
    "feedbackC": "Strong support should improve decision-making, not replace it."
  },
  {
    "id": "G912F03",
    "gradeBand": "9-12",
    "playZone": "Family",
    "topicTag": "Help & Support",
    "question": "A teen tells a caregiver, “I’ve been using to cope.” Which response is most helpful?",
    "hint": "Choose the option that reduces harm and improves safety.",
    "choiceA": "Shame them so they stop immediately.",
    "choiceB": "Ignore it unless school calls home.",
    "choiceC": "Stay calm, listen, and connect them to support.",
    "correct": "C",
    "feedbackA": "Shame can push a teen away from honesty and help.",
    "feedbackB": "Ignoring the problem can allow it to grow.",
    "feedbackC": "Correct. Calm listening and connection to help are stronger responses."
  },
  {
    "id": "G912S03",
    "gradeBand": "9-12",
    "playZone": "School",
    "topicTag": "Help & Support",
    "question": "If you are worried your substance use is becoming a pattern, which school-based option is the best starting point?",
    "hint": "Choose the option that reduces harm and improves safety.",
    "choiceA": "Keep it private until it becomes an emergency.",
    "choiceB": "Talk with a counselor, nurse, school social worker, or other trusted school professional.",
    "choiceC": "Ask classmates what they think you should do.",
    "correct": "B",
    "feedbackA": "Waiting can make it harder to get support early.",
    "feedbackB": "Correct. Trusted school professionals can help assess and connect you to support.",
    "feedbackC": "Peers can care, but trained adults are a stronger first support for this issue."
  },
  {
    "id": "G912S12",
    "gradeBand": "9-12",
    "playZone": "School",
    "topicTag": "Help & Support",
    "question": "What is a major benefit of screening tools like SBIRT (Screening, Brief Intervention, and Referral to Treatment)?",
    "hint": "Choose the option that reduces harm and improves safety.",
    "choiceA": "They punish students for every risky choice.",
    "choiceB": "They help sort out whether someone has never used, is experimenting, or needs more support.",
    "choiceC": "They replace treatment completely.",
    "correct": "B",
    "feedbackA": "Screening is meant to guide support, not simply punish.",
    "feedbackB": "Correct. Screening can point a person toward the right level of help.",
    "feedbackC": "Screening is useful, but it does not replace treatment when treatment is needed."
  },
  {
    "id": "G912W09",
    "gradeBand": "9-12",
    "playZone": "Wrap",
    "topicTag": "Help & Support",
    "question": "What is the biggest reason to reach out for help early?",
    "hint": "Choose the option that reduces harm and improves safety.",
    "choiceA": "Early support can keep a problem from getting worse and connect you to treatment sooner.",
    "choiceB": "Waiting usually makes support easier to get.",
    "choiceC": "Help only matters after legal trouble starts.",
    "correct": "A",
    "feedbackA": "Correct. Early help can change the path before things escalate.",
    "feedbackB": "Waiting often makes a problem harder, not easier, to address.",
    "feedbackC": "Support matters long before a situation reaches that point."
  },
  {
    "id": "G912W12",
    "gradeBand": "9-12",
    "playZone": "Wrap",
    "topicTag": "Help & Support",
    "question": "Which statement about talking with a doctor or primary care provider is most accurate?",
    "hint": "Choose the option that reduces harm and improves safety.",
    "choiceA": "Primary care can be a dependable place to discuss substance use and get screened or referred to support.",
    "choiceB": "Doctors only help after addiction is severe.",
    "choiceC": "There is no point bringing up stress or substance use at a routine visit.",
    "correct": "A",
    "feedbackA": "Correct. Routine care can be an important place to ask for support.",
    "feedbackB": "Healthcare providers can help much earlier than that.",
    "feedbackC": "Routine visits can be a smart place to bring up these concerns."
  },
  {
    "id": "G34P02",
    "gradeBand": "3-4",
    "playZone": "Peer",
    "topicTag": "Info & Myths",
    "question": "Someone says a pill is harmless. How can you check if that is true?",
    "hint": "Look for a trusted source, not a guess.",
    "choiceA": "Believe them because they are older.",
    "choiceB": "Check a trusted source like a doctor, nurse, or health site.",
    "choiceC": "Ask a bunch of friends.",
    "correct": "B",
    "feedbackA": "No. Being older does not make a claim true.",
    "feedbackB": "Correct. Trusted health sources help you check facts.",
    "feedbackC": "No. Friends can have opinions, but that is not the same as evidence."
  },
  {
    "id": "G34W01",
    "gradeBand": "3-4",
    "playZone": "Wrap",
    "topicTag": "Info & Myths",
    "question": "You see drug information online. How can you tell if it is trustworthy?",
    "hint": "Choose the answer about school, hospital, or government health sites.",
    "choiceA": "It comes from a school, hospital, or government health site.",
    "choiceB": "It is funny, so it must be false.",
    "choiceC": "It has lots of likes.",
    "correct": "A",
    "feedbackA": "Correct. This choice brings in support and lowers risk.",
    "feedbackB": "A stronger choice is the one that brings in support and lowers risk.",
    "feedbackC": "A stronger choice is the one that brings in support and lowers risk."
  },
  {
    "id": "G56S02",
    "gradeBand": "5-6",
    "playZone": "School",
    "topicTag": "Info & Myths",
    "question": "Which source is strongest for a school health project?",
    "hint": "Look for the answer based on facts, not pressure or rumors.",
    "choiceA": "A random post with no sources.",
    "choiceB": "A current .gov, .org, or .edu source with facts and citations.",
    "choiceC": "A comment section where people argue.",
    "correct": "B",
    "feedbackA": "A random post may sound sure, but it does not prove the facts.",
    "feedbackB": "Correct. Recent sources with citations are stronger for health information.",
    "feedbackC": "Arguments in comment sections are not the same as evidence."
  },
  {
    "id": "G78P02",
    "gradeBand": "7-8",
    "playZone": "Peer",
    "topicTag": "Info & Myths",
    "question": "Which statement is most accurate about media and peer pressure?",
    "hint": "Use evidence and risk awareness, not hype or popularity.",
    "choiceA": "If something looks normal online or in media, it must be safe",
    "choiceB": "Peer pressure and media messages can shape risky choices",
    "choiceC": "Media does not affect how young people think about substances",
    "correct": "B",
    "feedbackA": "Media and peer pressure can influence risky choices, even when the message is wrong.",
    "feedbackB": "You chose the strongest answer. Media and peer messages can shape what feels normal or safe.",
    "feedbackC": "Media and peer pressure can influence risky choices, even when the message is wrong."
  },
  {
    "id": "G78P03",
    "gradeBand": "7-8",
    "playZone": "Peer",
    "topicTag": "Info & Myths",
    "question": "Why does it help to know the real facts about how many teens use substances?",
    "hint": "Use evidence and risk awareness, not hype or popularity.",
    "choiceA": "Because people often think use is more common than it really is",
    "choiceB": "Because everyone ends up using substances",
    "choiceC": "Because guessing is better than facts",
    "correct": "A",
    "feedbackA": "You used the right idea. Real data can reduce pressure and challenge false beliefs about what is \"normal.\"",
    "feedbackB": "Many young people overestimate how common use is. Real facts help correct that.",
    "feedbackC": "Many young people overestimate how common use is. Real facts help correct that."
  },
  {
    "id": "G78S05",
    "gradeBand": "7-8",
    "playZone": "School",
    "topicTag": "Info & Myths",
    "question": "Someone says inhalants are no big deal because they are just household products. What is actually true?",
    "hint": "Use evidence and risk awareness, not hype or popularity.",
    "choiceA": "They are safe because they are household products",
    "choiceB": "They can damage the brain and other organs",
    "choiceC": "They only affect the nose",
    "correct": "B",
    "feedbackA": "Being a household product does not make something safe to misuse.",
    "feedbackB": "You used the right fact. Household products can still be very dangerous when misused.",
    "feedbackC": "Being a household product does not make something safe to misuse."
  },
  {
    "id": "G78T08",
    "gradeBand": "7-8",
    "playZone": "Threat",
    "topicTag": "Info & Myths",
    "question": "A teammate says alcohol is not a big deal after the game is over. What is the strongest response?",
    "hint": "Sports do not cancel out alcohol's effects on the brain and body.",
    "choiceA": "“Sports make alcohol safer for teens.”",
    "choiceB": "“Alcohol can still hurt judgment, reaction time, and recovery, even if practice is done.”",
    "choiceC": "“It only matters during the season.”",
    "correct": "B",
    "feedbackA": "Being on a team does not make alcohol safe for teens.",
    "feedbackB": "Correct. Sports do not cancel out alcohol’s effects on a teen body and brain.",
    "feedbackC": "Safety still matters even when the season or event is over."
  },
  {
    "id": "G78W04",
    "gradeBand": "7-8",
    "playZone": "Wrap",
    "topicTag": "Info & Myths",
    "question": "When a health claim sounds serious, what final check is smartest?",
    "hint": "Check for current evidence, real experts, and a trustworthy source.",
    "choiceA": "See whether the info is recent, cites experts, and comes from a trustworthy source.",
    "choiceB": "Trust it if it has lots of likes.",
    "choiceC": "Believe it if it sounds confident.",
    "correct": "A",
    "feedbackA": "Correct. Recent evidence and cited experts are stronger than popularity.",
    "feedbackB": "Likes measure attention, not truth.",
    "feedbackC": "Confidence is not the same as evidence."
  },
  {
    "id": "G912P04",
    "gradeBand": "9-12",
    "playZone": "Peer",
    "topicTag": "Info & Myths",
    "question": "Which statement about heavy marijuana use is most accurate?",
    "hint": "Look for the answer grounded in evidence, not myths or social pressure.",
    "choiceA": "It has no link to psychosis risk",
    "choiceB": "It can raise psychosis risk, especially in vulnerable teens",
    "choiceC": "It usually improves concentration and clear thinking",
    "correct": "B",
    "feedbackA": "Marijuana can affect thinking and may raise psychosis risk, especially for vulnerable youth.",
    "feedbackB": "You chose the strongest statement. Heavy marijuana use can raise psychosis risk in some teens.",
    "feedbackC": "Marijuana can affect thinking and may raise psychosis risk, especially for vulnerable youth."
  },
  {
    "id": "G912S04",
    "gradeBand": "9-12",
    "playZone": "School",
    "topicTag": "Info & Myths",
    "question": "What is the strongest source for a current health claim about vaping or hemp products?",
    "hint": "Look for the answer grounded in evidence, not myths or social pressure.",
    "choiceA": "A current evidence-based source that cites experts and data.",
    "choiceB": "The first social media thread you see.",
    "choiceC": "An influencer who says “trust me.”",
    "correct": "A",
    "feedbackA": "Correct. Current evidence and cited expertise are stronger than hype.",
    "feedbackB": "Fast information is not always accurate information.",
    "feedbackC": "Confidence is not the same thing as proof."
  },
  {
    "id": "G912W07",
    "gradeBand": "9-12",
    "playZone": "Wrap",
    "topicTag": "Info & Myths",
    "question": "When a health claim on social media sounds convincing, what is the best final test?",
    "hint": "Look for the answer grounded in evidence, not myths or social pressure.",
    "choiceA": "Whether it matches what your friends already think.",
    "choiceB": "Whether it uses current evidence, cited experts, and reliable sources.",
    "choiceC": "Whether it uses dramatic language.",
    "correct": "B",
    "feedbackA": "Friend agreement is not the same thing as evidence.",
    "feedbackB": "Correct. Good health information should be current, sourced, and expert-backed.",
    "feedbackC": "Drama can attract attention without proving anything."
  },
  {
    "id": "G912W11",
    "gradeBand": "9-12",
    "playZone": "Wrap",
    "topicTag": "Treatment & Recovery",
    "question": "If mental health symptoms and substance use are happening together, what kind of plan is strongest?",
    "hint": "Pick the answer that reduces risk and connects to healthy coping or real support.",
    "choiceA": "Treat the substance use only and ignore the mental health piece.",
    "choiceB": "Address both at the same time with appropriate support.",
    "choiceC": "Wait until one problem disappears on its own.",
    "correct": "B",
    "feedbackA": "Ignoring one side can leave an important part of the problem untreated.",
    "feedbackB": "Correct. When both are present, both need attention.",
    "feedbackC": "Waiting can allow both problems to grow."
  },
  {
    "id": "G56W01",
    "gradeBand": "5-6",
    "playZone": "Wrap",
    "topicTag": "Brain & Body",
    "question": "A ball suddenly comes toward you in gym class. What does reaction time mean?",
    "hint": "Choose the option that lowers risk and brings in support if needed.",
    "choiceA": "How quickly you notice it and react",
    "choiceB": "How upset it makes you feel",
    "choiceC": "How hard you throw it back",
    "correct": "A",
    "feedbackA": "You got it. Reaction time is how quickly you notice something and respond.",
    "feedbackB": "Reaction time is about how fast you respond, not how upset you feel or how hard you react.",
    "feedbackC": "Reaction time is about how fast you respond, not how upset you feel or how hard you react."
  },
  {
    "id": "G56W02",
    "gradeBand": "5-6",
    "playZone": "Wrap",
    "topicTag": "Safety & Emergency",
    "question": "Why is alcohol risky for things like sports, biking, or crossing the street?",
    "hint": "Choose the option that lowers risk and brings in support if needed.",
    "choiceA": "It speeds the brain up",
    "choiceB": "It does not change the brain",
    "choiceC": "It slows the brain and body, which can make reactions and judgment worse",
    "correct": "C",
    "feedbackA": "Alcohol affects the brain and can slow reactions, judgment, and movement.",
    "feedbackB": "Alcohol affects the brain and can slow reactions, judgment, and movement.",
    "feedbackC": "You used the right fact. Alcohol slows the brain, which can make movement and safety harder."
  },
  {
    "id": "G78F02",
    "gradeBand": "7-8",
    "playZone": "Family",
    "topicTag": "Brain & Body",
    "question": "Why does it matter if someone starts using alcohol or drugs young?",
    "hint": "Pick the option that sets a boundary and lowers risk.",
    "choiceA": "Starting young can raise the risk of later substance problems",
    "choiceB": "Starting young lowers later risk",
    "choiceC": "Risk stays the same no matter when someone starts",
    "correct": "A",
    "feedbackA": "You used the strongest fact. Early use is linked to greater long-term risk.",
    "feedbackB": "Age matters because the brain is still developing, and early use can raise later risk.",
    "feedbackC": "Age matters because the brain is still developing, and early use can raise later risk."
  },
  {
    "id": "G78S04",
    "gradeBand": "7-8",
    "playZone": "School",
    "topicTag": "Substance Risks",
    "question": "What is one real risk of marijuana use for teens?",
    "hint": "Pick the option that sets a boundary and lowers risk.",
    "choiceA": "Sharper memory and concentration",
    "choiceB": "Problems with attention, memory, and judgment",
    "choiceC": "Faster reactions and better coordination",
    "correct": "B",
    "feedbackA": "Marijuana does not improve focus or coordination. It can make both worse.",
    "feedbackB": "You used the strongest fact. Marijuana can affect attention, memory, and judgment.",
    "feedbackC": "Marijuana does not improve focus or coordination. It can make both worse."
  },
  {
    "id": "G912P02",
    "gradeBand": "9-12",
    "playZone": "Peer",
    "topicTag": "Treatment & Recovery",
    "question": "When does substance use move beyond experimentation?",
    "hint": "Choose the option that reduces harm and improves safety.",
    "choiceA": "As soon as someone tries a substance one time",
    "choiceB": "When repeated use starts causing harm, risk, or interference in daily life",
    "choiceC": "Only when use becomes daily and obvious to other people",
    "correct": "B",
    "feedbackA": "One-time use alone does not define a pattern, and daily use is not required before a situation becomes serious.",
    "feedbackB": "You chose the strongest answer. Use becomes more serious when it starts causing harm or interfering with daily life.",
    "feedbackC": "One-time use alone does not define a pattern, and daily use is not required before a situation becomes serious."
  },
  {
    "id": "G912S09",
    "gradeBand": "9-12",
    "playZone": "School",
    "topicTag": "Treatment & Recovery",
    "question": "Which definition best describes a substance use disorder?",
    "hint": "Choose the option that reduces harm and improves safety.",
    "choiceA": "Any use of alcohol or drugs by a teen, even once",
    "choiceB": "Only heavy daily use of illegal drugs",
    "choiceC": "A pattern of use that leads to significant problems, loss of control, or impairment",
    "correct": "C",
    "feedbackA": "A substance use disorder is not defined by one-time use or only by daily illegal-drug use.",
    "feedbackB": "A substance use disorder is not defined by one-time use or only by daily illegal-drug use.",
    "feedbackC": "You chose the strongest definition. The key issue is a pattern of use that leads to significant problems or loss of control."
  },
  {
    "id": "G912S10",
    "gradeBand": "9-12",
    "playZone": "School",
    "topicTag": "Treatment & Recovery",
    "question": "What does tolerance mean with regular substance use?",
    "hint": "Choose the option that reduces harm and improves safety.",
    "choiceA": "Being able to use the same amount without immediate side effects",
    "choiceB": "Needing more of the substance to feel the same effect",
    "choiceC": "Needing less of the substance over time to feel the same effect",
    "correct": "B",
    "feedbackA": "Tolerance is about needing more to get the same effect, not about having fewer immediate side effects.",
    "feedbackB": "You used the correct definition. Tolerance means the same amount no longer has the same effect.",
    "feedbackC": "Tolerance is about needing more to get the same effect, not about having fewer immediate side effects."
  },
  {
    "id": "G912S11",
    "gradeBand": "9-12",
    "playZone": "School",
    "topicTag": "Treatment & Recovery",
    "question": "What does withdrawal mean after regular substance use stops?",
    "hint": "Choose the option that reduces harm and improves safety.",
    "choiceA": "Physical or emotional symptoms that can happen when regular use stops",
    "choiceB": "The decision to leave treatment or counseling early",
    "choiceC": "Feeling stressed before a test or major event",
    "correct": "A",
    "feedbackA": "You used the correct definition. Withdrawal can involve physical or emotional symptoms when regular use stops.",
    "feedbackB": "Withdrawal is a reaction that can happen when regular use stops. It is not the same thing as stress or leaving treatment.",
    "feedbackC": "Withdrawal is a reaction that can happen when regular use stops. It is not the same thing as stress or leaving treatment."
  },
  {
    "id": "G1-2F02",
    "gradeBand": "1-2",
    "playZone": "Family",
    "topicTag": "Medication Safety",
    "question": "You see a bottle with a danger sign or a label you do not know. What should you do?",
    "hint": "Choose the answer that keeps your hands off it and gets help.",
    "choiceA": "Open it and smell it.",
    "choiceB": "Leave it alone and tell a grown-up.",
    "choiceC": "Move it by yourself.",
    "correct": "B",
    "feedbackA": "A stronger choice is the one that brings in support and lowers risk.",
    "feedbackB": "Correct. This choice brings in support and lowers risk.",
    "feedbackC": "A stronger choice is the one that brings in support and lowers risk."
  },
  {
    "id": "G912P08",
    "gradeBand": "9-12",
    "playZone": "Peer",
    "topicTag": "Medication Safety",
    "question": "A friend offers you a pill and says, “It came from someone I trust.” What makes that still risky?",
    "hint": "Choose the option that reduces harm and improves safety.",
    "choiceA": "Trust changes the chemical content of a pill.",
    "choiceB": "Shared pills are only risky if they taste strange.",
    "choiceC": "Even pills passed through friends can be counterfeit or contain fentanyl.",
    "correct": "C",
    "feedbackA": "Trust does not change what is chemically inside a pill.",
    "feedbackB": "Danger cannot be judged by taste alone.",
    "feedbackC": "Correct. A pill can be dangerous even if it came through someone you know."
  },
  {
    "id": "G912T04",
    "gradeBand": "9-12",
    "playZone": "Threat",
    "topicTag": "Medication Safety",
    "question": "A friend offers leftover opioids after your dental procedure because they “worked great” for them. What is the safest response?",
    "hint": "Choose the option that reduces harm and improves safety.",
    "choiceA": "Take one if the pain is strong.",
    "choiceB": "Only take medicine prescribed to you; ask your provider about safe pain options instead.",
    "choiceC": "It is safe if the bottle has the person’s name on it.",
    "correct": "B",
    "feedbackA": "Someone else’s prescription is not a safe plan for your pain.",
    "feedbackB": "Correct. Your pain plan should come from your own provider.",
    "feedbackC": "A labeled bottle does not make medicine safe for another person."
  },
  {
    "id": "G56T01",
    "gradeBand": "5-6",
    "playZone": "Threat",
    "topicTag": "Mental Health",
    "question": "When people talk about mental health, what do they mean?",
    "hint": "Look for the choice that includes thoughts, feelings, and relationships with other people.",
    "choiceA": "Only physical strength",
    "choiceB": "Your thoughts, feelings, and relationships",
    "choiceC": "Only whether someone looks happy on the outside",
    "correct": "B",
    "feedbackA": "Not quite. Physical strength is about the body. Mental health is about what you think, feel, and how you relate to other people.",
    "feedbackB": "Correct. Mental health includes your thoughts, feelings, and relationships.",
    "feedbackC": "Not quite. Someone can look okay on the outside and still be struggling inside. Mental health is about more than appearance."
  },
  {
    "id": "G56T02",
    "gradeBand": "5-6",
    "playZone": "Threat",
    "topicTag": "Mental Health",
    "question": "A person says one sip from their drink will help you forget a bad day. What is the best response?",
    "hint": "Pick the answer that says no and chooses support over escape.",
    "choiceA": "No. Unsafe things do not fix hard feelings, and I can get help another way.",
    "choiceB": "“One sip is not really a choice.”",
    "choiceC": "“It is okay if I had a tough day.”",
    "correct": "A",
    "feedbackA": "Correct. Hard feelings need real support, not unsafe shortcuts.",
    "feedbackB": "One sip is still a choice and still can be unsafe.",
    "feedbackC": "Having a hard day does not make an unsafe choice healthy."
  },
  {
    "id": "G78F03",
    "gradeBand": "7-8",
    "playZone": "Family",
    "topicTag": "Mental Health",
    "question": "Someone uses alcohol or drugs to get rid of stress fast. Why can that backfire?",
    "hint": "Look for the response that uses coping or support instead of quick escape.",
    "choiceA": "It may numb feelings for a short time but make problems worse later",
    "choiceB": "It permanently solves stress",
    "choiceC": "Only adults deal with stress",
    "correct": "A",
    "feedbackA": "You chose the strongest answer. Short-term relief can lead to bigger problems later.",
    "feedbackB": "Using substances to cope can make stress, anxiety, or sadness worse over time.",
    "feedbackC": "Using substances to cope can make stress, anxiety, or sadness worse over time."
  },
  {
    "id": "G78T07",
    "gradeBand": "7-8",
    "playZone": "Threat",
    "topicTag": "Mental Health",
    "question": "Someone says using a substance to numb stress is better than dealing with it. What is the best response?",
    "hint": "Pick the answer that treats stress with coping and support instead of numbing out.",
    "choiceA": "Numbing out can make stress worse over time; healthy coping and support work better.",
    "choiceB": "Quick relief is always the healthiest choice.",
    "choiceC": "It is only risky if a person is already failing school.",
    "correct": "A",
    "feedbackA": "Correct. Short-term escape can create bigger long-term problems.",
    "feedbackB": "Fast relief is not always healthy or safe.",
    "feedbackC": "Substance risk is not limited to one school outcome."
  },
  {
    "id": "G912F04",
    "gradeBand": "9-12",
    "playZone": "Family",
    "topicTag": "Mental Health",
    "question": "Why can alcohol be especially risky for a teen who is already depressed?",
    "hint": "Pick the answer that reduces risk and connects to healthy coping or real support.",
    "choiceA": "It can deepen depression and increase risky behavior",
    "choiceB": "If it brings quick relief, it is a reasonable way to manage depression",
    "choiceC": "Alcohol does not affect mood once someone is already depressed",
    "correct": "A",
    "feedbackA": "You chose the strongest answer. Alcohol can worsen depression and increase risky or impulsive behavior.",
    "feedbackB": "Short-term relief does not make alcohol a safe coping strategy, especially when someone is already depressed.",
    "feedbackC": "Short-term relief does not make alcohol a safe coping strategy, especially when someone is already depressed."
  },
  {
    "id": "G912F05",
    "gradeBand": "9-12",
    "playZone": "Family",
    "topicTag": "Mental Health",
    "question": "Why might someone with anxiety start misusing substances?",
    "hint": "Pick the answer that reduces risk and connects to healthy coping or real support.",
    "choiceA": "To get short-term relief from anxious feelings or social discomfort",
    "choiceB": "Because one use permanently cures anxious feelings",
    "choiceC": "Because anxiety makes substances less likely to affect the body",
    "correct": "A",
    "feedbackA": "You identified a common reason. Some people misuse substances trying to get quick relief from anxiety.",
    "feedbackB": "Anxiety can push coping in unhealthy directions, but substances do not cure anxiety or stop affecting the body.",
    "feedbackC": "Anxiety can push coping in unhealthy directions, but substances do not cure anxiety or stop affecting the body."
  },
  {
    "id": "G912F06",
    "gradeBand": "9-12",
    "playZone": "Family",
    "topicTag": "Mental Health",
    "question": "Why can some teens with ADHD face higher risk for substance misuse?",
    "hint": "Pick the answer that reduces risk and connects to healthy coping or real support.",
    "choiceA": "Impulsivity and sensation-seeking can increase experimentation",
    "choiceB": "Because ADHD makes a person less affected by substances",
    "choiceC": "Because ADHD automatically protects someone from addiction if they take medication",
    "correct": "A",
    "feedbackA": "You chose the strongest answer. Impulsivity and sensation-seeking can raise experimentation risk.",
    "feedbackB": "ADHD does not make substances safer or automatically protect someone from addiction.",
    "feedbackC": "ADHD does not make substances safer or automatically protect someone from addiction."
  },
  {
    "id": "G912F07",
    "gradeBand": "9-12",
    "playZone": "Family",
    "topicTag": "Mental Health",
    "question": "What does it mean when mental health problems and substance problems are co-occurring?",
    "hint": "Pick the answer that reduces risk and connects to healthy coping or real support.",
    "choiceA": "The person only gets stressed during tests",
    "choiceB": "The person changes school a lot",
    "choiceC": "They are happening in the same person at the same time",
    "correct": "C",
    "feedbackA": "Co-occurring means mental health and substance problems are happening together in the same person.",
    "feedbackB": "Co-occurring means mental health and substance problems are happening together in the same person.",
    "feedbackC": "You used the correct meaning. Co-occurring problems happen in the same person at the same time and can affect each other."
  },
  {
    "id": "G912T10",
    "gradeBand": "9-12",
    "playZone": "Threat",
    "topicTag": "Mental Health",
    "question": "Why is using alcohol or marijuana to self-medicate anxiety or depression risky?",
    "hint": "Choose the option that reduces harm and improves safety.",
    "choiceA": "Substances may worsen symptoms over time and raise the risk of a substance use problem.",
    "choiceB": "Substances treat the root cause better than counseling or medical care.",
    "choiceC": "Mental health symptoms cancel out the effect of substances.",
    "correct": "A",
    "feedbackA": "Correct. What feels like quick relief can turn into a bigger problem later.",
    "feedbackB": "Using substances is not the same as treating the actual cause.",
    "feedbackC": "Mental health symptoms do not make substances harmless."
  },
  {
    "id": "G1-2T01",
    "gradeBand": "1-2",
    "playZone": "Threat",
    "topicTag": "Peer Influence & Refusal",
    "question": "An older kid says a special drink will make you feel grown-up. Why should you say no?",
    "hint": "Pick the answer about keeping a growing body safe.",
    "choiceA": "Because adults do not like that drink.",
    "choiceB": "Because growing brains and bodies need safe drinks.",
    "choiceC": "Because you might get in trouble.",
    "correct": "B",
    "feedbackA": "A stronger choice is the one that sets a boundary and keeps safety first.",
    "feedbackB": "Correct. This choice sets a boundary and keeps safety first.",
    "feedbackC": "A stronger choice is the one that sets a boundary and keeps safety first."
  },
  {
    "id": "G1-2T02",
    "gradeBand": "1-2",
    "playZone": "Threat",
    "topicTag": "Peer Influence & Refusal",
    "question": "A friend wants you to try a \"magic pill.\" What should you do?",
    "hint": "Pick the answer that says no and gets help.",
    "choiceA": "Try a tiny piece.",
    "choiceB": "Say no and tell a grown-up.",
    "choiceC": "Hide it in your pocket.",
    "correct": "B",
    "feedbackA": "No. Never taste an unknown pill.",
    "feedbackB": "Correct. Only take medicine from a trusted adult or doctor.",
    "feedbackC": "Keeping it secret is not the safest choice; tell a trusted adult."
  },
  {
    "id": "G1-2T03",
    "gradeBand": "1-2",
    "playZone": "Threat",
    "topicTag": "Peer Influence & Refusal",
    "question": "A friend offers you candy from a medicine cabinet. Why should you say no?",
    "hint": "Look for the answer about medicine not meant for you.",
    "choiceA": "Because superheroes do not eat candy.",
    "choiceB": "Because medicine that is not yours can hurt a growing body.",
    "choiceC": "Because you might miss outside time.",
    "correct": "B",
    "feedbackA": "A stronger choice is the one that sets a boundary and keeps safety first.",
    "feedbackB": "Correct. This choice sets a boundary and keeps safety first.",
    "feedbackC": "A stronger choice is the one that sets a boundary and keeps safety first."
  },
  {
    "id": "G1-2T04",
    "gradeBand": "1-2",
    "playZone": "Threat",
    "topicTag": "Peer Influence & Refusal",
    "question": "Someone says a little sip of an adult drink is okay. What should you do?",
    "hint": "Pick the healthy drink choice.",
    "choiceA": "Choose water or juice instead.",
    "choiceB": "Let a friend try it first.",
    "choiceC": "Say it tastes bad.",
    "correct": "A",
    "feedbackA": "Correct. This choice sets a boundary and keeps safety first.",
    "feedbackB": "A stronger choice is the one that sets a boundary and keeps safety first.",
    "feedbackC": "A stronger choice is the one that sets a boundary and keeps safety first."
  },
  {
    "id": "G34P01",
    "gradeBand": "3-4",
    "playZone": "Peer",
    "topicTag": "Peer Influence & Refusal",
    "question": "A friend feels a lot of peer pressure. How can you help?",
    "hint": "Pick the answer that listens and brings support.",
    "choiceA": "Tell them to toughen up.",
    "choiceB": "Listen, support them, and help them find a safe adult.",
    "choiceC": "Leave them alone to figure it out.",
    "correct": "B",
    "feedbackA": "A stronger choice is the one that brings in support and lowers risk.",
    "feedbackB": "Correct. This choice brings in support and lowers risk.",
    "feedbackC": "A stronger choice is the one that brings in support and lowers risk."
  },
  {
    "id": "G34P03",
    "gradeBand": "3-4",
    "playZone": "Peer",
    "topicTag": "Peer Influence & Refusal",
    "question": "A group says you are not part of the team unless you try a drink. What are they doing?",
    "hint": "Pick the answer about pressure from other people.",
    "choiceA": "Being good friends.",
    "choiceB": "Using peer pressure.",
    "choiceC": "Testing your strength.",
    "correct": "B",
    "feedbackA": "A stronger choice is the one that sets a boundary and keeps safety first.",
    "feedbackB": "Correct. This choice sets a boundary and keeps safety first.",
    "feedbackC": "A stronger choice is the one that sets a boundary and keeps safety first."
  },
  {
    "id": "G34P04",
    "gradeBand": "3-4",
    "playZone": "Peer",
    "topicTag": "Peer Influence & Refusal",
    "question": "A group calls you a baby for saying no. What are they trying to do?",
    "hint": "Pick the answer about pressure, not jokes.",
    "choiceA": "Help you grow up faster.",
    "choiceB": "Pressure you to ignore what is healthy.",
    "choiceC": "Just joke around.",
    "correct": "B",
    "feedbackA": "A stronger choice is the one that sets a boundary and keeps safety first.",
    "feedbackB": "Correct. This choice sets a boundary and keeps safety first.",
    "feedbackC": "A stronger choice is the one that sets a boundary and keeps safety first."
  },
  {
    "id": "G34T01",
    "gradeBand": "3-4",
    "playZone": "Threat",
    "topicTag": "Peer Influence & Refusal",
    "question": "Someone says vaping is just flavored water vapor. Why is that wrong?",
    "hint": "Look for the answer about nicotine and a growing brain.",
    "choiceA": "It only makes the room cloudy.",
    "choiceB": "It is only for adults.",
    "choiceC": "Many vapes contain nicotine, which can hook a growing brain.",
    "correct": "C",
    "feedbackA": "A stronger choice is the one that sets a boundary and keeps safety first.",
    "feedbackB": "A stronger choice is the one that sets a boundary and keeps safety first.",
    "feedbackC": "Correct. This choice sets a boundary and keeps safety first."
  },
  {
    "id": "G34T02",
    "gradeBand": "3-4",
    "playZone": "Threat",
    "topicTag": "Peer Influence & Refusal",
    "question": "Someone says vaping is safe because it is not smoke. What is the hidden danger?",
    "hint": "Look for the answer about the brain wanting more nicotine.",
    "choiceA": "It can train your brain to want more nicotine.",
    "choiceB": "The cloud is sticky.",
    "choiceC": "It changes tooth color.",
    "correct": "A",
    "feedbackA": "Correct. This choice sets a boundary and keeps safety first.",
    "feedbackB": "A stronger choice is the one that sets a boundary and keeps safety first.",
    "feedbackC": "A stronger choice is the one that sets a boundary and keeps safety first."
  },
  {
    "id": "G56P05",
    "gradeBand": "5-6",
    "playZone": "Peer",
    "topicTag": "Peer Influence & Refusal",
    "question": "Two classmates start teasing someone into trying something unsafe. What is the best move?",
    "hint": "Choose the option that lowers risk and brings in support if needed.",
    "choiceA": "Laugh along so they stop noticing you.",
    "choiceB": "Say nothing because it is not your problem.",
    "choiceC": "Speak up, invite the person away, and get help if needed.",
    "correct": "C",
    "feedbackA": "Laughing along can add to the pressure.",
    "feedbackB": "Silence can leave the person without support.",
    "feedbackC": "Correct. Moving the person away and getting help can lower the risk."
  },
  {
    "id": "G56P07",
    "gradeBand": "5-6",
    "playZone": "Peer",
    "topicTag": "Peer Influence & Refusal",
    "question": "If other kids say, “Everyone is doing it,” why should you pause and think for yourself?",
    "hint": "Choose the option that lowers risk and brings in support if needed.",
    "choiceA": "Because pressure does not make something safe.",
    "choiceB": "Because the loudest person is usually right.",
    "choiceC": "Because risky choices help you fit in faster.",
    "correct": "A",
    "feedbackA": "Correct. A lot of pressure can still point toward an unsafe choice.",
    "feedbackB": "Being loud is not the same as being safe or correct.",
    "feedbackC": "Trying to fit in by doing something risky can harm your safety."
  },
  {
    "id": "G78T01",
    "gradeBand": "7-8",
    "playZone": "Threat",
    "topicTag": "Peer Influence & Refusal",
    "question": "A peer says marijuana is natural, so it is safe. What is the reality?",
    "hint": "Natural does not always mean safe.",
    "choiceA": "Natural things cannot be harmful.",
    "choiceB": "It only affects people who use it every day.",
    "choiceC": "Natural substances can still affect memory, focus, and judgment.",
    "correct": "C",
    "feedbackA": "A stronger choice is the one that sets a boundary and keeps safety first.",
    "feedbackB": "A stronger choice is the one that sets a boundary and keeps safety first.",
    "feedbackC": "Correct. This choice sets a boundary and keeps safety first."
  },
  {
    "id": "G78T02",
    "gradeBand": "7-8",
    "playZone": "Threat",
    "topicTag": "Peer Influence & Refusal",
    "question": "Someone offers you a \"study pill\" that was not prescribed to you. What is the biggest risk?",
    "hint": "Pick the answer about fake pills, strength, or dangerous ingredients.",
    "choiceA": "You might stay awake too long.",
    "choiceB": "No pills ever help anyone study.",
    "choiceC": "A pill that is not yours could be fake, too strong, or mixed with something dangerous.",
    "correct": "C",
    "feedbackA": "Not quite. Staying awake is not the biggest risk here.",
    "feedbackB": "Not quite. Some medicines can help when prescribed, but sharing pills is unsafe.",
    "feedbackC": "Correct. A pill that is not yours can be counterfeit or dangerous."
  },
  {
    "id": "G78T03",
    "gradeBand": "7-8",
    "playZone": "Threat",
    "topicTag": "Peer Influence & Refusal",
    "question": "A peer says marijuana helps with art or music. What is the risk for a developing brain?",
    "hint": "Look for the answer about brain fog and weaker focus.",
    "choiceA": "It can cause brain fog and weaker focus.",
    "choiceB": "It makes reality disappear.",
    "choiceC": "It makes you forget every skill you learned.",
    "correct": "A",
    "feedbackA": "Correct. This choice brings in support and lowers risk.",
    "feedbackB": "A stronger choice is the one that brings in support and lowers risk.",
    "feedbackC": "A stronger choice is the one that brings in support and lowers risk."
  },
  {
    "id": "G78T04",
    "gradeBand": "7-8",
    "playZone": "Threat",
    "topicTag": "Peer Influence & Refusal",
    "question": "Someone offers you an unlabeled pill and says it will help you relax. What is the danger?",
    "hint": "Pick the answer about not knowing what is in it.",
    "choiceA": "You do not know what is in it, and fake pills can contain dangerous drugs.",
    "choiceB": "It might only make you nap too long.",
    "choiceC": "The main problem is that it may be old.",
    "correct": "A",
    "feedbackA": "Correct. This choice brings in support and lowers risk.",
    "feedbackB": "A stronger choice is the one that brings in support and lowers risk.",
    "feedbackC": "A stronger choice is the one that brings in support and lowers risk."
  },
  {
    "id": "G912P05",
    "gradeBand": "9-12",
    "playZone": "Peer",
    "topicTag": "Peer Influence & Refusal",
    "question": "Why do peer norms matter in prevention?",
    "hint": "Choose the option that reduces harm and improves safety.",
    "choiceA": "Teens sometimes overestimate how many peers are using and feel pressure to match it.",
    "choiceB": "Popular behavior is automatically safe behavior.",
    "choiceC": "Most prevention decisions are only about family, not peers.",
    "correct": "A",
    "feedbackA": "Correct. Misreading “what everyone else is doing” can increase pressure.",
    "feedbackB": "Popularity and safety are not the same thing.",
    "feedbackC": "Peers influence decisions too, not just family."
  },
  {
    "id": "G912P09",
    "gradeBand": "9-12",
    "playZone": "Peer",
    "topicTag": "Peer Influence & Refusal",
    "question": "A friend says they have been anxious and are thinking about using something to calm down. What is the strongest peer response?",
    "hint": "Choose the option that reduces harm and improves safety.",
    "choiceA": "Offer them alcohol or marijuana so they can relax fast.",
    "choiceB": "Listen, encourage healthy coping, and help them connect to real support.",
    "choiceC": "Tell them everybody handles stress that way.",
    "correct": "B",
    "feedbackA": "Offering substances can make stress and risk worse.",
    "feedbackB": "Correct. Support, coping, and connection to help are stronger than numbing out.",
    "feedbackC": "Normalizing unhealthy coping can steer a friend away from real help."
  },
  {
    "id": "G912T05",
    "gradeBand": "9-12",
    "playZone": "Threat",
    "topicTag": "Peer Influence & Refusal",
    "question": "Someone says your tolerance is high, so you should drive after drinking. What is wrong with that logic?",
    "hint": "Tolerance does not cancel slowed reaction time or poor judgment.",
    "choiceA": "High tolerance makes crashes more likely.",
    "choiceB": "Tolerance does not stop alcohol from slowing reaction time and judgment.",
    "choiceC": "More alcohol makes you drive more calmly.",
    "correct": "B",
    "feedbackA": "A stronger choice is the one that sets a boundary and keeps safety first.",
    "feedbackB": "Correct. This choice sets a boundary and keeps safety first.",
    "feedbackC": "A stronger choice is the one that sets a boundary and keeps safety first."
  },
  {
    "id": "G912T06",
    "gradeBand": "9-12",
    "playZone": "Threat",
    "topicTag": "Peer Influence & Refusal",
    "question": "Someone says substance use is a rite of passage for high achievers. What is the long-term risk?",
    "hint": "Look for the answer about the brain linking reward to substances.",
    "choiceA": "You can never achieve again.",
    "choiceB": "Most substances have no long-term risk.",
    "choiceC": "Your brain can start linking relief or reward to substances instead of healthy effort.",
    "correct": "C",
    "feedbackA": "A stronger choice is the one that sets a boundary and keeps safety first.",
    "feedbackB": "A stronger choice is the one that sets a boundary and keeps safety first.",
    "feedbackC": "Correct. This choice sets a boundary and keeps safety first."
  },
  {
    "id": "G912T07",
    "gradeBand": "9-12",
    "playZone": "Threat",
    "topicTag": "Peer Influence & Refusal",
    "question": "Someone says micro-dosing is safe for high-schoolers because the amount is small. What is the risk?",
    "hint": "Small amounts can still affect a developing brain.",
    "choiceA": "Even small amounts can still affect a developing brain and decision-making.",
    "choiceB": "Small amounts cannot do harm.",
    "choiceC": "It only affects the brain if taken all at once.",
    "correct": "A",
    "feedbackA": "Correct. This choice sets a boundary and keeps safety first.",
    "feedbackB": "A stronger choice is the one that sets a boundary and keeps safety first.",
    "feedbackC": "A stronger choice is the one that sets a boundary and keeps safety first."
  },
  {
    "id": "G912T08",
    "gradeBand": "9-12",
    "playZone": "Threat",
    "topicTag": "Peer Influence & Refusal",
    "question": "A friend offers you a \"performance pill\" for an all-nighter. What is the danger?",
    "hint": "Pick the answer about safety and building reliance on a drug for performance.",
    "choiceA": "You might only be tired tomorrow.",
    "choiceB": "It is illegal to share prescriptions.",
    "choiceC": "It can be unsafe, and relying on pills for performance can build misuse.",
    "correct": "C",
    "feedbackA": "A stronger choice is the one that sets a boundary and keeps safety first.",
    "feedbackB": "A stronger choice is the one that sets a boundary and keeps safety first.",
    "feedbackC": "Correct. This choice sets a boundary and keeps safety first."
  },
  {
    "id": "G56F04",
    "gradeBand": "5-6",
    "playZone": "Family",
    "topicTag": "Protective Factors",
    "question": "You hear yelling at home and feel scared. What is the healthiest next move?",
    "hint": "Choose the option that lowers risk and brings in support if needed.",
    "choiceA": "Keep it secret so no one worries.",
    "choiceB": "Talk to a trusted adult and go somewhere safe.",
    "choiceC": "Leave the house without telling anyone.",
    "correct": "B",
    "feedbackA": "Keeping danger secret can make it harder to get help.",
    "feedbackB": "Yes. Safety and telling a trusted adult are the strongest steps.",
    "feedbackC": "Leaving without telling anyone can create another unsafe situation."
  },
  {
    "id": "G56F05",
    "gradeBand": "5-6",
    "playZone": "Family",
    "topicTag": "Protective Factors",
    "question": "Why do family rules about medicine help keep kids safe?",
    "hint": "Choose the option that lowers risk and brings in support if needed.",
    "choiceA": "They prevent mix-ups and unsafe use.",
    "choiceB": "They are only important when someone feels very sick.",
    "choiceC": "They stop kids from ever asking questions.",
    "correct": "A",
    "feedbackA": "Correct. Clear rules help prevent mistakes and unsafe choices.",
    "feedbackB": "Medicine safety matters all the time, not only when someone feels very sick.",
    "feedbackC": "Good rules should also leave room for questions and learning."
  },
  {
    "id": "G56F06",
    "gradeBand": "5-6",
    "playZone": "Family",
    "topicTag": "Protective Factors",
    "question": "Why is it helpful when adults know where you are and who you are with?",
    "hint": "Choose the option that lowers risk and brings in support if needed.",
    "choiceA": "It helps them keep you safe and support good choices.",
    "choiceB": "It means kids cannot learn responsibility.",
    "choiceC": "It only matters on weekends.",
    "correct": "A",
    "feedbackA": "Right. Knowing who you are with helps adults protect and support you.",
    "feedbackB": "Kids can still learn responsibility while adults keep safety in mind.",
    "feedbackC": "Safety matters every day, not just on weekends."
  },
  {
    "id": "G56P01",
    "gradeBand": "5-6",
    "playZone": "Peer",
    "topicTag": "Peer Influence & Refusal",
    "question": "You feel pressured to do something risky. Why does clear thinking matter?",
    "hint": "Choose the option that lowers risk and brings in support if needed.",
    "choiceA": "Let other people decide for you.",
    "choiceB": "Risky choices always make you seem older",
    "choiceC": "It helps protect your health and safety",
    "correct": "C",
    "feedbackA": "A stronger answer focuses on safety, health, and making your own healthy choice.",
    "feedbackB": "A stronger answer focuses on safety, health, and making your own healthy choice.",
    "feedbackC": "You chose the strongest answer. Clear thinking helps you make safer choices."
  },
  {
    "id": "G56P08",
    "gradeBand": "5-6",
    "playZone": "Peer",
    "topicTag": "Peer Influence & Refusal",
    "question": "A friend keeps pushing you to do something unsafe. What is the strongest response?",
    "hint": "Choose the option that lowers risk and brings in support if needed.",
    "choiceA": "Laugh and go along so they stop asking.",
    "choiceB": "Say no clearly and suggest a safer choice.",
    "choiceC": "Say maybe and decide once you get there.",
    "correct": "B",
    "feedbackA": "A stronger response is to set a clear boundary and move toward a safer choice.",
    "feedbackB": "You chose the strongest response. A clear no and a safer option can lower risk.",
    "feedbackC": "A stronger response is to set a clear boundary and move toward a safer choice."
  },
  {
    "id": "G56S01",
    "gradeBand": "5-6",
    "playZone": "School",
    "topicTag": "Protective Factors",
    "question": "You feel left out at school and start thinking about following a risky group. What is the best next step?",
    "hint": "Choose the option that lowers risk and brings in support if needed.",
    "choiceA": "Keep it inside and hope it fixes itself.",
    "choiceB": "Talk to a counselor, teacher, or other trusted adult and join a positive group.",
    "choiceC": "Do whatever the risky group wants so they like you.",
    "correct": "B",
    "feedbackA": "Keeping it all inside can make the problem feel heavier.",
    "feedbackB": "Yes. Support and positive connection are stronger than risky belonging.",
    "feedbackC": "Changing yourself for a risky group can put your safety at risk."
  },
  {
    "id": "G78F04",
    "gradeBand": "7-8",
    "playZone": "Family",
    "topicTag": "Protective Factors",
    "question": "Which example shows healthy caregiver monitoring?",
    "hint": "Pick the option that sets a boundary and lowers risk.",
    "choiceA": "Only punishing, with no conversation",
    "choiceB": "Ignoring behavior until there is a crisis",
    "choiceC": "Knowing who a teen is with, setting clear rules, and checking in regularly",
    "correct": "C",
    "feedbackA": "Healthy monitoring includes support, boundaries, and communication, not just punishment or waiting for a crisis.",
    "feedbackB": "Healthy monitoring includes support, boundaries, and communication, not just punishment or waiting for a crisis.",
    "feedbackC": "You identified healthy support. Clear expectations and steady check-ins can help keep young people safer."
  },
  {
    "id": "G78F05",
    "gradeBand": "7-8",
    "playZone": "Family",
    "topicTag": "Protective Factors",
    "question": "Which choice is most likely to protect a teen from risky substance choices?",
    "hint": "Pick the option that sets a boundary and lowers risk.",
    "choiceA": "Strong self-esteem, supportive relationships, and healthy coping skills",
    "choiceB": "Avoiding all adults so no one can check in or help",
    "choiceC": "Taking substances from others without knowing what is in them",
    "correct": "A",
    "feedbackA": "You identified strong protective factors. Healthy support and coping can lower risk.",
    "feedbackB": "Protective factors include support, skills, and healthy connection, not isolation or risky behavior.",
    "feedbackC": "Protective factors include support, skills, and healthy connection, not isolation or risky behavior."
  },
  {
    "id": "G78F06",
    "gradeBand": "7-8",
    "playZone": "Family",
    "topicTag": "Protective Factors",
    "question": "How can a mentor help lower substance-use risk?",
    "hint": "Pick the option that sets a boundary and lowers risk.",
    "choiceA": "A caring adult can build support, confidence, and healthier choices",
    "choiceB": "A mentor can excuse risky choices if they understand you",
    "choiceC": "A mentor should replace family, school, and other supports",
    "correct": "A",
    "feedbackA": "You chose the strongest answer. A caring adult can add support, guidance, and healthier choices.",
    "feedbackB": "A mentor can strengthen support, but does not excuse risky choices or replace every other support.",
    "feedbackC": "A mentor can strengthen support, but does not excuse risky choices or replace every other support."
  },
  {
    "id": "G78P04",
    "gradeBand": "7-8",
    "playZone": "Peer",
    "topicTag": "Protective Factors",
    "question": "You are heading somewhere that might get uncomfortable fast. Why does it help to have an exit plan first?",
    "hint": "Pick the option that sets a boundary and lowers risk.",
    "choiceA": "So you do not have to talk to anyone",
    "choiceB": "So you already know what to say and how to leave if you feel pressured",
    "choiceC": "So you can hide risky behavior",
    "correct": "B",
    "feedbackA": "An exit plan is about safety and preparation, not secrecy or avoiding all conversation.",
    "feedbackB": "You chose the strongest reason. Planning ahead makes it easier to stay safe under pressure.",
    "feedbackC": "An exit plan is about safety and preparation, not secrecy or avoiding all conversation."
  },
  {
    "id": "G78S06",
    "gradeBand": "7-8",
    "playZone": "School",
    "topicTag": "Protective Factors",
    "question": "Which after-school setting is safest and most supportive?",
    "hint": "Pick the option that sets a boundary and lowers risk.",
    "choiceA": "Long stretches with no structure or adult support",
    "choiceB": "Unsupervised time with peers who push risky choices",
    "choiceC": "A structured activity with caring adults and positive peers",
    "correct": "C",
    "feedbackA": "Protective settings usually include caring adults, structure, and positive peers.",
    "feedbackB": "Protective settings usually include caring adults, structure, and positive peers.",
    "feedbackC": "You identified a protective setting. Structure, support, and healthy peers lower risk."
  },
  {
    "id": "G78S09",
    "gradeBand": "7-8",
    "playZone": "School",
    "topicTag": "Protective Factors",
    "question": "Why can feeling connected to school lower substance-use risk?",
    "hint": "Pick the option that sets a boundary and lowers risk.",
    "choiceA": "Because belonging, trusted adults, and positive activities can support safer choices.",
    "choiceB": "Because school stress disappears for everyone who joins an activity.",
    "choiceC": "Because only grades matter.",
    "correct": "A",
    "feedbackA": "Correct. Connection and support can help protect against risky choices.",
    "feedbackB": "Activities help, but they do not make all stress disappear.",
    "feedbackC": "Grades matter, but support and belonging matter too."
  },
  {
    "id": "G912F08",
    "gradeBand": "9-12",
    "playZone": "Family",
    "topicTag": "Protective Factors",
    "question": "Why can caregiver monitoring still matter in high school?",
    "hint": "Choose the option that reduces harm and improves safety.",
    "choiceA": "It shows parents do not trust teens at all.",
    "choiceB": "It supports boundaries, safety, and awareness of risky situations.",
    "choiceC": "It only matters if a teen has already been suspended.",
    "correct": "B",
    "feedbackA": "Monitoring is not only about mistrust; it can also be about care and safety.",
    "feedbackB": "Correct. Knowing plans, friends, and context can lower risk.",
    "feedbackC": "Protective steps matter before a crisis, not only after one."
  },
  {
    "id": "G912F09",
    "gradeBand": "9-12",
    "playZone": "Family",
    "topicTag": "Protective Factors",
    "question": "Which family factor is most protective against teen substance use?",
    "hint": "Look for the answer grounded in evidence, not myths or social pressure.",
    "choiceA": "Clear expectations, regular check-ins, and supportive communication.",
    "choiceB": "Never talking about hard topics.",
    "choiceC": "Only reacting after a crisis happens.",
    "correct": "A",
    "feedbackA": "Correct. Clear expectations and support are strong protective factors.",
    "feedbackB": "Avoiding hard topics can leave teens without guidance.",
    "feedbackC": "Waiting for a crisis usually means missing earlier chances to help."
  },
  {
    "id": "G912S02",
    "gradeBand": "9-12",
    "playZone": "School",
    "topicTag": "Protective Factors",
    "question": "Why can school connectedness reduce risk?",
    "hint": "Choose the option that reduces harm and improves safety.",
    "choiceA": "Feeling known, supported, and involved can make risky behavior less likely.",
    "choiceB": "Connected students never deal with stress.",
    "choiceC": "It only helps students with perfect grades.",
    "correct": "A",
    "feedbackA": "Correct. Support and belonging can be protective factors.",
    "feedbackB": "Connection helps, but it does not remove every stressor.",
    "feedbackC": "School support can matter for many students, not only top students."
  },
  {
    "id": "G912S13",
    "gradeBand": "9-12",
    "playZone": "School",
    "topicTag": "Protective Factors",
    "question": "Why can jobs, clubs, tutoring, or other structured activities be protective?",
    "hint": "Choose the option that reduces harm and improves safety.",
    "choiceA": "They remove every possible risk from life.",
    "choiceB": "They can reduce unsupervised time and increase contact with positive peers and adults.",
    "choiceC": "They only help if the activity is sports.",
    "correct": "B",
    "feedbackA": "No activity removes every risk from life.",
    "feedbackB": "Correct. Structure, connection, and supervision can lower risk.",
    "feedbackC": "Many kinds of structured activities can be protective, not just sports."
  },
  {
    "id": "G912W08",
    "gradeBand": "9-12",
    "playZone": "Wrap",
    "topicTag": "Protective Factors",
    "question": "Why is delaying first use a prevention win?",
    "hint": "Choose the option that reduces harm and improves safety.",
    "choiceA": "Early initiation raises later risk, so delaying can lower the chance of future harm.",
    "choiceB": "Delaying only matters for tobacco, not other substances.",
    "choiceC": "The age of first use has no real effect on outcomes.",
    "correct": "A",
    "feedbackA": "Correct. Delaying use can reduce the risk of later problems.",
    "feedbackB": "Delaying matters across substances, not only tobacco.",
    "feedbackC": "The age when use begins can affect later outcomes."
  },
  {
    "id": "G58P01",
    "gradeBand": "5-8",
    "playZone": "Peer",
    "topicTag": "Peer Influence & Refusal",
    "question": "Friends pressure you to go somewhere unsafe after school. What is the best move?",
    "hint": "Pick the choice that sets a clear boundary and keeps you with safer people.",
    "choiceA": "Go with them so they stop teasing you.",
    "choiceB": "Walk away alone and keep it to yourself.",
    "choiceC": "Say no clearly and stay with safer people.",
    "correct": "C",
    "feedbackA": "Not quite. This safe place would have helped more with making a healthier choice.",
    "feedbackB": "Not quite. This safe place would have helped more with making a healthier choice.",
    "feedbackC": "Correct. That support choice helped you stay safer and make a healthier decision."
  },
  {
    "id": "G58P02",
    "gradeBand": "5-8",
    "playZone": "Peer",
    "topicTag": "Peer Influence & Refusal",
    "question": "A friend wants you to join a risky challenge for attention. Which response is strongest?",
    "hint": "The strongest answer says no and redirects the situation.",
    "choiceA": "Refuse and suggest something safer.",
    "choiceB": "Join so you do not feel left out.",
    "choiceC": "Stay quiet and watch what others do.",
    "correct": "A",
    "feedbackA": "Correct. That support choice helped you stay safer and make a healthier decision.",
    "feedbackB": "Not quite. This safe place would have helped more with making a healthier choice.",
    "feedbackC": "Not quite. This safe place would have helped more with making a healthier choice."
  },
  {
    "id": "G58F01",
    "gradeBand": "5-8",
    "playZone": "Family",
    "topicTag": "Coping",
    "question": "Stress is building and you feel out of control. What helps most right now?",
    "hint": "Pick the answer that slows the moment down and reaches for safe support.",
    "choiceA": "Hide it so nobody worries.",
    "choiceB": "Pause, calm your body, and reach out to someone safe.",
    "choiceC": "Do something risky to change your mood fast.",
    "correct": "B",
    "feedbackA": "Not quite. This safe place would have helped more with making a healthier choice.",
    "feedbackB": "Correct. That support choice helped you stay safer and make a healthier decision.",
    "feedbackC": "Not quite. This safe place would have helped more with making a healthier choice."
  },
  {
    "id": "G58F02",
    "gradeBand": "5-8",
    "playZone": "Family",
    "topicTag": "Coping",
    "question": "After an argument at home, you feel overwhelmed. What is the strongest next step?",
    "hint": "Look for coping plus support, not silence or escape.",
    "choiceA": "Make a risky choice to escape the feeling.",
    "choiceB": "Keep it all inside and hope it fades.",
    "choiceC": "Use a coping skill, then talk to a trusted adult.",
    "correct": "C",
    "feedbackA": "Not quite. This safe place would have helped more with making a healthier choice.",
    "feedbackB": "Not quite. This safe place would have helped more with making a healthier choice.",
    "feedbackC": "Correct. That support choice helped you stay safer and make a healthier decision."
  },
  {
    "id": "G58S02",
    "gradeBand": "5-8",
    "playZone": "School",
    "topicTag": "Substance Risks",
    "question": "A student says vaping is harmless because it is “just flavor.” What is the safest thing to say?",
    "hint": "Use health facts, not smell or popularity.",
    "choiceA": "If it smells better, it must be safer.",
    "choiceB": "If friends do it, it must be okay.",
    "choiceC": "Vaping can still harm a young brain and body.",
    "correct": "C",
    "feedbackA": "Not quite. This safe place would have helped more with making a healthier choice.",
    "feedbackB": "Not quite. This safe place would have helped more with making a healthier choice.",
    "feedbackC": "Correct. That support choice helped you stay safer and make a healthier decision."
  },
  {
    "id": "G58S03",
    "gradeBand": "5-8",
    "playZone": "School",
    "topicTag": "Info & Myths",
    "question": "Someone says, “Trying something once can’t hurt you.” What is the safest answer?",
    "hint": "Look for the fact-based answer, not the peer-pressure answer.",
    "choiceA": "That is true if friends say so.",
    "choiceB": "It only matters if adults find out.",
    "choiceC": "One time can still be harmful, and pressure does not make it safe.",
    "correct": "C",
    "feedbackA": "Not quite. This safe place would have helped more with making a healthier choice.",
    "feedbackB": "Not quite. This safe place would have helped more with making a healthier choice.",
    "feedbackC": "Correct. That support choice helped you stay safer and make a healthier decision."
  },
  {
    "id": "G56P03",
    "gradeBand": "5-6",
    "playZone": "Peer",
    "topicTag": "Safety & Emergency",
    "question": "A friend says, “Don’t tell any adult about this unsafe idea.” What is the strongest response?",
    "hint": "Choose the option that lowers risk and brings in support if needed.",
    "choiceA": "“Okay, I’ll keep every secret.”",
    "choiceB": "“We should only keep safe secrets. I’m telling a trusted adult.”",
    "choiceC": "“Let’s wait and see if anyone gets hurt first.”",
    "correct": "B",
    "feedbackA": "Unsafe secrets are not the kind of secrets you should keep.",
    "feedbackB": "Correct. Dangerous situations should be shared with a trusted adult.",
    "feedbackC": "Waiting can let the danger get worse before help arrives."
  },
  {
    "id": "G56S04",
    "gradeBand": "5-6",
    "playZone": "School",
    "topicTag": "Protective Factors",
    "question": "Which after-school choice gives the most protection?",
    "hint": "Choose the option that lowers risk and brings in support if needed.",
    "choiceA": "Wandering around unsupervised until dark.",
    "choiceB": "Going anywhere older kids invite you.",
    "choiceC": "Joining a club, team, or program with caring adults.",
    "correct": "C",
    "feedbackA": "Unsupervised time can create more chances for risky situations.",
    "feedbackB": "Going anywhere just because older kids say so is not a safe rule.",
    "feedbackC": "Correct. Structured activities connect you with positive adults and peers."
  },
  {
    "id": "G56S05",
    "gradeBand": "5-6",
    "playZone": "School",
    "topicTag": "Medication Safety",
    "question": "A student says, “My sibling’s medicine might help you focus.” What is the safest answer?",
    "hint": "Pick the answer about medicine being only for the person it was prescribed to.",
    "choiceA": "Only take medicine that is yours and given by a doctor or caregiver.",
    "choiceB": "“That is fine if the student means well.”",
    "choiceC": "“It is okay once if you have homework.”",
    "correct": "A",
    "feedbackA": "Correct. Medicine should only be used the safe way and by the right person.",
    "feedbackB": "Good intentions do not make shared medicine safe.",
    "feedbackC": "Homework is not a reason to use someone else’s medicine."
  },
  {
    "id": "G78F07",
    "gradeBand": "7-8",
    "playZone": "Family",
    "topicTag": "Medication Safety",
    "question": "Why is taking a lot of cough medicine to get high dangerous?",
    "hint": "Pick the option that sets a boundary and lowers risk.",
    "choiceA": "Cough medicine only affects colds, not the brain or body",
    "choiceB": "Large doses of DXM can cause hallucinations and serious health problems",
    "choiceC": "Store-bought medicine cannot become dangerous if it is misused",
    "correct": "B",
    "feedbackA": "Over-the-counter medicine is not risk-free. High doses of DXM can cause serious harm.",
    "feedbackB": "You chose the strongest answer. Even store-bought medicine can become dangerous when it is misused.",
    "feedbackC": "Over-the-counter medicine is not risk-free. High doses of DXM can cause serious harm."
  },
  {
    "id": "G78P05",
    "gradeBand": "7-8",
    "playZone": "Peer",
    "topicTag": "Medication Safety",
    "question": "A friend offers you leftover prescription medicine and says it helped them. When is it actually safe to take prescription medicine?",
    "hint": "Pick the option that sets a boundary and lowers risk.",
    "choiceA": "Only when it is prescribed to you for your current medical reason",
    "choiceB": "When a friend says it worked for them",
    "choiceC": "When you used it before for something else",
    "correct": "A",
    "feedbackA": "You used the right safety rule. Prescription medicine should only be used by the person it was prescribed for and as directed.",
    "feedbackB": "A safer answer is that prescription medicine is only safe when it is prescribed to you and used as directed.",
    "feedbackC": "A safer answer is that prescription medicine is only safe when it is prescribed to you and used as directed."
  },
  {
    "id": "G78P06",
    "gradeBand": "7-8",
    "playZone": "Peer",
    "topicTag": "Substance Risks",
    "question": "Someone offers you a pill that looks real, but it did not come from a pharmacy. Why is that dangerous?",
    "hint": "Pick the option that sets a boundary and lowers risk.",
    "choiceA": "Fake pills are usually weaker than real medicine",
    "choiceB": "You cannot know for sure what is inside it",
    "choiceC": "If it looks real, it is usually safe to try once",
    "correct": "B",
    "feedbackA": "The main danger is that you cannot know what is inside a fake pill, even if it looks real.",
    "feedbackB": "You chose the strongest answer. A pill that looks real may still contain unknown or highly dangerous substances.",
    "feedbackC": "The main danger is that you cannot know what is inside a fake pill, even if it looks real."
  },
  {
    "id": "G78P07",
    "gradeBand": "7-8",
    "playZone": "Peer",
    "topicTag": "Substance Risks",
    "question": "Why can marijuana edibles be harder to judge than smoking or vaping?",
    "hint": "Pick the option that sets a boundary and lowers risk.",
    "choiceA": "They work right away, so people usually stop at a small amount",
    "choiceB": "They do not affect judgment",
    "choiceC": "The effects take longer, so someone may take too much or eat them by accident",
    "correct": "C",
    "feedbackA": "Edibles can be harder to judge because the effects take longer to show up.",
    "feedbackB": "Edibles can be harder to judge because the effects take longer to show up.",
    "feedbackC": "You used the right idea. Delayed effects can lead people to take too much or underestimate the risk."
  },
  {
    "id": "G78S07",
    "gradeBand": "7-8",
    "playZone": "School",
    "topicTag": "Substance Risks",
    "question": "Why is fentanyl so dangerous when it shows up in illegal drugs?",
    "hint": "Pick the option that sets a boundary and lowers risk.",
    "choiceA": "You can usually see, smell, or taste it right away",
    "choiceB": "A very small amount can be deadly",
    "choiceC": "Teens are less affected by it than adults",
    "correct": "B",
    "feedbackA": "The danger is how powerful fentanyl is. A tiny amount can still be deadly.",
    "feedbackB": "You used the right fact. Even a very small amount can be deadly.",
    "feedbackC": "The danger is how powerful fentanyl is. A tiny amount can still be deadly."
  },
  {
    "id": "G78S08",
    "gradeBand": "7-8",
    "playZone": "School",
    "topicTag": "Substance Risks",
    "question": "Which could be one possible warning sign that someone is using marijuana?",
    "hint": "Pick the option that sets a boundary and lowers risk.",
    "choiceA": "Bloodshot eyes and frequent use of eye drops",
    "choiceB": "Stronger focus and memory",
    "choiceC": "Extra money with a clear explanation",
    "correct": "A",
    "feedbackA": "You identified one possible warning sign. One sign alone does not prove use, but it can be a clue.",
    "feedbackB": "One clue does not prove use, but bloodshot eyes and frequent eye-drop use can be a possible warning sign.",
    "feedbackC": "One clue does not prove use, but bloodshot eyes and frequent eye-drop use can be a possible warning sign."
  },
  {
    "id": "G78T06",
    "gradeBand": "7-8",
    "playZone": "Threat",
    "topicTag": "Substance Risks",
    "question": "A friend says nicotine pouches are a smart choice because adults may not notice. What is the strongest answer?",
    "hint": "Hidden does not mean harmless.",
    "choiceA": "“Easy to hide means it is safer.”",
    "choiceB": "Nicotine can still hook and harm teens, even if the product is hidden.",
    "choiceC": "“It only matters if there is smoke.”",
    "correct": "B",
    "feedbackA": "Being hidden does not make a nicotine product safe.",
    "feedbackB": "Correct. A hidden product can still affect the brain and body.",
    "feedbackC": "Smoke is not the only thing that can make a product risky."
  },
  {
    "id": "G912P07",
    "gradeBand": "9-12",
    "playZone": "Peer",
    "topicTag": "Substance Risks",
    "question": "Which situation is a clear example of risky substance use?",
    "hint": "Choose the option that reduces harm and improves safety.",
    "choiceA": "Driving after drinking alcohol",
    "choiceB": "Taking prescribed medicine exactly as directed",
    "choiceC": "Sleeping in late after a demanding week",
    "correct": "A",
    "feedbackA": "You identified a clear example of risky use. Drinking and driving creates immediate danger.",
    "feedbackB": "Risky substance use involves real harm or danger, such as driving after drinking.",
    "feedbackC": "Risky substance use involves real harm or danger, such as driving after drinking."
  },
  {
    "id": "G912T09",
    "gradeBand": "9-12",
    "playZone": "Threat",
    "topicTag": "Safety & Emergency",
    "question": "At a party, someone is hard to wake up and breathing slowly after drinking. What is the best response?",
    "hint": "Choose the option that reduces harm and improves safety.",
    "choiceA": "Let them sleep it off and check later.",
    "choiceB": "Call 911/get emergency help right away and stay with them.",
    "choiceC": "Give them coffee and send them home.",
    "correct": "B",
    "feedbackA": "Alcohol poisoning is an emergency, not something to “sleep off.”",
    "feedbackB": "Correct. Slow breathing and trouble waking are emergency warning signs.",
    "feedbackC": "Coffee does not reverse alcohol poisoning."
  },
  {
    "id": "G1-2P01",
    "gradeBand": "1-2",
    "playZone": "Peer",
    "topicTag": "Safety & Emergency",
    "question": "A friend looks sick after eating something unknown. What should you do first?",
    "hint": "Pick the answer that gets help right away.",
    "choiceA": "Wait and see.",
    "choiceB": "Ask what it tasted like.",
    "choiceC": "Tell a teacher or grown-up right away.",
    "correct": "C",
    "feedbackA": "A stronger choice is the one that brings in support and lowers risk.",
    "feedbackB": "A stronger choice is the one that brings in support and lowers risk.",
    "feedbackC": "Correct. This choice brings in support and lowers risk."
  },
  {
    "id": "G78W03",
    "gradeBand": "7-8",
    "playZone": "Wrap",
    "topicTag": "Safety & Emergency",
    "question": "You think a friend may be in trouble after taking something unknown. What is the best first move?",
    "hint": "Pick the option that sets a boundary and lowers risk.",
    "choiceA": "Wait to see if they “sleep it off.”",
    "choiceB": "Keep it private so they do not get embarrassed.",
    "choiceC": "Get adult or emergency help right away and stay with them.",
    "correct": "C",
    "feedbackA": "Waiting can waste time when a person needs help.",
    "feedbackB": "Privacy matters, but safety comes first in an emergency.",
    "feedbackC": "Correct. Fast help and staying with the person are strong emergency actions."
  },
  {
    "id": "G912P06",
    "gradeBand": "9-12",
    "playZone": "Peer",
    "topicTag": "Safety & Emergency",
    "question": "A friend plans to drive after drinking or using cannabis. What is the safest move?",
    "hint": "Choose the option that reduces harm and improves safety.",
    "choiceA": "Ride along if they say they feel “fine.”",
    "choiceB": "Do not get in, help arrange a safe ride, and involve a sober trusted adult if needed.",
    "choiceC": "Wait ten minutes and see if they seem better.",
    "correct": "B",
    "feedbackA": "Feeling “fine” does not erase impairment.",
    "feedbackB": "Correct. Refusing the ride and getting safe help protects everyone.",
    "feedbackC": "Waiting does not guarantee that a person is safe to drive."
  },
  {
    "id": "G912T02",
    "gradeBand": "9-12",
    "playZone": "Threat",
    "topicTag": "Safety & Emergency",
    "question": "Why is driving after using cannabis unsafe?",
    "hint": "Choose the option that reduces harm and improves safety.",
    "choiceA": "Cannabis only affects memory, not driving.",
    "choiceB": "Cannabis can slow reaction time and impair coordination, perception, and decision-making.",
    "choiceC": "Driving is only risky if a person also drank alcohol.",
    "correct": "B",
    "feedbackA": "Cannabis can affect more than memory.",
    "feedbackB": "Correct. Driving requires reaction time, judgment, and coordination.",
    "feedbackC": "Cannabis alone can still impair safe driving."
  },
  {
    "id": "G912W10",
    "gradeBand": "9-12",
    "playZone": "Wrap",
    "topicTag": "Safety & Emergency",
    "question": "A friend took an unknown pill and now seems confused and unsafe. What is the best action?",
    "hint": "Choose the option that reduces harm and improves safety.",
    "choiceA": "Keep it off adults’ radar.",
    "choiceB": "Post in a group chat for advice.",
    "choiceC": "Get emergency help, stay with the person, and use naloxone if available and you know how.",
    "correct": "C",
    "feedbackA": "Safety emergencies should not be hidden from adults or responders.",
    "feedbackB": "A group chat is slower and less reliable than emergency help.",
    "feedbackC": "Correct. Fast help and staying with the person can save a life."
  },
  {
    "id": "G56P04",
    "gradeBand": "5-6",
    "playZone": "Peer",
    "topicTag": "Info & Myths",
    "question": "A classmate says, “It is safe if it is only once, and everybody does it.” What is the best answer?",
    "hint": "Look for the answer based on facts, not popularity.",
    "choiceA": "If lots of people do it, it must be okay.",
    "choiceB": "One time can still be harmful, and pressure does not make it safe.",
    "choiceC": "Stay quiet because maybe they know more than you.",
    "correct": "B",
    "feedbackA": "Popularity does not make something safe. A lot of people doing something does not make it healthy.",
    "feedbackB": "Great choice. You used real health facts instead of following the crowd.",
    "feedbackC": "You avoided agreeing, but you did not use the facts. A stronger choice is to name the risk clearly."
  },
  {
    "id": "G56P09",
    "gradeBand": "5-6",
    "playZone": "Peer",
    "topicTag": "Peer Influence & Refusal",
    "question": "Online Challenge: Friends are filming a risky challenge for social media and say you have to do it to be included.",
    "hint": "Pick the answer that says no and suggests something safer.",
    "choiceA": "Refuse and suggest a safer challenge instead.",
    "choiceB": "Do it so people notice you online.",
    "choiceC": "Step away without saying anything.",
    "correct": "A",
    "feedbackA": "Great choice. You protected yourself and helped steer the group toward something safer.",
    "feedbackB": "That puts your safety at risk for attention. Online approval is not worth getting hurt.",
    "feedbackC": "You kept yourself safe, but a stronger response would be to say no clearly and suggest something safer."
  },
  {
    "id": "G56P10",
    "gradeBand": "5-6",
    "playZone": "Peer",
    "topicTag": "Peer Influence & Refusal",
    "question": "Two older kids tell you to come behind the gym with them and say, “Don’t be a baby.” What is the best move?",
    "hint": "Pick the answer that keeps you with safe people.",
    "choiceA": "Stay with your group and say, “No, I’m not going.”",
    "choiceB": "Go with them so they stop teasing you.",
    "choiceC": "Make an excuse and leave by yourself.",
    "correct": "A",
    "feedbackA": "Great choice. You said no clearly and stayed with safe people.",
    "feedbackB": "That puts you in a risky, isolated situation. A safer choice is to stay with your group and say no clearly.",
    "feedbackC": "You got away from the pressure, but you ended up alone. A stronger choice is to stay with your group and say no clearly."
  },
  {
    "id": "G56S07",
    "gradeBand": "5-6",
    "playZone": "School",
    "topicTag": "Coping",
    "question": "You feel embarrassed and angry at school. Another student says they know something that will help you “stop caring.” What should you do?",
    "hint": "Look for the answer that gets support instead of risky escape.",
    "choiceA": "Try what they offer so you calm down fast.",
    "choiceB": "Talk to a counselor, teacher, or another trusted adult.",
    "choiceC": "Walk away and keep all your feelings inside.",
    "correct": "B",
    "feedbackA": "That is a high-risk choice based on wanting fast relief. Quick escape can create bigger problems.",
    "feedbackB": "Great choice. You connected your feelings to real support, which is safer and stronger.",
    "feedbackC": "You avoided the risky offer, but keeping it all in can make stress build. Getting support would be stronger."
  },
  {
    "id": "G58F03",
    "gradeBand": "5-8",
    "playZone": "Family",
    "topicTag": "Coping",
    "question": "After an argument at home, you want the feeling to disappear fast. What is the strongest move?",
    "hint": "Pick the answer that uses healthy coping before things get worse.",
    "choiceA": "Do something risky to escape the feeling.",
    "choiceB": "Use a coping skill and ask a trusted adult for help.",
    "choiceC": "Shut down and pretend nothing is wrong.",
    "correct": "B",
    "feedbackA": "That may bring quick relief, but it creates new risks and does not solve the problem.",
    "feedbackB": "Great choice. You used self-control and reached for support before things got worse.",
    "feedbackC": "That avoids the moment, but it does not help you calm down. Coping plus support is stronger."
  },
  {
    "id": "G58S04",
    "gradeBand": "5-8",
    "playZone": "School",
    "topicTag": "Help & Support",
    "question": "Someone says the safest move is to keep risky situations secret so adults do not overreact. What is the strongest answer?",
    "hint": "Real safety brings in support instead of secrecy.",
    "choiceA": "Keep it secret so it stays small.",
    "choiceB": "Reach out to a trusted adult because support lowers danger.",
    "choiceC": "Wait and see if it fixes itself.",
    "correct": "B",
    "feedbackA": "Keeping it secret usually makes risk worse. Problems can grow when no safe adult knows what is happening.",
    "feedbackB": "Great choice. Safety works better when you bring in trusted support.",
    "feedbackC": "That avoids acting right away, but it leaves the risk in place. Getting support is stronger."
  },
  {
    "id": "G58T01",
    "gradeBand": "5-8",
    "playZone": "Threat",
    "topicTag": "Coping",
    "question": "Someone says using something is better than dealing with your feelings because it works fast. What is the best response?",
    "hint": "Fast relief is not the same as safety.",
    "choiceA": "Fast relief means it works.",
    "choiceB": "Maybe they are right. Decide later.",
    "choiceC": "Using something to escape feelings is risky. Real coping is safer.",
    "correct": "C",
    "feedbackA": "Fast relief does not make something safe. A risky shortcut can create bigger problems.",
    "feedbackB": "You did not fully agree, but you also did not challenge the risky idea. Using the facts is stronger.",
    "feedbackC": "Great choice. You used real health facts to reject the false claim."
  },
  {
    "id": "G58T02",
    "gradeBand": "5-8",
    "playZone": "Threat",
    "topicTag": "Coping",
    "question": "You are stressed before class. Someone offers something that will “help you chill fast.”",
    "hint": "Pick the answer that says no and reaches for trusted support.",
    "choiceA": "Take it because you want the stress gone right now.",
    "choiceB": "Ignore them and hold everything in until later.",
    "choiceC": "Say no and ask to talk with a trusted adult or counselor.",
    "correct": "C",
    "feedbackA": "That is a high-risk choice based on wanting quick relief.",
    "feedbackB": "You avoided the offer, but holding everything in is not strong coping. Getting support would be better.",
    "feedbackC": "Great choice. You stayed in control and reached for real support."
  },
  {
    "id": "G78P01",
    "gradeBand": "7-8",
    "playZone": "Peer",
    "topicTag": "Protective Factors",
    "question": "A friend wants you to skip practice and hang out behind a store. Another friend asks you to come to team drills instead.",
    "hint": "Pick the answer that keeps you with a safer group and on track with your goals.",
    "choiceA": "Go behind the store so nobody thinks you are boring.",
    "choiceB": "Leave both and go home without telling anyone why.",
    "choiceC": "Go to team drills and stay with the safer group.",
    "correct": "C",
    "feedbackA": "That choice increases risk and pulls you away from healthy support.",
    "feedbackB": "You avoided the risky option, but you also lost support. Staying with the safer group is stronger.",
    "feedbackC": "Great choice. You stayed with a healthy activity and kept your goals on track."
  },
  {
    "id": "G56T03",
    "gradeBand": "5-6",
    "playZone": "Threat",
    "topicTag": "Substance Risks",
    "question": "Someone offers you a mystery gummy and says it will help you “chill.” What is the safest response?",
    "hint": "Choose the option that lowers risk and brings in support if needed.",
    "choiceA": "Take half to be careful.",
    "choiceB": "Say no, because you do not know what is in it, and tell a trusted adult.",
    "choiceC": "Take it if a friend says it is safe.",
    "correct": "B",
    "feedbackA": "Taking less does not fix the problem of not knowing what is inside.",
    "feedbackB": "Correct. Unknown products are risky, and getting help is smart.",
    "feedbackC": "A friend cannot see every ingredient or danger in a mystery product."
  },
  {
    "id": "G56T04",
    "gradeBand": "5-6",
    "playZone": "Threat",
    "topicTag": "Substance Risks",
    "question": "An older student says a vape is safe because it “looks like no big deal.” What is the strongest answer?",
    "hint": "Look for the answer that sets a clear boundary and names the risk.",
    "choiceA": "“If it is small, it cannot hurt you.”",
    "choiceB": "“It is fine if you only try it once.”",
    "choiceC": "No thanks. Something that looks harmless can still hurt a growing brain.",
    "correct": "C",
    "feedbackA": "Size does not decide whether something is safe.",
    "feedbackB": "Trying something once can still be a risky choice.",
    "feedbackC": "Correct. A product can look harmless and still be unsafe."
  },
  {
    "id": "G78T05",
    "gradeBand": "7-8",
    "playZone": "Threat",
    "topicTag": "Substance Risks",
    "question": "An online seller says a pill is real because the packaging looks official. What is the safest conclusion?",
    "hint": "Pick the option that sets a boundary and lowers risk.",
    "choiceA": "Looking real does not mean it is safe—fake pills can contain fentanyl.",
    "choiceB": "Real-looking packaging proves what is inside.",
    "choiceC": "It is safe if other people ordered first.",
    "correct": "A",
    "feedbackA": "Correct. Counterfeit pills can look real and still be dangerous.",
    "feedbackB": "Packaging does not guarantee the contents are real or safe.",
    "feedbackC": "Other buyers cannot prove what is in the pill you were offered."
  },
  {
    "id": "G912P03",
    "gradeBand": "9-12",
    "playZone": "Peer",
    "topicTag": "Substance Risks",
    "question": "Why is combining alcohol with other drugs especially risky?",
    "hint": "Choose the option that reduces harm and improves safety.",
    "choiceA": "Mixing substances can multiply impairment and other harms.",
    "choiceB": "Using two things balances the effects.",
    "choiceC": "It is only dangerous for adults.",
    "correct": "A",
    "feedbackA": "Correct. Combined effects can raise risk fast.",
    "feedbackB": "Mixing substances does not “cancel out” danger.",
    "feedbackC": "Teens can also face serious harm from mixing substances."
  },
  {
    "id": "G912T01",
    "gradeBand": "9-12",
    "playZone": "Threat",
    "topicTag": "Substance Risks",
    "question": "Which statement about counterfeit pills is most accurate?",
    "hint": "Choose the option that reduces harm and improves safety.",
    "choiceA": "If a pill looks real, it is usually safe.",
    "choiceB": "Fake pills can look real, and pills sold outside a pharmacy may contain fentanyl.",
    "choiceC": "Counterfeit pills only affect adults.",
    "correct": "B",
    "feedbackA": "Looks can be misleading with counterfeit pills.",
    "feedbackB": "Correct. Fake pills may look real and still carry deadly risk.",
    "feedbackC": "Teens can also be harmed by counterfeit pills."
  },
  {
    "id": "G912T03",
    "gradeBand": "9-12",
    "playZone": "Threat",
    "topicTag": "Substance Risks",
    "question": "Why is using more than one substance at the same time especially dangerous?",
    "hint": "Choose the option that reduces harm and improves safety.",
    "choiceA": "The body can always tell which one to ignore.",
    "choiceB": "Combining substances can increase overdose risk, crash risk, and loss of control.",
    "choiceC": "Mixing is safer than taking a large amount of one substance.",
    "correct": "B",
    "feedbackA": "The body does not simply “ignore” one substance because another is present.",
    "feedbackB": "Correct. Combined effects can raise the danger quickly.",
    "feedbackC": "Mixing does not make the situation safer."
  },
  {
    "id": "G912P10",
    "gradeBand": "9-12",
    "playZone": "Peer",
    "topicTag": "Treatment & Recovery",
    "question": "Which statement about treatment and recovery is most accurate?",
    "hint": "Choose the option that reduces harm and improves safety.",
    "choiceA": "Treatment does not work for young people",
    "choiceB": "People usually recover only if they handle it completely on their own",
    "choiceC": "Treatment can help, and recovery may take time and more than one try",
    "correct": "C",
    "feedbackA": "Recovery is not something people always solve alone, and treatment can make a real difference.",
    "feedbackB": "Recovery is not something people always solve alone, and treatment can make a real difference.",
    "feedbackC": "You chose the strongest statement. Recovery is possible, and support and treatment can help."
  },
  {
    "id": "G912S14",
    "gradeBand": "9-12",
    "playZone": "School",
    "topicTag": "Treatment & Recovery",
    "question": "If mental health problems and substance problems happen together, which treatment approach is usually strongest?",
    "hint": "Pick the answer that reduces risk and connects to healthy coping or real support.",
    "choiceA": "Treat only substance use and ignore mental health",
    "choiceB": "Treat only mental health and ignore substance use",
    "choiceC": "Use integrated care that addresses both at the same time",
    "correct": "C",
    "feedbackA": "Treating only one side can miss how the two problems interact. Integrated care is usually stronger.",
    "feedbackB": "Treating only one side can miss how the two problems interact. Integrated care is usually stronger.",
    "feedbackC": "You chose the strongest approach. Integrated care is often best when both problems affect each other."
  }
];
const workbookSignalRows = [
  {
    "id": "G1-2FSD01",
    "gradeBand": "1-2",
    "playZone": "Family",
    "topicTag": "Advocacy & Environment",
    "format": "Reflection Check-In",
    "question": "Getting to school or the doctor is usually...",
    "hint": "Pick the choice that feels most true for your life.",
    "choiceA": "Easy for my family to figure out",
    "choiceB": "Sometimes hard",
    "choiceC": "Often hard",
    "feedbackA": "Thanks for checking in. Having a way to get where you need to go is an important support.",
    "feedbackB": "Thanks for checking in. If this is sometimes hard, extra planning or support may help.",
    "feedbackC": "Thanks for checking in. If this is often hard, it may be a real barrier right now.",
    "signalType": "sdoh",
    "signalDomain": "transport_access",
    "scoreA": 0,
    "scoreB": 1,
    "scoreC": 2
  },
  {
    "id": "G1-2FSD02",
    "gradeBand": "1-2",
    "playZone": "Family",
    "topicTag": "Advocacy & Environment",
    "format": "Reflection Check-In",
    "question": "Having food, sleep, and what I need for school is usually...",
    "hint": "Pick the choice that feels most true for your life.",
    "choiceA": "Easy for my family to figure out",
    "choiceB": "Sometimes hard",
    "choiceC": "Often hard",
    "feedbackA": "Thanks for checking in. Having basic needs met can help kids feel ready to learn and grow.",
    "feedbackB": "Thanks for checking in. If this is sometimes hard, that can still affect stress and school.",
    "feedbackC": "Thanks for checking in. If this is often hard, it may be an important barrier right now.",
    "signalType": "sdoh",
    "signalDomain": "basic_needs",
    "scoreA": 0,
    "scoreB": 1,
    "scoreC": 2
  },
  {
    "id": "G1-2FSD03",
    "gradeBand": "1-2",
    "playZone": "Family",
    "topicTag": "Safety & Emergency",
    "format": "Reflection Check-In",
    "question": "At home and where I live, I usually feel...",
    "hint": "Pick the choice that feels most true for your life.",
    "choiceA": "Safe",
    "choiceB": "Sometimes safe",
    "choiceC": "Often unsafe or worried",
    "feedbackA": "Thanks for checking in. Feeling safe where you live is an important support.",
    "feedbackB": "Thanks for checking in. If this feels mixed, that can still make things feel harder.",
    "feedbackC": "Thanks for checking in. If this often feels unsafe, it may be an important concern right now.",
    "signalType": "sdoh",
    "signalDomain": "safety_environment",
    "scoreA": 0,
    "scoreB": 1,
    "scoreC": 2
  },
  {
    "id": "G1-2SRC02",
    "gradeBand": "1-2",
    "playZone": "School",
    "topicTag": "Protective Factors",
    "format": "Reflection Check-In",
    "question": "At school, I feel like there is a place where I belong.",
    "hint": "Pick the choice that feels most true for you right now.",
    "choiceA": "Yes",
    "choiceB": "Sometimes",
    "choiceC": "Not really",
    "feedbackA": "Thanks for checking in. Feeling like you belong at school can be a strong support.",
    "feedbackB": "Thanks for checking in. If this changes day to day, extra connection may still help.",
    "feedbackC": "Thanks for checking in. If this does not feel true, you may need more support feeling connected at school.",
    "signalType": "recovery_capital",
    "signalDomain": "school_belonging",
    "scoreA": 0,
    "scoreB": 1,
    "scoreC": 2
  },
  {
    "id": "G1-2SSD03",
    "gradeBand": "1-2",
    "playZone": "School",
    "topicTag": "Help & Support",
    "format": "Reflection Check-In",
    "question": "At school, there is a grown-up who would help me if I was having a hard day.",
    "hint": "Pick the choice that feels most true for you right now.",
    "choiceA": "Yes",
    "choiceB": "I think so",
    "choiceC": "Not really",
    "feedbackA": "Thanks for checking in. Having a grown-up at school who would help is a strong support.",
    "feedbackB": "Thanks for checking in. If you are not fully sure, your support at school may still feel uneven.",
    "feedbackC": "Thanks for checking in. If this does not feel true, you may need more support at school right now.",
    "signalType": "recovery_capital",
    "signalDomain": "trusted_school_adult",
    "scoreA": 0,
    "scoreB": 1,
    "scoreC": 2
  },
  {
    "id": "G1-2SSD04",
    "gradeBand": "1-2",
    "playZone": "School",
    "topicTag": "Advocacy & Environment",
    "format": "Reflection Check-In",
    "question": "Having the things I need for school, like clothes, supplies, and rest, is usually...",
    "hint": "Pick the choice that feels most true for your life.",
    "choiceA": "Easy for my family to figure out",
    "choiceB": "Sometimes hard",
    "choiceC": "Often hard",
    "feedbackA": "Thanks for checking in. Having what you need for school can make learning feel easier.",
    "feedbackB": "Thanks for checking in. If this is sometimes hard, it may still make school feel more stressful.",
    "feedbackC": "Thanks for checking in. If this is often hard, it may be an important barrier right now.",
    "signalType": "sdoh",
    "signalDomain": "school_readiness_needs",
    "scoreA": 0,
    "scoreB": 1,
    "scoreC": 2
  },
  {
    "id": "G34FSD01",
    "gradeBand": "3-4",
    "playZone": "Family",
    "topicTag": "Advocacy & Environment",
    "format": "Reflection Check-In",
    "question": "At home, getting ready for school is usually...",
    "hint": "Pick the choice that feels most true for your life.",
    "choiceA": "Easy",
    "choiceB": "Sometimes hard",
    "choiceC": "Often hard",
    "feedbackA": "Thanks for checking in. Steady routines can make school and stress feel easier.",
    "feedbackB": "Thanks for checking in. If this changes from day to day, that can make things feel harder.",
    "feedbackC": "Thanks for checking in. If this is often hard, it may mean you need more support at home or school.",
    "signalType": "sdoh",
    "signalDomain": "home_stability",
    "scoreA": 0,
    "scoreB": 1,
    "scoreC": 2
  },
  {
    "id": "G34FSD02",
    "gradeBand": "3-4",
    "playZone": "Family",
    "topicTag": "Safety & Emergency",
    "format": "Reflection Check-In",
    "question": "At home and where I live, I usually feel...",
    "hint": "Pick the choice that feels most true for your life.",
    "choiceA": "Safe",
    "choiceB": "Sometimes safe",
    "choiceC": "Often unsafe or worried",
    "feedbackA": "Thanks for checking in. Feeling safe where you live is an important support.",
    "feedbackB": "Thanks for checking in. If this feels mixed, that can still affect stress and focus.",
    "feedbackC": "Thanks for checking in. If this often feels unsafe, it may be an important concern right now.",
    "signalType": "sdoh",
    "signalDomain": "safety_environment",
    "scoreA": 0,
    "scoreB": 1,
    "scoreC": 2
  },
  {
    "id": "G34FSD03",
    "gradeBand": "3-4",
    "playZone": "Family",
    "topicTag": "Advocacy & Environment",
    "format": "Reflection Check-In",
    "question": "I usually have food, sleep, and what I need to get through the day.",
    "hint": "Pick the choice that feels most true for your life.",
    "choiceA": "Yes",
    "choiceB": "Sometimes",
    "choiceC": "Not really",
    "feedbackA": "Thanks for checking in. Having your basic needs met can help you feel more ready for school and daily life.",
    "feedbackB": "Thanks for checking in. If this is only sometimes true, it may still affect stress and focus.",
    "feedbackC": "Thanks for checking in. If this does not feel true, it may be an important barrier right now.",
    "signalType": "sdoh",
    "signalDomain": "basic_needs",
    "scoreA": 0,
    "scoreB": 1,
    "scoreC": 2
  },
  {
    "id": "G34SRC03",
    "gradeBand": "3-4",
    "playZone": "School",
    "topicTag": "Protective Factors",
    "format": "Reflection Check-In",
    "question": "At school, I feel like I belong with other kids or adults.",
    "hint": "Pick the choice that feels most true for you right now.",
    "choiceA": "Yes",
    "choiceB": "Sometimes",
    "choiceC": "Not really",
    "feedbackA": "Thanks for checking in. Feeling like you belong at school can be a strong support.",
    "feedbackB": "Thanks for checking in. If this changes day to day, extra connection may still help.",
    "feedbackC": "Thanks for checking in. If this does not feel true, you may need more help feeling connected at school.",
    "signalType": "recovery_capital",
    "signalDomain": "school_belonging",
    "scoreA": 0,
    "scoreB": 1,
    "scoreC": 2
  },
  {
    "id": "G34SSD04",
    "gradeBand": "3-4",
    "playZone": "School",
    "topicTag": "Advocacy & Environment",
    "format": "Reflection Check-In",
    "question": "Getting to school and other important places is usually...",
    "hint": "Pick the choice that feels most true for your life.",
    "choiceA": "Easy",
    "choiceB": "Sometimes hard",
    "choiceC": "Often hard",
    "feedbackA": "Thanks for checking in. Reliable transportation can make school and support easier to reach.",
    "feedbackB": "Thanks for checking in. If this is sometimes hard, it can still make days feel more stressful.",
    "feedbackC": "Thanks for checking in. If this is often hard, it may be an important barrier right now.",
    "signalType": "sdoh",
    "signalDomain": "transport_access",
    "scoreA": 0,
    "scoreB": 1,
    "scoreC": 2
  },
  {
    "id": "G56FSD01",
    "gradeBand": "5-6",
    "playZone": "Family",
    "topicTag": "Help & Support",
    "format": "Reflection Check-In",
    "question": "If I needed counseling, medical help, or support, getting it would be...",
    "hint": "Pick the choice that feels most true for your life.",
    "choiceA": "Pretty possible",
    "choiceB": "Possible but hard",
    "choiceC": "Really hard",
    "feedbackA": "Thanks for checking in. Being able to get help when needed is an important support.",
    "feedbackB": "Thanks for checking in. If help is possible but hard, there may still be barriers in the way.",
    "feedbackC": "Thanks for checking in. If getting help feels really hard, that may be an important barrier right now.",
    "signalType": "sdoh",
    "signalDomain": "healthcare_access",
    "scoreA": 0,
    "scoreB": 1,
    "scoreC": 2
  },
  {
    "id": "G56FSD03",
    "gradeBand": "5-6",
    "playZone": "Family",
    "topicTag": "Advocacy & Environment",
    "format": "Reflection Check-In",
    "question": "I usually have what I need each day, like food, sleep, supplies, and clean clothes.",
    "hint": "Pick the choice that feels most true for your life.",
    "choiceA": "Yes",
    "choiceB": "Sometimes",
    "choiceC": "Not really",
    "feedbackA": "Thanks for checking in. Having your daily needs met can support focus and stability.",
    "feedbackB": "Thanks for checking in. If this is only sometimes true, it may still make school and stress harder.",
    "feedbackC": "Thanks for checking in. If this does not feel true, it may be an important barrier right now.",
    "signalType": "sdoh",
    "signalDomain": "basic_needs",
    "scoreA": 0,
    "scoreB": 1,
    "scoreC": 2
  },
  {
    "id": "G56PRC04",
    "gradeBand": "5-6",
    "playZone": "Peer",
    "topicTag": "Help & Support",
    "format": "Reflection Check-In",
    "question": "If I was having a really hard time, I know at least one safe person I could reach out to.",
    "hint": "Pick the choice that feels most true for you right now.",
    "choiceA": "Yes",
    "choiceB": "Maybe / I think so",
    "choiceC": "Not really",
    "feedbackA": "Thanks for checking in. Knowing a safe person to reach out to is a strong support.",
    "feedbackB": "Thanks for checking in. If you are unsure, your support network may still need to grow.",
    "feedbackC": "Thanks for checking in. If this does not feel true, you may need more support and connection right now.",
    "signalType": "recovery_capital",
    "signalDomain": "support_network",
    "scoreA": 0,
    "scoreB": 1,
    "scoreC": 2
  },
  {
    "id": "G56SRC02",
    "gradeBand": "5-6",
    "playZone": "School",
    "topicTag": "Help & Support",
    "format": "Reflection Check-In",
    "question": "At school, there is at least one adult who would notice if I was having a hard time.",
    "hint": "Pick the choice that feels most true for you right now.",
    "choiceA": "Yes",
    "choiceB": "Sometimes / I think so",
    "choiceC": "Not really",
    "feedbackA": "Thanks for checking in. Having an adult who notices and cares is a strong support.",
    "feedbackB": "Thanks for checking in. If you are only somewhat sure, your support at school may still feel uneven.",
    "feedbackC": "Thanks for checking in. If this does not feel true, you may need more support and connection at school.",
    "signalType": "recovery_capital",
    "signalDomain": "trusted_school_adult",
    "scoreA": 0,
    "scoreB": 1,
    "scoreC": 2
  },
  {
    "id": "G56SSD02",
    "gradeBand": "5-6",
    "playZone": "School",
    "topicTag": "Advocacy & Environment",
    "format": "Reflection Check-In",
    "question": "Having a quiet place and time to do schoolwork is...",
    "hint": "Pick the choice that feels most true for your life.",
    "choiceA": "Usually possible",
    "choiceB": "Sometimes hard",
    "choiceC": "Often hard",
    "feedbackA": "Thanks for checking in. Having space and time for schoolwork can make learning feel more manageable.",
    "feedbackB": "Thanks for checking in. If this is sometimes hard, it may still make school feel more stressful.",
    "feedbackC": "Thanks for checking in. If this is often hard, it may be an important barrier right now.",
    "signalType": "sdoh",
    "signalDomain": "study_environment",
    "scoreA": 0,
    "scoreB": 1,
    "scoreC": 2
  },
  {
    "id": "G56SSD04",
    "gradeBand": "5-6",
    "playZone": "School",
    "topicTag": "Advocacy & Environment",
    "format": "Reflection Check-In",
    "question": "If something important was online for school or support, I could usually get to it.",
    "hint": "Pick the choice that feels most true for your life.",
    "choiceA": "Yes",
    "choiceB": "Sometimes",
    "choiceC": "Not usually",
    "feedbackA": "Thanks for checking in. Reliable online access can make school and support easier to reach.",
    "feedbackB": "Thanks for checking in. If access is only sometimes there, that can still make things harder.",
    "feedbackC": "Thanks for checking in. If access is not usually there, it may be an important barrier right now.",
    "signalType": "sdoh",
    "signalDomain": "digital_access",
    "scoreA": 0,
    "scoreB": 1,
    "scoreC": 2
  },
  {
    "id": "G58FSD02",
    "gradeBand": "5-8",
    "playZone": "Family",
    "topicTag": "Advocacy & Environment",
    "format": "Reflection Check-In",
    "question": "I usually have what I need to focus at school, like sleep, food, and supplies.",
    "hint": "Pick the choice that feels most true for your life.",
    "choiceA": "Yes",
    "choiceB": "Sometimes",
    "choiceC": "Not really",
    "feedbackA": "Thanks for checking in. Having what you need each day can support focus and stability.",
    "feedbackB": "Thanks for checking in. If this is only sometimes true, it may still make school feel harder.",
    "feedbackC": "Thanks for checking in. If this does not feel true, it may be an important barrier right now.",
    "signalType": "sdoh",
    "signalDomain": "basic_needs",
    "scoreA": 0,
    "scoreB": 1,
    "scoreC": 2
  },
  {
    "id": "G58FSD03",
    "gradeBand": "5-8",
    "playZone": "Family",
    "topicTag": "Safety & Emergency",
    "format": "Reflection Check-In",
    "question": "At home and where I live, I usually feel...",
    "hint": "Pick the choice that feels most true for your life.",
    "choiceA": "Safe",
    "choiceB": "Sometimes safe",
    "choiceC": "Often unsafe or worried",
    "feedbackA": "Thanks for checking in. Feeling safe where you live is an important support.",
    "feedbackB": "Thanks for checking in. If this feels mixed, it can still affect stress and focus.",
    "feedbackC": "Thanks for checking in. If this often feels unsafe, it may be an important concern right now.",
    "signalType": "sdoh",
    "signalDomain": "safety_environment",
    "scoreA": 0,
    "scoreB": 1,
    "scoreC": 2
  },
  {
    "id": "G58PRC01",
    "gradeBand": "5-8",
    "playZone": "Peer",
    "topicTag": "Protective Factors",
    "format": "Reflection Check-In",
    "question": "I feel like I belong in at least one group, team, club, class, or community.",
    "hint": "Pick the choice that feels most true for you right now.",
    "choiceA": "Yes",
    "choiceB": "Kind of",
    "choiceC": "Not really",
    "feedbackA": "Thanks for checking in. Feeling like you belong can be a strong protective factor.",
    "feedbackB": "Thanks for checking in. If this feels mixed, connection may still be growing for you.",
    "feedbackC": "Thanks for checking in. If this does not feel true, it may mean you need more support finding connection.",
    "signalType": "recovery_capital",
    "signalDomain": "belonging_connection",
    "scoreA": 0,
    "scoreB": 1,
    "scoreC": 2
  },
  {
    "id": "G58SRC04",
    "gradeBand": "5-8",
    "playZone": "School",
    "topicTag": "Help & Support",
    "format": "Reflection Check-In",
    "question": "At school, there is at least one adult who would notice if I was having a hard time.",
    "hint": "Pick the choice that feels most true for you right now.",
    "choiceA": "Yes",
    "choiceB": "I think so",
    "choiceC": "Not really",
    "feedbackA": "Thanks for checking in. Having an adult at school who notices and cares is a strong support.",
    "feedbackB": "Thanks for checking in. If you are only somewhat sure, support at school may still feel uneven.",
    "feedbackC": "Thanks for checking in. If this does not feel true, you may need more support and connection at school.",
    "signalType": "recovery_capital",
    "signalDomain": "trusted_school_adult",
    "scoreA": 0,
    "scoreB": 1,
    "scoreC": 2
  },
  {
    "id": "G58SSD01",
    "gradeBand": "5-8",
    "playZone": "School",
    "topicTag": "Advocacy & Environment",
    "format": "Reflection Check-In",
    "question": "If something important was online for school or support, I could usually get to it.",
    "hint": "Pick the choice that feels most true for your life.",
    "choiceA": "Yes",
    "choiceB": "Sometimes",
    "choiceC": "Not usually",
    "feedbackA": "Thanks for checking in. Reliable online access can make school and support easier to reach.",
    "feedbackB": "Thanks for checking in. If access is only sometimes there, that can make things harder.",
    "feedbackC": "Thanks for checking in. If online access is not usually there, that may be an important barrier right now.",
    "signalType": "sdoh",
    "signalDomain": "digital_access",
    "scoreA": 0,
    "scoreB": 1,
    "scoreC": 2
  },
  {
    "id": "G58SSD04",
    "gradeBand": "5-8",
    "playZone": "School",
    "topicTag": "Help & Support",
    "format": "Reflection Check-In",
    "question": "If I needed counseling, medical help, or support, getting it would be...",
    "hint": "Pick the choice that feels most true for your life.",
    "choiceA": "Possible",
    "choiceB": "Possible but hard",
    "choiceC": "Really hard",
    "feedbackA": "Thanks for checking in. Being able to get help when needed is an important support.",
    "feedbackB": "Thanks for checking in. If help is possible but hard, there may still be barriers in the way.",
    "feedbackC": "Thanks for checking in. If getting help feels really hard, that may be an important barrier right now.",
    "signalType": "sdoh",
    "signalDomain": "healthcare_access",
    "scoreA": 0,
    "scoreB": 1,
    "scoreC": 2
  },
  {
    "id": "G78FSD01",
    "gradeBand": "7-8",
    "playZone": "Family",
    "topicTag": "Advocacy & Environment",
    "format": "Reflection Check-In",
    "question": "Problems at home, money stress, or moving around make it hard for me to focus on school or goals.",
    "hint": "Pick the choice that feels most true for you right now.",
    "choiceA": "Rarely",
    "choiceB": "Sometimes",
    "choiceC": "Often",
    "feedbackA": "Thanks for checking in. Fewer outside stressors can make it easier to focus and feel steady.",
    "feedbackB": "Thanks for checking in. If this happens sometimes, stress at home may still affect how things feel day to day.",
    "feedbackC": "Thanks for checking in. If this happens often, it may be an important stress barrier right now.",
    "signalType": "sdoh",
    "signalDomain": "home_economic_stability",
    "scoreA": 0,
    "scoreB": 1,
    "scoreC": 2
  },
  {
    "id": "G78FSD04",
    "gradeBand": "7-8",
    "playZone": "Family",
    "topicTag": "Advocacy & Environment",
    "format": "Reflection Check-In",
    "question": "I usually have what I need to get through the day, like sleep, food, and a steady routine.",
    "hint": "Pick the choice that feels most true for your life.",
    "choiceA": "Yes",
    "choiceB": "Sometimes",
    "choiceC": "Not really",
    "feedbackA": "Thanks for checking in. Having daily needs met can support focus, mood, and stability.",
    "feedbackB": "Thanks for checking in. If this is only sometimes true, it may still affect how steady life feels.",
    "feedbackC": "Thanks for checking in. If this does not feel true, it may be an important barrier right now.",
    "signalType": "sdoh",
    "signalDomain": "basic_needs",
    "scoreA": 0,
    "scoreB": 1,
    "scoreC": 2
  },
  {
    "id": "G78PRC03",
    "gradeBand": "7-8",
    "playZone": "Peer",
    "topicTag": "Help & Support",
    "format": "Reflection Check-In",
    "question": "I have at least one person I trust to help me make a safer choice if I am under pressure.",
    "hint": "Pick the choice that feels most true for you right now.",
    "choiceA": "Yes",
    "choiceB": "Maybe",
    "choiceC": "Not really",
    "feedbackA": "Thanks for checking in. Having even one trusted person like that is a strong support.",
    "feedbackB": "Thanks for checking in. If you are unsure, your support network may still feel limited.",
    "feedbackC": "Thanks for checking in. If this does not feel true, you may need more support around pressure and safer choices.",
    "signalType": "recovery_capital",
    "signalDomain": "support_network",
    "scoreA": 0,
    "scoreB": 1,
    "scoreC": 2
  },
  {
    "id": "G78SRC04",
    "gradeBand": "7-8",
    "playZone": "School",
    "topicTag": "Protective Factors",
    "format": "Reflection Check-In",
    "question": "I feel like I belong in at least one class, activity, team, or group.",
    "hint": "Pick the choice that feels most true for you right now.",
    "choiceA": "Yes",
    "choiceB": "Kind of",
    "choiceC": "Not really",
    "feedbackA": "Thanks for checking in. Feeling like you belong can be a strong protective factor.",
    "feedbackB": "Thanks for checking in. If this feels mixed, connection may still be growing for you.",
    "feedbackC": "Thanks for checking in. If this does not feel true, you may need more support finding connection and belonging.",
    "signalType": "recovery_capital",
    "signalDomain": "belonging_connection",
    "scoreA": 0,
    "scoreB": 1,
    "scoreC": 2
  },
  {
    "id": "G78SSD02",
    "gradeBand": "7-8",
    "playZone": "School",
    "topicTag": "Help & Support",
    "format": "Reflection Check-In",
    "question": "If I needed counseling, medical help, or other support, getting it would feel...",
    "hint": "Pick the choice that feels most true for your life right now.",
    "choiceA": "Possible",
    "choiceB": "Possible but hard",
    "choiceC": "Really hard",
    "feedbackA": "Thanks for checking in. Being able to get help when needed is an important support.",
    "feedbackB": "Thanks for checking in. If help is possible but hard, there may still be barriers in the way.",
    "feedbackC": "Thanks for checking in. If getting help feels really hard, that may be an important barrier right now.",
    "signalType": "sdoh",
    "signalDomain": "healthcare_access",
    "scoreA": 0,
    "scoreB": 1,
    "scoreC": 2
  },
  {
    "id": "G78SSD03",
    "gradeBand": "7-8",
    "playZone": "School",
    "topicTag": "Advocacy & Environment",
    "format": "Reflection Check-In",
    "question": "If something important was online for school or support, I could usually get to it.",
    "hint": "Pick the choice that feels most true for your life.",
    "choiceA": "Yes",
    "choiceB": "Sometimes",
    "choiceC": "Not usually",
    "feedbackA": "Thanks for checking in. Reliable online access can make school and support easier to reach.",
    "feedbackB": "Thanks for checking in. If access is only sometimes there, that can still make things harder.",
    "feedbackC": "Thanks for checking in. If access is not usually there, it may be an important barrier right now.",
    "signalType": "sdoh",
    "signalDomain": "digital_access",
    "scoreA": 0,
    "scoreB": 1,
    "scoreC": 2
  },
  {
    "id": "G912FSD02",
    "gradeBand": "9-12",
    "playZone": "Family",
    "topicTag": "Advocacy & Environment",
    "format": "Reflection Check-In",
    "question": "My housing and daily routines are steady enough for me to keep up with school, work, or goals.",
    "hint": "Pick the choice that feels most true for your life right now.",
    "choiceA": "Usually true",
    "choiceB": "Sometimes true",
    "choiceC": "Often not true",
    "feedbackA": "Thanks for checking in. Stability in housing and routines can make goals easier to keep up with.",
    "feedbackB": "Thanks for checking in. If this is only sometimes true, instability may still affect follow-through and stress.",
    "feedbackC": "Thanks for checking in. If this is often not true, it may be an important barrier right now.",
    "signalType": "sdoh",
    "signalDomain": "home_stability",
    "scoreA": 0,
    "scoreB": 1,
    "scoreC": 2
  },
  {
    "id": "G912FSD03",
    "gradeBand": "9-12",
    "playZone": "Family",
    "topicTag": "Advocacy & Environment",
    "format": "Reflection Check-In",
    "question": "I usually have what I need to keep up with school, work, or daily responsibilities.",
    "hint": "Pick the choice that feels most true for your life.",
    "choiceA": "Usually true",
    "choiceB": "Sometimes true",
    "choiceC": "Often not true",
    "feedbackA": "Thanks for checking in. Having daily needs met can make goals easier to keep up with.",
    "feedbackB": "Thanks for checking in. If this is only sometimes true, it may still affect follow-through and stress.",
    "feedbackC": "Thanks for checking in. If this is often not true, it may be an important barrier right now.",
    "signalType": "sdoh",
    "signalDomain": "basic_needs",
    "scoreA": 0,
    "scoreB": 1,
    "scoreC": 2
  },
  {
    "id": "G912PRC01",
    "gradeBand": "9-12",
    "playZone": "Peer",
    "topicTag": "Protective Factors",
    "format": "Reflection Check-In",
    "question": "I have at least one person who would help me make a safer choice if I was under pressure.",
    "hint": "Pick the choice that feels most true for you right now.",
    "choiceA": "Definitely",
    "choiceB": "Maybe",
    "choiceC": "Not really",
    "feedbackA": "Thanks for checking in. Having even one person like that is a strong protective factor.",
    "feedbackB": "Thanks for checking in. If you are not fully sure, your support network may still be limited.",
    "feedbackC": "Thanks for checking in. If this does not feel true, you may need more support around safer choices and pressure situations.",
    "signalType": "recovery_capital",
    "signalDomain": "support_network",
    "scoreA": 0,
    "scoreB": 1,
    "scoreC": 2
  },
  {
    "id": "G912SRC03",
    "gradeBand": "9-12",
    "playZone": "School",
    "topicTag": "Help & Support",
    "format": "Reflection Check-In",
    "question": "If I needed counseling, medical help, or support, I would know how to get started.",
    "hint": "Pick the choice that feels most true for you right now.",
    "choiceA": "Definitely",
    "choiceB": "Maybe",
    "choiceC": "Not really",
    "feedbackA": "Thanks for checking in. Knowing how to get started is a strong support.",
    "feedbackB": "Thanks for checking in. If you are not fully sure, access to help may still feel unclear.",
    "feedbackC": "Thanks for checking in. If this does not feel true, you may need more support finding help when you need it.",
    "signalType": "recovery_capital",
    "signalDomain": "help_access",
    "scoreA": 0,
    "scoreB": 1,
    "scoreC": 2
  },
  {
    "id": "G912SSD04",
    "gradeBand": "9-12",
    "playZone": "School",
    "topicTag": "Advocacy & Environment",
    "format": "Reflection Check-In",
    "question": "If something important for school, work, or support was online, I could usually access it.",
    "hint": "Pick the choice that feels most true for your life right now.",
    "choiceA": "Usually yes",
    "choiceB": "Sometimes",
    "choiceC": "Not usually",
    "feedbackA": "Thanks for checking in. Reliable online access can make school, work, and support easier to manage.",
    "feedbackB": "Thanks for checking in. If access is only sometimes there, it may still create barriers.",
    "feedbackC": "Thanks for checking in. If access is not usually there, it may be an important barrier right now.",
    "signalType": "sdoh",
    "signalDomain": "digital_access",
    "scoreA": 0,
    "scoreB": 1,
    "scoreC": 2
  }
];

function normalizeWorkbookLearningRow(row) {
  const gradeBand = normalizeWorkbookBand(row.gradeBand);
  const sourceType = workbookPlayZoneToSource(row.playZone);
  const zoneType = sourceType === 'safe_zone' ? String(row.playZone || '').trim().toLowerCase() : null;
  const category = workbookTopicTagToCategory(row.topicTag, row.playZone);
  const correctIndex = importedCorrectLetterToIndex(row.correct);
  const baseTelemetry = {
    imported: true,
    workbook: true,
    questionSkill: String(row.topicTag || category || 'general')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, ''),
    triggerType: `workbook_${sourceType}`
  };

  if (sourceType === 'safe_zone') {
    return {
      id: row.id,
      type: 'safe',
      title: workbookZoneTitle(zoneType),
      category,
      topicTag: row.topicTag,
      gradeBand,
      eligibleSources: ['safe_zone'],
      zoneType,
      text: row.question,
      hint: row.hint || '',
      correctIndex,
      telemetryTags: baseTelemetry,
      choices: [row.choiceA, row.choiceB, row.choiceC].map((choiceText, index) => ({
        label: `${['A', 'B', 'C'][index]}. ${choiceText}`,
        feedback: [row.feedbackA, row.feedbackB, row.feedbackC][index] || '',
        telemetryTags: inferredChoiceTelemetryTags(choiceText, index === correctIndex, category, row.topicTag)
      }))
    };
  }

  return {
    id: row.id,
    type: 'scenario',
    title: sourceType === 'wrap' ? 'Quick Choice' : 'What Would You Do?',
    category,
    topicTag: row.topicTag,
    gradeBand,
    eligibleSources: [sourceType],
    zoneType: null,
    text: row.question,
    hint: row.hint || '',
    telemetryTags: baseTelemetry,
    choices: [row.choiceA, row.choiceB, row.choiceC].map((choiceText, index) =>
      makeChoice(
        `${['A', 'B', 'C'][index]}. ${choiceText}`,
        workbookChoiceKind(category, correctIndex, index),
        [row.feedbackA, row.feedbackB, row.feedbackC][index] || '',
        inferredChoiceTelemetryTags(choiceText, index === correctIndex, category, row.topicTag)
      )
    )
  };
}

function normalizeWorkbookSignalRow(row) {
  const gradeBand = normalizeWorkbookBand(row.gradeBand);
  const zoneType = String(row.playZone || '').trim().toLowerCase();
  const category = workbookTopicTagToCategory(row.topicTag, row.playZone);

  return {
    id: row.id,
    type: 'signal',
    title: workbookZoneTitle(zoneType),
    category,
    topicTag: row.topicTag,
    gradeBand,
    eligibleSources: ['signal'],
    zoneType,
    signalType: row.signalType,
    signalDomain: row.signalDomain,
    format: row.format,
    text: row.question,
    hint: row.hint || '',
    telemetryTags: {
      imported: true,
      workbook: true,
      measureType: 'signal',
      signalType: row.signalType,
      signalDomain: row.signalDomain,
      questionSkill: String(row.signalDomain || row.topicTag || category || 'signal')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
    },
    choices: [
      { label: `A. ${row.choiceA}`, feedback: row.feedbackA || '', signalScore: row.scoreA, telemetryTags: { responseStyle: 'signal_a' } },
      { label: `B. ${row.choiceB}`, feedback: row.feedbackB || '', signalScore: row.scoreB, telemetryTags: { responseStyle: 'signal_b' } },
      { label: `C. ${row.choiceC}`, feedback: row.feedbackC || '', signalScore: row.scoreC, telemetryTags: { responseStyle: 'signal_c' } }
    ]
  };
}

const learningQuestionBank = workbookLearningRows.map(normalizeWorkbookLearningRow);
const signalQuestionBank = workbookSignalRows.map(normalizeWorkbookSignalRow);

function getLearningQuestionPool(sourceType, playerGradeBand = DEFAULT_GRADE_BAND, options = {}) {
  const { zoneType = null } = options;
  const normalizedBand = normalizePlayerGradeBand(playerGradeBand);

  return learningQuestionBank.filter((question) => {
    if (!questionMatchesPlayerBand(question.gradeBand, normalizedBand)) return false;
    if (!question.eligibleSources.includes(sourceType)) return false;
    if (zoneType && question.zoneType !== zoneType) return false;
    return true;
  });
}

function getSafeZoneQuestionPool(zoneType, playerGradeBand = DEFAULT_GRADE_BAND) {
  return getLearningQuestionPool('safe_zone', playerGradeBand, { zoneType });
}

function getSignalQuestionPool(zoneType, playerGradeBand = DEFAULT_GRADE_BAND) {
  const normalizedBand = normalizePlayerGradeBand(playerGradeBand);
  return signalQuestionBank.filter((question) => {
    if (!questionMatchesPlayerBand(question.gradeBand, normalizedBand)) return false;
    if (zoneType && question.zoneType !== zoneType) return false;
    return true;
  });
}

function getWrapScenarioPool(playerGradeBand = DEFAULT_GRADE_BAND) {
  return getLearningQuestionPool('wrap', playerGradeBand);
}

function getThreatScenarioPool(playerGradeBand = DEFAULT_GRADE_BAND) {
  return getLearningQuestionPool('threat', playerGradeBand);
}


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

const MAZE_WIDTH = 875;
const MAZE_HEIGHT = 687;

// do not redeclare PORTAL here
// use the one already declared near the top of the file

const OUTER_WALL_THICKNESS = 28;
const OUTER_FRAME_X = 12;
const SIDE_WALL_Y_INSET = 6;
const FRAME_CAP_INSET = 4;

const RIGHT_OUTER_WALL_X =
  MAZE_WIDTH - OUTER_FRAME_X - OUTER_WALL_THICKNESS;

const HORIZONTAL_FRAME_WIDTH =
  MAZE_WIDTH - OUTER_FRAME_X * 2 - FRAME_CAP_INSET * 2;

const LOWER_SIDE_WALL_HEIGHT =
  MAZE_HEIGHT - SIDE_WALL_Y_INSET - (PORTAL.y + PORTAL.h);

const wallSegments = [
  {
    x: OUTER_FRAME_X + FRAME_CAP_INSET,
    y: 0,
    w: HORIZONTAL_FRAME_WIDTH,
    h: OUTER_WALL_THICKNESS
  },
  {
    x: OUTER_FRAME_X + FRAME_CAP_INSET,
    y: MAZE_HEIGHT - OUTER_WALL_THICKNESS,
    w: HORIZONTAL_FRAME_WIDTH,
    h: OUTER_WALL_THICKNESS
  },

  {
    x: OUTER_FRAME_X,
    y: SIDE_WALL_Y_INSET,
    w: OUTER_WALL_THICKNESS,
    h: PORTAL.y - SIDE_WALL_Y_INSET
  },
  {
    x: OUTER_FRAME_X,
    y: PORTAL.y + PORTAL.h,
    w: OUTER_WALL_THICKNESS,
    h: LOWER_SIDE_WALL_HEIGHT
  },

  {
    x: RIGHT_OUTER_WALL_X,
    y: SIDE_WALL_Y_INSET,
    w: OUTER_WALL_THICKNESS,
    h: PORTAL.y - SIDE_WALL_Y_INSET
  },
  {
    x: RIGHT_OUTER_WALL_X,
    y: PORTAL.y + PORTAL.h,
    w: OUTER_WALL_THICKNESS,
    h: LOWER_SIDE_WALL_HEIGHT
  },

  { x: 95, y: 69, w: 164, h: 19 },
  { x: 95, y: 69, w: 19, h: 85 },
  { x: 173, y: 143, w: 196, h: 19 },
  { x: 95, y: 213, w: 178, h: 19 },
  { x: 351, y: 143, w: 19, h: 162 },
  { x: 15, y: 286, w: 165, h: 19 },
  { x: 269, y: 286, w: 101, h: 19 },

  { x: 332, y: 69, w: 155, h: 19 },
  { x: 568, y: 69, w: 188, h: 19 },
  { x: 737, y: 69, w: 19, h: 85 },
  { x: 423, y: 143, w: 252, h: 19 },
  { x: 515, y: 213, w: 235, h: 19 },
  { x: 423, y: 143, w: 19, h: 162 },
  { x: 423, y: 286, w: 182, h: 19 },
  { x: 703, y: 286, w: 136, h: 19 },

  { x: 95, y: 361, w: 132, h: 19 },
  { x: 305, y: 361, w: 65, h: 19 },
  { x: 95, y: 361, w: 19, h: 86 },
  { x: 173, y: 430, w: 120, h: 19 },
  { x: 351, y: 361, w: 19, h: 165 },
  { x: 197, y: 508, w: 173, h: 19 },
  { x: 95, y: 518, w: 19, h: 86 },
  { x: 95, y: 585, w: 277, h: 19 },

  { x: 423, y: 361, w: 312, h: 19 },
  { x: 423, y: 361, w: 19, h: 165 },
  { x: 515, y: 436, w: 161, h: 19 },
  { x: 657, y: 436, w: 19, h: 168 },
  { x: 423, y: 508, w: 147, h: 19 },
  { x: 423, y: 585, w: 160, h: 19 },
  { x: 737, y: 436, w: 19, h: 168 }
];

const INNER_LEFT = OUTER_FRAME_X + OUTER_WALL_THICKNESS;
const INNER_RIGHT = RIGHT_OUTER_WALL_X;
const INNER_TOP = OUTER_WALL_THICKNESS;
const INNER_BOTTOM = MAZE_HEIGHT - OUTER_WALL_THICKNESS;

const SAFE_W = 65;
const SAFE_H = 62;
const SAFE_INSET = 10;

const safeSpaces = [
  {
    x: INNER_RIGHT - SAFE_INSET - SAFE_W,
    y: INNER_TOP + SAFE_INSET,
    w: SAFE_W,
    h: SAFE_H,
    type: "school",
    label: "SCHOOL",
    border: COLORS.schoolBorder
  },
  {
    x: INNER_LEFT + SAFE_INSET,
    y: INNER_BOTTOM - SAFE_INSET - SAFE_H,
    w: SAFE_W,
    h: SAFE_H,
    type: "family",
    label: "FAMILY",
    border: COLORS.familyBorder
  },
  {
    x: INNER_RIGHT - SAFE_INSET - SAFE_W,
    y: INNER_BOTTOM - SAFE_INSET - SAFE_H,
    w: SAFE_W,
    h: SAFE_H,
    type: "peer",
    label: "PEER",
    border: COLORS.peerBorder
  }
];

const playerSpawn = {
  x: 50,
  y: 320
};

const chaserSpawns = [
  { x: 372, y: 312 },
  { x: 396, y: 312 },
  { x: 372, y: 336 },
  { x: 396, y: 336 }
];

const FACTOR_SPAWN_CANVAS_W = MAZE_WIDTH;
const FACTOR_SPAWN_CANVAS_H = MAZE_HEIGHT;
const FACTOR_HALF_SIZE = 13;
const FACTOR_SPAWN_STEP_X = 74;
const FACTOR_SPAWN_STEP_Y = 62;
const FACTOR_SPAWN_MARGIN_X = 48;
const FACTOR_SPAWN_MARGIN_Y = 46;
const FACTOR_SPAWN_MIN_SPACING = 48;
const FACTOR_SPAWN_CLEARANCE = 54;

function factorRectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function pointClearOfEntity(point, entity, clearance = FACTOR_SPAWN_CLEARANCE) {
  return Math.hypot(point.x - entity.x, point.y - entity.y) >= clearance;
}

function canUseFactorSpawnPoint(point) {
  const testRect = {
    x: point.x - FACTOR_HALF_SIZE,
    y: point.y - FACTOR_HALF_SIZE,
    w: FACTOR_HALF_SIZE * 2,
    h: FACTOR_HALF_SIZE * 2
  };

  if (wallSegments.some((wall) => factorRectsOverlap(testRect, wall))) return false;
  if (safeSpaces.some((safe) => factorRectsOverlap(testRect, safe))) return false;
  if (!pointClearOfEntity(point, playerSpawn)) return false;
  if (chaserSpawns.some((spawn) => !pointClearOfEntity(point, spawn, FACTOR_SPAWN_CLEARANCE - 4))) {
    return false;
  }

  return true;
}

function addFactorSpawnPoint(points, point) {
  if (!canUseFactorSpawnPoint(point)) return;

  const hasNearbyPoint = points.some((existing) =>
    Math.hypot(existing.x - point.x, existing.y - point.y) < FACTOR_SPAWN_MIN_SPACING
  );

  if (hasNearbyPoint) return;
  points.push(point);
}

function createFactorSpawnPoints() {
  const points = [];
  const passes = [
    { offsetX: 0, offsetY: 0 },
    { offsetX: Math.round(FACTOR_SPAWN_STEP_X / 2), offsetY: Math.round(FACTOR_SPAWN_STEP_Y / 2) }
  ];

  passes.forEach(({ offsetX, offsetY }) => {
    for (let y = FACTOR_SPAWN_MARGIN_Y + offsetY; y <= FACTOR_SPAWN_CANVAS_H - FACTOR_SPAWN_MARGIN_Y; y += FACTOR_SPAWN_STEP_Y) {
      for (let x = FACTOR_SPAWN_MARGIN_X + offsetX; x <= FACTOR_SPAWN_CANVAS_W - FACTOR_SPAWN_MARGIN_X; x += FACTOR_SPAWN_STEP_X) {
        addFactorSpawnPoint(points, { x, y });
      }
    }
  });

  return points.sort((a, b) => (a.y - b.y) || (a.x - b.x));
}

const factorSpawnPoints = createFactorSpawnPoints();

const SURVEY_STEP_KEYS = {
  pre: [
    ["challengePriority", "defensePriority"],
    ["recoveryPriority", "safeZonePriority"],
    ["factFindingTool", "cheatCode"]
  ],
  post: [
    ["challengePriority", "defensePriority"],
    ["recoveryPriority", "safeZonePriority"],
    ["factFindingTool", "cheatCode"],
    ["gameEnjoyment", "gameAttention", "gameBoredom", "gameFrustration", "gameRealism"]
  ]
};

const SURVEY_STEP_META = {
  pre: [
    {
      title: "Choose Your Starting Build",
      description: "Set your character’s biggest challenge and the tools they will rely on during the run."
    },
    {
      title: "Recovery and Support",
      description: "Choose how your character recovers under pressure and where their strongest support comes from."
    },
    {
      title: "Intel and Power-Ups",
      description: "Choose how your character gets the right answer and what bonus help gives them the biggest edge."
    }
  ],
  post: [
    {
      title: "Adjust Your Build After the Run",
      description: "After the run, rebuild around the challenges and tools that stood out most."
    },
    {
      title: "Recovery and Support After the Run",
      description: "After the run, adjust how your character recovers and where their strongest support comes from."
    },
    {
      title: "Intel and Power-Ups After the Run",
      description: "After the run, adjust how your character gets answers and what bonus help gives them the biggest edge."
    },
    {
      title: "How Did That Run Feel?",
      description: "Give a quick rating for how that run felt to play."
    }
  ]
};

const SURVEY_GROUP_META = {
  challengePriority: {
    icon: "⚠",
    theme: "theme-core",
    summary: "Big Challenges"
  },
  defensePriority: {
    icon: "🛡",
    theme: "theme-defense",
    summary: "Staying Safe"
  },
  recoveryPriority: {
    icon: "❤",
    theme: "theme-recovery",
    summary: "Ways to Reset"
  },
  safeZonePriority: {
    icon: "🏠",
    theme: "theme-support",
    summary: "Safe Places"
  },
  factFindingTool: {
    icon: "🔎",
    theme: "theme-knowledge",
    summary: "Finding Answers"
  },
  cheatCode: {
    icon: "✦",
    theme: "theme-assist",
    summary: "Special Helps"
  },

  healthyChoicesConfidence: {
    icon: "✦",
    theme: "theme-core",
    summary: "Healthy Choices"
  },
  refusalConfidence: {
    icon: "🛡",
    theme: "theme-defense",
    summary: "Saying No"
  },
  stressKnowledge: {
    icon: "◌",
    theme: "theme-recovery",
    summary: "Handling Stress"
  },
  copingConfidence: {
    icon: "❤",
    theme: "theme-recovery",
    summary: "Coping Tools"
  },
  futureLearningConfidence: {
    icon: "◎",
    theme: "theme-support",
    summary: "Learning for the Future"
  },
  futureGoalsConfidence: {
    icon: "➜",
    theme: "theme-support",
    summary: "Future Focus"
  },
  gameEnjoyment: {
    icon: "★",
    theme: "theme-knowledge",
    summary: "Game Enjoyment"
  },
  gameAttention: {
    icon: "👁",
    theme: "theme-knowledge",
    summary: "Game Attention"
  },
  gameBoredom: {
    icon: "…",
    theme: "theme-assist",
    summary: "Game Boredom"
  },
  gameFrustration: {
    icon: "!",
    theme: "theme-assist",
    summary: "Game Frustration"
  },
  gameRealism: {
    icon: "✓",
    theme: "theme-support",
    summary: "Game Realism"
  }
};

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
    title: "Tempting Shortcut",
    description:
      "This factor looks exciting or helpful at first, but it actually makes things harder later. It represents choices that feel good in the moment but lead to more pressure or confusion down the road."
  },
  social_harm: {
    title: "High Risk Substances",
    description:
      "This factor represents clear danger or unsafe pressure. It makes the run harder right away and drains your Protective Points quickly."
  },
  conflict_stress: {
    title: "Conflict or Peer Pressure",
    description:
      "This factor stands for arguments, conflict, or people pushing you toward unsafe choices. It increases stress and makes it harder to stay in control."
  },
  mental_overload: {
    title: "Mental Load or Confusion",
    description:
      "This factor represents misinformation, confusion, or feeling mentally overwhelmed. When your brain is overloaded, it is easier to make risky decisions or miss warning signs."
  }
};

export {
  PLAYER_BASE_SPEED,
  BEST_SPEED,
  WORST_SPEED,
  EFFECT_MS,
  STARTING_STABILITY,
  TOTAL_RUNS,
  WRAP_SCENARIO_CHANCE,
  WRAP_SCENARIO_COOLDOWN_MS,
  SAFE_ZONE_PROMPT_COOLDOWN_MS,
  SAFE_ZONE_REPEAT_MS,
  THREAT_SCENARIO_COOLDOWN_MS,
  THREAT_SCENARIO_CHECK_MS,
  THREAT_SCENARIO_ROLL,
  GLOBAL_MODAL_COOLDOWN_MS,
  CATCH_STABILITY_LOSS,
  DANGER_DISTANCE,
  NEAR_MISS_DISTANCE,
  CELL_SIZE,
  PORTAL,
  getGridDimensions,
  MAX_ACTIVE_PROTECTIVE,
  MAX_ACTIVE_RISK,
  PROTECTIVE_SPAWN_MIN_MS,
  PROTECTIVE_SPAWN_MAX_MS,
  RISK_SPAWN_MIN_MS,
  RISK_SPAWN_MAX_MS,
  FACTOR_LIFETIME_MS,
  PLAYER_DRAW,
  CHASER_NAMES,
  CHASER_DRAW_BY_SKIN,
  FACTOR_DRAW,
  CHASER_SPEED_MULTIPLIERS,
  THREAT_LEVELS,
  COLORS,
  SURVEY_SCALE_OPTIONS,
  BUILD_OPTION_LABELS,
  BUILD_ALLOCATION_TOTAL,
  BUILD_ALLOCATION_MIN,
  PRE_RESPONSE_KEYS,
  POST_EXPERIENCE_KEYS,
  QUESTION_CATEGORY_KEYS,
  QUESTION_TYPE_KEYS,
  preSurveySchema,
  postSurveySchema,
  SURVEY_STEP_KEYS,
  SURVEY_STEP_META,
  SURVEY_GROUP_META,
  makeChoice,
  DEFAULT_GRADE_BAND,
  EXACT_PLAYER_GRADE_BANDS,
  normalizePlayerGradeBand,
  getGradeBandFromSearch,
  createGradeBandStore,
  questionMatchesPlayerBand,
  inferredChoiceTelemetryTags,
  importedCorrectLetterToIndex,
  learningQuestionBank,
  signalQuestionBank,
  getLearningQuestionPool,
  getSafeZoneQuestionPool,
  getSignalQuestionPool,
  getWrapScenarioPool,
  getThreatScenarioPool,
  copingTools,
  protectiveFactorPool,
  riskFactorPool,
  factorSpawnPoints,
  wallSegments,
  safeSpaces,
  playerSpawn,
  chaserSpawns,
  RISK_POINT_DRAIN,
  factorSummaryCopy
};
