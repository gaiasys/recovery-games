import { TOTAL_RUNS, factorSummaryCopy } from "./data.js";

const CATEGORY_COPY = {
  peer: {
    label: "Peer Pressure",
    success: "You handled social pressure well and stayed closer to safer choices.",
    growth: "Peer moments got harder when pressure showed up. Practice a clear no and stay with safer people."
  },
  personal: {
    label: "Handling Big Feelings",
    success: "You stayed more grounded when stress or emotions showed up.",
    growth: "Stress-based choices were harder this run. Slow down first, then use a coping tool or safe support."
  },
  facts: {
    label: "Knowing the Facts",
    success: "You recognized the safer fact-based choice more often in this lane.",
    growth: "Fact-check moments were harder this run. Pause longer and look for the safest health-based answer."
  }
};

const SAFE_ZONE_LABELS = {
  school: "School",
  family: "Family",
  peer: "Friends"
};

const COPING_TOOL_LABELS = {
  stress_management: "Stress Management",
  creative_outlets: "Creative Outlets",
  physical_activity: "Physical Activity"
};

function formatCategoryLabel(category) {
  return CATEGORY_COPY[category]?.label || "This Skill Lane";
}

function formatSafeZoneLabel(zoneType) {
  return SAFE_ZONE_LABELS[zoneType] || "Safe support";
}

function formatCopingToolLabel(toolId) {
  return COPING_TOOL_LABELS[toolId] || "your coping tool";
}

function getCategoryEntry(snapshot, category) {
  return snapshot?.derived?.categoryAverages?.[category] || null;
}

function getCategoryPerformanceText(snapshot, category, mode = "success") {
  const entry = getCategoryEntry(snapshot, category);
  const copy = CATEGORY_COPY[category];

  if (!copy || !entry || !entry.answered) {
    return mode === "success"
      ? "This lane did not show up enough this run to score yet."
      : "This lane did not appear enough this run to become a practice target yet.";
  }

  if (mode === "success") {
    if ((entry.best || 0) >= Math.max(entry.neutral || 0, entry.risky || 0)) {
      return copy.success;
    }

    return `You stayed engaged in ${copy.label.toLowerCase()} moments, even when the safer answer was not always the first pick.`;
  }

  if ((entry.risky || 0) > (entry.best || 0)) {
    return copy.growth;
  }

  if ((entry.wrong || 0) > 0) {
    return `You were close in ${copy.label.toLowerCase()} moments. A little more practice can turn near-misses into strong choices.`;
  }

  return `Keep practicing ${copy.label.toLowerCase()} so the safer option feels faster under pressure.`;
}

function getAdaptiveCoachingTip(snapshot, playerProfile = {}, playerState = {}) {
  const bestCategory = snapshot?.summary?.bestCategory || null;
  const lowestCategory = snapshot?.summary?.lowestCategory || null;
  const helpSeekingCount = snapshot?.summary?.helpSeekingChoiceSelected || 0;
  const cueCount = snapshot?.summary?.protectiveCueVsRiskCueIdentification || 0;
  const topSafeZone = playerProfile?.safeZonePriority?.[0] || null;
  const topRecoveryTool = playerProfile?.recoveryPriority?.[0] || playerState?.lastSelectedCopingTool || null;

  if (lowestCategory === "peer") {
    return `Next run, use ${formatSafeZoneLabel(topSafeZone)} support when pressure builds and practice one clear boundary before you move again.`;
  }

  if (lowestCategory === "personal") {
    return `Next run, open with ${formatCopingToolLabel(topRecoveryTool)} before stress snowballs, then head for ${formatSafeZoneLabel(topSafeZone)} support if you still feel overloaded.`;
  }

  if (lowestCategory === "facts") {
    return `Next run, slow the moment down and use ${formatSafeZoneLabel(topSafeZone)} support to check the safest fact-based answer before reacting fast.`;
  }

  if (helpSeekingCount <= 0 && bestCategory !== "facts") {
    return `Next run, try reaching out sooner. Asking for safe support earlier can protect both your chances and your decision quality.`;
  }

  if (cueCount <= 1) {
    return "Next run, scan for the protective cue first. The safer option usually leaves you with more space, more support, or more time to think.";
  }

  return `Next run, lean into ${formatCategoryLabel(bestCategory).toLowerCase()} again and pair it with ${formatCopingToolLabel(topRecoveryTool)} when pressure starts to rise.`;
}

