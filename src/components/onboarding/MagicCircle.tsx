type MagicCircleProps = {
  className?: string;
  animated?: boolean;
};

/*
 * A hand-built arcane seal: concentric rings, runic ticks and a glyph core.
 * Used large as the onboarding hero and small as the atelier brand mark.
 * Purely decorative — kept out of the accessibility tree by callers.
 */
export default function MagicCircle({ className = "", animated = true }: MagicCircleProps) {
  const ticks = Array.from({ length: 24 }, (_, index) => index * 15);
  const runes = Array.from({ length: 8 }, (_, index) => index * 45);

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      role="presentation"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
    >
      <defs>
        <radialGradient id="seal-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--color-arcane-glow)" stopOpacity="0.45" />
          <stop offset="55%" stopColor="var(--color-arcane-glow)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="var(--color-arcane-glow)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="100" cy="100" r="96" fill="url(#seal-glow)" stroke="none" />

      {/* Outer rotating ring with runic ticks */}
      <g className={animated ? "animate-spin-slow" : ""}>
        <circle cx="100" cy="100" r="88" strokeWidth="1.4" opacity="0.7" />
        <circle cx="100" cy="100" r="80" strokeWidth="0.8" opacity="0.5" />
        {ticks.map((angle) => (
          <line
            key={angle}
            x1="100"
            y1="12"
            x2="100"
            y2={angle % 45 === 0 ? "26" : "20"}
            strokeWidth={angle % 45 === 0 ? "1.6" : "0.9"}
            opacity="0.75"
            transform={`rotate(${angle} 100 100)`}
          />
        ))}
      </g>

      {/* Counter-rotating glyph ring */}
      <g className={animated ? "animate-spin-reverse" : ""}>
        <circle cx="100" cy="100" r="64" strokeWidth="1.2" opacity="0.6" />
        {runes.map((angle) => (
          <g key={angle} transform={`rotate(${angle} 100 100)`}>
            <path
              d="M100 40 l6 10 -6 6 -6 -6 z"
              strokeWidth="1.2"
              opacity="0.8"
              strokeLinejoin="round"
            />
          </g>
        ))}
      </g>

      {/* Inscribed geometry */}
      <g opacity="0.85">
        <polygon points="100,46 146,128 54,128" strokeWidth="1.3" strokeLinejoin="round" />
        <polygon points="100,154 54,72 146,72" strokeWidth="1.3" strokeLinejoin="round" />
        <circle cx="100" cy="100" r="34" strokeWidth="1.2" />
      </g>

      {/* Pulsing core sigil */}
      <g className={animated ? "animate-sigil-pulse" : ""} stroke="var(--color-gold-bright)">
        <circle cx="100" cy="100" r="16" strokeWidth="1.6" />
        <path d="M100 86 v28 M86 100 h28 M90 90 l20 20 M110 90 l-20 20" strokeWidth="1.2" />
      </g>
    </svg>
  );
}
