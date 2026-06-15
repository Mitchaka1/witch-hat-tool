import { describe, expect, it } from "vitest";
import { demoSpells } from "@/data/demoSpells";

describe("demoSpells", () => {
  it("contains eight unique, battle-ready spell definitions", () => {
    expect(demoSpells).toHaveLength(8);
    expect(new Set(demoSpells.map((spell) => spell.id))).toHaveLength(8);

    for (const spell of demoSpells) {
      expect(spell.preparationInkCost).toBeGreaterThan(0);
      expect(spell.battleUses).toBeGreaterThan(0);
      expect(spell.basePower).toBeGreaterThan(0);
      expect(spell.designImage).toMatch(/^\/spell-designs\/.+\.svg$/);
    }
  });

  it("keeps the first four requested mechanics available", () => {
    expect(demoSpells.slice(0, 4).map((spell) => spell.id)).toEqual([
      "flame_shot",
      "watershot",
      "rising_platform",
      "wind_wall",
    ]);
  });
});