function buildAdaptiveDebrief(snapshot, playerProfile = {}, playerState = {}) {
  const bestCategory = snapshot?.summary?.bestCategory || null;
  const lowestCategory = snapshot?.summary?.lowestCategory || null;
  const helpSeekingCount = snapshot?.summary?.helpSeekingChoiceSelected || 0;
  const cueCount = snapshot?.summary?.protectiveCueVsRiskCueIdentification || 0;
  const questionCount = snapshot?.raw?.questionsAnsweredCount || 0;

  const headline = bestCategory && lowestCategory
    ? `Your strongest lane was ${formatCategoryLabel(bestCategory)}, while ${formatCategoryLabel(lowestCategory)} needs the most practice next.`
    : questionCount > 0
    ? "You completed the run, and the game captured enough choices to start coaching your next step."
    : "This run ended quickly, so the coaching below focuses on your next safest move.";

  const supportRead = helpSeekingCount > 0
    ? `You reached for safe support ${helpSeekingCount} time${helpSeekingCount === 1 ? "" : "s"} during decision moments, which is a strong protective signal.`
    : "You did not use help-seeking much in this run, so the next goal is to reach out sooner when pressure shows up.";

  const cueRead = cueCount > 0
    ? `You identified the safer protective cue ${cueCount} time${cueCount === 1 ? "" : "s"} during questions.`
    : "The safer protective cue was harder to spot this run, so slow the decision down a little more next time.";

  return {
    headline,
    strongestLabel: bestCategory ? formatCategoryLabel(bestCategory) : "Undetermined",
    strongestText: getCategoryPerformanceText(snapshot, bestCategory, "success"),
    growthLabel: lowestCategory ? formatCategoryLabel(lowestCategory) : "Undetermined",
    growthText: getCategoryPerformanceText(snapshot, lowestCategory, "growth"),
    supportRead,
    cueRead,
    coachTip: getAdaptiveCoachingTip(snapshot, playerProfile, playerState)
  };
}

export function getDomRefs(doc = document) {
  const canvas = doc.getElementById("game");

  return {
    document: doc,
    canvas,
    ctx: canvas ? canvas.getContext("2d") : null,

    setupTitle: doc.getElementById("setupTitle"),
    setupSub: doc.getElementById("setupSub"),
    setupOverlay: doc.getElementById("setupOverlay"),
    questionnaireGrid: doc.getElementById("questionnaireGrid"),
    startGameBtn: doc.getElementById("startGameBtn"),
    endSessionBtn: doc.getElementById("endSessionBtn"),
    runAgainBtn: doc.getElementById("runAgainBtn"),
    setupError: doc.getElementById("setupError"),

    scenarioModal: doc.getElementById("scenarioModal"),
    scenarioCard: doc.querySelector(".scenario-card"),
    scenarioTitle: doc.getElementById("scenarioTitle"),
    scenarioText: doc.getElementById("scenarioText"),
    scenarioMeta: doc.getElementById("scenarioMeta"),
    scenarioHint: doc.getElementById("scenarioHint"),
    scenarioChoices: doc.getElementById("scenarioChoices"),
    scenarioResultBox: doc.getElementById("scenarioResultBox"),
    scenarioFeedback: doc.getElementById("scenarioFeedback"),
    scenarioOutcome: doc.getElementById("scenarioOutcome"),
    scenarioContinueBtn: doc.getElementById("scenarioContinueBtn"),

    hudLevel: doc.getElementById("hudLevel"),
    hudEnergy: doc.getElementById("hudEnergy"),
    hudScore: doc.getElementById("hudScore"),
    hudCaught: doc.getElementById("hudCaught"),
    hudFocus: doc.getElementById("hudFocus"),
    hudTool: doc.getElementById("hudTool"),

    prevStepBtn: doc.getElementById("prevStepBtn"),
    nextStepBtn: doc.getElementById("nextStepBtn"),
    surveyStepLabel: doc.getElementById("surveyStepLabel"),
    surveyProgressFill: doc.getElementById("surveyProgressFill"),
    surveyStageTitle: doc.getElementById("surveyStageTitle"),
    surveyStageSub: doc.getElementById("surveyStageSub"),
    buildSnapshotPanel: doc.getElementById("buildSnapshotPanel"),
    choicesPanel: doc.getElementById("choicesPanel"),
    setupScroll: doc.querySelector(".setup-scroll"),
    gradeEntryCard: doc.getElementById("gradeEntryCard"),
    studentGrade: doc.getElementById("studentGrade")
  };
}

