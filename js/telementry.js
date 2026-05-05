import { STARTING_STABILITY, QUESTION_CATEGORY_KEYS } from "./data.js";

export function makeTelemetryId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function makeEmptyCategoryCounts() {
  return {
    peer: 0,
    personal: 0,
    facts: 0
  };
}

export function makeEmptyTypeCounts() {
  return {
    scenario: 0,
    safe: 0,
    signal: 0
  };
}

export function makeEmptyCategoryPerformanceEntry() {
  return {
    presented: 0,
    answered: 0,
    correct: 0,
    wrong: 0,
    best: 0,
    neutral: 0,
    risky: 0,
    totalLatencyMs: 0,
    totalDecisionQuality: 0,
    totalProtectivePointsDelta: 0,
    totalStabilityDelta: 0
  };
}

export function makeEmptyCategoryPerformanceMap() {
  return {
    peer: makeEmptyCategoryPerformanceEntry(),
    personal: makeEmptyCategoryPerformanceEntry(),
    facts: makeEmptyCategoryPerformanceEntry()
  };
}

export function createEmptyChoiceMetrics() {
  return {
    helpSeekingChoiceSelected: 0,
    protectiveCueVsRiskCueIdentification: 0
  };
}

export function makeEmptyChanceMetrics() {
  return {
    startingChances: STARTING_STABILITY,
    endingChances: STARTING_STABILITY,
    totalChancesGained: 0,
    totalChancesLost: 0,
    chancesLostToMonsterHits: 0,
    chancesLostToScenarioQuestions: 0,
    chancesLostToSafeZoneQuestions: 0,
    chancesGainedFromSafeZoneEntry: 0,
    chancesGainedFromCorrectSafeZoneAnswers: 0,
    stabilityDeltaByCategory: makeEmptyCategoryCounts()
  };
}

export function makeEmptyPointMetrics() {
  return {
    startingProtectivePoints: 0,
    endingProtectivePoints: 0,
    totalProtectivePointsGained: 0,
    totalProtectivePointsLost: 0,
    protectivePointsDeltaByCategory: makeEmptyCategoryCounts()
  };
}

export function createTelemetryState() {
  return {
    sessionId: makeTelemetryId("session"),
    sessionStart: null,
    sessionEnd: null,
    sessionCount: 0,
    sessionCompletionStatus: "not_started",
    sessionExitType: null,

    currentRunNumber: 1,
    attemptNumberWithinSession: 1,
    cumulativeAttemptCount: 0,

    runId: makeTelemetryId("run"),
    runStart: null,
    runEnd: null,
    runCompletionStatus: "not_started",
    runExitType: null,

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
    nearestChaserDistance: Infinity,

    scenarioCount: 0,
    questionsAnsweredCount: 0,
    questionsPresented: 0,

    questionLatenciesMs: [],
    scenarioLatenciesMs: [],
    copingSelectionLatenciesMs: [],
    safeZoneQuestionLatenciesMs: [],
    teamSuggestionsShown: 0,
    teamSuggestionsFollowed: 0,
    teamSuggestionLatenciesMs: [],

    safeZoneCorrect: 0,
    safeZoneWrong: 0,
    signalPresented: 0,
    signalAnswered: 0,
    signalScores: [],
    signalByDomain: {},
    signalAcknowledgmentsShown: 0,

    copingToolSelected: [],
    copingStart: [],
    copingEnd: [],
    copingEndReason: [],
    highDangerDuration: [],
    supportCycles: [],
    currentSupportCycle: null,

    wrongRepeatTriggered: 0,
    interveningLearningCount: [],
    correctSuppressed: 0,

    questionExposure: [],
    questionTypeCounts: makeEmptyTypeCounts(),
    questionCountByCategory: makeEmptyCategoryCounts(),
    categoryPerformance: makeEmptyCategoryPerformanceMap(),
    choiceMetrics: createEmptyChoiceMetrics(),

    chanceMetrics: makeEmptyChanceMetrics(),
    pointMetrics: makeEmptyPointMetrics(),

    decisionQualities: [],
    eventLog: []
  };
}

export function createFactorTelemetryState() {
  return {
    protectiveCollected: 0,
    riskHit: 0,
    blockedRiskHit: 0,
    totalRiskPointLoss: 0,
    protectiveByType: {},
    riskByType: {}
  };
}

