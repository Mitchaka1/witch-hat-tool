import { describe, expect, it } from "vitest";
import { demoSpells } from "@/data/demoSpells";
import {
  GRIMOIRE_STORAGE_KEY,
  canAffordSpell,
  createPreparedSpell,
  loadGrimoire,
  qualityMultiplier,
  saveGrimoire,
  spentPreparationInk,
} from "@/lib/grimoireStorage";

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initial));

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe("grimoire preparation", () => {
  const flameShot = demoSpells.find((spell) => spell.id === "flame_shot")!;

  it("maps drawing quality to a bounded battle multiplier", () => {
    expect(qualityMultiplier(0)).toBe(0.65);
    expect(qualityMultiplier(0.5)).toBeCloseTo(0.975);
    expect(qualityMultiplier(1)).toBe(1.3);
    expect(qualityMultiplier(10)).toBe(1.3);
  });

  it("creates a prepared page with the spell's uses and expected power", () => {
    const prepared = createPreparedSpell(flameShot, 0.84, {
      id: "prepared-1",
      now: 1234,
    });

    expect(prepared).toMatchObject({
      preparedId: "prepared-1",
      spellId: "flame_shot",
      preparedQuality: 0.84,
      remainingUses: 4,
      preparedAt: 1234,
    });
    expect(prepared.expectedPower).toBeCloseTo(
      flameShot.basePower * qualityMultiplier(0.84),
    );
  });

  it("tracks spent ink and affordability", () => {
    const prepared = [
      createPreparedSpell(flameShot, 0.8, { id: "a", now: 1 }),
      createPreparedSpell(flameShot, 0.9, { id: "b", now: 2 }),
    ];

    expect(spentPreparationInk(prepared)).toBe(24);
    expect(canAffordSpell(24, 100, flameShot)).toBe(true);
    expect(canAffordSpell(92, 100, flameShot)).toBe(false);
  });

  it("round-trips valid prepared pages through storage", () => {
    const storage = memoryStorage();
    const prepared = [
      createPreparedSpell(flameShot, 0.8, { id: "a", now: 1 }),
    ];

    saveGrimoire(prepared, storage);

    expect(loadGrimoire(storage)).toEqual(prepared);
  });

  it("discards malformed or unknown stored pages", () => {
    const storage = memoryStorage({
      [GRIMOIRE_STORAGE_KEY]: JSON.stringify([
        {
          preparedId: "bad",
          spellId: "not-a-real-spell",
          preparedQuality: 4,
          remainingUses: -2,
          preparedAt: "yesterday",
        },
      ]),
    });

    expect(loadGrimoire(storage)).toEqual([]);
  });
});
