import {
  demoSpellById,
  type DemoSpell,
  type SpellElement,
} from "@/data/demoSpells";

export const GRIMOIRE_STORAGE_KEY = "ink-grimoire-arena:prepared-spells:v1";

export type PreparedSpell = {
  preparedId: string;
  spellId: string;
  name: string;
  element: SpellElement;
  effect: string;
  designImage: string;
  preparationInkCost: number;
  preparedQuality: number;
  remainingUses: number;
  preparedAt: number;
  basePower: number;
  qualityMultiplier: number;
  expectedPower: number;
};

type PreparedSpellOptions = {
  id?: string;
  now?: number;
};

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function qualityMultiplier(quality: number) {
  return Number((0.65 + clamp(quality) * 0.65).toFixed(3));
}

export function createPreparedSpell(
  spell: DemoSpell,
  quality: number,
  options: PreparedSpellOptions = {},
): PreparedSpell {
  const preparedQuality = Number(clamp(quality).toFixed(3));
  const multiplier = qualityMultiplier(preparedQuality);

  return {
    preparedId: options.id ?? createPreparedId(),
    spellId: spell.id,
    name: spell.name,
    element: spell.element,
    effect: spell.effectDescription,
    designImage: spell.designImage,
    preparationInkCost: spell.preparationInkCost,
    preparedQuality,
    remainingUses: spell.battleUses,
    preparedAt: options.now ?? Date.now(),
    basePower: spell.basePower,
    qualityMultiplier: multiplier,
    expectedPower: Number((spell.basePower * multiplier).toFixed(2)),
  };
}

export function spentPreparationInk(prepared: readonly PreparedSpell[]) {
  return prepared.reduce(
    (total, spell) => total + spell.preparationInkCost,
    0,
  );
}

export function canAffordSpell(
  spentInk: number,
  inkBudget: number,
  spell: DemoSpell,
) {
  return spentInk + spell.preparationInkCost <= inkBudget;
}

export function saveGrimoire(
  prepared: readonly PreparedSpell[],
  storage: Storage = window.localStorage,
) {
  storage.setItem(GRIMOIRE_STORAGE_KEY, JSON.stringify(prepared));
}

export function loadGrimoire(
  storage: Storage = window.localStorage,
): PreparedSpell[] {
  const rawValue = storage.getItem(GRIMOIRE_STORAGE_KEY);

  if (!rawValue) return [];

  try {
    const parsed: unknown = JSON.parse(rawValue);
    return Array.isArray(parsed)
      ? parsed.filter(isValidPreparedSpell).map((item) => ({ ...item }))
      : [];
  } catch {
    return [];
  }
}

function createPreparedId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `prepared-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isValidPreparedSpell(value: unknown): value is PreparedSpell {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<PreparedSpell>;
  const definition =
    typeof candidate.spellId === "string"
      ? demoSpellById.get(candidate.spellId)
      : undefined;

  return Boolean(
    definition &&
      typeof candidate.preparedId === "string" &&
      candidate.name === definition.name &&
      candidate.element === definition.element &&
      candidate.effect === definition.effectDescription &&
      candidate.designImage === definition.designImage &&
      candidate.preparationInkCost === definition.preparationInkCost &&
      typeof candidate.preparedQuality === "number" &&
      candidate.preparedQuality >= 0 &&
      candidate.preparedQuality <= 1 &&
      typeof candidate.remainingUses === "number" &&
      candidate.remainingUses >= 0 &&
      candidate.remainingUses <= definition.battleUses &&
      typeof candidate.preparedAt === "number" &&
      typeof candidate.basePower === "number" &&
      candidate.basePower === definition.basePower &&
      typeof candidate.qualityMultiplier === "number" &&
      typeof candidate.expectedPower === "number",
  );
}
