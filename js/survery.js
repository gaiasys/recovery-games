import {
  BUILD_ALLOCATION_MIN,
  BUILD_ALLOCATION_TOTAL,
  BUILD_OPTION_LABELS,
  PRE_RESPONSE_KEYS,
  SURVEY_GROUP_META,
  SURVEY_STEP_KEYS,
  SURVEY_STEP_META,
  preSurveySchema,
  postSurveySchema
} from "./data.js";

export function createSurveyState() {
  return {
    appPhase: "pre",
    currentSurveySchema: [],
    currentSurveyStep: 0,
    currentSurveyDraft: {},
    preSurveyResults: null,
    postSurveyResults: null
  };
}

export function getSurveyPhaseKey(state) {
  return state.appPhase === "post" ? "post" : "pre";
}

export function getSurveyStepsForPhase(phase = "pre") {
  return SURVEY_STEP_KEYS[phase] || [];
}

function getAllocationMax(group) {
  return BUILD_ALLOCATION_TOTAL - ((group.options.length - 1) * BUILD_ALLOCATION_MIN);
}

function createDefaultAllocation(group) {
  const allocation = {};
  const optionCount = group.options.length;
  const base = Math.floor(BUILD_ALLOCATION_TOTAL / optionCount);
  let remainder = BUILD_ALLOCATION_TOTAL - base * optionCount;

  group.options.forEach((option) => {
    allocation[option.value] = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
  });

  return allocation;
}

export function createEmptySurveyDraft(schema) {
  const draft = {};
  schema.forEach((group) => {
    draft[group.key] =
      group.type === "allocation"
        ? createDefaultAllocation(group)
        : null;
  });
  return draft;
}

export function getCurrentStepGroups(state, schema = state.currentSurveySchema) {
  const stepKeys = getSurveyStepsForPhase(getSurveyPhaseKey(state))[state.currentSurveyStep] || [];
  return schema.filter((group) => stepKeys.includes(group.key));
}

export function getGroupByKey(state, groupKey) {
  return (
    state.currentSurveySchema.find((group) => group.key === groupKey) ||
    preSurveySchema.find((group) => group.key === groupKey) ||
    postSurveySchema.find((group) => group.key === groupKey) ||
    null
  );
}

export function getOptionLabel(state, groupKey, value) {
  const group = getGroupByKey(state, groupKey);
  if (!group) return String(value);

  const option = group.options.find((item) => String(item.value) === String(value));
  return option ? option.label : String(value);
}

export function getBuildOptionLabel(groupKey, value) {
  return BUILD_OPTION_LABELS[groupKey]?.[value] || String(value);
}

export function getSelectedScale(state, groupKey) {
  const value = state.currentSurveyDraft[groupKey];
  return value === null || value === undefined ? null : Number(value);
}

function hasUniqueTopChoice(allocation = {}) {
  const values = Object.values(allocation);
  const top = Math.max(...values);
  return values.filter((value) => value === top).length === 1;
}

function isValidAllocation(group, allocation) {
  if (!allocation) return false;

  const values = group.options.map((option) => Number(allocation[option.value] || 0));
  const total = values.reduce((sum, value) => sum + value, 0);
  const everyMinMet = values.every((value) => value >= BUILD_ALLOCATION_MIN);

  return total === BUILD_ALLOCATION_TOTAL && everyMinMet && hasUniqueTopChoice(allocation);
}

export function isGroupComplete(state, groupKey) {
  const group = getGroupByKey(state, groupKey);
  const value = state.currentSurveyDraft[groupKey];

  if (!group) return false;
  if (group.type === "allocation") {
    return isValidAllocation(group, value);
  }

  return value !== null && value !== undefined;
}

export function getScaleValue(state, groupKey) {
  const group = getGroupByKey(state, groupKey);
  const value = state.currentSurveyDraft[groupKey];

  if (group?.type === "allocation") {
  if (!isValidAllocation(group, value)) {
    throw new Error(`Use all ${BUILD_ALLOCATION_TOTAL} points and make one choice strongest before continuing.`);
  }
  return value;
}

  if (value === null || value === undefined) {
    throw new Error("Please answer every question before continuing.");
  }

  return Number(value);
}

export function setScaleSelection(state, dom, groupKey, value) {
  state.currentSurveyDraft[groupKey] = Number(value);
  if (dom.setupError) dom.setupError.textContent = "";
  renderQuestionnaire(state, dom, state.currentSurveySchema);
}

export function getLikertDescriptor(value) {
  const descriptors = {
    1: "Not at all true",
    2: "A little true",
    3: "Somewhat true",
    4: "Mostly true",
    5: "Very true"
  };
  return `${value} - ${descriptors[value] || "Not answered"}`;
}

export function averageValues(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function sortAllocationMap(map = {}) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key);
}

