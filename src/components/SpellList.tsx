import {
  Droplets,
  Flame,
  Mountain,
  Sparkles,
  Wind,
} from "lucide-react";
import type { DemoSpell } from "@/data/demoSpells";

type SpellListProps = {
  spells: readonly DemoSpell[];
  selectedId: string;
  spentInk: number;
  inkBudget: number;
  onSelect: (spellId: string) => void;
};

const elementIcons = {
  fire: Flame,
  water: Droplets,
  wind: Wind,
  earth: Mountain,
  light: Sparkles,
};

export default function SpellList({
  spells,
  selectedId,
  spentInk,
  inkBudget,
  onSelect,
}: SpellListProps) {
  const remainingInk = inkBudget - spentInk;

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
      {spells.map((spell) => {
        const Icon = elementIcons[spell.element];
        const affordable = spell.preparationInkCost <= remainingInk;
        const selected = selectedId === spell.id;

        return (
          <button
            key={spell.id}
            type="button"
            disabled={!affordable}
            onClick={() => onSelect(spell.id)}
            aria-label={`${spell.name}, ${spell.preparationInkCost} ink`}
            className={`group grid min-h-24 grid-cols-[42px_1fr_auto] items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
              selected
                ? "border-[var(--color-gold)] bg-[#fff8df] shadow-[0_0_0_2px_rgba(200,154,61,0.18)]"
                : "border-[var(--color-line)] bg-[var(--color-surface)] hover:border-[var(--color-gold)]"
            } disabled:cursor-not-allowed disabled:opacity-40`}
          >
            <span
              className="grid h-10 w-10 place-items-center rounded-full border bg-white/70"
              style={{ borderColor: spell.accent, color: spell.accent }}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-[family-name:var(--font-cinzel)] text-sm font-semibold text-ink">
                {spell.name}
              </span>
              <span className="mt-1 block text-xs text-ink-soft">
                {spell.shortEffect} · {spell.battleUses} use
                {spell.battleUses === 1 ? "" : "s"}
              </span>
              <span className="mt-1 block truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-gold)]">
                {spell.libraryComponents
                  .map((component) => component.name)
                  .join(" + ")}
              </span>
            </span>
            <span className="rounded-full bg-[var(--color-surface-sunken)] px-2.5 py-1 font-mono text-xs font-bold text-ink">
              {spell.preparationInkCost}
            </span>
          </button>
        );
      })}
    </div>
  );
}
