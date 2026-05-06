import {
  PLAYER_BASE_SPEED,
  EFFECT_MS,
  MAX_ACTIVE_PROTECTIVE,
  MAX_ACTIVE_RISK,
  PROTECTIVE_SPAWN_MIN_MS,
  PROTECTIVE_SPAWN_MAX_MS,
  RISK_SPAWN_MIN_MS,
  RISK_SPAWN_MAX_MS,
  FACTOR_LIFETIME_MS,
  protectiveFactorPool,
  riskFactorPool,
  factorSpawnPoints,
  RISK_POINT_DRAIN
} from "./data.js";

function assertFunction(name, value) {
  if (typeof value !== "function") {
    throw new Error(`createFactorSystem requires a "${name}" function.`);
  }
}

const FACTOR_REGION_COLS = 3;
const FACTOR_REGION_ROWS = 3;

function getSpawnRegionKey(state, point) {
  const col = Math.max(
    0,
    Math.min(
      FACTOR_REGION_COLS - 1,
      Math.floor((point.x / Math.max(1, state.canvasWidth)) * FACTOR_REGION_COLS)
    )
  );

  const row = Math.max(
    0,
    Math.min(
      FACTOR_REGION_ROWS - 1,
      Math.floor((point.y / Math.max(1, state.canvasHeight)) * FACTOR_REGION_ROWS)
    )
  );

  return `${col}:${row}`;
}

function getRectCenter(rect) {
  return {
    x: rect.x + rect.w / 2,
    y: rect.y + rect.h / 2
  };
}

function getPointSpacingScore(state, point) {
  const anchors = [state.player, ...state.activeProtectiveFactors, ...state.activeRiskFactors]
    .filter(Boolean)
    .map(getRectCenter);

  if (!anchors.length) return 0;

  let nearest = Infinity;

  anchors.forEach((anchor) => {
    const distance = Math.hypot(point.x - anchor.x, point.y - anchor.y);
    if (distance < nearest) nearest = distance;
  });

  return nearest;
}

