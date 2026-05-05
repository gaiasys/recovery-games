import {
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
  getGridDimensions,
  CHASER_NAMES,
  CHASER_SPEED_MULTIPLIERS,
  THREAT_LEVELS,
  getLearningQuestionPool,
  getSignalQuestionPool,
  copingTools,
  wallSegments,
  safeSpaces,
  playerSpawn,
  chaserSpawns
} from "./data.js";

import {
  updateHUD,
  resetScenarioModalUI,
  closeScenarioUI,
  showScenarioResult,
  openPostRunDecision,
  openEndedState
} from "./ui.js";

import {
  createTelemetryState,
  createFactorTelemetryState,
  resetRunTelemetry,
  logEvent,
  updateChanceMetrics,
  updatePointMetrics,
  recordQuestionPresented,
  recordQuestionAnswered,
  getChoiceTelemetryTags,
  getTelemetrySnapshot
} from "./telemetry.js";

import { createFactorSystem } from "./factors.js";

const SAFE_ZONE_ENTRY_BONUS_COOLDOWN_MS = 15000;
const CHASER_COLLIDER_W = 30;
const CHASER_COLLIDER_H = 30;
const CHASER_NAV_W = 20;
const CHASER_NAV_H = 20;

const CHASER_STEP_THRESHOLD = 12;
const CHASER_AMBUSH_CELLS = 2;
const CHASER_SHADE_RETREAT_RADIUS = CELL_SIZE * 8;
const CHASER_STUCK_REPATH_FRAMES = 6;
const CHASER_CENTER_EPSILON = 1.5;
const CHASER_MIN_SPEED = 1.18;
const CHASER_DIRECTION_TIE_BIAS = {
  solar: ["up", "left", "down", "right"],
  ember: ["left", "up", "right", "down"],
  frost: ["down", "right", "up", "left"],
  shade: ["right", "down", "left", "up"]
};

const CHASER_MODE_SCHEDULE = [
  { mode: "scatter", durationMs: 5500 },
  { mode: "chase", durationMs: 14000 },
  { mode: "scatter", durationMs: 4500 },
  { mode: "chase", durationMs: 16000 },
  { mode: "scatter", durationMs: 3500 },
  { mode: "chase", durationMs: Infinity }
];

const QUESTION_PRIORITY_WEIGHTS = [4, 2, 1];
const SIGNAL_MIN_RUN_MS = 25000;
const SIGNAL_POST_RESPAWN_BLOCK_MS = 12000;
const SIGNAL_REPEAT_COOLDOWN_MS = 45000;
const COPING_HIGH_DANGER_EXPIRE_MS = 4000;
const SUPPORT_MAX_ACTIVE_MS = 15000;

function nowMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

export function createDefaultPlayerProfile() {
  return {
    challengePriority: ["peer", "facts", "personal"],
    defensePriority: ["refusal_skills", "environmental_control", "social_agency"],
    recoveryPriority: ["stress_management", "creative_outlets", "physical_activity"],
    safeZonePriority: ["school", "family", "peer"],
    factFindingTool: ["direct_knowledge", "external_research", "collaborative_problem_solving"],
    cheatCode: ["strategic_planning", "internal_motivation", "situational_awareness"]
  };
}

function createLearningRunState() {
  return {
    correctQuestionIds: [],
    wrongQuestionIds: [],
    lastWrongRepeatCandidate: null,
    interveningLearningCount: 0,
    lastPresentedQuestionId: null
  };
}

function createSignalRunState() {
  return {
    signalOwed: true,
    signalsShownThisChanceSegment: 0,
    signalsShownThisRun: 0,
    signalsShownThisSession: 0,
    lastSignalAt: 0,
    lastSignalZone: null,
    lastSignalId: null,
    chanceSegmentIndex: 0,
    zoneSignalServedThisRun: { school: false, family: false, peer: false },
    lastPromptType: null,
    lastRespawnAt: 0
  };
}

function createCopingState() {
  return {
    active: false,
    activeToolId: null,
    startedAt: 0,
    endReason: null,
    highDangerSince: 0,
    lastDripAt: 0,
    expirationThresholdMs: COPING_HIGH_DANGER_EXPIRE_MS
  };
}

function createSupportState() {
  return {
    active: false,
    supportId: null,
    source: null,
    startedAt: 0,
    endsAt: 0,
    endReason: null,
    chanceSegmentIndex: 0
  };
}

function createSelectionTelemetry() {
  return {
    correctSuppressed: 0,
    blockedWrongRepeat: false,
    interveningLearningCount: 0
  };
}

function arrayIncludesId(arr, id) {
  return Array.isArray(arr) && arr.includes(id);
}

function rememberLearningAnswerResult(state, questionId, isCorrect) {
  if (!questionId) return;
  state.learningState ||= createLearningRunState();
  if (isCorrect) {
    state.learningState.correctQuestionIds = Array.from(new Set([...(state.learningState.correctQuestionIds || []), questionId]));
    state.learningState.wrongQuestionIds = (state.learningState.wrongQuestionIds || []).filter((id) => id !== questionId);
    if (state.learningState.lastWrongRepeatCandidate === questionId) {
      state.learningState.lastWrongRepeatCandidate = null;
      state.learningState.interveningLearningCount = 0;
    }
  } else if (!arrayIncludesId(state.learningState.correctQuestionIds, questionId)) {
    state.learningState.wrongQuestionIds = Array.from(new Set([...(state.learningState.wrongQuestionIds || []), questionId]));
    state.learningState.lastWrongRepeatCandidate = questionId;
    state.learningState.interveningLearningCount = 0;
  }
}

function filterLearningQuestionsForRun(state, pool) {
  state.learningState ||= createLearningRunState();
  const lastId = state.learningState.lastPresentedQuestionId;
  const correctIds = new Set(state.learningState.correctQuestionIds || []);
  const wrongIds = new Set(state.learningState.wrongQuestionIds || []);
  const candidate = state.learningState.lastWrongRepeatCandidate;
  const intervening = state.learningState.interveningLearningCount || 0;

  let correctSuppressed = 0;
  let blockedWrongRepeat = false;

  let filtered = (pool || []).filter((question) => {
    if (!question?.id) return false;
    if (correctIds.has(question.id)) {
      correctSuppressed += 1;
      return false;
    }
    if (question.id === lastId) {
      return false;
    }
    if (question.id === candidate && wrongIds.has(question.id) && intervening < 1) {
      blockedWrongRepeat = true;
      return false;
    }
    return true;
  });

  if (!filtered.length) {
    filtered = (pool || []).filter((question) => question?.id && !correctIds.has(question.id) && question.id !== lastId);
  }

  state.selectionTelemetry = {
    correctSuppressed,
    blockedWrongRepeat,
    interveningLearningCount: intervening
  };
  return filtered;
}

function getCopingConfigForToolId(toolId) {
  if (toolId === "stress_management") {
    return {
      baseSpeedBonus: 0.04,
      clearLagOnActivate: true,
      invulnerableMs: 0,
      nearMissBonus: 0,
      burstSpeedBonus: 0.06,
      burstDurationMs: 700,
      dangerDistanceBuffer: -8,
      protectiveDripAmount: 0,
      protectiveDripIntervalMs: 0
    };
  }

  if (toolId === "creative_outlets") {
    return {
      baseSpeedBonus: 0.08,
      clearLagOnActivate: false,
      invulnerableMs: 0,
      nearMissBonus: 10,
      burstSpeedBonus: 0.1,
      burstDurationMs: 900,
      dangerDistanceBuffer: 0,
      protectiveDripAmount: 0.25,
      protectiveDripIntervalMs: 1500
    };
  }

  if (toolId === "physical_activity") {
    return {
      baseSpeedBonus: 0.12,
      clearLagOnActivate: true,
      invulnerableMs: 1100,
      nearMissBonus: 4,
      burstSpeedBonus: 0.2,
      burstDurationMs: 1200,
      dangerDistanceBuffer: 0,
      protectiveDripAmount: 0,
      protectiveDripIntervalMs: 0
    };
  }

  return {
    baseSpeedBonus: 0,
    clearLagOnActivate: false,
    invulnerableMs: 0,
    nearMissBonus: 0,
    burstSpeedBonus: 0,
    burstDurationMs: 0,
    dangerDistanceBuffer: 0,
    protectiveDripAmount: 0,
    protectiveDripIntervalMs: 0
  };
}

function getActiveCopingConfig(state) {
  const toolId = state?.copingState?.active ? state?.copingState?.activeToolId : null;
  return getCopingConfigForToolId(toolId);
}

function getBasePlayerSpeed(state) {
  const config = getActiveCopingConfig(state);
  return PLAYER_BASE_SPEED + (config.baseSpeedBonus || 0);
}

function getRecoveryToolVisual(toolId) {
  if (toolId === "stress_management") {
    return {
      icon: "⚡",
      label: "Stress Management",
      color: "#8BEAFF",
      perks: ["Steady Reset", "Speed Burst"]
    };
  }

  if (toolId === "creative_outlets") {
    return {
      icon: "✨",
      label: "Creative Outlets",
      color: "#67FF94",
      perks: ["Protective Point Drip", "Near-Miss Bonus"]
    };
  }

  if (toolId === "physical_activity") {
    return {
      icon: "🔥",
      label: "Physical Activity",
      color: "#FFD95A",
      perks: ["Fastest Boost", "Brief Protection"]
    };
  }

  return {
    icon: "⚡",
    label: "Recovery Move",
    color: "#8BEAFF",
    perks: ["Recovery Active"]
  };
}

function getPowerUpVisual(powerUpId) {
  if (powerUpId === "strategic_planning") {
    return {
      icon: "🧭",
      label: "Planning Ahead",
      color: "#8BEAFF",
      perk: "Better routes and safer setup"
    };
  }

  if (powerUpId === "internal_motivation") {
    return {
      icon: "💪",
      label: "Inner Strength",
      color: "#FFD95A",
      perk: "Stronger recovery after pressure"
    };
  }

  if (powerUpId === "situational_awareness") {
    return {
      icon: "👁",
      label: "Paying Attention",
      color: "#C689FF",
      perk: "Earlier danger awareness"
    };
  }

  return {
    icon: "⭐",
    label: "Power-Up",
    color: "#FFD95A",
    perk: "Passive bonus active"
  };
}

function showPowerUpReadyText(state) {
  const powerUpId = state?.playerProfile?.cheatCode?.[0];
  if (!powerUpId) return;

  const visual = getPowerUpVisual(powerUpId);
  const fxX = state.player.x + state.player.w / 2;
  const fxY = state.player.y - 38;

  spawnPickupText(state, fxX, fxY, `${visual.icon} Power-Up: ${visual.label}`, visual.color);
  spawnPickupText(state, fxX, fxY + 16, visual.perk, visual.color);
  spawnPickupBurst(state, fxX, fxY + 12, visual.color);

  logEvent(state, "power_up_ready_shown", {
    powerUpId,
    label: visual.label
  });
}

function expireCopingState(state, reason = "ended") {
  if (!state?.copingState?.active) return false;
  const endedAt = Date.now();
  const activeToolId = state.copingState.activeToolId;
  const startedAt = state.copingState.startedAt || endedAt;
  const highDangerDuration = state.copingState.highDangerSince ? Math.max(0, endedAt - state.copingState.highDangerSince) : 0;
  state.copingState.active = false;
  state.copingState.endReason = reason;
  state.copingState.highDangerSince = 0;
  state.copingState.lastDripAt = 0;
  state.copingState.activeToolId = null;
  state.playerState.lastSelectedCopingTool = null;
  clearLag(state);
  state.telemetry.copingEnd.push(endedAt);
  state.telemetry.copingEndReason.push(reason);
  state.telemetry.highDangerDuration.push(highDangerDuration);
  logEvent(state, "coping_state_ended", { reason, activeToolId, startedAt, endedAt, highDangerDuration });
  return true;
}

function startSupportCycle(state, { supportId, source }) {
  const now = Date.now();
  const preSurveyCopingSkill = state.playerProfile?.recoveryPriority?.[0] || null;

  state.supportState = {
    active: true,
    supportId,
    source,
    startedAt: now,
    endsAt: now + SUPPORT_MAX_ACTIVE_MS,
    endReason: null,
    chanceSegmentIndex: state.signalState?.chanceSegmentIndex || 1
  };

  applyRecoveryToolEffect(state, supportId);
const labelMap = {
  stress_management: "Stress Management",
  creative_outlets: "Creative Outlets",
  physical_activity: "Physical Activity"
};

const label = labelMap[supportId] || "Support";

const fxX = state.player.x + state.player.w / 2;
const fxY = state.player.y - 40;

spawnPickupText(state, fxX, fxY, "Support Active", "#8BEAFF");
spawnPickupText(state, fxX, fxY + 16, `${label}`, "#FFFFFF");

  state.telemetry.currentSupportCycle = {
    runNumber: state.telemetry.currentRunNumber,
    chanceSegmentIndex: state.supportState.chanceSegmentIndex,
    source,
    preSurveyCopingSkill,
    selectedSupport: supportId,
    matchedPreSurveyChoice: supportId === preSurveyCopingSkill,
    startedAt: now,
    endedAt: null,
    durationMs: null,
    endReason: null
  };

  logEvent(state, "support_cycle_started", {
    supportId,
    source,
    preSurveyCopingSkill,
    matchedPreSurveyChoice: supportId === preSurveyCopingSkill
  });
}