export function updateFocusHUD(dom, playerProfile) {
  if (!dom?.hudFocus || !playerProfile?.safeZonePriority?.length) return;
  dom.hudFocus.textContent = `Strongest Safe Place: ${playerProfile.safeZonePriority[0].toUpperCase()}`;
}

export function updateHUD({ dom, currentThreatLevel, playerState, copingState, telemetry, playerProfile, getReadableTool }) {
  if (!dom) return;

  if (dom.hudLevel) {
    dom.hudLevel.textContent = `Level: ${Number(currentThreatLevel || 0) + 1}`;
  }

  if (dom.hudEnergy) {
    dom.hudEnergy.textContent = `Chances Left: ${playerState?.stability ?? 0}`;
  }

  if (dom.hudScore) {
    dom.hudScore.textContent = `Protective Points: ${Number(playerState?.protectivePoints || 0).toFixed(2)}`;
  }

  if (dom.hudCaught) {
    dom.hudCaught.textContent = `Monster Hits: ${telemetry?.timesCaught ?? 0}`;
  }

  updateFocusHUD(dom, playerProfile);

  if (dom.hudTool) {
  const activeToolId = copingState?.activeToolId || null;
  const isCopingActive = !!copingState?.active;

  const toolIcons = {
    stress_management: "⚡",
    creative_outlets: "✨",
    physical_activity: "🔥"
  };

  const icon = toolIcons[activeToolId] || "○";

  dom.hudTool.textContent = isCopingActive
  ? `${icon} Support: Active`
  : "○ Support: Off";
 }
}

export function resetScenarioModalUI(dom) {
  if (!dom) return;

  dom.scenarioModal?.classList.add("hidden");
  dom.scenarioCard?.classList.remove("is-answered");

  const assist = dom.scenarioCard?.querySelector(".scenario-assist");
  if (assist) assist.remove();

  dom.scenarioChoices?.classList.remove("hidden");
  dom.scenarioResultBox?.classList.add("hidden");

  if (dom.scenarioChoices) dom.scenarioChoices.innerHTML = "";
  if (dom.scenarioFeedback) dom.scenarioFeedback.textContent = "";
  if (dom.scenarioOutcome) {
    dom.scenarioOutcome.textContent = "";
    dom.scenarioOutcome.className = "outcome-pill";
  }
  if (dom.scenarioHint) {
    dom.scenarioHint.classList.add("hidden");
    dom.scenarioHint.textContent = "";
  }
  if (dom.scenarioMeta) dom.scenarioMeta.textContent = "";
}

export function closeScenarioUI(dom) {
  resetScenarioModalUI(dom);
}

