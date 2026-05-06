import { getGradeBandFromSearch, createGradeBandStore } from "./data.js";
import {
  createSurveyState,
  openPreSurvey,
  openPostSurvey,
  completeSurveyPhase,
  getPostRunResponseText,
  renderQuestionnaire,
  wireSurveyStepButtons
} from "./survey.js";
import {
  getDomRefs,
  updateHUD,
  wireGlobalInput,
  wireStartGameButton,
  wireRunAgainButton,
  wireEndSessionButton
} from "./ui.js";
import {
  createGameState,
  createGameSystems,
  getReadableTool
} from "./system.js";
import { createRenderer } from "./render.js";

function createAudio(src) {
  const audio = new Audio(src);
  audio.preload = "auto";
  audio.addEventListener("error", () => {
    console.error("Audio failed to load:", src);
  });
  return audio;
}

function unlockSfx(sfx) {
  Object.entries(sfx).forEach(([key, audio]) => {
    if (!audio || key === "startCountdown") return;

    audio.muted = true;
    const p = audio.play();

    if (p && typeof p.then === "function") {
      p.then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
      }).catch((err) => {
        audio.muted = false;
        console.error("Audio unlock failed:", audio.src, err);
      });
    }
  });
}

function getInitialStudentGradeFromSearch(search = "") {
  const params = new URLSearchParams(search || "");
  const directGrade = String(params.get("grade") || "").trim();

  if (/^(1|2|3|4|5|6|7|8|9|10|11|12)$/.test(directGrade)) {
    return directGrade;
  }

  const gradeBand = String(params.get("gradeBand") || "").trim();

  if (gradeBand === "1-2") return "1";
  if (gradeBand === "3-4") return "3";
  if (gradeBand === "5-6") return "5";
  if (gradeBand === "7-8") return "7";
  if (gradeBand === "9-12") return "9";

  return "";
}

function getSelectedGradeBand(dom) {
  return dom?.studentGrade?.selectedOptions?.[0]?.dataset?.gradeBand || "";
}