function endSupportCycle(state, reason = "ended") {
  if (!state.supportState?.active) return false;

  const endedAt = Date.now();
  const cycle = state.telemetry.currentSupportCycle;

  state.supportState.active = false;
  state.supportState.endReason = reason;

  if (cycle) {
    cycle.endedAt = endedAt;
    cycle.durationMs = endedAt - cycle.startedAt;
    cycle.endReason = reason;
    state.telemetry.supportCycles.push({ ...cycle });
    state.telemetry.currentSupportCycle = null;
  }

  expireCopingState(state, reason);
  showSupportEndedFeedback(state, reason);

  logEvent(state, "support_cycle_ended", {
    reason,
    supportId: state.supportState.supportId,
    durationMs: cycle?.durationMs || null
  });

  return true;
}

function updateSupportState(state) {
  if (!state.supportState?.active) return;

  if (Date.now() >= state.supportState.endsAt) {
    endSupportCycle(state, "max_time_reached");
  }
}

function beginChanceSegment(state) {
  state.signalState ||= createSignalRunState();
  state.signalState.signalOwed = true;
  state.signalState.signalsShownThisChanceSegment = 0;
  state.signalState.lastRespawnAt = Date.now();
  state.signalState.chanceSegmentIndex += 1;
}

function shouldOfferSignalInZone(state, zoneType) {
  const now = Date.now();
  const runStartedAt = state.telemetry?.runStart || now;
  state.signalState ||= createSignalRunState();
  state.signalState.signalOwed = state.signalState.signalsShownThisChanceSegment < 1 && state.signalState.signalsShownThisRun < 2 && state.signalState.signalsShownThisSession < 5;
  if (!state.signalState.signalOwed) return false;
  if (state.signalState.lastPromptType === "signal") return false;
  if (state.signalState.zoneSignalServedThisRun?.[zoneType]) return false;
  if (now - runStartedAt < SIGNAL_MIN_RUN_MS) return false;
  if (now - (state.signalState.lastRespawnAt || runStartedAt) < SIGNAL_POST_RESPAWN_BLOCK_MS) return false;
  if (state.signalState.lastSignalAt && now - state.signalState.lastSignalAt < SIGNAL_REPEAT_COOLDOWN_MS) return false;
  return true;
}

function noteQuestionPresented(state, question) {
  state.signalState ||= createSignalRunState();
  state.learningState ||= createLearningRunState();
  if (question?.type === "signal") {
    state.signalState.lastPromptType = "signal";
    return;
  }
  state.signalState.lastPromptType = "learning";
  if (state.learningState.lastWrongRepeatCandidate && question?.id && question.id !== state.learningState.lastWrongRepeatCandidate) {
    state.learningState.interveningLearningCount += 1;
  }
  state.learningState.lastPresentedQuestionId = question?.id || null;
}

function markSignalServed(state, zoneType, signalId = null) {
  state.signalState ||= createSignalRunState();
  state.signalState.signalOwed = false;
  state.signalState.signalsShownThisChanceSegment += 1;
  state.signalState.signalsShownThisRun += 1;
  state.signalState.signalsShownThisSession += 1;
  state.signalState.lastSignalAt = Date.now();
  state.signalState.lastSignalZone = zoneType || null;
  state.signalState.lastSignalId = signalId || null;
  if (zoneType && state.signalState.zoneSignalServedThisRun) {
    state.signalState.zoneSignalServedThisRun[zoneType] = true;
  }
}

function openRespawnCopingModal(state, dom) {
  if (!dom) return false;
  state.lastModalAt = Date.now();
  state.scenarioOpen = true;
  state.pendingResolution = null;
  state.modalContext = {
    kind: "respawn_coping",
    step: "coping",
    source: "respawn",
    copingShownAt: nowMs(),
    questionShownAt: null,
    selectedCopingTool: null,
    usedCollaboration: false,
    teamSuggestionIndex: null,
    teamSuggestionShownAt: null,
    zoneType: null,
    question: null,
    exposureId: null
  };
  Object.keys(state.keys || {}).forEach((key) => { state.keys[key] = false; });
  renderModalStep(state, dom);
  dom?.scenarioModal?.classList.remove("hidden");
  logEvent(state, "respawn_coping_prompt_opened", {
    chanceSegmentIndex: state.signalState?.chanceSegmentIndex || 0,
    remainingStability: state.playerState?.stability || 0
  });
  return true;
}

function openSignalQuestion(state, dom, zoneType) {
  const pool = getSignalQuestionPool(zoneType, state.currentGradeBand).filter((question) => question.zoneType === zoneType);
  if (!pool.length) return false;
  const question = pool[Math.floor(Math.random() * pool.length)];
  const opened = openQuestionModal(state, dom, question, {
    source: "signal",
    zoneType,
    requireCoping: false
  });
  if (opened) markSignalServed(state, zoneType, question.id);
  return opened;
}

function openSafeZonePrompt(state, dom, zoneType) {
  if (shouldOfferSignalInZone(state, zoneType)) {
    const openedSignal = openSignalQuestion(state, dom, zoneType);
    if (openedSignal) return true;
  }
  return openSafeZoneQuestion(state, dom, zoneType);
}

function getChaserName(index) {
  return CHASER_NAMES[index] || `chaser_${index}`;
}

function createChaserFromSpawn(spawn, index) {
  const dir = spawn.x > playerSpawn.x ? { dc: -1, dr: 0 } : { dc: 1, dr: 0 };

  return {
    name: getChaserName(index),
    spawnX: spawn.x,
    spawnY: spawn.y,
    x: spawn.x,
    y: spawn.y,
    w: CHASER_COLLIDER_W,
    h: CHASER_COLLIDER_H,
    speed: 1.0,
    active: index === 0,
    stuckFrames: 0,
    dir,
    lastMoveAxis: dir.dc ? "x" : "y"
  };
}

function clearChaserPaths(state) {
  (state.chasers || []).forEach((chaser) => {
    chaser.stuckFrames = 0;
    if (!chaser.dir || (!chaser.dir.dc && !chaser.dir.dr)) {
      chaser.dir = chaser.x > playerSpawn.x ? { dc: -1, dr: 0 } : { dc: 1, dr: 0 };
    }
  });
}

function resetChaserModeState(state) {
  state.chaserMode = CHASER_MODE_SCHEDULE[0].mode;
  state.chaserModeIndex = 0;
  state.chaserModeUntil = Number.isFinite(CHASER_MODE_SCHEDULE[0].durationMs)
    ? Date.now() + CHASER_MODE_SCHEDULE[0].durationMs
    : Infinity;

  clearChaserPaths(state);
}

export function updateChaserMode(state) {
  if (!state.gameStarted) return;

  if (!state.chaserModeUntil) {
    resetChaserModeState(state);
    return;
  }

  const now = Date.now();
  let changed = false;

  while (
    now >= state.chaserModeUntil &&
    state.chaserModeIndex < CHASER_MODE_SCHEDULE.length - 1
  ) {
    state.chaserModeIndex += 1;
    state.chaserMode = CHASER_MODE_SCHEDULE[state.chaserModeIndex].mode;

    const nextDuration = CHASER_MODE_SCHEDULE[state.chaserModeIndex].durationMs;
    state.chaserModeUntil = Number.isFinite(nextDuration)
      ? now + nextDuration
      : Infinity;

    changed = true;
  }

  if (changed) {
    clearChaserPaths(state);

    logEvent(state, "chaser_mode_changed", {
      mode: state.chaserMode,
      scheduleIndex: state.chaserModeIndex
    });
  }
}

function getPlayerCenter(state) {
  return {
    x: state.player.x + state.player.w / 2,
    y: state.player.y + state.player.h / 2
  };
}

function makeTargetRect(x, y) {
  return {
    x: x - CHASER_COLLIDER_W / 2,
    y: y - CHASER_COLLIDER_H / 2,
    w: CHASER_COLLIDER_W,
    h: CHASER_COLLIDER_H
  };
}

function getPlayerDirectionVector(state) {
  let dx = 0;
  let dy = 0;

  if (state.keys["arrowleft"] || state.keys.a) dx -= 1;
  if (state.keys["arrowright"] || state.keys.d) dx += 1;
  if (state.keys["arrowup"] || state.keys.w) dy -= 1;
  if (state.keys["arrowdown"] || state.keys.s) dy += 1;

  if (dx !== 0) dx = Math.sign(dx);
  if (dy !== 0) dy = Math.sign(dy);

  return { dx, dy };
}

function getStoredPlayerDirectionVector(state) {
  const liveDirection = getPlayerDirectionVector(state);

  if (liveDirection.dx || liveDirection.dy) {
    return liveDirection;
  }

  const stored = state.playerHeading || { dx: 1, dy: 0 };
  if (stored.dx || stored.dy) {
    return stored;
  }

  return { dx: 1, dy: 0 };
}

function getProjectedPlayerTargetRect(state, cellsAhead = CHASER_AMBUSH_CELLS) {
  const { dx, dy } = getStoredPlayerDirectionVector(state);
  const center = getPlayerCenter(state);
  const distance = CELL_SIZE * cellsAhead;

  return makeTargetRect(center.x + dx * distance, center.y + dy * distance);
}

function getScatterTargetRect(state, index) {
  const pad = 24;

  const corners = [
    { x: state.canvasWidth - pad, y: pad },
    { x: pad, y: pad },
    { x: state.canvasWidth - pad, y: state.canvasHeight - pad },
    { x: pad, y: state.canvasHeight - pad }
  ];

  const corner = corners[index % corners.length];
  return makeTargetRect(corner.x, corner.y);
}

function getSafeZoneRetreatTargetRect(state, index) {
  const safeZone = getSafeZoneAtRect(state.player);
  if (!safeZone) {
    return getScatterTargetRect(state, index);
  }

  const safeCenter = {
    x: safeZone.x + safeZone.w / 2,
    y: safeZone.y + safeZone.h / 2
  };

  const pad = 24;
  const corners = [
    { x: state.canvasWidth - pad, y: pad },
    { x: pad, y: pad },
    { x: state.canvasWidth - pad, y: state.canvasHeight - pad },
    { x: pad, y: state.canvasHeight - pad }
  ];

  const farCorner = corners
    .map((corner) => ({
      ...corner,
      distance: Math.hypot(corner.x - safeCenter.x, corner.y - safeCenter.y)
    }))
    .sort((a, b) => b.distance - a.distance)[0];

  const offsets = [
    { x: 0, y: 0 },
    { x: -28, y: 0 },
    { x: 0, y: -28 },
    { x: -28, y: -28 }
  ];

  const offset = offsets[index % offsets.length];

  const targetX = Math.max(
    pad,
    Math.min(state.canvasWidth - pad, farCorner.x + offset.x)
  );

  const targetY = Math.max(
    pad,
    Math.min(state.canvasHeight - pad, farCorner.y + offset.y)
  );

  return makeTargetRect(targetX, targetY);
}

function getNamedChaserTargetRect(state, index) {
  const name = getChaserName(index);
  const playerCenter = getPlayerCenter(state);

  if (name === "solar") {
    return makeTargetRect(playerCenter.x, playerCenter.y);
  }

  if (name === "ember") {
    return getProjectedPlayerTargetRect(state, 2);
  }

  if (name === "frost") {
    const solar = state.chasers[0];
    if (!solar) {
      return getProjectedPlayerTargetRect(state, 2);
    }

    const projected = getProjectedPlayerTargetRect(state, 2);
    const solarCenterX = solar.x + solar.w / 2;
    const solarCenterY = solar.y + solar.h / 2;
    const projectedCenterX = projected.x + projected.w / 2;
    const projectedCenterY = projected.y + projected.h / 2;

    const vx = projectedCenterX - solarCenterX;
    const vy = projectedCenterY - solarCenterY;

    return makeTargetRect(
      solarCenterX + vx * 2,
      solarCenterY + vy * 2
    );
  }

  const shade = state.chasers[index];
  if (shade) {
    const shadeCenterX = shade.x + shade.w / 2;
    const shadeCenterY = shade.y + shade.h / 2;
    const distance = Math.hypot(
      playerCenter.x - shadeCenterX,
      playerCenter.y - shadeCenterY
    );

    if (distance < CHASER_SHADE_RETREAT_RADIUS) {
      return getScatterTargetRect(state, index);
    }
  }

  return makeTargetRect(playerCenter.x, playerCenter.y);
}

