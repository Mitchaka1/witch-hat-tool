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

  it("records the exact library-derived recipe for every demo spell", () => {
    expect(
      Object.fromEntries(
        demoSpells.map((spell) => [
          spell.id,
          spell.libraryComponents.map((component) => component.id),
        ]),
      ),
    ).toEqual({
      flame_shot: ["fire", "column", "region"],
      watershot: ["water", "column"],
      rising_platform: ["water", "column", "levitation"],
      wind_wall: ["wind", "column", "convergence"],
      sand_cage: ["earth", "column", "crush"],
      sylph_shoes: ["wind_underfoot", "levitation", "convergence"],
      light_beam: ["light", "column"],
      pyreball: ["fire", "levitation"],
    });

    for (const spell of demoSpells) {
      expect(spell.librarySourceUrl).toMatch(
        /^https:\/\/witchhatatelier\.telepedia\.net/,
      );
      expect(spell.publicName).not.toHaveLength(0);
      expect(spell.formationDescription).not.toHaveLength(0);

      for (const component of spell.libraryComponents) {
        expect(component.assetPath).toMatch(
          /^\/vectors\/(signs|sigils)\/.+\.svg$/,
        );
        expect(component.role).not.toHaveLength(0);
      }
    }
  });
});
