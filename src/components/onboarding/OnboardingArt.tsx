/*
 * Decorative art for the onboarding tour. Two kinds:
 *  - SymbolCluster renders real SVGs from the library so the preview is authentic.
 *  - The hand-built scenes (Workshop, Identify) illustrate flows the tour describes.
 * All pieces are presentational and hidden from assistive tech by the slide frame.
 */
import Image from "next/image";

type ClusterEntry = {
  src: string;
  label: string;
  tone: "sigil" | "sign";
};

const LIBRARY_PREVIEW: ClusterEntry[] = [
  { src: "/vectors/sigils/Fire_sigil.svg", label: "Fire", tone: "sigil" },
  { src: "/vectors/sigils/Water.svg", label: "Water", tone: "sigil" },
  { src: "/vectors/sigils/Earth.svg", label: "Earth", tone: "sigil" },
  { src: "/vectors/sigils/Light.svg", label: "Light", tone: "sigil" },
  { src: "/vectors/signs/Bolt.svg", label: "Bolt", tone: "sign" },
  { src: "/vectors/signs/Float.svg", label: "Float", tone: "sign" },
];

export function SymbolCluster() {
  return (
    <div className="grid w-full max-w-[320px] grid-cols-3 gap-3" aria-hidden="true">
      {LIBRARY_PREVIEW.map((entry, index) => (
        <div
          key={entry.label}
          className="animate-float-up flex flex-col items-center gap-2 rounded-xl border border-[var(--color-gold-soft)]/60 bg-[var(--color-parchment-bright)] p-3 shadow-sm"
          style={{ animationDelay: `${index * 70}ms` }}
        >
          <Image
            src={entry.src}
            alt=""
            width={56}
            height={56}
            className="h-12 w-12 object-contain"
          />
          <div className="flex flex-col items-center gap-1">
            <span className="text-[11px] font-semibold text-ink">{entry.label}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider ${
                entry.tone === "sigil"
                  ? "bg-[var(--color-ember)]/15 text-[var(--color-ember)]"
                  : "bg-[var(--color-arcane)]/15 text-[var(--color-arcane)]"
              }`}
            >
              {entry.tone}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SignsVsSigils() {
  return (
    <div className="flex w-full max-w-[340px] items-stretch gap-4" aria-hidden="true">
      <div className="animate-float-up flex flex-1 flex-col items-center gap-3 rounded-2xl border border-[var(--color-ember)]/30 bg-[var(--color-parchment-bright)] p-4 shadow-sm">
        <span className="rounded-full bg-[var(--color-ember)]/15 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[var(--color-ember)]">
          Sigil
        </span>
        <Image
          src="/vectors/sigils/Fire_sigil.svg"
          alt=""
          width={72}
          height={72}
          className="h-16 w-16 object-contain"
        />
        <p className="text-center text-[11px] leading-snug text-ink-soft">
          The <strong className="text-ink">noun</strong> — the core element a spell acts on.
        </p>
      </div>

      <div className="flex items-center self-center text-[var(--color-gold)]">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor">
          <path d="M5 12h14M13 6l6 6-6 6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div
        className="animate-float-up flex flex-1 flex-col items-center gap-3 rounded-2xl border border-[var(--color-arcane)]/30 bg-[var(--color-parchment-bright)] p-4 shadow-sm"
        style={{ animationDelay: "120ms" }}
      >
        <span className="rounded-full bg-[var(--color-arcane)]/15 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[var(--color-arcane)]">
          Sign
        </span>
        <Image
          src="/vectors/signs/Bolt.svg"
          alt=""
          width={72}
          height={72}
          className="h-16 w-16 object-contain"
        />
        <p className="text-center text-[11px] leading-snug text-ink-soft">
          The <strong className="text-ink">modifier</strong> — it shapes how the magic behaves.
        </p>
      </div>
    </div>
  );
}

export function WorkshopScene() {
  return (
    <svg
      viewBox="0 0 220 200"
      className="w-full max-w-[300px]"
      fill="none"
      stroke="currentColor"
      role="presentation"
      aria-hidden="true"
    >
      {/* Drafting board */}
      <rect x="18" y="20" width="184" height="160" rx="10" className="text-[var(--color-line-strong)]" strokeWidth="1.4" />
      <rect
        x="18"
        y="20"
        width="184"
        height="160"
        rx="10"
        fill="var(--color-surface)"
        stroke="none"
        opacity="0.6"
      />

      {/* The seal being inscribed */}
      <g className="text-[var(--color-arcane)]">
        <circle cx="100" cy="104" r="58" strokeWidth="1.6" strokeDasharray="3 4" opacity="0.85" />
        <circle cx="100" cy="104" r="40" strokeWidth="1.2" opacity="0.55" />
        <polygon points="100,70 130,128 70,128" strokeWidth="1.3" strokeLinejoin="round" opacity="0.75" />
      </g>
      <g className="animate-sigil-pulse text-[var(--color-gold-bright)]">
        <circle cx="100" cy="104" r="13" strokeWidth="1.6" />
        <path d="M100 94v20M90 104h20" strokeWidth="1.2" />
      </g>

      {/* Quill */}
      <g className="text-[var(--color-ink)]">
        <path
          d="M150 38 C120 60 110 86 104 100 l9 9 c14 -7 40 -18 61 -47 z"
          strokeWidth="1.6"
          strokeLinejoin="round"
          fill="var(--color-parchment-bright)"
        />
        <path d="M150 38 l24 24" strokeWidth="1.2" />
        <path d="M104 100 l-7 12 12 -3" strokeWidth="1.6" strokeLinejoin="round" fill="var(--color-ink)" />
      </g>
    </svg>
  );
}

export function IdentifyScene() {
  return (
    <svg
      viewBox="0 0 220 200"
      className="w-full max-w-[300px]"
      fill="none"
      stroke="currentColor"
      role="presentation"
      aria-hidden="true"
    >
      {/* Rough drawn input */}
      <g className="text-[var(--color-ink-soft)]">
        <rect x="14" y="58" width="78" height="78" rx="10" strokeWidth="1.4" strokeDasharray="4 4" />
        <path
          d="M30 110 c8 -34 28 -36 24 -12 c-3 16 10 18 18 -6"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Arrow / matching */}
      <g className="animate-sigil-pulse text-[var(--color-arcane-bright)]">
        <path d="M100 97h22M116 90l8 7-8 7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Matched result */}
      <g>
        <rect
          x="130"
          y="58"
          width="78"
          height="78"
          rx="10"
          fill="var(--color-parchment-bright)"
          className="text-[var(--color-gold)]"
          strokeWidth="1.6"
        />
        <image href="/vectors/signs/Bend.svg" x="146" y="70" width="46" height="46" />
      </g>
      <g className="text-[var(--color-arcane)]">
        <circle cx="198" cy="62" r="13" fill="var(--color-arcane)" stroke="none" />
        <path
          d="M192 62l4 4 8 -9"
          stroke="var(--color-parchment-bright)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <text
        x="169"
        y="150"
        textAnchor="middle"
        className="fill-[var(--color-ink)]"
        style={{ font: "600 12px var(--font-cinzel), serif" }}
      >
        Bend
      </text>
    </svg>
  );
}