function getChaserTargetForCurrentState(state, index) {
  if (isInSafeSpace(state.player)) {
    return getSafeZoneRetreatTargetRect(state, index);
  }

  if (state.chaserMode === "scatter") {
    return getScatterTargetRect(state, index);
  }

  return getNamedChaserTargetRect(state, index);
}

function getDistanceBetweenRects(a, b) {
  const ax = a.x + a.w / 2;
  const ay = a.y + a.h / 2;
  const bx = b.x + b.w / 2;
  const by = b.y + b.h / 2;
  return Math.hypot(bx - ax, by - ay);
}

export function createGameState({ canvasWidth = 855, canvasHeight = 670, gradeBand = "7-8" } = {}) {
  const grid = getGridDimensions(canvasWidth, canvasHeight, CELL_SIZE);

  return {
    canvasWidth,
    canvasHeight,
    grid,
    currentGradeBand: gradeBand,
    appPhase: "pre",
    lastRunEndReason: "chances_depleted",
    gameStarted: false,
    scenarioOpen: false,
    currentThreatLevel: 0,
    levelBannerUntil: 0,
    levelBannerText: "",
    pendingResolution: null,
    playerWasInSafeSpace: false,
    currentSafeZoneType: null,
    chaserPassability: null,
    lastFrameTime: nowMs(),
    lastModalAt: 0,
    lastWrapScenarioAt: 0,
    playerProfile: createDefaultPlayerProfile(),
    telemetry: createTelemetryState(),
    factorTelemetry: createFactorTelemetryState(),
    selectionTelemetry: createSelectionTelemetry(),
    learningState: createLearningRunState(),
    signalState: createSignalRunState(),
    copingState: createCopingState(),
    supportState: createSupportState(),
    playerState: {
      stability: STARTING_STABILITY,
      protectivePoints: 0,
      currentSafeZone: null,
      lastSupportPromptAt: 0,
      lastSelectedCopingTool: null
    },
    countdown: {
  	active: false,
 	endsAt: 0,
 	displayValue: 0,
  	goUntil: 0,
  	source: "manual"
    },
    player: {
      x: playerSpawn.x,
      y: playerSpawn.y,
      w: 18,
      h: 22,
      speed: PLAYER_BASE_SPEED,
      invulnerableUntil: 0
    },
    playerHeading: { dx: 1, dy: 0 },
    chasers: chaserSpawns.map((spawn, index) => createChaserFromSpawn(spawn, index)),
    chaserMode: "scatter",
    chaserModeIndex: 0,
    chaserModeUntil: 0,
    keys: {},
    effectState: {
      speedUntil: 0,
      shieldUntil: 0
    },
    safeZonePromptHistory: {
      school: 0,
      family: 0,
      peer: 0
    },
    safeZoneEntryBonusHistory: {
      school: 0,
      family: 0,
      peer: 0
    },
    threatState: {
      inDanger: false,
      nearestDistance: Infinity,
      lastNearMissAt: 0,
      lastThreatScenarioAt: 0,
      lastThreatScenarioCheckAt: 0
    },
    activeProtectiveFactors: [],
    activeRiskFactors: [],
    nextProtectiveSpawnAt: 0,
    nextRiskSpawnAt: 0,
    factorSpawnHistoryByRegion: {},
    modalContext: null,
    pickupTexts: [],
    pickupBursts: []
  };
}

const RUN_COUNTDOWN_MS = 3000;
const RUN_GO_FLASH_MS = 700;

function clearPressedKeys(state) {
  Object.keys(state.keys || {}).forEach((key) => {
    state.keys[key] = false;
  });
}

function beginLiveRun(state, dom, { draw = null, source = "manual", sfx = null } = {}) {
  state.gameStarted = true;
  state.countdown.active = false;
  state.countdown.displayValue = 0;
  state.countdown.goUntil = Date.now() + RUN_GO_FLASH_MS;
  state.lastFrameTime = nowMs();

  state.telemetry.runStart = Date.now();

  updateThreatLevel(state);
  state.chaserMode = "chase";
  state.chaserModeIndex = 1;
  state.chaserModeUntil = Date.now() + CHASER_MODE_SCHEDULE[1].durationMs;
  clearChaserPaths(state);

  updateHUD({
  dom,
  currentThreatLevel: state.currentThreatLevel,
  playerState: state.playerState,
  copingState: state.copingState,
  telemetry: state.telemetry,
  playerProfile: state.playerProfile,
  getReadableTool
});

startSupportCycle(state, {
  supportId: state.playerProfile.recoveryPriority[0],
  source: "pre_survey"
});

  if (typeof draw === "function") draw();

  logEvent(state, "run_started", {
    source,
    runNumber: state.telemetry.currentRunNumber,
    sessionId: state.telemetry.sessionId,
    runId: state.telemetry.runId,
    gradeBand: state.currentGradeBand
  });
}

function updateRunCountdown(state, dom, { draw = null, sfx = null } = {}) {
  if (!state.countdown?.active) return false;

  const remainingMs = state.countdown.endsAt - Date.now();

  if (remainingMs > 2000) state.countdown.displayValue = 3;
  else if (remainingMs > 1000) state.countdown.displayValue = 2;
  else if (remainingMs > 0) state.countdown.displayValue = 1;

  if (remainingMs <= 0) {
    beginLiveRun(state, dom, {
      draw,
      source: state.countdown.source || "manual",
      sfx
    });
    return true;
  }

  if (typeof draw === "function") draw();
  return true;
}

export function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export function hitsWall(rect) {
  return wallSegments.some((wall) => rectsOverlap(rect, wall));
}

export function getSafeZoneAtRect(rect) {
  return safeSpaces.find((safe) => rectsOverlap(rect, safe)) || null;
}

export function hitsSafeSpace(rect) {
  return !!getSafeZoneAtRect(rect);
}

export function isInSafeSpace(entity) {
  return !!getSafeZoneAtRect(entity);
}

export function applyHorizontalWrap(state, rect) {
  const wrappedRect = { ...rect };

  const WRAP_TUNNEL_TOP = 305;
  const WRAP_TUNNEL_BOTTOM = 305 + 56;
  const WRAP_EXIT_X = 40;
  const WRAP_TRIGGER_PAD = 2;

  const centerY = wrappedRect.y + wrappedRect.h / 2;
  const inWrapTunnel =
    centerY >= WRAP_TUNNEL_TOP && centerY <= WRAP_TUNNEL_BOTTOM;

  if (!inWrapTunnel) {
    return { rect: wrappedRect, wrapped: false };
  }

  if (wrappedRect.x <= -WRAP_TRIGGER_PAD) {
    wrappedRect.x = state.canvasWidth - WRAP_EXIT_X - wrappedRect.w;
    return { rect: wrappedRect, wrapped: true };
  }

  if (wrappedRect.x + wrappedRect.w >= state.canvasWidth + WRAP_TRIGGER_PAD) {
    wrappedRect.x = WRAP_EXIT_X;
    return { rect: wrappedRect, wrapped: true };
  }

  return { rect: wrappedRect, wrapped: false };
}

export function clampVertical(state, entity) {
  entity.y = Math.max(0, Math.min(state.canvasHeight - entity.h, entity.y));
}

export function pointToCell(x, y) {
  return {
    col: Math.floor(x / CELL_SIZE),
    row: Math.floor(y / CELL_SIZE)
  };
}

export function cellCenter(col, row) {
  return {
    x: col * CELL_SIZE + CELL_SIZE / 2,
    y: row * CELL_SIZE + CELL_SIZE / 2
  };
}

export function cellIndex(state, col, row) {
  return row * state.grid.cols + col;
}

export function isCellPassable(state, col, row, blockSafeSpaces = true) {
  if (col < 0 || col >= state.grid.cols || row < 0 || row >= state.grid.rows) {
    return false;
  }

  const center = cellCenter(col, row);
  const testRect = {
    x: center.x - CHASER_NAV_W / 2,
    y: center.y - CHASER_NAV_H / 2,
    w: CHASER_NAV_W,
    h: CHASER_NAV_H
  };

  if (hitsWall(testRect)) return false;
  if (blockSafeSpaces && hitsSafeSpace(testRect)) return false;
  return true;
}

export function buildPassability(state) {
  const cells = new Array(state.grid.cols * state.grid.rows).fill(false);

  for (let row = 0; row < state.grid.rows; row += 1) {
    for (let col = 0; col < state.grid.cols; col += 1) {
      cells[cellIndex(state, col, row)] = isCellPassable(state, col, row, false);
    }
  }

  state.chaserPassability = cells;
  return cells;
}

export function findNearestPassableCell(state, col, row) {
  for (let radius = 0; radius < Math.max(state.grid.cols, state.grid.rows); radius += 1) {
    for (let r = row - radius; r <= row + radius; r += 1) {
      for (let c = col - radius; c <= col + radius; c += 1) {
        if (isCellPassable(state, c, r, false)) {
          return { col: c, row: r };
        }
      }
    }
  }

  return { col, row };
}

export function getNeighbors(state, col, row) {
  const offsets = [
    { dc: 1, dr: 0 },
    { dc: -1, dr: 0 },
    { dc: 0, dr: 1 },
    { dc: 0, dr: -1 }
  ];

  return offsets
    .map(({ dc, dr }) => ({ col: col + dc, row: row + dr }))
    .filter(({ col: nextCol, row: nextRow }) => isCellPassable(state, nextCol, nextRow, false));
}

export function findPath(state, startRect, goalRect) {
  const startCell = pointToCell(startRect.x + startRect.w / 2, startRect.y + startRect.h / 2);
  const goalCell = pointToCell(goalRect.x + goalRect.w / 2, goalRect.y + goalRect.h / 2);

  const safeStart = findNearestPassableCell(state, startCell.col, startCell.row);
  const safeGoal = findNearestPassableCell(state, goalCell.col, goalCell.row);

  const startKey = `${safeStart.col},${safeStart.row}`;
  const goalKey = `${safeGoal.col},${safeGoal.row}`;

  const frontier = [safeStart];
  const cameFrom = new Map([[startKey, null]]);

  while (frontier.length) {
    const current = frontier.shift();
    const currentKey = `${current.col},${current.row}`;

    if (currentKey === goalKey) break;

    for (const neighbor of getNeighbors(state, current.col, current.row)) {
      const key = `${neighbor.col},${neighbor.row}`;
      if (cameFrom.has(key)) continue;
      cameFrom.set(key, current);
      frontier.push(neighbor);
    }
  }

  if (!cameFrom.has(goalKey)) {
    return [];
  }

  const reversed = [];
  let step = safeGoal;

  while (step) {
    reversed.push(cellCenter(step.col, step.row));
    const key = `${step.col},${step.row}`;
    step = cameFrom.get(key);
  }

  return reversed.reverse();
}

export function weightedPickByPriority(items, priorityOrder, keyName) {
  const bag = [];

  items.forEach((item) => {
    let weight = 1;
    const value = item[keyName];
    const index = priorityOrder.indexOf(value);

    if (index === 0) weight = QUESTION_PRIORITY_WEIGHTS[0];
    else if (index === 1) weight = QUESTION_PRIORITY_WEIGHTS[1];
    else if (index === 2) weight = QUESTION_PRIORITY_WEIGHTS[2];

    for (let i = 0; i < weight; i += 1) {
      bag.push(item);
    }
  });

  if (!bag.length) return null;
  return bag[Math.floor(Math.random() * bag.length)];
}

export function pickAdaptiveQuestion(state, pool, keyName = "category") {
  const filteredPool = filterLearningQuestionsForRun(state, pool);
  if (!filteredPool.length) return null;
  return weightedPickByPriority(filteredPool, state.playerProfile.challengePriority, keyName);
}


export function getPrimaryProfileChoice(value) {
  return Array.isArray(value) ? value[0] : value;
}

export function getActiveFactFindingTool(state) {
  return getPrimaryProfileChoice(state.playerProfile.factFindingTool);
}

export function getActiveCheatCode(state) {
  return getPrimaryProfileChoice(state.playerProfile.cheatCode);
}

export function getRankWeightFromOrderedList(list, value) {
  const index = list.indexOf(value);
  if (index === 0) return 2;
  if (index === 1) return 1;
  return 0.5;
}

export function getRecoveryWeight(state, toolId) {
  return getRankWeightFromOrderedList(state.playerProfile.recoveryPriority, toolId);
}

export function getChallengeSettings(state, category) {
  const rank = state.playerProfile.challengePriority.indexOf(category);
  if (rank === 0) return { weight: 7, scoreMultiplier: 2.5 };
  if (rank === 1) return { weight: 3, scoreMultiplier: 1.5 };
  return { weight: 1, scoreMultiplier: 1 };
}

export function getChallengeRankMultiplier(state, category) {
  return getChallengeSettings(state, category).scoreMultiplier;
}

