import { describe, expect, it } from "vitest";
import { demoSpells } from "@/data/demoSpells";
import { getScaledSpellStats } from "@/lib/spellEffects";

function spell(id: string) {
  return demoSpells.find((item) => item.id === id)!;
}

describe("getScaledSpellStats", () => {
  it("makes high-quality flame shots stronger, larger, and slightly faster", () => {
    const rough = getScaledSpellStats(spell("flame_shot"), 0.6);
    const precise = getScaledSpellStats(spell("flame_shot"), 1);

    expect(precise.damage).toBeGreaterThan(rough.damage);
    expect(precise.size).toBeGreaterThan(rough.size);
    expect(precise.speed).toBeGreaterThan(rough.speed);
  });

  it("scales watershot push more strongly than its light damage", () => {
    const rough = getScaledSpellStats(spell("watershot"), 0.6);
    const precise = getScaledSpellStats(spell("watershot"), 1);

    expect(precise.push - rough.push).toBeGreaterThan(
      precise.damage - rough.damage,
    );
  });

  it("turns platform quality into height and duration", () => {
    const rough = getScaledSpellStats(spell("rising_platform"), 0.6);
    const precise = getScaledSpellStats(spell("rising_platform"), 1);

    expect(precise.height).toBeGreaterThan(rough.height);
    expect(precise.duration).toBeGreaterThan(rough.duration);
  });

  it("keeps every runtime stat finite and non-negative", () => {
    for (const definition of demoSpells) {
      const stats = getScaledSpellStats(definition, 0.84);

      for (const value of Object.values(stats)) {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
