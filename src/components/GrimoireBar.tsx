import SpellSealPreview from "@/components/SpellSealPreview";
import { demoSpellById } from "@/data/demoSpells";
import type { PreparedSpell } from "@/lib/grimoireStorage";

type GrimoireBarProps = {
  pages: readonly PreparedSpell[];
  selectedIndex: number;
  onSelect: (index: number) => void;
};

export default function GrimoireBar({
  pages,
  selectedIndex,
  onSelect,
}: GrimoireBarProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {pages.map((page, index) => {
        const selected = index === selectedIndex;
        const exhausted = page.remainingUses <= 0;
        const definition = demoSpellById.get(page.spellId);

        return (
          <button
            key={page.preparedId}
            type="button"
            onClick={() => onSelect(index)}
            aria-label={`Select ${page.name}`}
            aria-pressed={selected}
            className={`grid min-w-48 grid-cols-[48px_1fr] items-center gap-3 rounded-xl border p-2.5 text-left transition ${
              selected
                ? "border-[#d9bd70] bg-[#fff7dc] shadow-[0_0_0_2px_rgba(217,189,112,0.22)]"
                : "border-white/10 bg-white/5 text-white hover:bg-white/10"
            } ${exhausted ? "opacity-55" : ""}`}
          >
            <span className="h-12 w-12">
              {definition ? (
                <SpellSealPreview
                  spell={definition}
                  className={`h-full w-full ${
                    selected ? "" : "brightness-75"
                  }`}
                />
              ) : null}
            </span>
            <span className="min-w-0">
              <span
                className={`block truncate font-[family-name:var(--font-cinzel)] text-xs font-semibold ${
                  selected ? "text-ink" : "text-white"
                }`}
              >
                {page.name}
              </span>
              <span
                className={`mt-1 block font-mono text-xs font-bold ${
                  selected ? "text-[var(--color-gold)]" : "text-white/60"
                }`}
              >
                {exhausted
                  ? "Spent"
                  : `${page.remainingUses} use${
                      page.remainingUses === 1 ? "" : "s"
                    }`}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