export function getSafePlaceSettings(state, zoneType) {
  const rank = state.playerProfile.safeZonePriority.indexOf(zoneType);

  if (rank === 0) {
    return {
      healOnEntry: 1,
      shieldMs: 1600,
      bonusQuestionStability: 1,
      bonusQuestionPoints: 0.5
    };
  }

  if (rank === 1) {
    return {
      healOnEntry: 0,
      shieldMs: 900,
      bonusQuestionStability: 0,
      bonusQuestionPoints: 0.25
    };
  }

  return {
    healOnEntry: 0,
    shieldMs: 400,
    bonusQuestionStability: 0,
    bonusQuestionPoints: 0
  };
}

export function getReadableTool(id) {
  const tool = copingTools.find((item) => item.id === id);
  return tool ? tool.label : "None";
}

export function getTopDefenseMechanism(state) {
  return state.playerProfile.defensePriority[0];
}

export function getDefenseSettings(state) {
  const topDefense = getTopDefenseMechanism(state);

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

export function getRecoverySettings(state, toolId) {
  const config = getCopingConfigForToolId(toolId);

  return {
    stabilityGain: 0,
    speedBoost: config.baseSpeedBonus,
    durationMs: config.burstDurationMs || 0,
    clearLag: !!config.clearLagOnActivate,
    bonusProtectivePoints: config.protectiveDripAmount || 0,
    invulnerableMs: config.invulnerableMs || 0,
    dangerDistanceBuffer: config.dangerDistanceBuffer || 0,
    nearMissBonus: config.nearMissBonus || 0,
    weight: getRecoveryWeight(state, toolId)
  };
}

export function getTruthToolSettings(state) {
  const tool = getActiveFactFindingTool(state);

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

export function getSpecialHelpSettings(state) {
  const help = getActiveCheatCode(state);

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

export function playSound(sound, volume = 0.4) {
  if (!sound) return;

  sound.pause();
  sound.currentTime = 0;
  sound.volume = volume;
  sound.play().catch(() => {});
}

export function adjustStability(state, delta, { sfx = null, reason = "unknown", meta = {} } = {}) {
  const before = state.playerState.stability;
  state.playerState.stability = Math.max(0, Math.min(12, state.playerState.stability + delta));
  const actualDelta = state.playerState.stability - before;

  if (actualDelta > 0 && sfx?.chanceGain) {
    playSound(sfx.chanceGain, 0.4);
  }

  if (actualDelta < 0 && sfx?.chanceLoss) {
    playSound(sfx.chanceLoss, 0.5);
  }

  updateChanceMetrics(state, actualDelta, reason, meta);
  return actualDelta;
}

export function adjustProtectivePoints(state, delta, { sfx = null, reason = "unknown", meta = {} } = {}) {
  const before = state.playerState.protectivePoints;
  state.playerState.protectivePoints = Math.max(0, state.playerState.protectivePoints + delta);
  const actualDelta = state.playerState.protectivePoints - before;

  if (actualDelta > 0 && reason === "protective_pickup" && sfx?.protectivePickup) {
    playSound(sfx.protectivePickup, 0.32);
  }

  if (actualDelta < 0 && reason === "risk_pickup" && sfx?.riskPickup) {
    playSound(sfx.riskPickup, 0.38);
  }

  updatePointMetrics(state, actualDelta, reason, meta);
  return actualDelta;
}

export function boostPlayer(state, speedValue, durationMs) {
  state.player.speed = speedValue;
  state.effectState.speedUntil = Date.now() + durationMs;
}

export function slowPlayer(state, speedValue, durationMs) {
  state.player.speed = speedValue;
  state.effectState.speedUntil = Date.now() + durationMs;
}

export function clearLag(state) {
  state.player.speed = getBasePlayerSpeed(state);
  state.effectState.speedUntil = 0;
}

export function grantShield(state, ms) {
  state.effectState.shieldUntil = Math.max(state.effectState.shieldUntil, Date.now() + ms);
}

export function hasShield(state) {
  return Date.now() < state.effectState.shieldUntil;
}

export function updateEffects(state, { sfx = null } = {}) {
  const now = Date.now();

  if (now > state.effectState.speedUntil) {
    state.player.speed = getBasePlayerSpeed(state);
  }

  if (!state.copingState?.active) {
    return;
  }

  const settings = getActiveCopingConfig(state);
  if (!settings.protectiveDripAmount || !settings.protectiveDripIntervalMs) {
    return;
  }

  if (!state.copingState.lastDripAt) {
    state.copingState.lastDripAt = state.copingState.startedAt || now;
  }

  while (now - state.copingState.lastDripAt >= settings.protectiveDripIntervalMs) {
  state.copingState.lastDripAt += settings.protectiveDripIntervalMs;

  const gained = adjustProtectivePoints(state, settings.protectiveDripAmount, {
    sfx,
    reason: "coping_tool_effect",
    meta: { copingTool: state.copingState.activeToolId }
  });

  if (gained > 0) {
    const visual = getRecoveryToolVisual(state.copingState.activeToolId);
    const fxX = state.player.x + state.player.w / 2;
    const fxY = state.player.y - 12;

    spawnPickupText(state, fxX, fxY, `${visual.icon} +${gained.toFixed(2)} Protective`, visual.color);
    spawnPickupBurst(state, fxX, fxY + 8, visual.color);
  }
 }
}

const factorSystem = createFactorSystem({
  randomBetween,
  hitsWall,
  hitsSafeSpace,
  rectsOverlap,
  hasShield,
  grantShield,
  boostPlayer,
  clearLag,
  adjustProtectivePoints,
  slowPlayer,
  logEvent,
  getSpecialHelpSettings,
  endSupportCycle
});

export function scheduleNextProtectiveSpawn(state) {
  return factorSystem.scheduleNextProtectiveSpawn(state);
}

export function scheduleNextRiskSpawn(state) {
  return factorSystem.scheduleNextRiskSpawn(state);
}

export function makeFactorInstance(def, x, y, type) {
  return factorSystem.makeFactorInstance(def, x, y, type);
}

export function isSpawnPointValid(state, point) {
  return factorSystem.isSpawnPointValid(state, point);
}

export function getUnusedSpawnPoints(state) {
  return factorSystem.getUnusedSpawnPoints(state);
}

export function spawnSingleFactor(state, type) {
  return factorSystem.spawnSingleFactor(state, type);
}

export function pruneExpiredFactors(state) {
  return factorSystem.pruneExpiredFactors(state);
}

export function updateFactorSpawning(state) {
  return factorSystem.updateFactorSpawning(state);
}

export function spawnPickupText(state, x, y, text, color) {
  return factorSystem.spawnPickupText(state, x, y, text, color);
}

export function spawnPickupBurst(state, x, y, color) {
  return factorSystem.spawnPickupBurst(state, x, y, color);
}

export function updatePickupFX(state) {
  return factorSystem.updatePickupFX(state);
}

export function getProtectivePickupDetail(factor) {
  return factorSystem.getProtectivePickupDetail(factor);
}

export function getRiskPickupDetail(factor, blocked = false) {
  return factorSystem.getRiskPickupDetail(factor, blocked);
}

export function applyProtectiveFactor(state, factor, { sfx = null } = {}) {
  return factorSystem.applyProtectiveFactor(state, factor, { sfx });
}

export function drainProtectivePoints(state, amount, meta = {}, { sfx = null } = {}) {
  return factorSystem.drainProtectivePoints(state, amount, meta, { sfx });
}

export function applyRiskFactor(state, factor, { sfx = null } = {}) {
  return factorSystem.applyRiskFactor(state, factor, { sfx });
}

export function checkFactorInteractions(state, { sfx = null } = {}) {
  return factorSystem.checkFactorInteractions(state, { sfx });
}

export function getSurvivalSeconds(state) {
  return Math.floor((Date.now() - state.telemetry.runStart) / 1000);
}

export function applySafeZoneEntryEffect(state, zoneType, { sfx = null } = {}) {
  const now = Date.now();

  if (now - state.safeZoneEntryBonusHistory[zoneType] < SAFE_ZONE_ENTRY_BONUS_COOLDOWN_MS) {
    return;
  }

  state.safeZoneEntryBonusHistory[zoneType] = now;

  const safePlace = getSafePlaceSettings(state, zoneType);
  const isHomeBase = state?.playerProfile?.safeZonePriority?.[0] === zoneType;
  const safeZone = safeSpaces.find((safe) => safe.type === zoneType);

  const fxX = safeZone ? safeZone.x + safeZone.w / 2 : state.player.x + state.player.w / 2;
  const fxY = safeZone ? safeZone.y + safeZone.h / 2 : state.player.y;
  const zoneColor = safeZone?.border || "#FFD95A";

  if (safePlace.healOnEntry) {
    adjustStability(state, safePlace.healOnEntry, {
      sfx,
      reason: "safe_zone_entry",
      meta: { zoneType }
    });
  }

  if (safePlace.shieldMs) {
    grantShield(state, safePlace.shieldMs);
  }

  if (isHomeBase) {
    spawnPickupText(state, fxX, fxY - 6, "HOME BASE BONUS", "#FFD95A");

    if (safePlace.healOnEntry > 0) {
      spawnPickupText(state, fxX, fxY + 10, `+${safePlace.healOnEntry} Chance`, "#67FF94");
    }

    if (safePlace.shieldMs > 0) {
      spawnPickupText(state, fxX, fxY + 26, "Shielded", "#8BEAFF");
    }

    spawnPickupBurst(state, fxX, fxY, "#FFD95A");
  } else if (safePlace.shieldMs > 0) {
    spawnPickupText(state, fxX, fxY, "Safe Zone", zoneColor);
    spawnPickupBurst(state, fxX, fxY, zoneColor);
  }

  logEvent(state, "safe_place_bonus_applied", {
    zoneType,
    isHomeBase,
    healOnEntry: safePlace.healOnEntry,
    shieldMs: safePlace.shieldMs
  });
}

export function applyRecoveryToolEffect(state, toolId, { sfx = null } = {}) {
  state.copingState ||= createCopingState();
  state.copingState.active = true;
  state.copingState.activeToolId = toolId;
  state.copingState.startedAt = Date.now();
  state.copingState.endReason = null;
  state.copingState.highDangerSince = 0;
  state.copingState.lastDripAt = state.copingState.startedAt;
  state.playerState.lastSelectedCopingTool = toolId;

  const settings = getActiveCopingConfig(state);
  const visual = getRecoveryToolVisual(toolId);
  const fxX = state.player.x + state.player.w / 2;
  const fxY = state.player.y - 8;

  spawnPickupText(state, fxX, fxY, `${visual.icon} ${visual.label}`, visual.color);
  spawnPickupText(state, fxX, fxY + 16, visual.perks.join(" + "), visual.color);
  spawnPickupBurst(state, fxX, fxY + 18, visual.color);

  if (settings.clearLagOnActivate) clearLag(state);
  if (settings.invulnerableMs) {
    state.player.invulnerableUntil = Math.max(state.player.invulnerableUntil, Date.now() + settings.invulnerableMs);
    spawnPickupText(state, fxX, fxY + 32, "Brief Protection", "#FFD95A");
  }
  if (settings.burstSpeedBonus) {
    boostPlayer(state, getBasePlayerSpeed(state) + settings.burstSpeedBonus, settings.burstDurationMs || 900);
  }

  state.telemetry.copingToolSelected.push(toolId);
  state.telemetry.copingStart.push(state.copingState.startedAt);
  logEvent(state, "coping_state_started", {
    toolId,
    chanceSegmentIndex: state.signalState?.chanceSegmentIndex || 0
  });

  return {
    speedBoost: settings.baseSpeedBonus,
    durationMs: settings.burstDurationMs || 0,
    weight: getRecoveryWeight(state, toolId)
  };
}

export function getCatchStabilityLoss(state) {
  const defense = getDefenseSettings(state);
  return Math.max(1, CATCH_STABILITY_LOSS - defense.catchLossReduction);
}

export function applyPostCatchDefenseEffect(state) {
  const topDefense = getTopDefenseMechanism(state);
  const defense = getDefenseSettings(state);

  state.player.invulnerableUntil = Math.max(
    state.player.invulnerableUntil,
    Date.now() + defense.invulnerableMs
  );

  if (defense.shieldMs) grantShield(state, defense.shieldMs);
  if (defense.speedBurst) {
    boostPlayer(state, PLAYER_BASE_SPEED + defense.speedBurst, defense.speedBurstMs);
  }

  logEvent(state, "defense_effect_applied", {
    defense: topDefense,
    invulnerableMs: defense.invulnerableMs,
    shieldMs: defense.shieldMs || 0,
    speedBurst: defense.speedBurst || 0
  });
}

export function getNearestActiveChaserDistance(state) {
  let nearest = Infinity;

  state.chasers.forEach((chaser) => {
    if (!chaser.active) return;

    const dx = chaser.x + chaser.w / 2 - (state.player.x + state.player.w / 2);
    const dy = chaser.y + chaser.h / 2 - (state.player.y + state.player.h / 2);
    nearest = Math.min(nearest, Math.hypot(dx, dy));
  });

  return nearest;
}

export function updateThreatLevel(state) {
  const seconds = getSurvivalSeconds(state);
  let levelIndex = 0;

  for (let i = 0; i < THREAT_LEVELS.length; i += 1) {
    if (seconds >= THREAT_LEVELS[i].time) {
      levelIndex = i;
    }
  }

  if (levelIndex !== state.currentThreatLevel) {
    state.currentThreatLevel = levelIndex;
    state.levelBannerUntil = Date.now() + 1800;
    state.levelBannerText = THREAT_LEVELS[levelIndex].label;
  }

  const config = THREAT_LEVELS[state.currentThreatLevel];
  state.telemetry.highestLevelReached = Math.max(
    state.telemetry.highestLevelReached,
    state.currentThreatLevel + 1
  );

  state.chasers.forEach((chaser, index) => {
    const wasActive = chaser.active;
    const nextActive = index < config.activeChasers;

    chaser.active = nextActive;
    chaser.speed = Math.max(
      CHASER_MIN_SPEED,
      config.speed * (CHASER_SPEED_MULTIPLIERS[index] || 1)
    );

    if (wasActive !== nextActive) {
      chaser.stuckFrames = 0;
      if (!nextActive) {
        chaser.dir = { dc: 0, dr: 0 };
      }
    }
  });
}

export function maybePromptSafeZoneSupport(state, zone) {
  const now = Date.now();
  if (!zone) return false;

  const lastPrompt = state.safeZonePromptHistory[zone.type] || 0;
  const sinceLastPrompt = now - lastPrompt;
  const sinceGlobalSupport = now - state.playerState.lastSupportPromptAt;

  if (sinceGlobalSupport < SAFE_ZONE_PROMPT_COOLDOWN_MS) return false;
  if (lastPrompt && sinceLastPrompt < SAFE_ZONE_REPEAT_MS) return false;

  state.safeZonePromptHistory[zone.type] = now;
  state.playerState.lastSupportPromptAt = now;
  return true;
}

export function updateSafeSpaceTracking(state, deltaMs, openSafeZoneQuestionFn, { sfx = null } = {}) {
  const safeZone = getSafeZoneAtRect(state.player);
  state.playerState.currentSafeZone = safeZone ? safeZone.type : null;

  if (safeZone) {
    state.telemetry.totalSafeSpaceMs += deltaMs;
  }

  if (safeZone && !state.playerWasInSafeSpace) {
    state.telemetry.safeSpaceEntries += 1;
    applySafeZoneEntryEffect(state, safeZone.type, { sfx });
    logEvent(state, "safe_space_enter", { zoneType: safeZone.type });

    if (maybePromptSafeZoneSupport(state, safeZone) && typeof openSafeZoneQuestionFn === "function") {
      openSafeZoneQuestionFn(safeZone.type);
    }
  }

  if (!safeZone && state.playerWasInSafeSpace) {
    logEvent(state, "safe_space_exit", { zoneType: state.currentSafeZoneType });
  }

  state.playerWasInSafeSpace = !!safeZone;
  state.currentSafeZoneType = safeZone ? safeZone.type : null;
}

export function tryMove(state, entity, dx, dy, options = {}) {
  const candidate = {
    ...entity,
    x: entity.x + dx,
    y: entity.y + dy
  };

  let didWrap = false;

  if (options.allowWrap) {
    const wrapped = applyHorizontalWrap(state, candidate);
    candidate.x = wrapped.rect.x;
    candidate.y = wrapped.rect.y;
    didWrap = wrapped.wrapped;
  }

  clampVertical(state, candidate);

  if (hitsWall(candidate)) {
    state.telemetry.collisionCount += 1;
    return false;
  }

  if (options.blockSafeSpaces && hitsSafeSpace(candidate)) {
    return false;
  }

  entity.x = candidate.x;
  entity.y = candidate.y;

  if (didWrap) {
    state.telemetry.wrapCount += 1;
    if (options.onWrapped) options.onWrapped();
  }

  return true;
}

export function movePlayer(state, deltaMs = 16.67, dom = null) {
  const frameScale = deltaMs / 16.67;

  let dx = 0;
  let dy = 0;

  if (state.keys["arrowleft"] || state.keys.a) dx -= state.player.speed * frameScale;
  if (state.keys["arrowright"] || state.keys.d) dx += state.player.speed * frameScale;
  if (state.keys["arrowup"] || state.keys.w) dy -= state.player.speed * frameScale;
  if (state.keys["arrowdown"] || state.keys.s) dy += state.player.speed * frameScale;
  if (!dx && !dy) return;

  state.telemetry.movementCount += 1;

  if (dx !== 0 || dy !== 0) {
    const magnitude = Math.hypot(dx, dy) || 1;
    state.playerHeading = {
      dx: Math.round(dx / magnitude),
      dy: Math.round(dy / magnitude)
    };
  }

  if (dx) {
    tryMove(state, state.player, dx, 0, {
      allowWrap: true,
      onWrapped() {
        maybeTriggerWrapScenario(state, dom, { triggeredByWrap: true });
      }
    });
  }
  if (dy) tryMove(state, state.player, 0, dy, { allowWrap: false });
}

function getRectCenterPoint(rect) {
  return {
    x: rect.x + rect.w / 2,
    y: rect.y + rect.h / 2
  };
}

function dirToName(dc, dr) {
  if (dc === 1) return "right";
  if (dc === -1) return "left";
  if (dr === 1) return "down";
  return "up";
}

function isReverseDirection(dirA, dirB) {
  return !!dirA && !!dirB && dirA.dc === -dirB.dc && dirA.dr === -dirB.dr;
}

function getChaserCurrentCell(state, chaser) {
  const navRect = getChaserNavRect(chaser);
  const center = getRectCenterPoint(navRect);
  return pointToCell(center.x, center.y);
}

function getChaserCellCenter(state, chaser) {
  const cell = getChaserCurrentCell(state, chaser);
  return cellCenter(cell.col, cell.row);
}

function isChaserNearCellCenter(state, chaser, epsilon = CHASER_CENTER_EPSILON) {
  const center = getRectCenterPoint(getChaserNavRect(chaser));
  const cellCtr = getChaserCellCenter(state, chaser);
  return Math.hypot(center.x - cellCtr.x, center.y - cellCtr.y) <= epsilon;
}

function snapChaserToCellCenter(state, chaser) {
  const cell = getChaserCurrentCell(state, chaser);
  const safeCell = findNearestPassableCell(state, cell.col, cell.row);
  const ctr = cellCenter(safeCell.col, safeCell.row);
  chaser.x = ctr.x - chaser.w / 2;
  chaser.y = ctr.y - chaser.h / 2;
}

function getChaserDirectionOptions(state, chaser) {
  const cell = getChaserCurrentCell(state, chaser);

  return getNeighbors(state, cell.col, cell.row).map(({ col, row }) => {
    const dc = Math.sign(col - cell.col);
    const dr = Math.sign(row - cell.row);

    return {
      dc,
      dr,
      center: cellCenter(col, row),
      name: dirToName(dc, dr)
    };
  });
}

function getDirectionBiasScore(chaser, option) {
  const order = CHASER_DIRECTION_TIE_BIAS[chaser.name] || CHASER_DIRECTION_TIE_BIAS.solar;
  const index = order.indexOf(option.name);
  return index < 0 ? 0 : index * 0.01;
}

function makeCellRectFromCenter(center) {
  return {
    x: center.x - CHASER_NAV_W / 2,
    y: center.y - CHASER_NAV_H / 2,
    w: CHASER_NAV_W,
    h: CHASER_NAV_H
  };
}

function getChaserNavRect(entity) {
  return {
    x: entity.x + (entity.w - CHASER_NAV_W) / 2,
    y: entity.y + (entity.h - CHASER_NAV_H) / 2,
    w: CHASER_NAV_W,
    h: CHASER_NAV_H
  };
}

function chooseChaserDirection(state, chaser, targetRect) {
  const options = getChaserDirectionOptions(state, chaser);
  if (!options.length) {
    return { dc: 0, dr: 0 };
  }

  const currentDir = chaser.dir || { dc: 0, dr: 0 };
  const nonReverse = options.filter((option) => !isReverseDirection(option, currentDir));
  const choicePool = nonReverse.length ? nonReverse : options;
  const targetCenter = getRectCenterPoint(targetRect);

  let best = choicePool[0];
  let bestScore = Infinity;

  choicePool.forEach((option) => {
    const optionRect = makeCellRectFromCenter(option.center);
    const path = findPath(state, optionRect, targetRect);
    const pathLength = path.length || 9999;
    const straightDistance = Math.hypot(
      targetCenter.x - option.center.x,
      targetCenter.y - option.center.y
    );
    const keepGoingBonus = currentDir.dc === option.dc && currentDir.dr === option.dr ? -0.1 : 0;

    const score =
      pathLength * 1000 +
      straightDistance +
      getDirectionBiasScore(chaser, option) +
      keepGoingBonus;

    if (score < bestScore) {
      bestScore = score;
      best = option;
    }
  });

  return { dc: best.dc, dr: best.dr };
}

function snapChaserToNearestPassableSpawn(state, chaser) {
  const startCenter = {
    x: chaser.spawnX + chaser.w / 2,
    y: chaser.spawnY + chaser.h / 2
  };

  const startCell = pointToCell(startCenter.x, startCenter.y);
  const safeCell = findNearestPassableCell(state, startCell.col, startCell.row);
  const center = cellCenter(safeCell.col, safeCell.row);

  chaser.x = center.x - chaser.w / 2;
  chaser.y = center.y - chaser.h / 2;
}

function canChaserMoveInDirection(state, chaser, dir = chaser.dir) {
  if (!dir || (!dir.dc && !dir.dr)) return false;

  const candidate = {
    ...chaser,
    x: chaser.x + dir.dc * chaser.speed,
    y: chaser.y + dir.dr * chaser.speed
  };

  candidate.x = Math.max(0, Math.min(state.canvasWidth - chaser.w, candidate.x));
  candidate.y = Math.max(0, Math.min(state.canvasHeight - chaser.h, candidate.y));

  return !hitsWall(getChaserNavRect(candidate));
}

function moveChaserOneStep(state, chaser, dir = chaser.dir) {
  if (!dir || (!dir.dc && !dir.dr)) return false;

  const cellCtr = getChaserCellCenter(state, chaser);

  if (dir.dc) {
    chaser.y = cellCtr.y - chaser.h / 2;
  } else if (dir.dr) {
    chaser.x = cellCtr.x - chaser.w / 2;
  }

  const totalDistance = Math.max(1, chaser.speed);
  const steps = Math.ceil(totalDistance);
  const stepX = (dir.dc * totalDistance) / steps;
  const stepY = (dir.dr * totalDistance) / steps;

  let movedAny = false;

  for (let i = 0; i < steps; i += 1) {
    const candidate = {
      ...chaser,
      x: chaser.x + stepX,
      y: chaser.y + stepY
    };

    candidate.x = Math.max(0, Math.min(state.canvasWidth - chaser.w, candidate.x));
    candidate.y = Math.max(0, Math.min(state.canvasHeight - chaser.h, candidate.y));

    if (hitsWall(getChaserNavRect(candidate))) {
      return movedAny;
    }

    chaser.x = candidate.x;
    chaser.y = candidate.y;
    movedAny = true;
  }

  chaser.lastMoveAxis = dir.dc ? "x" : "y";
  return movedAny;
}

export function moveChasers(state) {
  const playerInSafeSpace = isInSafeSpace(state.player);

  state.chasers.forEach((chaser, index) => {
    if (!chaser.active) return;

    const targetRect = getChaserTargetForCurrentState(state, index);
    if (!targetRect) return;

    const targetDistance = getDistanceBetweenRects(chaser, targetRect);
    const shouldPauseAtTarget =
      (playerInSafeSpace || state.chaserMode === "scatter") &&
      targetDistance <= CHASER_STEP_THRESHOLD;

    if (shouldPauseAtTarget) {
      chaser.dir = { dc: 0, dr: 0 };
      chaser.stuckFrames = 0;
      return;
    }

    const nearCenter = isChaserNearCellCenter(state, chaser, 0.75);
const needsTurnDecision =
  nearCenter ||
  !chaser.dir ||
  (!chaser.dir.dc && !chaser.dir.dr) ||
  !canChaserMoveInDirection(state, chaser, chaser.dir);

if (needsTurnDecision) {
  if (nearCenter) {
    snapChaserToCellCenter(state, chaser);
  }
  chaser.dir = chooseChaserDirection(state, chaser, targetRect);
}

    let moved = moveChaserOneStep(state, chaser, chaser.dir);

    if (!moved) {
      snapChaserToCellCenter(state, chaser);
      chaser.dir = chooseChaserDirection(state, chaser, targetRect);
      moved = moveChaserOneStep(state, chaser, chaser.dir);
    }

    if (!moved) {
      const rawOptions = getChaserDirectionOptions(state, chaser);
      const nonReverse = rawOptions.filter(
        (option) => !isReverseDirection(option, chaser.dir)
      );
      const options = (nonReverse.length ? nonReverse : rawOptions)
        .sort((a, b) => getDirectionBiasScore(chaser, a) - getDirectionBiasScore(chaser, b));

      for (const option of options) {
        const dir = { dc: option.dc, dr: option.dr };
        snapChaserToCellCenter(state, chaser);

        if (moveChaserOneStep(state, chaser, dir)) {
          chaser.dir = dir;
          moved = true;
          break;
        }
      }
    }

    if (!moved) {
      chaser.stuckFrames += 1;

      if (chaser.stuckFrames >= CHASER_STUCK_REPATH_FRAMES) {
        snapChaserToNearestPassableSpawn(state, chaser);
        chaser.dir = chooseChaserDirection(state, chaser, targetRect);
        chaser.stuckFrames = 0;
      } else {
        chaser.dir = { dc: 0, dr: 0 };
      }
    } else {
      chaser.stuckFrames = 0;
    }
  });
}

export function checkCaught(state, { dom = null, sfx = null, onCaught = null } = {}) {
  if (Date.now() < state.player.invulnerableUntil) return false;
  if (hasShield(state)) return false;
  if (isInSafeSpace(state.player)) return false;

  const caught = state.chasers.some(
    (chaser) => chaser.active && rectsOverlap(chaser, state.player)
  );
  if (!caught) return false;

  if (state.supportState?.active) {
  endSupportCycle(state, "chance_lost");
}

  state.telemetry.timesCaught += 1;
  const loss = getCatchStabilityLoss(state);
  adjustStability(state, -loss, { sfx, reason: 'monster_hit' });
  applyPostCatchDefenseEffect(state);

  logEvent(state, 'player_caught', {
    loss,
    remainingStability: state.playerState.stability
  });

  if (state.playerState.stability > 0) {
    openRespawnCopingModal(state, dom);
  }

  if (typeof onCaught === 'function') {
    onCaught();
  }

  return true;
}

export function pickWrongIndex(correctIndex, total) {
  const options = [];

  for (let i = 0; i < total; i += 1) {
    if (i !== correctIndex) options.push(i);
  }

  return options[Math.floor(Math.random() * options.length)];
}

export function getTeamSuggestedChoiceIndex(state, question) {
  const isCorrect = Math.random() < getTruthToolSettings(state).teamInputAccuracy;

  if (question.type === "safe") {
    return isCorrect
      ? question.correctIndex
      : pickWrongIndex(question.correctIndex, question.choices.length);
  }

  const bestIndex = question.choices.findIndex((choice) => choice.kind === "best");
  const riskyIndex = question.choices.findIndex((choice) => choice.kind === "risky");

  if (isCorrect) {
    return bestIndex >= 0 ? bestIndex : 0;
  }

  if (riskyIndex >= 0) {
    return riskyIndex;
  }

  return pickWrongIndex(bestIndex >= 0 ? bestIndex : 0, question.choices.length);
}

export function getQuestionHint(state, question) {
  if (question?.type === "signal") return question.hint || "";
  const truth = getTruthToolSettings(state);

  if (truth.showHint && question.hint) return question.hint;
  return "";
}

function ensureTeamSuggestionTelemetryState(state) {
  state.telemetry.teamSuggestionsShown = Number(state.telemetry.teamSuggestionsShown || 0);
  state.telemetry.teamSuggestionsFollowed = Number(state.telemetry.teamSuggestionsFollowed || 0);
  state.telemetry.teamSuggestionLatenciesMs ||= [];
  state.telemetry.questionExposure ||= [];
}

function getCurrentQuestionExposure(state) {
  const exposureId = state.modalContext?.exposureId;
  if (!exposureId) return null;
  return state.telemetry.questionExposure.find((item) => item.exposureId === exposureId) || null;
}

function updateCurrentQuestionExposure(state, patch = {}) {
  const exposure = getCurrentQuestionExposure(state);
  if (!exposure) return null;
  Object.assign(exposure, patch);
  return exposure;
}

export function resolveQuestionOutcome(
  state,
  dom,
  question,
  choiceIndex,
  usedCollaboration,
  { sfx = null } = {}
) {
  const latency = Math.round(nowMs() - (state.modalContext?.questionShownAt || nowMs()));
  const multiplier = getChallengeRankMultiplier(state, question.category);
  const source = state.modalContext?.source;
  const selectedCopingTool = state.modalContext?.selectedCopingTool || null;
  const special = getSpecialHelpSettings(state);
  const teamSuggestionIndex = state.modalContext?.teamSuggestionIndex;
  const teamSuggestionShownAt = state.modalContext?.teamSuggestionShownAt || null;
  const teamSuggestionShown = !!usedCollaboration && Number.isInteger(teamSuggestionIndex);
  const teamSuggestionFollowed = teamSuggestionShown && choiceIndex === teamSuggestionIndex;
  const postSuggestionDecisionLatencyMs = teamSuggestionShownAt
    ? Math.max(0, Math.round(nowMs() - teamSuggestionShownAt))
    : null;

  ensureTeamSuggestionTelemetryState(state);

  function finalizeTeamSuggestionOutcome() {
    updateCurrentQuestionExposure(state, {
      teamSuggestionShown,
      teamSuggestedChoiceIndex: teamSuggestionShown ? teamSuggestionIndex : null,
      teamSuggestedChoiceLabel: teamSuggestionShown
        ? question.choices?.[teamSuggestionIndex]?.label || ""
        : null,
      teamSuggestionFollowed,
      postSuggestionDecisionLatencyMs
    });

    if (teamSuggestionFollowed) {
      state.telemetry.teamSuggestionsFollowed += 1;
    }
  }

  state.telemetry.questionLatenciesMs.push(latency);
  state.telemetry.questionsAnsweredCount += 1;

  if (question.type === "signal") {
    const choice = question.choices[choiceIndex] || {};
    const feedback = choice.feedback || "Thanks for checking in.";
    return {
      feedback,
      outcomeText: "Check-In Logged",
      outcomeType: "neutral",
      apply() {
        recordQuestionAnswered(state, question, choiceIndex, {
          latencyMs: latency,
          usedCollaboration: false,
          selectedCopingTool,
          signalScore: choice.signalScore ?? null,
          acknowledgmentShown: true,
          protectivePointsDelta: 0,
          stabilityDelta: 0
        });

        logEvent(state, "signal_answered", {
          questionId: question.id,
          zoneType: state.modalContext?.zoneType,
          signalType: question.signalType,
          signalDomain: question.signalDomain,
          signalScore: choice.signalScore ?? null,
          gradeBand: state.currentGradeBand
        });
      }
    };
  }

  if (question.type === "scenario") {
    state.telemetry.scenarioLatenciesMs.push(latency);
    state.telemetry.scenarioCount += 1;
  }

  if (question.type === "safe") {
    state.telemetry.safeZoneQuestionLatenciesMs.push(latency);
  }

  if (question.type === "scenario") {
    const choice = question.choices[choiceIndex];
    const qualityMap = { best: 2, neutral: 1, risky: 0 };
    const quality = qualityMap[choice.kind];

    state.telemetry.decisionQualities.push({ questionId: question.id, quality, source });

    let protectivePointsDelta = 0;
    let stabilityDelta = 0;
    let outcomeType = "neutral";
    let outcomeText = "No Major Shift";
    const feedback = choice.feedback;

    if (choice.kind === "best") {
      protectivePointsDelta += 2 * multiplier + special.questionRewardBonus;
      outcomeType = "reward";
      outcomeText = `Reward: +${(2 * multiplier + special.questionRewardBonus).toFixed(1)} Protective Points`;
    } else if (choice.kind === "neutral") {
      protectivePointsDelta += 0.5 * multiplier;
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
      apply() {
        adjustProtectivePoints(state, protectivePointsDelta, {
          sfx,
          reason: "scenario_question",
          meta: { category: question.category, questionId: question.id }
        });

        adjustStability(state, stabilityDelta, {
          sfx,
          reason: "scenario_question",
          meta: { category: question.category, questionId: question.id }
        });

        const wasWrongRepeat = arrayIncludesId(state.learningState?.wrongQuestionIds, question.id);
        recordQuestionAnswered(state, question, choiceIndex, {
          answerKind: choice.kind,
          isCorrect: choice.kind === "best",
          latencyMs: latency,
          usedCollaboration,
          selectedCopingTool,
          protectivePointsDelta,
          stabilityDelta,
          wrongRepeatTriggered: wasWrongRepeat,
          interveningLearningCount: wasWrongRepeat ? (state.learningState?.interveningLearningCount || 0) : null,
          correctSuppressed: state.selectionTelemetry?.correctSuppressed || 0,
          teamSuggestionShown,
          teamSuggestedChoiceIndex: teamSuggestionShown ? teamSuggestionIndex : null,
          teamSuggestionFollowed,
          postSuggestionDecisionLatencyMs
        });

        finalizeTeamSuggestionOutcome();
        rememberLearningAnswerResult(state, question.id, choice.kind === "best");

        if (choice.kind === "best") boostPlayer(state, BEST_SPEED, EFFECT_MS);
        else if (choice.kind === "risky") slowPlayer(state, WORST_SPEED, EFFECT_MS);

        logEvent(state, "scenario_answered", {
          questionId: question.id,
          source,
          category: question.category,
          answerKind: choice.kind,
          choiceTags: getChoiceTelemetryTags(question, choiceIndex),
          copingTool: selectedCopingTool,
          latencyMs: latency,
          usedCollaboration,
          protectivePointsDelta,
          stabilityDelta,
          gradeBand: state.currentGradeBand
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
  const safePlace = getSafePlaceSettings(state, state.modalContext?.zoneType);

  if (isCorrect) {
    state.telemetry.safeZoneCorrect += 1;
    protectivePointsDelta += 1 * multiplier + special.questionRewardBonus + (safePlace.bonusQuestionPoints || 0);
    stabilityDelta += safePlace.bonusQuestionStability || 0;
    outcomeType = "reward";
    outcomeText = `Safe Zone Reward: +${(1 * multiplier + special.questionRewardBonus + (safePlace.bonusQuestionPoints || 0)).toFixed(1)} Protective Points`;
    feedback = question.choices?.[choiceIndex]?.feedback || "Correct. That support choice helped you stay safer and make a healthier decision.";
  } else {
    state.telemetry.safeZoneWrong += 1;
    protectivePointsDelta -= 1;
    stabilityDelta -= 1;
    outcomeType = "lag";
    outcomeText = "Safe Zone Miss: -1 Protective Point, -1 Chance";
    feedback = question.choices?.[choiceIndex]?.feedback || "Not quite. This safe place would have helped more with making a healthier choice.";
  }

  return {
    feedback,
    outcomeText,
    outcomeType,
    apply() {
      adjustProtectivePoints(state, protectivePointsDelta, {
        sfx,
        reason: "safe_zone_question",
        meta: {
          category: question.category,
          questionId: question.id,
          zoneType: state.modalContext?.zoneType
        }
      });

      adjustStability(state, stabilityDelta, {
        sfx,
        reason: "safe_zone_question",
        meta: {
          category: question.category,
          questionId: question.id,
          zoneType: state.modalContext?.zoneType
        }
      });

      const wasWrongRepeat = arrayIncludesId(state.learningState?.wrongQuestionIds, question.id);
      recordQuestionAnswered(state, question, choiceIndex, {
        isCorrect,
        latencyMs: latency,
        usedCollaboration,
        selectedCopingTool,
        protectivePointsDelta,
        stabilityDelta,
        wrongRepeatTriggered: wasWrongRepeat,
        interveningLearningCount: wasWrongRepeat ? (state.learningState?.interveningLearningCount || 0) : null,
        correctSuppressed: state.selectionTelemetry?.correctSuppressed || 0,
        teamSuggestionShown,
        teamSuggestedChoiceIndex: teamSuggestionShown ? teamSuggestionIndex : null,
        teamSuggestionFollowed,
        postSuggestionDecisionLatencyMs
      });

      finalizeTeamSuggestionOutcome();
      rememberLearningAnswerResult(state, question.id, isCorrect);

      logEvent(state, "safe_zone_question_answered", {
        questionId: question.id,
        zoneType: state.modalContext?.zoneType,
        category: question.category,
        isCorrect,
        choiceTags: getChoiceTelemetryTags(question, choiceIndex),
        copingTool: selectedCopingTool,
        latencyMs: latency,
        usedCollaboration,
        protectivePointsDelta,
        stabilityDelta,
        gradeBand: state.currentGradeBand
      });
    }
  };
}

export function closeScenario(state, dom) {
  state.scenarioOpen = false;
  state.modalContext = null;
  dom?.scenarioCard?.querySelector(".scenario-assist")?.remove();
  closeScenarioUI(dom);
}

export function openQuestionModal(state, dom, question, options = {}) {
  const now = Date.now();

  if (!state.gameStarted || state.scenarioOpen || now - state.lastModalAt < GLOBAL_MODAL_COOLDOWN_MS) {
    return false;
  }

  state.lastModalAt = now;
  state.scenarioOpen = true;
  state.pendingResolution = null;

  Object.keys(state.keys).forEach((key) => {
    state.keys[key] = false;
  });

  const exposureId = recordQuestionPresented(state, question, {
    source: options.source || "manual",
    zoneType: options.zoneType || null
  });

  noteQuestionPresented(state, question);

  state.modalContext = {
    question,
    source: options.source || "manual",
    zoneType: options.zoneType || null,
    requireCoping: !!options.requireCoping,
    step: options.requireCoping ? "coping" : "question",
    copingShownAt: nowMs(),
    questionShownAt: options.requireCoping ? null : nowMs(),
    selectedCopingTool: null,
    usedCollaboration: false,
    teamSuggestionIndex: null,
    teamSuggestionShownAt: null,
    exposureId
  };

  ensureTeamSuggestionTelemetryState(state);

  logEvent(state, "modal_open", {
    modalType: question.type,
    questionId: question.id,
    source: state.modalContext.source,
    zoneType: state.modalContext.zoneType,
    gradeBand: state.currentGradeBand
  });

  renderModalStep(state, dom);
  dom?.scenarioModal?.classList.remove("hidden");
  return true;
}

export function renderModalStep(state, dom) {
  const question = state.modalContext?.question;
  if (state.modalContext?.kind === "respawn_coping") {
    if (dom.scenarioChoices) dom.scenarioChoices.innerHTML = "";
    dom.scenarioChoices?.classList.remove("hidden");
    dom.scenarioResultBox?.classList.add("hidden");
    if (dom.scenarioTitle) dom.scenarioTitle.textContent = "Choose Your Reset";
    if (dom.scenarioText) dom.scenarioText.textContent = "Pick what will help you reset before you jump back in.";
    if (dom.scenarioMeta) dom.scenarioMeta.textContent = "Your choice becomes your active support until it fades, breaks, or the next chance is lost.";
    dom.scenarioHint?.classList.add("hidden");
    if (dom.scenarioHint) dom.scenarioHint.textContent = "";
    copingTools.forEach((tool) => {
      const button = document.createElement("button");
      button.textContent = `${tool.label}: ${tool.description}`;
      button.className = "secondary";
      button.addEventListener("click", () => {
        const latency = Math.round(nowMs() - (state.modalContext?.copingShownAt || nowMs()));
        state.telemetry.copingSelectionLatenciesMs.push(latency);
        state.modalContext.selectedCopingTool = tool.id;
	respawnPlayerAfterCatch(state);
	beginChanceSegment(state);

	startSupportCycle(state, {
  	supportId: tool.id,
  	source: "new_chance_choice"
	});

const recoveryEffect = getRecoverySettings(state, tool.id);

logEvent(state, "coping_tool_selected", {
          source: "respawn",
          copingTool: tool.id,
          latencyMs: latency,
          recoveryWeight: recoveryEffect.weight,
          speedBoost: recoveryEffect.speedBoost
        });
        closeScenario(state, dom);
        updateHUD({
  dom,
  currentThreatLevel: state.currentThreatLevel,
  playerState: state.playerState,
  copingState: state.copingState,
  telemetry: state.telemetry,
  playerProfile: state.playerProfile,
  getReadableTool
});
      });
      dom.scenarioChoices?.appendChild(button);
    });
    return;
  }

  if (!question || !dom) return;

  if (dom.scenarioChoices) dom.scenarioChoices.innerHTML = "";
  dom.scenarioChoices?.classList.remove("hidden");
  dom.scenarioResultBox?.classList.add("hidden");

  if (dom.scenarioFeedback) dom.scenarioFeedback.textContent = "";

  if (dom.scenarioOutcome) {
    dom.scenarioOutcome.textContent = "";
    dom.scenarioOutcome.className = "outcome-pill";
  }

  dom.scenarioHint?.classList.add("hidden");
  if (dom.scenarioHint) dom.scenarioHint.textContent = "";

  if (state.modalContext.step === "coping") {
    if (dom.scenarioTitle) dom.scenarioTitle.textContent = "Choose a Coping Tool";
    if (dom.scenarioText) dom.scenarioText.textContent = question.text;
    if (dom.scenarioMeta) {
      dom.scenarioMeta.textContent = "Select how your character will steady themselves before choosing.";
    }

    copingTools.forEach((tool) => {
      const button = document.createElement("button");
      button.textContent = `${tool.label}: ${tool.description}`;
      button.className = "secondary";

      button.addEventListener("click", () => {
        const latency = Math.round(nowMs() - state.modalContext.copingShownAt);
        state.telemetry.copingSelectionLatenciesMs.push(latency);
        state.playerState.lastSelectedCopingTool = tool.id;
        state.modalContext.selectedCopingTool = tool.id;

        const recoveryEffect = applyRecoveryToolEffect(state, tool.id);

        state.modalContext.step = "question";
        state.modalContext.questionShownAt = nowMs();

        logEvent(state, "coping_tool_selected", {
          questionId: question.id,
          copingTool: tool.id,
          latencyMs: latency,
          recoveryWeight: recoveryEffect.weight,
          speedBoost: recoveryEffect.speedBoost
        });

        renderModalStep(state, dom);
      });

      dom.scenarioChoices?.appendChild(button);
    });

    return;
  }

  if (dom.scenarioTitle) dom.scenarioTitle.textContent = question.title;
  if (dom.scenarioText) dom.scenarioText.textContent = question.text;

  if (question.type === "safe") {
    if (dom.scenarioMeta) {
      dom.scenarioMeta.textContent = `Safe Zone Support: ${String(state.modalContext.zoneType).toUpperCase()}`;
    }
  } else if (state.modalContext.selectedCopingTool) {
    if (dom.scenarioMeta) {
      dom.scenarioMeta.textContent =
        `Challenge Focus: ${question.category.toUpperCase()} | Coping Tool: ${getReadableTool(state.modalContext.selectedCopingTool)}`;
    }
  } else {
    if (dom.scenarioMeta) {
      dom.scenarioMeta.textContent = `Challenge Focus: ${question.category.toUpperCase()}`;
    }
  }

dom.scenarioCard?.querySelector(".scenario-assist")?.remove();

const hintText = getQuestionHint(state, question);
if (hintText && dom.scenarioHint) {
  dom.scenarioHint.textContent = hintText;
  dom.scenarioHint.classList.remove("hidden");
}

const hasTeamSuggestion = Number.isInteger(state.modalContext?.teamSuggestionIndex);

if (
  question.type !== "signal" &&
  getActiveFactFindingTool(state) === "collaborative_problem_solving"
) {
  const helpButton = document.createElement("button");
  helpButton.textContent = hasTeamSuggestion ? "Team Input Used" : "Use Team Input";
  helpButton.className = "tertiary";
  helpButton.disabled = hasTeamSuggestion;

    helpButton.addEventListener("click", () => {
      if (Number.isInteger(state.modalContext?.teamSuggestionIndex)) return;

      ensureTeamSuggestionTelemetryState(state);

      const choiceIndex = getTeamSuggestedChoiceIndex(state, question);
      const shownAt = nowMs();
      const suggestionLatencyMs = Math.round(
        shownAt - (state.modalContext?.questionShownAt || shownAt)
      );

      state.modalContext.teamSuggestionIndex = choiceIndex;
      state.modalContext.teamSuggestionShownAt = shownAt;
      state.modalContext.usedCollaboration = true;

      updateCurrentQuestionExposure(state, {
        teamSuggestionShown: true,
        teamSuggestedChoiceIndex: choiceIndex,
        teamSuggestedChoiceLabel: question.choices?.[choiceIndex]?.label || "",
        teamSuggestionAtTs: Date.now(),
        teamSuggestionLatencyMs: suggestionLatencyMs
      });

      state.telemetry.teamSuggestionsShown += 1;
      state.telemetry.teamSuggestionLatenciesMs.push(suggestionLatencyMs);

      logEvent(state, "team_input_suggestion_shown", {
        questionId: question.id,
        source: state.modalContext?.source,
        zoneType: state.modalContext?.zoneType,
        suggestedChoiceIndex: choiceIndex,
        suggestedChoiceLabel: question.choices?.[choiceIndex]?.label || "",
        suggestionLatencyMs,
        gradeBand: state.currentGradeBand
      });

      renderModalStep(state, dom);
    });

    dom.scenarioChoices?.appendChild(helpButton);
  }

question.choices.forEach((choice, index) => {
  const button = document.createElement("button");
  const isSuggested = state.modalContext?.teamSuggestionIndex === index;

  button.textContent = isSuggested
    ? `${choice.label}  •  Team suggests this`
    : choice.label;

  button.classList.add("scenario-choice-btn");

  if (isSuggested) {
    button.classList.add("scenario-choice-suggested");
  }

  button.addEventListener("click", () => {
    handleQuestionAnswer(
      state,
      dom,
      question,
      index,
      !!state.modalContext?.usedCollaboration
    );
  });

  dom.scenarioChoices?.appendChild(button);
});
}

export function handleQuestionAnswer(
  state,
  dom,
  question,
  choiceIndex,
  usedCollaboration,
  { sfx = null } = {}
) {
  const buttons = dom?.scenarioChoices?.querySelectorAll("button") || [];

  buttons.forEach((button) => {
    button.disabled = true;
    button.style.opacity = "0.6";
    button.style.cursor = "not-allowed";
  });

  const result = resolveQuestionOutcome(state, dom, question, choiceIndex, usedCollaboration, { sfx });
  state.pendingResolution = result.apply;

  showScenarioResult(dom, {
    feedback: result.feedback,
    outcomeText: result.outcomeText,
    outcomeType: result.outcomeType
  });
}

export function maybeTriggerWrapScenario(state, dom, { triggeredByWrap = false } = {}) {
  const now = Date.now();

  if (
    !triggeredByWrap ||
    !state.gameStarted ||
    state.scenarioOpen ||
    now - state.lastWrapScenarioAt < WRAP_SCENARIO_COOLDOWN_MS
  ) {
    return false;
  }

  if (Math.random() > WRAP_SCENARIO_CHANCE) return false;

  const pool = getLearningQuestionPool('wrap', state.currentGradeBand);
  if (!pool.length) return false;

  const question = pickAdaptiveQuestion(state, pool, "category");
  if (!question) return false;
  const opened = openQuestionModal(state, dom, question, { requireCoping: false, source: "wrap" });

  if (opened) state.lastWrapScenarioAt = now;
  return opened;
}

export function maybeTriggerThreatScenario(state, dom) {
  const now = Date.now();

  if (
    !state.gameStarted ||
    state.scenarioOpen ||
    hasShield(state) ||
    !state.threatState.inDanger ||
    now - state.threatState.lastThreatScenarioAt < THREAT_SCENARIO_COOLDOWN_MS
  ) {
    return false;
  }

  if (now - state.threatState.lastThreatScenarioCheckAt < THREAT_SCENARIO_CHECK_MS) {
    return false;
  }

  state.threatState.lastThreatScenarioCheckAt = now;
  if (Math.random() > THREAT_SCENARIO_ROLL) return false;

  const pool = getLearningQuestionPool('threat', state.currentGradeBand);
  if (!pool.length) return false;

  const question = pickAdaptiveQuestion(state, pool, "category");
  if (!question) return false;
  const opened = openQuestionModal(state, dom, question, { requireCoping: false, source: "threat" });

  if (opened) state.threatState.lastThreatScenarioAt = now;
  return opened;
}

export function updateThreatTracking(state, dom) {
  const nearest = getNearestActiveChaserDistance(state);
  state.threatState.nearestDistance = nearest;
  state.telemetry.nearestChaserDistance = nearest;

  const activeCoping = getActiveCopingConfig(state);
  const effectiveDangerDistance = DANGER_DISTANCE + (activeCoping.dangerDistanceBuffer || 0);
  const inDangerNow = nearest < effectiveDangerDistance && !isInSafeSpace(state.player) && !hasShield(state);

  if (inDangerNow && !state.threatState.inDanger) {
    state.telemetry.dangerZoneEntries += 1;
    state.telemetry.chaserProximityHits += 1;
    logEvent(state, "danger_zone_enter", { nearestDistance: Math.round(nearest) });
  }

  const nearMissDistance = NEAR_MISS_DISTANCE + (activeCoping.nearMissBonus || 0);

  if (
    nearest < nearMissDistance &&
    !isInSafeSpace(state.player) &&
    !hasShield(state) &&
    Date.now() - state.threatState.lastNearMissAt > 1600 &&
    Date.now() > state.player.invulnerableUntil
  ) {
    state.telemetry.nearMisses += 1;
state.threatState.lastNearMissAt = Date.now();

if (state.copingState?.active && activeCoping.nearMissBonus > 0) {
  const visual = getRecoveryToolVisual(state.copingState.activeToolId);
  const fxX = state.player.x + state.player.w / 2;
  const fxY = state.player.y - 18;

  spawnPickupText(state, fxX, fxY, `${visual.icon} Close Call Bonus`, visual.color);
  spawnPickupText(state, fxX, fxY + 16, `+${activeCoping.nearMissBonus} reaction space`, visual.color);
  spawnPickupBurst(state, fxX, fxY + 10, visual.color);
}

logEvent(state, "near_miss", {
  nearestDistance: Math.round(nearest),
  copingTool: state.copingState?.activeToolId || null,
  nearMissBonus: activeCoping.nearMissBonus || 0
});
  }

  state.threatState.inDanger = inDangerNow;

  if (state.copingState?.active) {
    if (inDangerNow) {
      if (!state.copingState.highDangerSince) {
        state.copingState.highDangerSince = Date.now();
      } else if (Date.now() - state.copingState.highDangerSince >= COPING_HIGH_DANGER_EXPIRE_MS) {
        endSupportCycle(state, "prolonged_high_danger_chase");
      }
    } else {
      state.copingState.highDangerSince = 0;
    }
  }

  if (state.threatState.inDanger) {
    maybeTriggerThreatScenario(state, dom);
  }
}

export function openSafeZoneQuestion(state, dom, zoneType) {
  const pool = getLearningQuestionPool('safe_zone', state.currentGradeBand, { zoneType });
  if (!pool.length) return false;

  const question = pickAdaptiveQuestion(state, pool, "category");
  if (!question) return false;
  return openQuestionModal(state, dom, question, {
    source: "safe_zone",
    zoneType,
    requireCoping: false
  });
}

export function resetChasers(state) {
  state.chasers = chaserSpawns.map((spawn, index) =>
    createChaserFromSpawn(spawn, index)
  );

  state.chasers.forEach((chaser) => {
    snapChaserToNearestPassableSpawn(state, chaser);
  });

  resetChaserModeState(state);
}

export function resetPlayer(state) {
  state.player.x = playerSpawn.x;
  state.player.y = playerSpawn.y;
  state.player.speed = PLAYER_BASE_SPEED;
  state.player.invulnerableUntil = 0;

  state.playerState.stability = STARTING_STABILITY;
  state.playerState.protectivePoints = state.playerState.protectivePoints || 0;
  state.playerState.currentSafeZone = null;
  state.playerState.lastSupportPromptAt = 0;
  state.playerState.lastSelectedCopingTool = null;

  resetRunTelemetry(state);

  state.selectionTelemetry = createSelectionTelemetry();
  state.learningState = createLearningRunState();
  state.signalState = { ...createSignalRunState(), signalsShownThisSession: state.signalState?.signalsShownThisSession || 0 };
  state.copingState = createCopingState();
  state.supportState = createSupportState();

  state.effectState.speedUntil = 0;
  state.effectState.shieldUntil = 0;

  state.safeZonePromptHistory = { school: 0, family: 0, peer: 0 };
  state.safeZoneEntryBonusHistory = { school: 0, family: 0, peer: 0 };
  state.threatState = {
    inDanger: false,
    nearestDistance: Infinity,
    lastNearMissAt: 0,
    lastThreatScenarioAt: 0,
    lastThreatScenarioCheckAt: 0
  };

  state.activeProtectiveFactors = [];
  state.activeRiskFactors = [];
  state.nextProtectiveSpawnAt = 0;
  state.nextRiskSpawnAt = 0;
  state.factorSpawnHistoryByRegion = {};
  state.pendingResolution = null;
  state.modalContext = null;
  state.playerWasInSafeSpace = false;
  state.currentSafeZoneType = null;
  state.lastModalAt = 0;
  state.lastWrapScenarioAt = 0;
  state.pickupTexts = [];
  beginChanceSegment(state);
  state.pickupBursts = [];
  state.currentThreatLevel = 0;
  state.levelBannerUntil = 0;
  state.levelBannerText = "";
}

export function respawnPlayerAfterCatch(state) {
  state.player.x = playerSpawn.x;
  state.player.y = playerSpawn.y;
  state.player.invulnerableUntil = Date.now() + 900;
}

function getSupportEndText(reason) {
  const map = {
    risk_item_hit: "Support Broken",
    prolonged_high_danger_chase: "Overwhelmed",
    max_time_reached: "Support Faded",
    chance_lost: "Chance Lost",
    end_of_run: "Run Complete"
  };

  return map[reason] || "Support Ended";
}

function showSupportEndedFeedback(state, reason) {
  const text = getSupportEndText(reason);
  const fxX = state.player.x + state.player.w / 2;
  const fxY = state.player.y - 28;

  spawnPickupText(state, fxX, fxY, text, "#FF7A7A");
  spawnPickupBurst(state, fxX, fxY + 8, "#FF7A7A");

  logEvent(state, "support_end_feedback_shown", {
    reason,
    text
  });
}

export function endRun(
  state,
  dom,
  { reason = "chances_depleted", surveyState = null, surveyApi = null, draw = null } = {}
) {
  if (!state.gameStarted) return;

  if (state.supportState?.active) {
  endSupportCycle(state, "end_of_run");
}

  state.gameStarted = false;
  state.appPhase = "post";
  state.telemetry.runEnd = Date.now();
  state.telemetry.runCompletionStatus = reason === "completed" ? "completed" : "ended";
  state.telemetry.runExitType = reason;
  state.lastRunEndReason = reason;

  logEvent(state, "run_ended", {
    reason,
    telemetrySummary: getTelemetrySnapshot(state).summary
  });

  if (surveyApi?.openPostSurvey && surveyState) {
    surveyApi.openPostSurvey(surveyState, dom, {
      reason,
      logEvent: (type, data) => logEvent(state, type, data)
    });
  }

  if (typeof draw === "function") {
    draw();
  }
}

export function startRunLoop(state, dom, { draw = null, source = "manual", sfx = null } = {}) {
  state.appPhase = "game";
  state.gameStarted = false;
  state.scenarioOpen = false;
  state.pendingResolution = null;
  state.modalContext = null;

  if (dom?.setupError) dom.setupError.textContent = "";
  dom?.setupOverlay?.classList.add("hidden");
  resetScenarioModalUI(dom);

  state.safeZonePromptHistory = { school: 0, family: 0, peer: 0 };
  state.lastFrameTime = nowMs();

  resetPlayer(state);
  resetChasers(state);
  buildPassability(state);
  clearPressedKeys(state);

  state.countdown.active = true;
state.countdown.endsAt = Date.now() + RUN_COUNTDOWN_MS;
state.countdown.displayValue = 3;
state.countdown.goUntil = 0;
state.countdown.source = source;

if (sfx?.startCountdown) {
  playSound(sfx.startCountdown, 0.42);
}

showPowerUpReadyText(state);

updateHUD({
  dom,
  currentThreatLevel: state.currentThreatLevel,
  playerState: state.playerState,
  copingState: state.copingState,
  telemetry: state.telemetry,
  playerProfile: state.playerProfile,
  getReadableTool
});

  if (typeof draw === "function") draw();
}

export function finishRunSummaryOrEndSession(
  state,
  dom,
  { sprites = {}, getPostRunResponseText = null } = {}
) {
  if (state.telemetry.currentRunNumber >= TOTAL_RUNS) {
    state.appPhase = "ended";
    openEndedState({
      dom,
      telemetry: state.telemetry,
      playerState: state.playerState,
      getPostRunResponseText,
      logEvent: (type, data) => logEvent(state, type, data)
    });
    return;
  }

  state.appPhase = "post_complete";
  openPostRunDecision({
    dom,
    telemetry: state.telemetry,
    factorTelemetry: state.factorTelemetry,
    playerState: state.playerState,
    playerProfile: state.playerProfile,
    sprites,
    getTelemetrySnapshot: () => getTelemetrySnapshot(state),
    reason: state.lastRunEndReason
  });
}

export function advanceToNextRun(state, dom, { draw = null, sfx = null } = {}) {
  if (state.telemetry.currentRunNumber >= TOTAL_RUNS) {
    state.appPhase = "ended";
    return false;
  }

  state.telemetry.currentRunNumber += 1;
  state.telemetry.cumulativeAttemptCount += 1;
  state.telemetry.attemptNumberWithinSession += 1;

  startRunLoop(state, dom, { draw, source: "run_again", sfx });
  return true;
}

export function endSessionNow(state, dom, { getPostRunResponseText = null } = {}) {
  state.appPhase = "ended";
  openEndedState({
    dom,
    telemetry: state.telemetry,
    playerState: state.playerState,
    getPostRunResponseText,
    logEvent: (type, data) => logEvent(state, type, data)
  });
}

export function stepGame(
  state,
  dom,
  {
    deltaMs = 16,
    sfx = null,
    draw = null,
    surveyState = null,
    surveyApi = null
  } = {}
) {
  if (state.countdown?.active) {
    updateRunCountdown(state, dom, { draw, sfx });
    return;
  }

  if (!state.gameStarted || state.scenarioOpen) {
    if (typeof draw === "function") draw();
    return;
  }

  updateEffects(state, { sfx });
  updateSupportState(state);
  movePlayer(state, deltaMs, dom);
  updateThreatLevel(state);
  updateChaserMode(state);
  moveChasers(state);
  updateThreatTracking(state, dom);
  updateFactorSpawning(state);
  checkFactorInteractions(state, { sfx });
  updatePickupFX(state);
  updateSafeSpaceTracking(
  state,
  deltaMs,
  (zoneType) => openSafeZonePrompt(state, dom, zoneType),
  { sfx }
);

  checkCaught(state, {
    dom,
    sfx,
    onCaught() {
      if (state.playerState.stability <= 0) {
        endRun(state, dom, {
          reason: "chances_depleted",
          surveyState,
          surveyApi,
          draw
        });
      }
    }
  });

  updateHUD({
  dom,
  currentThreatLevel: state.currentThreatLevel,
  playerState: state.playerState,
  copingState: state.copingState,
  telemetry: state.telemetry,
  playerProfile: state.playerProfile,
  getReadableTool
});

  if (typeof draw === "function") draw();
}
export function createGameSystems({
  state,
  dom,
  surveyState = null,
  surveyApi = null,
  draw = null,
  sprites = {},
  sfx = null
} = {}) {
  if (!state) {
    throw new Error("createGameSystems requires a state object created by createGameState().");
  }

  return {
    state,
    startRun(source = "manual") {
  return startRunLoop(state, dom, { draw, source, sfx });
},
    step(deltaMs = 16) {
      return stepGame(state, dom, { deltaMs, sfx, draw, surveyState, surveyApi });
    },
    endRun(reason = "chances_depleted") {
      return endRun(state, dom, { reason, surveyState, surveyApi, draw });
    },
    closeScenario() {
      return closeScenario(state, dom);
    },
    continueScenario() {
      if (typeof state.pendingResolution === "function") {
        state.pendingResolution();
      }

      state.pendingResolution = null;
      closeScenario(state, dom);

      updateHUD({
  dom,
  currentThreatLevel: state.currentThreatLevel,
  playerState: state.playerState,
  copingState: state.copingState,
  telemetry: state.telemetry,
  playerProfile: state.playerProfile,
  getReadableTool
});

      if (typeof draw === "function") draw();
    },
    openSafeZoneQuestion(zoneType) {
      return openSafeZonePrompt(state, dom, zoneType);
    },
    openQuestion(question, options = {}) {
      return openQuestionModal(state, dom, question, options);
    },
    handleAnswer(question, choiceIndex, usedCollaboration = false) {
      return handleQuestionAnswer(state, dom, question, choiceIndex, usedCollaboration, { sfx });
    },
    finishPostSurvey(getPostRunResponseText) {
      return finishRunSummaryOrEndSession(state, dom, { sprites, getPostRunResponseText });
    },
    runAgain() {
  return advanceToNextRun(state, dom, { draw, sfx });
},
    endSessionNow(getPostRunResponseText) {
      return endSessionNow(state, dom, { getPostRunResponseText });
    },
    resetPlayer() {
      return resetPlayer(state);
    },
    resetChasers() {
      return resetChasers(state);
    },
    getTelemetrySnapshot() {
      return getTelemetrySnapshot(state);
    },
    logEvent(type, data = {}) {
      return logEvent(state, type, data);
    }
  };
}
