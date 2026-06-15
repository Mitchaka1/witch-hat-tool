export function resolveJumpInput(
  pressed: boolean,
  consumed: boolean,
  onGround: boolean,
) {
  if (!pressed) {
    return { shouldJump: false, consumed: false };
  }

  if (!consumed && onGround) {
    return { shouldJump: true, consumed: true };
  }

  return { shouldJump: false, consumed };
}

export function getBattleIntro(now: number, startsAt: number) {
  if (now >= startsAt) {
    return { active: true, message: "Cast!" };
  }

  const seconds = Math.max(1, Math.ceil((startsAt - now) / 1000));
  return {
    active: false,
    message: `Ready your grimoire · ${seconds}`,
  };
}
