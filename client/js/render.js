import {
  PORTAL,
  PLAYER_DRAW,
  CHASER_NAMES,
  CHASER_DRAW_BY_SKIN,
  FACTOR_DRAW,
  COLORS,
  wallSegments,
  safeSpaces
} from "./data.js";

export function makeSprite(src) {
  const img = new Image();
  img.src = src;
  return img;
}

export function createSpriteRegistry(assetRoot = "assets") {
  return {
    player: {
      idle: makeSprite(`${assetRoot}/player/sprig_idle.png`),
      run: [
        makeSprite(`${assetRoot}/player/sprig_run_01.png`),
        makeSprite(`${assetRoot}/player/sprig_run_02.png`),
        makeSprite(`${assetRoot}/player/sprig_run_03.png`),
        makeSprite(`${assetRoot}/player/sprig_run_04.png`),
        makeSprite(`${assetRoot}/player/sprig_run_05.png`),
        makeSprite(`${assetRoot}/player/sprig_run_06.png`)
      ]
    },
    chasers: {
      solar: {
        normal: makeSprite(`${assetRoot}/chasers/solar_chaser.png`),
        alert: makeSprite(`${assetRoot}/chasers/solar_chaser_alert.png`)
      },
      ember: {
        normal: makeSprite(`${assetRoot}/chasers/ember_chaser.png`),
        alert: makeSprite(`${assetRoot}/chasers/ember_chaser_alert.png`)
      },
      frost: {
        normal: makeSprite(`${assetRoot}/chasers/frost_chaser.png`),
        alert: makeSprite(`${assetRoot}/chasers/frost_chaser_alert.png`)
      },
      shade: {
        normal: makeSprite(`${assetRoot}/chasers/shade_chaser.png`),
        alert: makeSprite(`${assetRoot}/chasers/shade_chaser_alert.png`)
      }
    },
    protective: {
      achievement: makeSprite(`${assetRoot}/protective/protective_achievement.png`),
      family_support: makeSprite(`${assetRoot}/protective/protective_family_support.png`),
      health_protection: makeSprite(`${assetRoot}/protective/protective_health_protection.png`),
      healthy_nutrition: makeSprite(`${assetRoot}/protective/protective_healthy_nutrition.png`),
      learning_growth: makeSprite(`${assetRoot}/protective/protective_learning_growth.png`),
      restful_sleep: makeSprite(`${assetRoot}/protective/protective_restful_sleep.png`),
      self_awareness: makeSprite(`${assetRoot}/protective/protective_self_awareness.png`)
    },
    risk: {
      alcohol_exposure: makeSprite(`${assetRoot}/risk/risk_alcohol_exposure.png`),
      conflict_stress: makeSprite(`${assetRoot}/risk/risk_conflict_stress.png`),
      mental_overload: makeSprite(`${assetRoot}/risk/risk_mental_overload.png`),
      social_harm: makeSprite(`${assetRoot}/risk/risk_social_harm.png`)
    }
  };
}

function getSupportVisual(toolId) {
  if (toolId === "stress_management") {
    return { color: "#8BEAFF", icon: "⚡" };
  }

  if (toolId === "creative_outlets") {
    return { color: "#67FF94", icon: "✨" };
  }

  if (toolId === "physical_activity") {
    return { color: "#FFD95A", icon: "🔥" };
  }

  return { color: "#FFFFFF", icon: "✦" };
}

function drawSupportAura({ ctx, state }) {
  if (!state?.supportState?.active || !state?.supportState?.supportId) return;

  const now = performance.now();
  const visual = getSupportVisual(state.supportState.supportId);

  const centerX = state.player.x + state.player.w / 2;
  const centerY = state.player.y + state.player.h / 2;
  const radius = getGlowPulse(now, 24, 34, 0.006);

  ctx.save();

  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = visual.color;
  ctx.lineWidth = 4;
  ctx.shadowColor = visual.color;
  ctx.shadowBlur = 18;

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = 0.95;
  ctx.shadowBlur = 0;
  ctx.font = "16px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(visual.icon, centerX, centerY - 34);
  const totalMs = 15000;
const remainingMs = Math.max(0, state.supportState.endsAt - Date.now());
const pctRaw = Math.max(0, Math.min(1, remainingMs / totalMs));
const pct = 1 - Math.pow(1 - pctRaw, 2);

  const barW = 34;
  const barH = 4;
  const barX = centerX - barW / 2;
  const barY = centerY - 44;

  ctx.globalAlpha = 0.9;
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(barX, barY, barW, barH);

  ctx.fillStyle = visual.color;
  ctx.fillRect(barX, barY, barW * pct, barH); 

  ctx.restore();
}