function syncGradeSearchParams(win, gradeValue, gradeBand) {
  if (!win?.history?.replaceState || !win?.location?.href) return;

  const url = new URL(win.location.href);

  if (gradeValue) url.searchParams.set("grade", gradeValue);
  else url.searchParams.delete("grade");

  if (gradeBand) url.searchParams.set("gradeBand", gradeBand);
  else url.searchParams.delete("gradeBand");

  win.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

export function createSfxRegistry(assetRoot = "assets/sfx") {
  return {
    chanceGain: createAudio(`${assetRoot}/chance_won.mp3`),
    chanceLoss: createAudio(`${assetRoot}/chance_lost.mp3`),
    protectivePickup: createAudio(`${assetRoot}/protective_pickup.mp3`),
    riskPickup: createAudio(`${assetRoot}/risk_pickup.mp3`),
    startCountdown: createAudio(`${assetRoot}/game_start.mp3`)
  };
}

export function replaceObject(target, source, { preserve = [] } = {}) {
  const preservedValues = new Map();

  preserve.forEach((key) => {
    preservedValues.set(key, target[key]);
  });

  Object.keys(target).forEach((key) => {
    delete target[key];
  });

  Object.assign(target, source);

  preserve.forEach((key) => {
    target[key] = preservedValues.get(key);
  });

  return target;
}

export function resetSessionState({ state, surveyState, dom, renderer, gradeBand }) {
  const freshState = createGameState({
    canvasWidth: dom.canvas.width,
    canvasHeight: dom.canvas.height,
    gradeBand
  });

  const freshSurveyState = createSurveyState();

  const keysRef = state.keys;
  Object.keys(keysRef).forEach((key) => {
    delete keysRef[key];
  });

  replaceObject(state, freshState, { preserve: ["keys"] });
  state.keys = keysRef;

  replaceObject(surveyState, freshSurveyState);

  renderer.resetAnimation();

  updateHUD({
  dom,
  currentThreatLevel: state.currentThreatLevel,
  playerState: state.playerState,
  copingState: state.copingState,
  telemetry: state.telemetry,
  playerProfile: state.playerProfile,
  getReadableTool
});

  openPreSurvey(surveyState, dom);
  renderer.draw();
}

export function initGameApp({ doc = document, win = window } = {}) {
  const dom = getDomRefs(doc);

  if (!dom.canvas || !dom.ctx) {
    throw new Error("The game canvas (#game) was not found or could not create a 2D context.");
  }

  const gradeBandStore = createGradeBandStore(
    getGradeBandFromSearch(win.location?.search || "")
  );
  const initialStudentGrade = getInitialStudentGradeFromSearch(win.location?.search || "");

  const surveyState = createSurveyState();
  const state = createGameState({
    canvasWidth: dom.canvas.width,
    canvasHeight: dom.canvas.height,
    gradeBand: gradeBandStore.get()
  });

  const renderer = createRenderer({
    canvas: dom.canvas,
    ctx: dom.ctx,
    state
  });

  if (dom.studentGrade) {
    dom.studentGrade.value = initialStudentGrade;
    dom.studentGrade.addEventListener("change", () => {
      if (dom.setupError) dom.setupError.textContent = "";
      if (surveyState.appPhase === "pre") {
        renderQuestionnaire(surveyState, dom, surveyState.currentSurveySchema || []);
      }
    });
  }

  const sfx = createSfxRegistry();

  const surveyApi = {
    openPostSurvey
  };

  const systems = createGameSystems({
    state,
    dom,
    surveyState,
    surveyApi,
    draw: () => renderer.draw(),
    sprites: renderer.sprites,
    sfx
  });

  const getPostRunText = (groupKey) => getPostRunResponseText(surveyState, groupKey);

  function startPreRun() {
    const selectedGrade = dom.studentGrade?.value || "";
    const selectedGradeBand = getSelectedGradeBand(dom);

    if (!selectedGrade || !selectedGradeBand) {
      throw new Error("Please choose the student's grade before starting the run.");
    }

    gradeBandStore.set(selectedGradeBand);
    state.currentGradeBand = selectedGradeBand;
    syncGradeSearchParams(win, selectedGrade, selectedGradeBand);

    completeSurveyPhase(surveyState, { playerProfile: state.playerProfile });
    unlockSfx(sfx);
    systems.startRun("pre_survey_complete");
  }

  function finishPostSurveyPhase() {
  completeSurveyPhase(surveyState, { playerProfile: state.playerProfile });
  systems.finishPostSurvey(getPostRunText);
}

  function runAgain() {
    if (state.appPhase === "ended") {
      resetSessionState({
        state,
        surveyState,
        dom,
        renderer,
        gradeBand: gradeBandStore.get()
      });
      return;
    }

    systems.runAgain();
  }

  function endSession() {
    systems.endSessionNow(getPostRunText);
  }

  wireSurveyStepButtons(surveyState, dom);
  wireGlobalInput(state.keys, win);

  if (dom.scenarioContinueBtn) {
    dom.scenarioContinueBtn.addEventListener("click", () => {
      systems.continueScenario();
    });
  }

  wireStartGameButton({
    dom,
    getAppPhase: () => surveyState.appPhase,
    startPreRun,
    finishPostSurvey: finishPostSurveyPhase,
    onError(error) {
      console.error("Start/finish button error:", error);
    }
  });

  wireRunAgainButton({ dom, runAgain });
  wireEndSessionButton({ dom, endSession });

  openPreSurvey(surveyState, dom);

  updateHUD({
  dom,
  currentThreatLevel: state.currentThreatLevel,
  playerState: state.playerState,
  copingState: state.copingState,
  telemetry: state.telemetry,
  playerProfile: state.playerProfile,
  getReadableTool
});

  renderer.draw();

  let lastTs = performance.now();

  function frame(ts) {
    const deltaMs = Math.min(40, Math.max(0, ts - lastTs));
    lastTs = ts;

    systems.step(deltaMs);
    win.requestAnimationFrame(frame);
  }

  win.requestAnimationFrame(frame);

  return {
    dom,
    state,
    surveyState,
    renderer,
    sfx,
    systems,
    gradeBandStore,
    resetSession() {
      resetSessionState({
        state,
        surveyState,
        dom,
        renderer,
        gradeBand: gradeBandStore.get()
      });
    }
  };
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    window.gameApp = initGameApp({ doc: document, win: window });
  });
}