export function showScenarioResult(dom, { feedback = "", outcomeText = "", outcomeType = "neutral" } = {}) {
  if (!dom) return;

  dom.scenarioChoices?.classList.add("hidden");
  dom.scenarioHint?.classList.add("hidden");
  dom.scenarioCard?.classList.add("is-answered");
  dom.scenarioResultBox?.classList.remove("hidden");

  if (dom.scenarioFeedback) {
    dom.scenarioFeedback.textContent = feedback;
  }

  if (dom.scenarioOutcome) {
    dom.scenarioOutcome.textContent = outcomeText;
    dom.scenarioOutcome.className =
      "outcome-pill " +
      (outcomeType === "reward"
        ? "outcome-reward"
        : outcomeType === "lag"
        ? "outcome-lag"
        : "outcome-neutral");
  }
}

export function getPlaySummaryBand(summary) {
  if ((summary?.protectiveCollected || 0) >= 6 && (summary?.riskHit || 0) <= 2) {
    return {
      title: "Strong Protective Play",
      text: "You built a lot of Protective Points this run. That means you used your supports well and made strong choices under pressure."
    };
  }

  if ((summary?.protectiveCollected || 0) > 0 && (summary?.riskHit || 0) > 0 && (summary?.riskHit || 0) < (summary?.protectiveCollected || 0)) {
    return {
      title: "Mixed Play",
      text: "You made several strong choices, and you also hit a few traps. Traps are great learning moments. They show where something looked safe but was not."
    };
  }

  return {
    title: "High Risk Pickups",
    text: "You faced a lot of pressure this run. Risk pickups show where things got tough. These are the best places to practice coping tools next time."
  };
}

export function getRoundSummaryData({ factorTelemetry, playerState, getTelemetrySnapshot }) {
  const telemetrySnapshot = typeof getTelemetrySnapshot === "function" ? getTelemetrySnapshot() : null;

  return {
    protectiveCollected: factorTelemetry?.protectiveCollected || 0,
    riskHit: factorTelemetry?.riskHit || 0,
    blockedRiskHit: factorTelemetry?.blockedRiskHit || 0,
    totalRiskPointLoss: Number((factorTelemetry?.totalRiskPointLoss || 0).toFixed(2)),
    endingProtectivePoints: Number((playerState?.protectivePoints || 0).toFixed(2)),
    protectiveByType: { ...(factorTelemetry?.protectiveByType || {}) },
    riskByType: { ...(factorTelemetry?.riskByType || {}) },
    telemetrySummary: telemetrySnapshot?.summary || null,
    telemetrySnapshot
  };
}

export function getFactorImageSrc(id, sprites = {}) {
  return sprites?.protective?.[id]?.src || sprites?.risk?.[id]?.src || "";
}