export function createPlayerAnimationState(player = { x: 0, y: 0 }) {
  return {
    frameIndex: 0,
    frameTimer: 0,
    frameDelay: 90,
    lastX: player.x,
    lastY: player.y,
    moving: false
  };
}

export function resetPlayerAnimation(playerAnim, player) {
  if (!playerAnim || !player) return;
  playerAnim.frameIndex = 0;
  playerAnim.frameTimer = 0;
  playerAnim.lastX = player.x;
  playerAnim.lastY = player.y;
  playerAnim.moving = false;
}

export function spriteReady(img) {
  return !!(img && img.complete && img.naturalWidth > 0);
}

export function roundedRectPath(ctx, x, y, w, h, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function getGlowPulse(now = performance.now(), min = 10, max = 18, speed = 0.005) {
  const wave = (Math.sin(now * speed) + 1) / 2;
  return min + (max - min) * wave;
}

export function updatePlayerAnimation({ state, playerAnim, sprites, deltaMs }) {
  if (!state?.player || !playerAnim || !sprites?.player?.run?.length) return;

  const { player } = state;
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

export function getPlayerSprite({ sprites, playerAnim }) {
  if (!sprites?.player) return null;
  if (!playerAnim?.moving) return sprites.player.idle;
  return sprites.player.run[playerAnim.frameIndex] || sprites.player.idle;
}

function getChaserSkinKey(chaser, index) {
  return chaser?.name || CHASER_NAMES[index % CHASER_NAMES.length];
}

export function getChaserSprite({ sprites, threatState, chaser, index }) {
  const skinKey = getChaserSkinKey(chaser, index);
  const stateKey = threatState?.inDanger ? "alert" : "normal";
  return sprites?.chasers?.[skinKey]?.[stateKey] || null;
}

export function getFactorSprite({ sprites, factor }) {
  if (!factor) return null;
  if (factor.type === "protective") return sprites?.protective?.[factor.id] || null;
  return sprites?.risk?.[factor.id] || null;
}

export function drawFallbackBox(ctx, x, y, w, h, fill, stroke) {
  ctx.save();
  ctx.fillStyle = fill;
  roundedRectPath(ctx, x, y, w, h, 4);
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  roundedRectPath(ctx, x, y, w, h, 4);
  ctx.stroke();
  ctx.restore();
}

export function drawSpriteCentered(ctx, sprite, rect, drawWidth, drawHeight, glowColor = null, glowBlur = 0) {
  const drawX = rect.x - (drawWidth - rect.w) / 2;
  const drawY = rect.y - (drawHeight - rect.h) / 2;

  ctx.save();
  if (glowColor) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glowBlur;
  }
  ctx.drawImage(sprite, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();
}

export function drawBackground({ ctx, canvas }) {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#06101A");
  gradient.addColorStop(1, "#030813");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const vignette = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    120,
    canvas.width / 2,
    canvas.height / 2,
    520
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.38)");

  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255, 255, 255, 0.012)";
  ctx.fillRect(0, PORTAL.y - 10, canvas.width, PORTAL.h + 20);
}