export function buildPlayerProfileFromSurvey(results) {
  return {
    challengePriority: sortAllocationMap(results.challengePriority),
    defensePriority: sortAllocationMap(results.defensePriority),
    recoveryPriority: sortAllocationMap(results.recoveryPriority),
    safeZonePriority: sortAllocationMap(results.safeZonePriority),
    factFindingTool: sortAllocationMap(results.factFindingTool),
    cheatCode: sortAllocationMap(results.cheatCode)
  };
}

export function applyDerivedPlayerProfile(results, playerProfile) {
  const derivedProfile = buildPlayerProfileFromSurvey(results);
  Object.assign(playerProfile, derivedProfile);
  return derivedProfile;
}

export function getSurveyAverageScore(state, schema, source = state.currentSurveyDraft) {
  const values = schema
    .map((group) => {
      const value = source[group.key];
      return value === null || value === undefined ? null : Number(value);
    })
    .filter((value) => Number.isFinite(value));

  return averageValues(values);
}

export function getPreConfidenceAverage(results) {
  const values = PRE_RESPONSE_KEYS
    .map((key) => {
      const allocation = results?.[key];
      if (!allocation || typeof allocation !== "object") return null;

      const scores = Object.values(allocation)
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value));

      if (!scores.length) return null;
      return Math.max(...scores);
    })
    .filter((value) => Number.isFinite(value));

  return values.length ? averageValues(values) : 0;
}

function getTopAllocationChoiceLabel(state, groupKey, allocation) {
  if (!allocation || typeof allocation !== "object") return "Not answered";

  const sorted = Object.entries(allocation).sort(
    (a, b) => Number(b[1] || 0) - Number(a[1] || 0)
  );

  const topKey = sorted[0]?.[0];
  if (!topKey) return "Not answered";

  return getOptionLabel(state, groupKey, topKey);
}

export function getPostRunResponseText(state, groupKey) {
  const value = state.postSurveyResults?.[groupKey];

  if (value === null || value === undefined) {
    return "Not answered";
  }

  const group = getGroupByKey(state, groupKey);

  if (group?.type === "allocation") {
    return getTopAllocationChoiceLabel(state, groupKey, value);
  }

  return getOptionLabel(state, groupKey, value);
}

export function validateStep(state, stepIndex = state.currentSurveyStep) {
  const stepKeys = getSurveyStepsForPhase(getSurveyPhaseKey(state))[stepIndex] || [];
  const incomplete = stepKeys.some((key) => !isGroupComplete(state, key));

  if (incomplete) {
    throw new Error("Please answer every question on this step before continuing.");
  }
}