export function renderFactorSummaryRows(countMap, ids, { sprites = {}, factorSummaryMap = factorSummaryCopy } = {}) {
  return ids
    .filter((id) => (countMap?.[id] || 0) > 0)
    .map((id) => {
      const copy = factorSummaryMap[id];
      if (!copy) return "";

      const count = countMap[id] || 0;
      const imgSrc = getFactorImageSrc(id, sprites);

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

export function openPostRunDecision({
  dom,
  telemetry,
  factorTelemetry,
  playerState,
  playerProfile = null,
  sprites,
  getTelemetrySnapshot,
  reason = "chances_depleted"
}) {
  if (!dom) return null;

  const roundSummary = getRoundSummaryData({
    factorTelemetry,
    playerState,
    getTelemetrySnapshot
  });

  const playBand = getPlaySummaryBand(roundSummary);
  const adaptiveDebrief = buildAdaptiveDebrief(roundSummary.telemetrySnapshot, playerProfile, playerState);

  if (dom.setupTitle) dom.setupTitle.textContent = "Run Summary";
  if (dom.setupSub) {
    dom.setupSub.textContent =
      `Run ${telemetry?.currentRunNumber || 1} of ${TOTAL_RUNS} is complete. Review how the run went, then choose your next step.`;
  }

  if (dom.surveyStepLabel) dom.surveyStepLabel.textContent = "Run Summary";
  if (dom.surveyStageTitle) dom.surveyStageTitle.textContent = playBand.title;
  if (dom.surveyStageSub) dom.surveyStageSub.textContent = playBand.text;
  if (dom.surveyProgressFill) dom.surveyProgressFill.style.width = "100%";
  if (dom.setupError) dom.setupError.textContent = "";
  if (dom.gradeEntryCard) dom.gradeEntryCard.classList.add("hidden");

  if (dom.prevStepBtn) dom.prevStepBtn.style.display = "none";
  if (dom.nextStepBtn) dom.nextStepBtn.style.display = "none";
  if (dom.startGameBtn) dom.startGameBtn.style.display = "none";

  if (dom.endSessionBtn) dom.endSessionBtn.classList.remove("hidden");
  if (dom.runAgainBtn) {
    dom.runAgainBtn.textContent =
      (telemetry?.currentRunNumber || 1) < TOTAL_RUNS
        ? `Start Run ${(telemetry?.currentRunNumber || 1) + 1}`
        : "No Runs Left";
    dom.runAgainBtn.classList.toggle("hidden", (telemetry?.currentRunNumber || 1) >= TOTAL_RUNS);
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
    ], { sprites })}
    ${renderFactorSummaryRows(roundSummary.riskByType, [
      "alcohol_exposure",
      "social_harm",
      "conflict_stress",
      "mental_overload"
    ], { sprites })}
  `;

  if (dom.questionnaireGrid) {
    dom.questionnaireGrid.innerHTML = `
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
          (telemetry?.currentRunNumber || 1) < TOTAL_RUNS
            ? `Select <strong>Start Run ${(telemetry?.currentRunNumber || 1) + 1}</strong> to keep going, or <strong>Finish</strong> to stop here.`
            : `All 3 runs are complete. Select <strong>Finish</strong> to close the session.`
        }</p>
      </div>

      <div class="question-card theme-defense" style="grid-column: 1 / -1;">
        <div class="question-title-row">
          <span class="question-icon">🧭</span>
          <h3>Your Coach’s Debrief</h3>
        </div>
        <p>${adaptiveDebrief.headline}</p>

        <div class="build-summary-list">
          <div class="build-summary-item">
            <span class="build-summary-label">Strongest Lane</span>
            <span class="build-summary-value">${adaptiveDebrief.strongestLabel}</span>
            <span class="build-summary-value">${adaptiveDebrief.strongestText}</span>
          </div>

          <div class="build-summary-item">
            <span class="build-summary-label">Practice Next</span>
            <span class="build-summary-value">${adaptiveDebrief.growthLabel}</span>
            <span class="build-summary-value">${adaptiveDebrief.growthText}</span>
          </div>

          <div class="build-summary-item">
            <span class="build-summary-label">Pressure Signals</span>
            <span class="build-summary-value">${adaptiveDebrief.supportRead}</span>
            <span class="build-summary-value">${adaptiveDebrief.cueRead}</span>
          </div>

          <div class="build-summary-item">
            <span class="build-summary-label">Coach Tip for the Next Run</span>
            <span class="build-summary-value">${adaptiveDebrief.coachTip}</span>
          </div>
        </div>
      </div>

      <div class="question-card theme-knowledge" style="grid-column: 1 / -1;">
        <div class="question-title-row">
          <span class="question-icon">◈</span>
          <h3>Here’s What You Collected</h3>
        </div>
        <p>This run included the following helpful and risky factors.</p>

        <div class="build-summary-list run-summary-grid">
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
  }

  if (dom.buildSnapshotPanel) {
    dom.buildSnapshotPanel.innerHTML = `
      <div class="build-panel-card">
        <h3>What Happened This Run</h3>

        <div class="run-stats-grid">
          <div class="run-stat">
            <span class="run-stat-label">Run End</span>
            <span class="run-stat-value">${reason === "chances_depleted" ? "No Chances Left" : "Completed"}</span>
          </div>

          <div class="run-stat">
            <span class="run-stat-label">Ending Protective Points</span>
            <span class="run-stat-value">${roundSummary.endingProtectivePoints}</span>
          </div>

          <div class="run-stat">
            <span class="run-stat-label">Helpful Items Collected</span>
            <span class="run-stat-value">${roundSummary.protectiveCollected}</span>
          </div>

          <div class="run-stat">
            <span class="run-stat-label">Risk Items Hit</span>
            <span class="run-stat-value">${roundSummary.riskHit}</span>
          </div>

          <div class="run-stat">
            <span class="run-stat-label">Strongest Lane</span>
            <span class="run-stat-value">${adaptiveDebrief.strongestLabel}</span>
          </div>

          <div class="run-stat">
            <span class="run-stat-label">Practice Next</span>
            <span class="run-stat-value">${adaptiveDebrief.growthLabel}</span>
          </div>
        </div>
      </div>
    `;
  }

  return { roundSummary, playBand };
}