export function drawSeamlessWalls({ ctx }) {
  ctx.save();
  ctx.shadowColor = COLORS.wallGlow;
  ctx.shadowBlur = 10;
  ctx.fillStyle = COLORS.wallFill;

  for (const wall of wallSegments) {
    const radius = Math.max(6, Math.min(wall.w, wall.h) / 2);
    roundedRectPath(ctx, wall.x, wall.y, wall.w, wall.h, radius);
    ctx.fill();
  }

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(93, 231, 255, 0.04)";

  for (const wall of wallSegments) {
    const radius = Math.max(6, Math.min(wall.w, wall.h) / 2);
    roundedRectPath(ctx, wall.x - 2, wall.y - 2, wall.w + 4, wall.h + 4, radius + 2);
    ctx.fill();
  }

  ctx.fillStyle = COLORS.wallFill;
  for (const wall of wallSegments) {
    const radius = Math.max(6, Math.min(wall.w, wall.h) / 2);
    roundedRectPath(ctx, wall.x, wall.y, wall.w, wall.h, radius);
    ctx.fill();
  }

  ctx.fillStyle = COLORS.wallInner;
  for (const wall of wallSegments) {
    const radius = Math.max(6, Math.min(wall.w, wall.h) / 2);
    roundedRectPath(
      ctx,
      wall.x + 2,
      wall.y + 2,
      wall.w - 4,
      wall.h - 4,
      Math.max(4, radius - 2)
    );
    ctx.fill();
  }

  ctx.fillStyle = COLORS.wallCore;
  for (const wall of wallSegments) {
    if (wall.w >= wall.h) {
      const stripH = Math.max(3, Math.floor(wall.h * 0.24));
      const stripY = wall.y + (wall.h - stripH) / 2;
      roundedRectPath(ctx, wall.x + 8, stripY, Math.max(8, wall.w - 16), stripH, stripH / 2);
      ctx.fill();
    } else {
      const stripW = Math.max(3, Math.floor(wall.w * 0.24));
      const stripX = wall.x + (wall.w - stripW) / 2;
      roundedRectPath(ctx, stripX, wall.y + 8, stripW, Math.max(8, wall.h - 16), stripW / 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

export function drawSafeSpaces({ ctx, state }) {
  const now = performance.now();

  for (const safe of safeSpaces) {
    ctx.save();

    const isPriority = state?.playerProfile?.safeZonePriority?.[0] === safe.type;
    const centerX = safe.x + safe.w / 2;
    const centerY = safe.y + safe.h / 2;

    const priorityGlow = getGlowPulse(now, 18, 28, 0.008);
    const priorityRingInset = 5 + Math.sin(now * 0.01) * 1.5;

    ctx.shadowColor = safe.border;
    ctx.shadowBlur = isPriority ? 18 : 10;

    ctx.fillStyle = COLORS.safeFill;
    roundedRectPath(ctx, safe.x, safe.y, safe.w, safe.h, 10);
    ctx.fill();

    if (isPriority) {
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = "#FFD95A";
      roundedRectPath(ctx, safe.x + 4, safe.y + 4, safe.w - 8, safe.h - 8, 8);
      ctx.fill();
      ctx.restore();
    }

    ctx.shadowBlur = 0;
    ctx.strokeStyle = safe.border;
    ctx.lineWidth = isPriority ? 3 : 2;
    roundedRectPath(ctx, safe.x, safe.y, safe.w, safe.h, 10);
    ctx.stroke();

    if (isPriority) {
      ctx.save();
      ctx.strokeStyle = "#FFD95A";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#FFD95A";
      ctx.shadowBlur = priorityGlow;
      roundedRectPath(
        ctx,
        safe.x - priorityRingInset,
        safe.y - priorityRingInset,
        safe.w + priorityRingInset * 2,
        safe.h + priorityRingInset * 2,
        14
      );
      ctx.stroke();
      ctx.restore();

      const badgeText = "★ YOUR BASE";
      ctx.save();
      ctx.font = "bold 11px Arial";
      const badgeWidth = Math.max(92, ctx.measureText(badgeText).width + 18);
      const badgeHeight = 22;
      const badgeX = centerX - badgeWidth / 2;
      const badgeY = safe.y - badgeHeight - 8;

      ctx.fillStyle = "rgba(8, 18, 30, 0.96)";
      roundedRectPath(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 11);
      ctx.fill();

      ctx.strokeStyle = "#FFD95A";
      ctx.lineWidth = 2;
      roundedRectPath(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 11);
      ctx.stroke();

      ctx.fillStyle = "#FFD95A";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(badgeText, centerX, badgeY + badgeHeight / 2 + 0.5);
      ctx.restore();
    }

    ctx.fillStyle = safe.border;
    ctx.font = isPriority ? "bold 14px Arial" : "bold 13px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(safe.label, centerX, centerY);

    ctx.restore();
  }

  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
}

function drawCrosswalkActivator(ctx, x, y, w, h) {
  ctx.save();

  ctx.fillStyle = "rgba(93, 231, 255, 0.08)";
  ctx.strokeStyle = COLORS.wrapBorder;
  ctx.lineWidth = 2;
  ctx.shadowColor = COLORS.wrapBorder;
  ctx.shadowBlur = 10;

  roundedRectPath(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.wrapStripe;

  for (let yy = y + 8; yy < y + h - 6; yy += 12) {
    roundedRectPath(ctx, x + 7, yy, w - 14, 4, 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawPortalHints({ ctx, canvas }) {
  const pad = 12;
  const w = 28;
  drawCrosswalkActivator(ctx, pad, PORTAL.y, w, PORTAL.h);
  drawCrosswalkActivator(ctx, canvas.width - pad - w, PORTAL.y, w, PORTAL.h);
}

export function drawFactor({ ctx, sprites, factor, now = performance.now() }) {
  if (!factor || factor.collected) return;

  const sprite = getFactorSprite({ sprites, factor });
  const isProtective = factor.type === "protective";
  const glowColor = isProtective ? COLORS.protectiveGlow : COLORS.riskGlow;
  const pulseBlur = isProtective
    ? getGlowPulse(now, 10, 18, 0.005)
    : getGlowPulse(now, 12, 20, 0.006);

  if (spriteReady(sprite)) {
    drawSpriteCentered(ctx, sprite, factor, FACTOR_DRAW.w, FACTOR_DRAW.h, glowColor, pulseBlur);
  } else {
    const fill = isProtective ? COLORS.protective : COLORS.risk;
    drawFallbackBox(ctx, factor.x, factor.y, factor.w, factor.h, fill, glowColor);
  }
}

export function drawNearestProtectiveLocator({ ctx, state }) {
  if (state?.playerProfile?.cheatCode?.[0] !== "internal_motivation") return;
  if ((state?.playerState?.stability ?? 99) > 3) return;

  let nearestFactor = null;
  let nearestDistance = Infinity;
  const px = state.player.x + state.player.w / 2;
  const py = state.player.y + state.player.h / 2;

  for (const factor of state.activeProtectiveFactors || []) {
    if (factor.collected) continue;
    const fx = factor.x + factor.w / 2;
    const fy = factor.y + factor.h / 2;
    const dist = Math.hypot(px - fx, py - fy);
    if (dist < nearestDistance) {
      nearestDistance = dist;
      nearestFactor = factor;
    }
  }

  if (!nearestFactor) return;

  const pulse = 8 + Math.sin(Date.now() / 180) * 3;
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

export function drawFactors({ ctx, state, sprites, now = performance.now() }) {
  for (const factor of state.activeProtectiveFactors || []) {
    drawFactor({ ctx, sprites, factor, now });
  }
  for (const factor of state.activeRiskFactors || []) {
    drawFactor({ ctx, sprites, factor, now });
  }
  drawNearestProtectiveLocator({ ctx, state });
}

export function drawStrategicPlanningGuide({ ctx, state }) {
  if (state?.playerProfile?.cheatCode?.[0] !== "strategic_planning") return;
  if (!state?.threatState?.inDanger) return;
  if ((state?.playerState?.stability ?? 99) > 2) return;

  let nearestSafe = null;
  let nearestDistance = Infinity;
  const px = state.player.x + state.player.w / 2;
  const py = state.player.y + state.player.h / 2;

  for (const safe of safeSpaces) {
    const sx = safe.x + safe.w / 2;
    const sy = safe.y + safe.h / 2;
    const dist = Math.hypot(px - sx, py - sy);
    if (dist < nearestDistance) {
      nearestDistance = dist;
      nearestSafe = safe;
    }
  }

  if (!nearestSafe) return;

  ctx.save();
  ctx.strokeStyle = "#ffd95a";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(nearestSafe.x + nearestSafe.w / 2, nearestSafe.y + nearestSafe.h / 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

export function hasShield(state) {
  return Date.now() < (state?.effectState?.shieldUntil || 0);
}

function getRecoveryToolVisual(toolId) {
  if (toolId === "stress_management") {
    return { icon: "⚡", label: "Recovery Active", color: "#8BEAFF" };
  }

  if (toolId === "creative_outlets") {
    return { icon: "✨", label: "Recovery Active", color: "#67FF94" };
  }

  if (toolId === "physical_activity") {
    return { icon: "🔥", label: "Recovery Active", color: "#FFD95A" };
  }

  return { icon: "⚡", label: "Recovery Active", color: "#8BEAFF" };
}

export function drawPlayer({ ctx, state, sprites, playerAnim }) {
  const sprite = getPlayerSprite({ sprites, playerAnim });
  ctx.save();

  drawSupportAura({ ctx, state });

  if (spriteReady(sprite)) {
    if (Date.now() < (state.player.invulnerableUntil || 0)) {
      ctx.globalAlpha = 0.75 + Math.sin(performance.now() * 0.02) * 0.15;
    }
    drawSpriteCentered(ctx, sprite, state.player, PLAYER_DRAW.w, PLAYER_DRAW.h);
    ctx.globalAlpha = 1;
  } else {
    const fill = Date.now() < (state.player.invulnerableUntil || 0)
      ? COLORS.playerInvulnerable
      : COLORS.player;
    drawFallbackBox(
      ctx,
      state.player.x,
      state.player.y,
      state.player.w,
      state.player.h,
      fill,
      COLORS.playerBorder
    );
  }

  if (hasShield(state)) {
    ctx.strokeStyle = "#FFD95A";
    ctx.lineWidth = 2;
    roundedRectPath(
      ctx,
      state.player.x - 3,
      state.player.y - 3,
      state.player.w + 6,
      state.player.h + 6,
      6
    );
    ctx.stroke();
  }

  ctx.restore();
}
export function drawChasers({ ctx, state, sprites, now = performance.now() }) {
  (state.chasers || []).forEach((chaser, index) => {
    if (!chaser.active) return;

    const skinKey = getChaserSkinKey(chaser, index);
    const sprite = getChaserSprite({
      sprites,
      threatState: state.threatState,
      chaser,
      index
    });

    const normalGlow = COLORS.chaserGlows[index % COLORS.chaserGlows.length];
    const alertPulse = getGlowPulse(now, 18, 30, 0.01);
    const normalPulse = getGlowPulse(now, 10, 15, 0.004);
    const glowColor = state?.threatState?.inDanger ? COLORS.chaserAlertGlow : normalGlow;
    const glowBlur = state?.threatState?.inDanger ? alertPulse : normalPulse;

    ctx.save();

    if (spriteReady(sprite)) {
      const drawSize = CHASER_DRAW_BY_SKIN[skinKey] || { w: 45, h: 40 };
      drawSpriteCentered(ctx, sprite, chaser, drawSize.w, drawSize.h, glowColor, glowBlur);
    } else {
      drawFallbackBox(ctx, chaser.x, chaser.y, chaser.w, chaser.h, COLORS.chaserBody, glowColor);
    }

    ctx.restore();
  });
}

function getFxProgress(item, now = Date.now()) {
  const startedAt = item?.startedAt ?? now;
  const durationMs = Math.max(1, item?.durationMs ?? 1);
  const elapsed = Math.max(0, now - startedAt);
  return Math.min(1, elapsed / durationMs);
}

export function drawPickupFX({ ctx, state, now = Date.now() }) {
  ctx.save();

  for (const burst of state.pickupBursts || []) {
    const progress = getFxProgress(burst, now);
    const alpha = 1 - progress;

    const startRadius = burst.startRadius ?? 8;
    const endRadius = burst.endRadius ?? 22;
    const lineWidth = burst.lineWidth ?? 3;
    const radius = startRadius + (endRadius - startRadius) * progress;

    ctx.globalAlpha = Math.max(0, alpha);
    ctx.beginPath();
    ctx.arc(burst.x, burst.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = burst.color || COLORS.protectiveGlow;
    ctx.lineWidth = Math.max(1, lineWidth * (1 - progress * 0.45));
    ctx.stroke();
  }

  for (const item of state.pickupTexts || []) {
    const progress = getFxProgress(item, now);
    const alpha = 1 - progress;
    const floatUp = progress * 16;

    ctx.globalAlpha = Math.max(0, alpha);
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(5, 11, 18, 0.85)";
    ctx.strokeText(item.text, item.x, item.y - floatUp);
    ctx.fillStyle = item.color || "#ffffff";
    ctx.fillText(item.text, item.x, item.y - floatUp);
  }

  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
}

export function drawLevelBanner({ ctx, canvas, state }) {
  if (Date.now() > (state.levelBannerUntil || 0)) return;

  const text = state.levelBannerText || "";
  ctx.save();
  ctx.font = "bold 22px Arial";
  const textWidth = ctx.measureText(text).width;
  const w = textWidth + 40;
  const h = 44;
  const x = (canvas.width - w) / 2;
  const y = 70;

  ctx.fillStyle = "rgba(8, 18, 30, 0.9)";
  roundedRectPath(ctx, x, y, w, h, 12);
  ctx.fill();

  ctx.strokeStyle = "#5DE7FF";
  ctx.lineWidth = 2;
  roundedRectPath(ctx, x, y, w, h, 12);
  ctx.stroke();

  ctx.fillStyle = "#EAF4FF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + w / 2, y + h / 2 + 1);
  ctx.restore();
}

export function drawCountdownOverlay({ ctx, canvas, state }) {
  const now = Date.now();
  const countdownActive = !!state?.countdown?.active;
  const showGo = now < (state?.countdown?.goUntil || 0);

  if (!countdownActive && !showGo) return;

  const text = countdownActive ? String(state.countdown.displayValue || 3) : "GO!";

  ctx.save();
  ctx.fillStyle = "rgba(3, 8, 18, 0.42)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = countdownActive ? "bold 108px Arial" : "bold 84px Arial";

  const textWidth = ctx.measureText(text).width;
  const w = textWidth + 72;
  const h = countdownActive ? 120 : 96;
  const x = (canvas.width - w) / 2;
  const y = (canvas.height - h) / 2 - 10;

  ctx.fillStyle = "rgba(8, 18, 30, 0.92)";
  roundedRectPath(ctx, x, y, w, h, 20);
  ctx.fill();

  ctx.strokeStyle = "#5DE7FF";
  ctx.lineWidth = 3;
  roundedRectPath(ctx, x, y, w, h, 20);
  ctx.stroke();

  ctx.fillStyle = "#EAF4FF";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  ctx.font = "bold 18px Arial";
  ctx.fillStyle = "rgba(234, 244, 255, 0.88)";
  ctx.fillText(
    countdownActive ? "Get ready" : "Move now",
    canvas.width / 2,
    canvas.height / 2 + 64
  );

  ctx.restore();
}

export function drawFrame({ ctx, canvas, state, sprites, playerAnim }) {
  const now = performance.now();

  drawBackground({ ctx, canvas });
  drawSeamlessWalls({ ctx });
  drawSafeSpaces({ ctx, state });
  drawPortalHints({ ctx, canvas });
  drawFactors({ ctx, state, sprites, now });
  drawStrategicPlanningGuide({ ctx, state });
  drawChasers({ ctx, state, sprites, now });
  drawPlayer({ ctx, state, sprites, playerAnim });
  drawPickupFX({ ctx, state, now: Date.now() });
  drawLevelBanner({ ctx, canvas, state });
  drawCountdownOverlay({ ctx, canvas, state });
}

export function createRenderer({ canvas, ctx, state, sprites = createSpriteRegistry(), playerAnim = createPlayerAnimationState(state?.player) } = {}) {
  if (!canvas) throw new Error("createRenderer requires a canvas.");
  if (!ctx) throw new Error("createRenderer requires a 2D context.");
  if (!state) throw new Error("createRenderer requires the shared game state.");

  let lastAnimationTs = performance.now();

  return {
    canvas,
    ctx,
    sprites,
    playerAnim,
    resetAnimation() {
      resetPlayerAnimation(playerAnim, state.player);
      lastAnimationTs = performance.now();
    },
    draw() {
      const now = performance.now();
      const deltaMs = Math.min(40, now - lastAnimationTs);
      lastAnimationTs = now;
      updatePlayerAnimation({ state, playerAnim, sprites, deltaMs });
      drawFrame({ ctx, canvas, state, sprites, playerAnim });
    }
  };
}