export function createFactorSystem({
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
} = {}) {
  assertFunction("randomBetween", randomBetween);
  assertFunction("hitsWall", hitsWall);
  assertFunction("hitsSafeSpace", hitsSafeSpace);
  assertFunction("rectsOverlap", rectsOverlap);
  assertFunction("hasShield", hasShield);
  assertFunction("grantShield", grantShield);
  assertFunction("boostPlayer", boostPlayer);
  assertFunction("clearLag", clearLag);
  assertFunction("adjustProtectivePoints", adjustProtectivePoints);
  assertFunction("slowPlayer", slowPlayer);
  assertFunction("logEvent", logEvent);
  assertFunction("getSpecialHelpSettings", getSpecialHelpSettings);
  assertFunction("endSupportCycle", endSupportCycle);

  function scheduleNextProtectiveSpawn(state) {
    const special = getSpecialHelpSettings(state);
    const delay =
      randomBetween(PROTECTIVE_SPAWN_MIN_MS, PROTECTIVE_SPAWN_MAX_MS) *
      special.protectiveSpawnMultiplier;

    state.nextProtectiveSpawnAt = Date.now() + delay;
  }

  function scheduleNextRiskSpawn(state) {
    const special = getSpecialHelpSettings(state);
    const delay =
      randomBetween(RISK_SPAWN_MIN_MS, RISK_SPAWN_MAX_MS) *
      special.riskSpawnMultiplier;

    state.nextRiskSpawnAt = Date.now() + delay;
  }

  function makeFactorInstance(def, x, y, type) {
    return {
      id: def.id,
      label: def.label,
      color: def.color,
      effect: { ...(def.effect || {}) },
      x,
      y,
      w: 26,
      h: 26,
      type,
      spawnedAt: Date.now(),
      expiresAt: Date.now() + FACTOR_LIFETIME_MS
    };
  }

  function isSpawnPointValid(state, point) {
    const testRect = { x: point.x - 13, y: point.y - 13, w: 26, h: 26 };

    if (hitsWall(testRect)) return false;
    if (hitsSafeSpace(testRect)) return false;

    return !rectsOverlap(testRect, state.player);
  }

  function getUnusedSpawnPoints(state) {
    const activeRects = [
      ...state.activeProtectiveFactors,
      ...state.activeRiskFactors
    ];

    return factorSpawnPoints.filter((point) => {
      if (!isSpawnPointValid(state, point)) return false;

      const testRect = { x: point.x - 13, y: point.y - 13, w: 26, h: 26 };

      return !activeRects.some((factor) => rectsOverlap(testRect, factor));
    });
  }

  function spawnSingleFactor(state, type) {
    const pool = type === "protective" ? protectiveFactorPool : riskFactorPool;
    const active =
      type === "protective"
        ? state.activeProtectiveFactors
        : state.activeRiskFactors;
    const max = type === "protective" ? MAX_ACTIVE_PROTECTIVE : MAX_ACTIVE_RISK;

    if (active.length >= max) return null;

    const unused = getUnusedSpawnPoints(state);
    if (!unused.length) return null;

    state.factorSpawnHistoryByRegion ||= {};

    let lowestRegionCount = Infinity;
    let preferredRegions = [];

    unused.forEach((point) => {
      const regionKey = getSpawnRegionKey(state, point);
      const regionCount = state.factorSpawnHistoryByRegion[regionKey] || 0;

      if (regionCount < lowestRegionCount) {
        lowestRegionCount = regionCount;
        preferredRegions = [regionKey];
      } else if (regionCount === lowestRegionCount && !preferredRegions.includes(regionKey)) {
        preferredRegions.push(regionKey);
      }
    });

    let regionCandidates = unused.filter((point) =>
      preferredRegions.includes(getSpawnRegionKey(state, point))
    );

    if (!regionCandidates.length) {
      regionCandidates = unused;
    }

    const scoredCandidates = [...regionCandidates]
      .sort((a, b) => getPointSpacingScore(state, b) - getPointSpacingScore(state, a))
      .slice(0, Math.min(6, regionCandidates.length));

    const point = scoredCandidates[Math.floor(Math.random() * scoredCandidates.length)];
    const regionKey = getSpawnRegionKey(state, point);
    const def = pool[Math.floor(Math.random() * pool.length)];
    const instance = makeFactorInstance(def, point.x - 13, point.y - 13, type);

    state.factorSpawnHistoryByRegion[regionKey] =
      (state.factorSpawnHistoryByRegion[regionKey] || 0) + 1;

    active.push(instance);
    return instance;
  }

  function pruneExpiredFactors(state) {
    const now = Date.now();

    state.activeProtectiveFactors = state.activeProtectiveFactors.filter(
      (item) => item.expiresAt > now
    );

    state.activeRiskFactors = state.activeRiskFactors.filter(
      (item) => item.expiresAt > now
    );
  }

  function updateFactorSpawning(state) {
    const now = Date.now();

    pruneExpiredFactors(state);

    if (!state.nextProtectiveSpawnAt) scheduleNextProtectiveSpawn(state);
    if (!state.nextRiskSpawnAt) scheduleNextRiskSpawn(state);

    if (now >= state.nextProtectiveSpawnAt) {
      spawnSingleFactor(state, "protective");
      scheduleNextProtectiveSpawn(state);
    }

    if (now >= state.nextRiskSpawnAt) {
      spawnSingleFactor(state, "risk");
      scheduleNextRiskSpawn(state);
    }
  }

  function spawnPickupText(state, x, y, text, color) {
    state.pickupTexts.push({
      x,
      y,
      text,
      color,
      startedAt: Date.now(),
      durationMs: 900
    });
  }

  function spawnPickupBurst(state, x, y, color) {
    state.pickupBursts.push({
      x,
      y,
      color,
      startedAt: Date.now(),
      durationMs: 450
    });
  }

  function updatePickupFX(state) {
    const now = Date.now();

    state.pickupTexts = state.pickupTexts.filter(
      (item) => now - item.startedAt < item.durationMs
    );

    state.pickupBursts = state.pickupBursts.filter(
      (item) => now - item.startedAt < item.durationMs
    );
  }

  function getProtectivePickupDetail(factor) {
    return `+${factor.label}`;
  }

  function getRiskPickupDetail(factor, blocked = false) {
    return blocked ? `Blocked ${factor.label}` : `-${factor.label}`;
  }

  function applyProtectiveFactor(state, factor, { sfx = null } = {}) {
    state.factorTelemetry.protectiveCollected += 1;
    state.factorTelemetry.protectiveByType[factor.id] =
      (state.factorTelemetry.protectiveByType[factor.id] || 0) + 1;

    if (factor.effect?.shieldMs) {
      grantShield(state, factor.effect.shieldMs);
    }

    if (factor.effect?.speedBoost) {
      boostPlayer(
        state,
        PLAYER_BASE_SPEED + factor.effect.speedBoost,
        factor.effect.durationMs || EFFECT_MS
      );
    }

    if (factor.effect?.clearLag) {
      clearLag(state);
    }

    adjustProtectivePoints(state, 1, {
      sfx,
      reason: "protective_pickup",
      meta: {}
    });

    spawnPickupText(
      state,
      factor.x,
      factor.y,
      getProtectivePickupDetail(factor),
      factor.color
    );

    spawnPickupBurst(state, factor.x, factor.y, factor.color);

    logEvent(state, "protective_factor_collected", {
      factorId: factor.id,
      factorLabel: factor.label
    });
  }

  function drainProtectivePoints(state, amount, meta = {}, { sfx = null } = {}) {
    const actual = adjustProtectivePoints(state, -Math.abs(amount), {
      sfx,
      reason: "risk_pickup",
      meta
    });

    state.factorTelemetry.totalRiskPointLoss += Math.abs(actual);
    return Math.abs(actual);
  }

  function applyRiskFactor(state, factor, { sfx = null } = {}) {
    if (hasShield(state)) {
      state.factorTelemetry.blockedRiskHit += 1;

      spawnPickupText(
        state,
        factor.x,
        factor.y,
        getRiskPickupDetail(factor, true),
        factor.color
      );

      spawnPickupBurst(state, factor.x, factor.y, factor.color);

      logEvent(state, "risk_factor_blocked", {
        factorId: factor.id,
        factorLabel: factor.label
      });

      return;
    }

    state.factorTelemetry.riskHit += 1;
    state.factorTelemetry.riskByType[factor.id] =
      (state.factorTelemetry.riskByType[factor.id] || 0) + 1;

    if (factor.effect?.speedPenalty) {
      slowPlayer(
        state,
        Math.max(1.2, PLAYER_BASE_SPEED - factor.effect.speedPenalty),
        factor.effect.durationMs || EFFECT_MS
      );
    }

    const drain = RISK_POINT_DRAIN[factor.id] || 1;
    const drained = drainProtectivePoints(
      state,
      drain,
      { factorId: factor.id },
      { sfx }
    );

    spawnPickupText(
      state,
      factor.x,
      factor.y,
      getRiskPickupDetail(factor),
      factor.color
    );

    spawnPickupBurst(state, factor.x, factor.y, factor.color);

    logEvent(state, "risk_factor_hit", {
  factorId: factor.id,
  factorLabel: factor.label,
  pointsLost: drained
});

if (typeof endSupportCycle === "function") {
  endSupportCycle(state, "risk_item_hit");
}
  }

  function checkFactorInteractions(state, { sfx = null } = {}) {
    const protectiveRemaining = [];

    for (const factor of state.activeProtectiveFactors) {
      if (rectsOverlap(state.player, factor)) {
        applyProtectiveFactor(state, factor, { sfx });
      } else {
        protectiveRemaining.push(factor);
      }
    }

    state.activeProtectiveFactors = protectiveRemaining;

    const riskRemaining = [];

    for (const factor of state.activeRiskFactors) {
      if (rectsOverlap(state.player, factor)) {
        applyRiskFactor(state, factor, { sfx });
      } else {
        riskRemaining.push(factor);
      }
    }

    state.activeRiskFactors = riskRemaining;
  }

  return {
    scheduleNextProtectiveSpawn,
    scheduleNextRiskSpawn,
    makeFactorInstance,
    isSpawnPointValid,
    getUnusedSpawnPoints,
    spawnSingleFactor,
    pruneExpiredFactors,
    updateFactorSpawning,
    spawnPickupText,
    spawnPickupBurst,
    updatePickupFX,
    getProtectivePickupDetail,
    getRiskPickupDetail,
    applyProtectiveFactor,
    drainProtectivePoints,
    applyRiskFactor,
    checkFactorInteractions
  };
}