export function renderPostRunResponses({ dom, getPostRunResponseText }) {
  if (!dom?.choicesPanel || typeof getPostRunResponseText !== "function") return;

  dom.choicesPanel.innerHTML = `
    <div class="build-panel-card" style="margin-top: 12px;">
      <h3>What You Said After the Run</h3>
      <div class="build-summary-list">

<div class="build-summary-item">
  <span class="build-summary-label">Biggest Challenge After the Run</span>
  <span class="build-summary-value">${getPostRunResponseText("challengePriority")}</span>
</div>

<div class="build-summary-item">
  <span class="build-summary-label">Best Coping Tool After the Run</span>
  <span class="build-summary-value">${getPostRunResponseText("recoveryPriority")}</span>
</div>

<div class="build-summary-item">
  <span class="build-summary-label">Game Enjoyment</span>
  <span class="build-summary-value">${getPostRunResponseText("gameEnjoyment")}</span>
</div>
      </div>
    </div>
  `;
}

export function openEndedState({
  dom,
  telemetry,
  playerState,
  getPostRunResponseText,
  playSound = null,
  bigWinSound = null,
  logEvent = null
}) {
  if (!dom) return;

  telemetry.sessionEnd = Date.now();
  telemetry.sessionCompletionStatus = (telemetry.currentRunNumber || 1) >= TOTAL_RUNS ? "completed_all_runs" : "ended_early";
  telemetry.sessionExitType = "normal";

  if (typeof playSound === "function" && bigWinSound) {
    playSound(bigWinSound, 0.45);
  }

  if (dom.setupTitle) dom.setupTitle.textContent = "Session Finished";
  if (dom.setupSub) {
    dom.setupSub.textContent =
      "This 3-run session is done. You can start a new 3-run session with the same build.";
  }
  if (dom.surveyStepLabel) dom.surveyStepLabel.textContent = "Session Finished";
  if (dom.surveyStageTitle) dom.surveyStageTitle.textContent = "All Done";
  if (dom.surveyStageSub) {
    dom.surveyStageSub.textContent =
      "Choose Start New 3-Run Session whenever you want to play again.";
  }
  if (dom.surveyProgressFill) dom.surveyProgressFill.style.width = "100%";
  if (dom.setupError) dom.setupError.textContent = "";
  if (dom.gradeEntryCard) dom.gradeEntryCard.classList.add("hidden");

  if (dom.prevStepBtn) dom.prevStepBtn.style.display = "none";
  if (dom.nextStepBtn) dom.nextStepBtn.style.display = "none";
  if (dom.startGameBtn) dom.startGameBtn.style.display = "none";
  if (dom.endSessionBtn) dom.endSessionBtn.classList.add("hidden");
  if (dom.runAgainBtn) {
    dom.runAgainBtn.textContent = "Start New 3-Run Session";
    dom.runAgainBtn.classList.remove("hidden");
  }

  if (dom.questionnaireGrid) {
    dom.questionnaireGrid.innerHTML = `
      <div class="question-card theme-support">
        <div class="question-title-row">
          <span class="question-icon">✓</span>
          <h3>Session Finished</h3>
        </div>
        <p>Your 3-run session is complete. Select <strong>Start New 3-Run Session</strong> whenever you want to play again.</p>
      </div>
    `;
  }

  if (dom.buildSnapshotPanel) {
    dom.buildSnapshotPanel.innerHTML = `
      <div class="build-panel-card">
        <h3>Final Snapshot</h3>
        <div class="build-summary-list">
          <div class="build-summary-item">
            <span class="build-summary-label">Total Protective Points</span>
            <span class="build-summary-value">${Number(playerState?.protectivePoints || 0).toFixed(2)}</span>
          </div>

          <div class="build-summary-item">
            <span class="build-summary-label">Monster Hits</span>
            <span class="build-summary-value">${telemetry?.timesCaught ?? 0}</span>
          </div>

          <div class="build-summary-item">
<span class="build-summary-label">Last Character Check</span>
<span class="build-summary-value">${typeof getPostRunResponseText === "function" ? getPostRunResponseText("challengePriority") : "Not answered"}</span>
          </div>
        </div>
      </div>
    `;
  }

  if (dom.choicesPanel) {
    dom.choicesPanel.innerHTML = "";
  }

  dom.setupOverlay?.classList.remove("hidden");

  if (typeof logEvent === "function") {
    logEvent("session_ended_on_post_screen");
  }
}