export function resetFactorTelemetryCounts(state) {
  state.factorTelemetry = createFactorTelemetryState();
  return state.factorTelemetry;
}

export function resetRunTelemetry(state) {
  state.telemetry.runId = makeTelemetryId("run");
  state.telemetry.runStart = Date.now();
  state.telemetry.runEnd = null;
  state.telemetry.runCompletionStatus = "in_progress";
  state.telemetry.runExitType = null;

  state.telemetry.movementCount = 0;
  state.telemetry.collisionCount = 0;
  state.telemetry.wrapCount = 0;
  state.telemetry.timesCaught = 0;
  state.telemetry.safeSpaceEntries = 0;
  state.telemetry.totalSafeSpaceMs = 0;
  state.telemetry.dangerZoneEntries = 0;
  state.telemetry.nearMisses = 0;
  state.telemetry.highestLevelReached = 1;
  state.telemetry.chaserProximityHits = 0;
  state.telemetry.nearestChaserDistance = Infinity;

  state.telemetry.scenarioCount = 0;
  state.telemetry.questionsAnsweredCount = 0;
  state.telemetry.questionsPresented = 0;

  state.telemetry.questionLatenciesMs = [];
  state.telemetry.scenarioLatenciesMs = [];
  state.telemetry.copingSelectionLatenciesMs = [];
  state.telemetry.safeZoneQuestionLatenciesMs = [];
  state.telemetry.teamSuggestionsShown = 0;
  state.telemetry.teamSuggestionsFollowed = 0;
  state.telemetry.teamSuggestionLatenciesMs = [];

  state.telemetry.safeZoneCorrect = 0;
  state.telemetry.safeZoneWrong = 0;
  state.telemetry.signalPresented = 0;
  state.telemetry.signalAnswered = 0;
  state.telemetry.signalScores = [];
  state.telemetry.signalByDomain = {};
  state.telemetry.signalAcknowledgmentsShown = 0;

  state.telemetry.copingToolSelected = [];
  state.telemetry.copingStart = [];
  state.telemetry.copingEnd = [];
  state.telemetry.copingEndReason = [];
  state.telemetry.highDangerDuration = [];
  state.telemetry.supportCycles = [];
  state.telemetry.currentSupportCycle = null;

  state.telemetry.wrongRepeatTriggered = 0;
  state.telemetry.interveningLearningCount = [];
  state.telemetry.correctSuppressed = 0;

  state.telemetry.questionExposure = [];
  state.telemetry.questionTypeCounts = makeEmptyTypeCounts();
  state.telemetry.questionCountByCategory = makeEmptyCategoryCounts();
  state.telemetry.categoryPerformance = makeEmptyCategoryPerformanceMap();
  state.telemetry.choiceMetrics = createEmptyChoiceMetrics();

  state.telemetry.chanceMetrics = makeEmptyChanceMetrics();
  state.telemetry.chanceMetrics.startingChances = STARTING_STABILITY;
  state.telemetry.chanceMetrics.endingChances = STARTING_STABILITY;

  const roundedPoints = Number((state.playerState?.protectivePoints || 0).toFixed(2));
  state.telemetry.pointMetrics = makeEmptyPointMetrics();
  state.telemetry.pointMetrics.startingProtectivePoints = roundedPoints;
  state.telemetry.pointMetrics.endingProtectivePoints = roundedPoints;

  state.telemetry.decisionQualities = [];
  state.telemetry.eventLog = [];

  resetFactorTelemetryCounts(state);

  return state.telemetry;
}

export function logEvent(state, type, data = {}) {
  state.telemetry.eventLog.push({
    ts: Date.now(),
    type,
    level: (state.currentThreatLevel || 0) + 1,
    stability: state.playerState?.stability ?? 0,
    protectivePoints: Number((state.playerState?.protectivePoints || 0).toFixed(2)),
    x: Math.round(state.player?.x || 0),
    y: Math.round(state.player?.y || 0),
    ...data
  });
}

export function getChoiceLabel(question, choiceIndex) {
  return question?.choices?.[choiceIndex]?.label || "";
}

export function getChoiceTelemetryTags(question, choiceIndex) {
  return question?.choices?.[choiceIndex]?.telemetryTags || {};
}

