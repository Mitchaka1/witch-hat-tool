import Image from "next/image";
import { ExternalLink, LibraryBig } from "lucide-react";
import type { DemoSpell } from "@/data/demoSpells";

type SpellFormulaProps = {
  spell: DemoSpell;
  compact?: boolean;
};

export default function SpellFormula({
  spell,
  compact = false,
}: SpellFormulaProps) {
  return (
    <section
      className={`rounded-xl border border-[var(--color-line)] bg-white/55 ${
        compact ? "p-2.5" : "p-4"
      }`}
      aria-label={`${spell.name} library formula`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-gold)]">
            <LibraryBig className="h-3.5 w-3.5" aria-hidden="true" />
            Library-derived formula
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Public alias:{" "}
            <strong className="font-[family-name:var(--font-cinzel)] text-ink">
              {spell.publicName}
            </strong>
          </p>
        </div>
        <a
          href={spell.librarySourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-arcane)] underline-offset-4 hover:underline"
        >
          Source library
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </div>

      <div className={`mt-3 grid gap-2 ${compact ? "grid-cols-3" : "sm:grid-cols-3"}`}>
        {spell.libraryComponents.map((component) => (
          <article
            key={component.id}
            className="flex min-w-0 items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[#fffaf0] p-2"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white p-1">
              <Image
                src={component.assetPath}
                alt={`${component.name} ${component.kind} reference`}
                width={36}
                height={36}
                className="h-full w-full object-contain"
              />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-bold text-ink">
                {component.name}
              </span>
              <span className="block text-[9px] font-bold uppercase tracking-wider text-ink-faint">
                {component.kind}
              </span>
            </span>
          </article>
        ))}
      </div>

      {compact ? (
        <>
          <p className="mt-2 text-xs leading-5 text-ink-soft">
            {spell.formationDescription}
          </p>
          <details className="mt-2 text-xs text-ink-faint">
            <summary className="cursor-pointer font-semibold text-[var(--color-arcane)]">
              Why these marks?
            </summary>
            <ul className="mt-2 grid gap-1 pl-1 leading-5">
              {spell.libraryComponents.map((component) => (
                <li key={component.id}>
                  <strong className="text-ink-soft">{component.name}:</strong>{" "}
                  {component.role}
                </li>
              ))}
            </ul>
          </details>
        </>
      ) : (
        <>
          <p className="mt-3 text-sm leading-5 text-ink-soft">
            {spell.formationDescription}
          </p>
          <ul className="mt-2 grid gap-1 text-xs leading-5 text-ink-faint">
            {spell.libraryComponents.map((component) => (
              <li key={component.id}>
                <strong className="text-ink-soft">{component.name}:</strong>{" "}
                {component.role}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