export function wireGlobalInput(keys, target = window) {
  if (!target || !keys) return;

  target.addEventListener("keydown", (event) => {
    keys[event.key.toLowerCase()] = true;
  });

  target.addEventListener("keyup", (event) => {
    keys[event.key.toLowerCase()] = false;
  });
}

export function wireScenarioContinueButton({ dom, getPendingResolution, setPendingResolution, closeScenario }) {
  if (!dom?.scenarioContinueBtn) return;

  dom.scenarioContinueBtn.addEventListener("click", () => {
    const pendingResolution = typeof getPendingResolution === "function" ? getPendingResolution() : null;

    if (typeof pendingResolution === "function") {
      pendingResolution();
    }

    if (typeof setPendingResolution === "function") {
      setPendingResolution(null);
    }

    if (typeof closeScenario === "function") {
      closeScenario();
    } else {
      closeScenarioUI(dom);
    }
  });
}

export function wireStartGameButton({
  dom,
  getAppPhase,
  startPreRun,
  finishPostSurvey,
  onError
}) {
  if (!dom?.startGameBtn) return;

  dom.startGameBtn.addEventListener("click", async () => {
    try {
      const phase = typeof getAppPhase === "function" ? getAppPhase() : null;

      if (phase === "pre") {
        await startPreRun?.();
        return;
      }

      if (phase === "post") {
        await finishPostSurvey?.();
      }
    } catch (error) {
      if (dom.setupError) {
        dom.setupError.textContent = error?.message || String(error);
      }
      if (typeof onError === "function") {
        onError(error);
      }
    }
  });
}

export function wireRunAgainButton({ dom, runAgain }) {
  if (!dom?.runAgainBtn || typeof runAgain !== "function") return;
  dom.runAgainBtn.addEventListener("click", runAgain);
}

export function wireEndSessionButton({ dom, endSession }) {
  if (!dom?.endSessionBtn || typeof endSession !== "function") return;
  dom.endSessionBtn.addEventListener("click", endSession);
}

export function wireBeforeUnload({ target = window, shouldPersistRun, onBeforeUnload }) {
  if (!target || typeof onBeforeUnload !== "function") return;

  target.addEventListener("beforeunload", () => {
    if (typeof shouldPersistRun === "function" && !shouldPersistRun()) return;
    onBeforeUnload();
  });
}