export function choiceImpliesHelpSeeking(question, choiceIndex) {
  return getChoiceTelemetryTags(question, choiceIndex).helpSeeking === true;
}

export function choiceIndicatesProtectiveCueIdentification(question, choiceIndex) {
  return getChoiceTelemetryTags(question, choiceIndex).protectiveCue === true;
}

export function getQuestionQualityValue(question, answerKind, isCorrect) {
  if (question?.type === "safe") {
    return isCorrect ? 2 : 0;
  }

  if (answerKind === "best") return 2;
  if (answerKind === "neutral") return 1;
  return 0;
}

export function updateChanceMetrics(state, delta, reason = "unknown", meta = {}) {
  if (!Number.isFinite(delta) || delta === 0) {
    state.telemetry.chanceMetrics.endingChances = state.playerState.stability;
    return;
  }

  if (delta > 0) {
    state.telemetry.chanceMetrics.totalChancesGained += delta;
  } else {
    state.telemetry.chanceMetrics.totalChancesLost += Math.abs(delta);
  }

  if (reason === "monster_hit" && delta < 0) {
    state.telemetry.chanceMetrics.chancesLostToMonsterHits += Math.abs(delta);
  }

  if (reason === "scenario_question" && delta < 0) {
    state.telemetry.chanceMetrics.chancesLostToScenarioQuestions += Math.abs(delta);
  }

  if (reason === "safe_zone_question") {
    if (delta < 0) {
      state.telemetry.chanceMetrics.chancesLostToSafeZoneQuestions += Math.abs(delta);
    } else {
      state.telemetry.chanceMetrics.chancesGainedFromCorrectSafeZoneAnswers += delta;
    }
  }

  if (reason === "safe_zone_entry" && delta > 0) {
    state.telemetry.chanceMetrics.chancesGainedFromSafeZoneEntry += delta;
  }

  if (
    meta.category &&
    state.telemetry.chanceMetrics.stabilityDeltaByCategory[meta.category] !== undefined
  ) {
    state.telemetry.chanceMetrics.stabilityDeltaByCategory[meta.category] += delta;
  }

  state.telemetry.chanceMetrics.endingChances = state.playerState.stability;
}

export function updatePointMetrics(state, delta, reason = "unknown", meta = {}) {
  if (!Number.isFinite(delta) || delta === 0) {
    state.telemetry.pointMetrics.endingProtectivePoints = Number(
      state.playerState.protectivePoints.toFixed(2)
    );
    return;
  }

  if (delta > 0) {
    state.telemetry.pointMetrics.totalProtectivePointsGained += delta;
  } else {
    state.telemetry.pointMetrics.totalProtectivePointsLost += Math.abs(delta);
  }

  if (
    meta.category &&
    state.telemetry.pointMetrics.protectivePointsDeltaByCategory[meta.category] !== undefined
  ) {
    state.telemetry.pointMetrics.protectivePointsDeltaByCategory[meta.category] += delta;
  }

  state.telemetry.pointMetrics.endingProtectivePoints = Number(
    state.playerState.protectivePoints.toFixed(2)
  );
}

export function recordQuestionPresented(state, question, context = {}) {
  const record = {
    exposureId: makeTelemetryId("question"),
    questionId: question.id,
    questionType: question.type,
    questionCategory: question.category,
    questionSource: context.source || "manual",
    zoneType: context.zoneType || null,
    gradeBand: state.currentGradeBand,

    presentedAtTs: Date.now(),
    answeredAtTs: null,
    latencyMs: null,

    selectedChoiceIndex: null,
    selectedChoiceLabel: null,
    selectedChoiceTags: null,

    answerKind: null,
    isCorrect: null,
    usedCollaboration: false,
    selectedCopingTool: null,
    teamSuggestionShown: false,
    teamSuggestedChoiceIndex: null,
    teamSuggestedChoiceLabel: null,
    teamSuggestionAtTs: null,
    teamSuggestionLatencyMs: null,
    teamSuggestionFollowed: false,
    postSuggestionDecisionLatencyMs: null,
    signalType: question.signalType || null,
    signalDomain: question.signalDomain || null,
    signalScore: null,
    acknowledgmentShown: false,
    wrongRepeatTriggered: false,
    interveningLearningCount: null,
    correctSuppressed: 0,

    protectivePointsDelta: 0,
    stabilityDelta: 0
  };

  state.telemetry.questionExposure.push(record);
  state.telemetry.questionsPresented += 1;
  state.telemetry.questionTypeCounts[question.type] =
    (state.telemetry.questionTypeCounts[question.type] || 0) + 1;

  if (question.type === "signal") {
    state.telemetry.signalPresented += 1;
  } else {
    state.telemetry.questionCountByCategory[question.category] =
      (state.telemetry.questionCountByCategory[question.category] || 0) + 1;

    if (state.telemetry.categoryPerformance[question.category]) {
      state.telemetry.categoryPerformance[question.category].presented += 1;
    }
  }

  return record.exposureId;
}

