export function computeRecoilVectors(playerPos, aiPos, recoilMagnitude) {
  const dx = playerPos.x - aiPos.x;
  const dy = playerPos.y - aiPos.y;
  const nx = Math.sign(dx) || 1;
  const ny = Math.sign(dy) || 1;
  return {
    player: { x: nx * recoilMagnitude, y: ny * recoilMagnitude },
    ai: { x: -nx * recoilMagnitude, y: -ny * recoilMagnitude },
  };
}

export function nextAiDirectionTime(nowMs) {
  const jitter = Math.floor(Math.random() * 1001); // 0..1000
  return nowMs + 1200 + jitter;
}

export function tickTimer(currentSeconds) {
  return Math.max(0, currentSeconds - 1);
}

// Returns true if a score can be awarded for hitting a specific target now,
// given the last time that target was scored. Updates are handled by caller.
export function canScoreHit(nowMs, lastScoredAtMs, cooldownMs) {
  if (lastScoredAtMs == null) return true;
  return nowMs - lastScoredAtMs >= cooldownMs;
}


