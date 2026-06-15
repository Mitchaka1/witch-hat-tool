import type { DemoSpell } from "@/data/demoSpells";

export type ScaledSpellStats = {
  damage: number;
  size: number;
  speed: number;
  push: number;
  duration: number;
  height: number;
  radius: number;
  slow: number;
  jumpBoost: number;
  moveBoost: number;
};

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function getScaledSpellStats(
  spell: DemoSpell,
  preparedQuality: number,
): ScaledSpellStats {
  const quality = clamp(preparedQuality);
  const powerScale = 0.75 + quality * 0.55;
  const defaults: ScaledSpellStats = {
    damage: spell.qualityScaling.damage ? spell.basePower * powerScale : 0,
    size: spell.qualityScaling.size ? 14 + quality * 13 : 14,
    speed: spell.qualityScaling.speed ? 430 + quality * 90 : 440,
    push: spell.qualityScaling.push ? 220 + quality * 240 : 0,
    duration: spell.qualityScaling.duration ? 2.4 + quality * 3.2 : 0,
    height: spell.qualityScaling.height ? 72 + quality * 90 : 0,
    radius: spell.qualityScaling.size ? 58 + quality * 55 : 64,
    slow: 0,
    jumpBoost: 0,
    moveBoost: 0,
  };

  switch (spell.id) {
    case "watershot":
      return {
        ...defaults,
        damage: spell.basePower * (0.85 + quality * 0.25),
        size: 16 + quality * 14,
        speed: 410,
      };
    case "rising_platform":
      return {
        ...defaults,
        size: 100 + quality * 80,
        duration: 3.2 + quality * 3.8,
        height: 90 + quality * 115,
      };
    case "wind_wall":
      return {
        ...defaults,
        size: 92 + quality * 80,
        duration: 2.6 + quality * 3.2,
        push: 300 + quality * 300,
      };
    case "sand_cage":
      return {
        ...defaults,
        damage: spell.basePower * (0.55 + quality * 0.45),
        duration: 2.8 + quality * 3.5,
        radius: 72 + quality * 56,
        slow: 0.38 + quality * 0.38,
      };
    case "sylph_shoes":
      return {
        ...defaults,
        duration: 3.4 + quality * 4.2,
        jumpBoost: 80 + quality * 130,
        moveBoost: 55 + quality * 105,
      };
    case "light_beam":
      return {
        ...defaults,
        damage: spell.basePower * powerScale,
        size: 5 + quality * 8,
        radius: 650 + quality * 260,
      };
    case "pyreball":
      return {
        ...defaults,
        damage: spell.basePower * powerScale,
        size: 24 + quality * 18,
        speed: 245 + quality * 45,
        push: 330 + quality * 250,
        radius: 78 + quality * 72,
      };
    default:
      return {
        ...defaults,
        damage: spell.basePower * powerScale,
        size: 13 + quality * 12,
        speed: 455 + quality * 85,
      };
  }
}