export function getQuestionExposureRecord(state, exposureId) {
  if (!exposureId) return null;
  return (
    state.telemetry.questionExposure.find((item) => item.exposureId === exposureId) || null
  );
}

export function recordQuestionAnswered(state, question, choiceIndex, details = {}) {
  const exposure = getQuestionExposureRecord(state, state.modalContext?.exposureId);
  const categoryEntry =
    question.type === "signal" ? null : state.telemetry.categoryPerformance[question.category];
  const choiceLabel = getChoiceLabel(question, choiceIndex);
  const choiceTags = getChoiceTelemetryTags(question, choiceIndex);
  const quality = getQuestionQualityValue(
    question,
    details.answerKind,
    details.isCorrect
  );

  if (exposure) {
    exposure.answeredAtTs = Date.now();
    exposure.latencyMs = details.latencyMs ?? null;
    exposure.selectedChoiceIndex = choiceIndex;
    exposure.selectedChoiceLabel = choiceLabel;
    exposure.selectedChoiceTags = { ...choiceTags };
    exposure.answerKind = details.answerKind ?? null;
    exposure.isCorrect = details.isCorrect ?? null;
    exposure.usedCollaboration = !!details.usedCollaboration;
    exposure.selectedCopingTool = details.selectedCopingTool || null;
    exposure.teamSuggestionShown = !!details.teamSuggestionShown;
    exposure.teamSuggestedChoiceIndex = details.teamSuggestedChoiceIndex ?? null;
    exposure.teamSuggestedChoiceLabel =
      details.teamSuggestedChoiceLabel ?? exposure.teamSuggestedChoiceLabel ?? null;
    exposure.teamSuggestionAtTs =
      details.teamSuggestionAtTs ?? exposure.teamSuggestionAtTs ?? null;
    exposure.teamSuggestionLatencyMs =
      details.teamSuggestionLatencyMs ?? exposure.teamSuggestionLatencyMs ?? null;
    exposure.teamSuggestionFollowed = !!details.teamSuggestionFollowed;
    exposure.postSuggestionDecisionLatencyMs =
      details.postSuggestionDecisionLatencyMs ?? null;
    exposure.signalScore = details.signalScore ?? null;
    exposure.acknowledgmentShown = !!details.acknowledgmentShown;
    exposure.wrongRepeatTriggered = !!details.wrongRepeatTriggered;
    exposure.interveningLearningCount = details.interveningLearningCount ?? null;
    exposure.correctSuppressed = details.correctSuppressed || 0;
    exposure.protectivePointsDelta = details.protectivePointsDelta || 0;
    exposure.stabilityDelta = details.stabilityDelta || 0;
  }

  if (question.type === "signal") {
    state.telemetry.signalAnswered += 1;
    if (details.acknowledgmentShown) {
      state.telemetry.signalAcknowledgmentsShown += 1;
    }
    if (details.signalScore !== undefined && details.signalScore !== null) {
      state.telemetry.signalScores.push(details.signalScore);
    }
    const domainKey = question.signalDomain || "unknown";
    state.telemetry.signalByDomain[domainKey] =
      (state.telemetry.signalByDomain[domainKey] || 0) + 1;
    return;
  }

  if (details.wrongRepeatTriggered) {
    state.telemetry.wrongRepeatTriggered += 1;
  }
  if (
    details.interveningLearningCount !== undefined &&
    details.interveningLearningCount !== null
  ) {
    state.telemetry.interveningLearningCount.push(details.interveningLearningCount);
  }
  if (details.correctSuppressed) {
    state.telemetry.correctSuppressed += details.correctSuppressed;
  }
  if (details.teamSuggestionFollowed) {
    state.telemetry.teamSuggestionsFollowed += 1;
  }

  if (categoryEntry) {
    categoryEntry.answered += 1;
    categoryEntry.totalLatencyMs += details.latencyMs || 0;
    categoryEntry.totalDecisionQuality += quality;
    categoryEntry.totalProtectivePointsDelta += details.protectivePointsDelta || 0;
    categoryEntry.totalStabilityDelta += details.stabilityDelta || 0;

    if (question.type === "safe") {
      if (details.isCorrect) {
        categoryEntry.correct += 1;
      } else {
        categoryEntry.wrong += 1;
      }
    } else {
      if (details.answerKind === "best") {
        categoryEntry.best += 1;
        categoryEntry.correct += 1;
      } else if (details.answerKind === "neutral") {
        categoryEntry.neutral += 1;
      } else if (details.answerKind === "risky") {
        categoryEntry.risky += 1;
        categoryEntry.wrong += 1;
      }
    }
  }

  if (choiceImpliesHelpSeeking(question, choiceIndex)) {
    state.telemetry.choiceMetrics.helpSeekingChoiceSelected += 1;
  }

  if (choiceIndicatesProtectiveCueIdentification(question, choiceIndex)) {
    state.telemetry.choiceMetrics.protectiveCueVsRiskCueIdentification += 1;
  }
}