function renderAllocationCard(state, group) {
  const meta = SURVEY_GROUP_META[group.key] || {
    icon: "•",
    theme: "",
    summary: group.title
  };

  const allocation = state.currentSurveyDraft[group.key] || {};
  const totalUsed = Object.values(allocation).reduce((sum, value) => sum + Number(value || 0), 0);
  const maxPerOption = getAllocationMax(group);
  const tickValues = Array.from(
    { length: maxPerOption - BUILD_ALLOCATION_MIN + 1 },
    (_, index) => BUILD_ALLOCATION_MIN + index
  );

  return `
    <div class="question-card ${meta.theme}">
      <div class="question-title-row">
        <span class="question-icon">${meta.icon}</span>
        <h3>${group.title}</h3>
      </div>
      <p>${group.description}</p>

      <div class="allocation-summary">
        <span>Use all ${BUILD_ALLOCATION_TOTAL} points</span>
        <span>${totalUsed}/${BUILD_ALLOCATION_TOTAL} used</span>
      </div>

      <div class="allocation-list">
        ${group.options.map((option) => {
          const value = Number(allocation[option.value] || BUILD_ALLOCATION_MIN);

          return `
            <div class="allocation-row">
              <div class="allocation-header">
                <span class="allocation-label">${option.label}</span>
                <span class="allocation-value">${value}</span>
              </div>

              <input
                type="range"
                min="${BUILD_ALLOCATION_MIN}"
                max="${maxPerOption}"
                step="1"
                value="${value}"
                data-allocation-group="${group.key}"
                data-allocation-option="${option.value}"
                class="allocation-slider"
              >

              <div class="allocation-ticks" style="--allocation-steps:${tickValues.length}" aria-hidden="true">
                ${tickValues
                  .map((tick) => `<span class="allocation-tick ${tick <= value ? "is-active" : ""}"></span>`)
                  .join("")}
              </div>

              <div class="allocation-scale-labels" aria-hidden="true">
                <span>${BUILD_ALLOCATION_MIN}</span>
                <span>${maxPerOption}</span>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

export function renderQuestionCard(state, group) {
  if (group.type === "allocation") {
    return renderAllocationCard(state, group);
  }

  const meta = SURVEY_GROUP_META[group.key] || {
    icon: "•",
    theme: "",
    summary: group.title
  };

  const selectedValue = getSelectedScale(state, group.key);

  return `
    <div class="question-card ${meta.theme}">
      <div class="question-title-row">
        <span class="question-icon">${meta.icon}</span>
        <h3>${group.title}</h3>
      </div>
      <p>${group.description}</p>

      <div class="option-list">
        ${group.options
          .map((option) => `
            <label class="option-row">
              <input
                type="radio"
                name="${group.key}"
                value="${option.value}"
                data-scale-group="${group.key}"
                ${selectedValue === Number(option.value) ? "checked" : ""}
              >
              <span class="option-label">${option.label}</span>
            </label>
          `)
          .join("")}
      </div>
    </div>
  `;
}

function rebalanceAllocation(group, currentAllocation, changedOption, nextValue) {
  const updated = { ...currentAllocation };
  const optionKeys = group.options.map((option) => option.value);
  const otherKeys = optionKeys.filter((key) => key !== changedOption);
  const maxPerOption = getAllocationMax(group);

  updated[changedOption] = Math.max(
    BUILD_ALLOCATION_MIN,
    Math.min(Number(nextValue), maxPerOption)
  );

  let remaining = BUILD_ALLOCATION_TOTAL - updated[changedOption];

  otherKeys.forEach((key) => {
    updated[key] = Math.max(BUILD_ALLOCATION_MIN, Number(updated[key] || BUILD_ALLOCATION_MIN));
  });

  const sortedOthers = [...otherKeys].sort((a, b) => updated[b] - updated[a]);

  sortedOthers.forEach((key, index) => {
    const minNeededForRest = (otherKeys.length - index - 1) * BUILD_ALLOCATION_MIN;
    const maxForThis = remaining - minNeededForRest;

    updated[key] = Math.max(
      BUILD_ALLOCATION_MIN,
      Math.min(updated[key], maxForThis)
    );

    remaining -= updated[key];
  });

  if (remaining !== 0) {
    const lastKey = sortedOthers[sortedOthers.length - 1];
    updated[lastKey] += remaining;
  }

  return updated;
}

function setAllocationSelection(state, dom, groupKey, optionValue, nextValue) {
  const group = getGroupByKey(state, groupKey);
  if (!group || group.type !== "allocation") return;

  const current = state.currentSurveyDraft[groupKey] || createDefaultAllocation(group);
  state.currentSurveyDraft[groupKey] = rebalanceAllocation(group, current, optionValue, Number(nextValue));

  if (dom.setupError) dom.setupError.textContent = "";
  renderQuestionnaire(state, dom, state.currentSurveySchema);
}

export function bindSurveyInputLogic(state, dom) {
  const radioInputs = dom.questionnaireGrid.querySelectorAll("input[data-scale-group]");
  radioInputs.forEach((input) => {
    input.addEventListener("change", () => {
      setScaleSelection(state, dom, input.dataset.scaleGroup, input.value);
    });
  });

  const allocationInputs = dom.questionnaireGrid.querySelectorAll("input[data-allocation-group]");
  allocationInputs.forEach((input) => {
    input.addEventListener("input", () => {
      setAllocationSelection(
        state,
        dom,
        input.dataset.allocationGroup,
        input.dataset.allocationOption,
        input.value
      );
    });
  });
}
function updateGradeEntryUI(state, dom) {
  if (!dom?.gradeEntryCard) return;

  const showGradeEntry =
    state.appPhase === "pre" && state.currentSurveyStep === 0;

  dom.gradeEntryCard.classList.toggle("hidden", !showGradeEntry);
}

export function renderBuildSummary(state, dom) {
  if (!dom) return;
  if (dom.buildSnapshotPanel) dom.buildSnapshotPanel.innerHTML = "";
  if (dom.choicesPanel) dom.choicesPanel.innerHTML = "";
}

export function updateSurveyStepChrome(state, dom) {
  const phaseKey = getSurveyPhaseKey(state);
  const stepMeta = SURVEY_STEP_META[phaseKey];
  const totalSteps = stepMeta.length;
  const currentMeta = stepMeta[state.currentSurveyStep];

  dom.surveyStepLabel.textContent = `Step ${state.currentSurveyStep + 1} of ${totalSteps}`;
  dom.surveyStageTitle.textContent = currentMeta.title;
  dom.surveyStageSub.textContent = currentMeta.description;
  dom.surveyProgressFill.style.width = `${((state.currentSurveyStep + 1) / totalSteps) * 100}%`;

  if (dom.endSessionBtn) dom.endSessionBtn.classList.add("hidden");
  if (dom.runAgainBtn) dom.runAgainBtn.classList.add("hidden");

  dom.prevStepBtn.style.display = "inline-flex";
  dom.prevStepBtn.disabled = state.currentSurveyStep === 0;
  dom.nextStepBtn.style.display = state.currentSurveyStep === totalSteps - 1 ? "none" : "inline-flex";
  dom.startGameBtn.style.display = state.currentSurveyStep === totalSteps - 1 ? "inline-flex" : "none";
}

export function renderQuestionnaire(state, dom, schema) {
  state.currentSurveySchema = schema;
  const stepGroups = getCurrentStepGroups(state, schema);
  dom.questionnaireGrid.innerHTML = stepGroups.map((group) => renderQuestionCard(state, group)).join("");

  bindSurveyInputLogic(state, dom);
  updateGradeEntryUI(state, dom);
  renderBuildSummary(state, dom);
  updateSurveyStepChrome(state, dom);
}

export function readSurvey(state, schema) {
  const result = {};

  schema.forEach((group) => {
    result[group.key] = getScaleValue(state, group.key);
  });

  return result;
}

export function openPreSurvey(state, dom) {
  state.appPhase = "pre";
  state.currentSurveyStep = 0;
  state.currentSurveySchema = preSurveySchema;
  state.currentSurveyDraft = createEmptySurveyDraft(preSurveySchema);

  dom.setupTitle.textContent = "Build Your Character";
  dom.setupSub.textContent =
    "Spend your points to shape how your character handles pressure, finds support, and bounces back.";
  dom.startGameBtn.textContent = "Build and Start Run";
  dom.setupError.textContent = "";

  renderQuestionnaire(state, dom, preSurveySchema);
  dom.setupOverlay.classList.remove("hidden");
}

export function openPostSurvey(state, dom, { reason = "completed", logEvent = null } = {}) {
  state.appPhase = "post";
  state.currentSurveyStep = 0;
  state.currentSurveySchema = postSurveySchema;
  state.currentSurveyDraft = createEmptySurveyDraft(postSurveySchema);

  dom.setupTitle.textContent = "Build Your Character After the Run";
  dom.setupSub.textContent =
    "Spend your points again based on what stood out during the run.";
  dom.startGameBtn.textContent = "Finish Reflection";
  dom.setupError.textContent = "";

  renderQuestionnaire(state, dom, postSurveySchema);
  dom.setupOverlay.classList.remove("hidden");

  if (typeof logEvent === "function") {
    logEvent("post_survey_opened", { reason });
  }
}

export function goToPreviousSurveyStep(state, dom) {
  if (state.currentSurveyStep === 0) return;
  state.currentSurveyStep -= 1;
  dom.setupError.textContent = "";
  renderQuestionnaire(state, dom, state.currentSurveySchema);
  dom.setupScroll?.scrollTo({ top: 0, behavior: "smooth" });
}

export function goToNextSurveyStep(state, dom) {
  validateStep(state, state.currentSurveyStep);
  state.currentSurveyStep += 1;
  dom.setupError.textContent = "";
  renderQuestionnaire(state, dom, state.currentSurveySchema);
  dom.setupScroll?.scrollTo({ top: 0, behavior: "smooth" });
}

export function wireSurveyStepButtons(state, dom) {
  if (dom.prevStepBtn) {
    dom.prevStepBtn.addEventListener("click", () => {
      goToPreviousSurveyStep(state, dom);
    });
  }

  if (dom.nextStepBtn) {
    dom.nextStepBtn.addEventListener("click", () => {
      try {
        goToNextSurveyStep(state, dom);
      } catch (error) {
        dom.setupError.textContent = error.message;
      }
    });
  }
}

export function completeSurveyPhase(state, { playerProfile = null } = {}) {
  validateStep(state, state.currentSurveyStep);

  if (state.appPhase === "pre") {
    state.preSurveyResults = readSurvey(state, preSurveySchema);
    if (playerProfile) {
      applyDerivedPlayerProfile(state.preSurveyResults, playerProfile);
    }
    return {
      phase: "pre",
      results: state.preSurveyResults,
      derivedProfile: playerProfile
        ? { ...playerProfile }
        : buildPlayerProfileFromSurvey(state.preSurveyResults)
    };
  }

  if (state.appPhase === "post") {
    state.postSurveyResults = readSurvey(state, postSurveySchema);

    if (playerProfile) {
      applyDerivedPlayerProfile(state.postSurveyResults, playerProfile);
    }

    return {
      phase: "post",
      results: state.postSurveyResults,
      derivedProfile: playerProfile
        ? { ...playerProfile }
        : buildPlayerProfileFromSurvey(state.postSurveyResults)
    };
  }

  throw new Error(`Survey completion is not supported for appPhase: ${state.appPhase}`);
}

export {
  preSurveySchema,
  postSurveySchema,
  SURVEY_STEP_KEYS,
  SURVEY_STEP_META,
  SURVEY_GROUP_META
};
