import Image from "next/image";
import { Trash2 } from "lucide-react";
import { qualityLabel } from "@/lib/circleQuality";
import type { PreparedSpell } from "@/lib/grimoireStorage";

type GrimoirePreviewProps = {
  prepared: readonly PreparedSpell[];
  onRemove: (preparedId: string) => void;
};

export default function GrimoirePreview({
  prepared,
  onRemove,
}: GrimoirePreviewProps) {
  if (prepared.length === 0) {
    return (
      <div className="grid min-h-44 place-items-center rounded-xl border border-dashed border-[var(--color-line-strong)] bg-white/40 p-6 text-center">
        <div>
          <p className="font-[family-name:var(--font-cinzel)] text-lg font-semibold text-ink">
            A blank grimoire
          </p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-ink-soft">
            Trace a stable ring, then bind the selected spell to its first page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {prepared.map((spell, index) => (
        <article
          key={spell.preparedId}
          className="relative overflow-hidden rounded-xl border border-[var(--color-line)] bg-[#fffaf0] p-3 shadow-sm"
        >
          <div className="absolute inset-y-0 left-0 w-1 bg-[var(--color-gold)]" />
          <div className="flex gap-3">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-lg border border-[var(--color-line)] bg-white/60 p-2">
              <Image
                src={spell.designImage}
                alt=""
                width={64}
                height={64}
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-gold)]">
                Page {index + 1}
              </p>
              <h3 className="mt-1 truncate font-[family-name:var(--font-cinzel)] text-sm font-semibold text-ink">
                {spell.name}
              </h3>
              <p className="mt-1 text-xs text-ink-soft">
                {qualityLabel(spell.preparedQuality)} ·{" "}
                {Math.round(spell.preparedQuality * 100)}%
              </p>
              <p className="mt-1 font-mono text-xs font-semibold text-ink">
                {spell.remainingUses} uses · Power {Math.round(spell.expectedPower)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(spell.preparedId)}
              aria-label={`Remove ${spell.name}`}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-faint transition hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