export function getAverageLatencyByCategory(state, category) {
  const entry = state.telemetry.categoryPerformance[category];
  if (!entry || entry.answered === 0) return null;
  return Number((entry.totalLatencyMs / entry.answered).toFixed(2));
}

export function getAverageDecisionQualityByCategory(state, category) {
  const entry = state.telemetry.categoryPerformance[category];
  if (!entry || entry.answered === 0) return null;
  return Number((entry.totalDecisionQuality / entry.answered).toFixed(2));
}

export function getCategoryRanking(state) {
  const ranked = QUESTION_CATEGORY_KEYS
    .map((category) => ({
      category,
      score: getAverageDecisionQualityByCategory(state, category) ?? -1,
      answered: state.telemetry.categoryPerformance[category].answered
    }))
    .filter((item) => item.answered > 0)
    .sort((a, b) => b.score - a.score);

  return {
    bestCategory: ranked.length ? ranked[0].category : null,
    lowestCategory: ranked.length ? ranked[ranked.length - 1].category : null
  };
}

export function getTelemetrySnapshot(state) {
  const categoryAverages = {};

  QUESTION_CATEGORY_KEYS.forEach((category) => {
    categoryAverages[category] = {
      averageLatencyMs: getAverageLatencyByCategory(state, category),
      averageDecisionQuality: getAverageDecisionQualityByCategory(state, category),
      ...state.telemetry.categoryPerformance[category]
    };
  });

  return {
    raw: {
      currentGradeBand: state.currentGradeBand,

      sessionId: state.telemetry.sessionId,
      sessionStart: state.telemetry.sessionStart,
      sessionEnd: state.telemetry.sessionEnd,
      sessionCount: state.telemetry.sessionCount,
      sessionCompletionStatus: state.telemetry.sessionCompletionStatus,
      sessionExitType: state.telemetry.sessionExitType,

      currentRunNumber: state.telemetry.currentRunNumber,
      attemptNumberWithinSession: state.telemetry.attemptNumberWithinSession,
      cumulativeAttemptCount: state.telemetry.cumulativeAttemptCount,

      runId: state.telemetry.runId,
      runStart: state.telemetry.runStart,
      runEnd: state.telemetry.runEnd,
      runCompletionStatus: state.telemetry.runCompletionStatus,
      runExitType: state.telemetry.runExitType,

      movementCount: state.telemetry.movementCount,
      collisionCount: state.telemetry.collisionCount,
      wrapCount: state.telemetry.wrapCount,
      timesCaught: state.telemetry.timesCaught,
      safeSpaceEntries: state.telemetry.safeSpaceEntries,
      totalSafeSpaceMs: state.telemetry.totalSafeSpaceMs,
      dangerZoneEntries: state.telemetry.dangerZoneEntries,
      nearMisses: state.telemetry.nearMisses,
      highestLevelReached: state.telemetry.highestLevelReached,
      chaserProximityHits: state.telemetry.chaserProximityHits,
      nearestChaserDistance: state.telemetry.nearestChaserDistance,

      questionsPresented: state.telemetry.questionsPresented,
      questionsAnsweredCount: state.telemetry.questionsAnsweredCount,
      scenarioCount: state.telemetry.scenarioCount,

      questionLatenciesMs: state.telemetry.questionLatenciesMs,
      scenarioLatenciesMs: state.telemetry.scenarioLatenciesMs,
      copingSelectionLatenciesMs: state.telemetry.copingSelectionLatenciesMs,
      safeZoneQuestionLatenciesMs: state.telemetry.safeZoneQuestionLatenciesMs,
      teamSuggestionsShown: state.telemetry.teamSuggestionsShown,
      teamSuggestionsFollowed: state.telemetry.teamSuggestionsFollowed,
      teamSuggestionLatenciesMs: state.telemetry.teamSuggestionLatenciesMs,

      safeZoneCorrect: state.telemetry.safeZoneCorrect,
      safeZoneWrong: state.telemetry.safeZoneWrong,
      signalPresented: state.telemetry.signalPresented,
      signalAnswered: state.telemetry.signalAnswered,
      signalScores: state.telemetry.signalScores,
      signalByDomain: state.telemetry.signalByDomain,
      signalAcknowledgmentsShown: state.telemetry.signalAcknowledgmentsShown,
      copingToolSelected: state.telemetry.copingToolSelected,
      copingStart: state.telemetry.copingStart,
      copingEnd: state.telemetry.copingEnd,
      copingEndReason: state.telemetry.copingEndReason,
      highDangerDuration: state.telemetry.highDangerDuration,
      supportCycles: state.telemetry.supportCycles,
      currentSupportCycle: state.telemetry.currentSupportCycle,
      wrongRepeatTriggered: state.telemetry.wrongRepeatTriggered,
      interveningLearningCount: state.telemetry.interveningLearningCount,
      correctSuppressed: state.telemetry.correctSuppressed,

      questionExposure: state.telemetry.questionExposure,
      questionTypeCounts: state.telemetry.questionTypeCounts,
      questionCountByCategory: state.telemetry.questionCountByCategory,
      choiceMetrics: state.telemetry.choiceMetrics,
      chanceMetrics: state.telemetry.chanceMetrics,
      pointMetrics: state.telemetry.pointMetrics,
      factorTelemetry: state.factorTelemetry,
      eventLog: state.telemetry.eventLog
    },

    derived: {
      runDurationMs:
        state.telemetry.runStart && state.telemetry.runEnd
          ? state.telemetry.runEnd - state.telemetry.runStart
          : null,
      timeSurvivedSeconds: state.telemetry.runStart
        ? Math.floor(((state.telemetry.runEnd || Date.now()) - state.telemetry.runStart) / 1000)
        : null,
      protectiveToTrapPickupRatio:
        state.factorTelemetry.riskHit > 0
          ? Number(
              (state.factorTelemetry.protectiveCollected / state.factorTelemetry.riskHit).toFixed(2)
            )
          : null,
      categoryAverages
    },

    summary: {
      currentGradeBand: state.currentGradeBand,
      ...getCategoryRanking(state),
      endingChances: state.telemetry.chanceMetrics.endingChances,
      endingProtectivePoints: state.telemetry.pointMetrics.endingProtectivePoints,
      helpSeekingChoiceSelected: state.telemetry.choiceMetrics.helpSeekingChoiceSelected,
      protectiveCueVsRiskCueIdentification:
        state.telemetry.choiceMetrics.protectiveCueVsRiskCueIdentification,
      signalPresented: state.telemetry.signalPresented,
      signalAnswered: state.telemetry.signalAnswered,
      signalAcknowledgmentsShown: state.telemetry.signalAcknowledgmentsShown,
      wrongRepeatTriggered: state.telemetry.wrongRepeatTriggered,
      correctSuppressed: state.telemetry.correctSuppressed,
      teamSuggestionsShown: state.telemetry.teamSuggestionsShown,
      teamSuggestionsFollowed: state.telemetry.teamSuggestionsFollowed
    }
  };
}
