import Image from "next/image";
import type { DemoSpell } from "@/data/demoSpells";

type SpellSealPreviewProps = {
  spell: DemoSpell;
  className?: string;
  showLabels?: boolean;
};

export default function SpellSealPreview({
  spell,
  className = "",
  showLabels = false,
}: SpellSealPreviewProps) {
  const sigils = spell.libraryComponents.filter(
    (component) => component.kind === "sigil",
  );
  const signs = spell.libraryComponents.filter(
    (component) => component.kind === "sign",
  );

  return (
    <div
      className={`relative aspect-square overflow-hidden rounded-full bg-[#f8efd9] ${className}`}
      aria-label={`${spell.name} library-derived seal`}
    >
      <div
        className="absolute inset-[6%] rounded-full border-[3px] border-current opacity-75"
        style={{ color: spell.accent }}
      />
      <div className="absolute inset-[16%] rounded-full border border-[#2b2117]/45" />
      <div
        className="absolute inset-[28%] rounded-full border-2 border-current opacity-45"
        style={{ color: spell.accent }}
      />

      {sigils.map((component, index) => (
        <div
          key={component.id}
          className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#fff9ea]/80 p-[9%]"
          style={{
            width: `${48 - index * 8}%`,
            height: `${48 - index * 8}%`,
          }}
        >
          <Image
            src={component.assetPath}
            alt=""
            width={150}
            height={150}
            className="h-full w-full object-contain opacity-90"
          />
        </div>
      ))}

      {signs.map((component, index) => {
        const angle =
          -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(1, signs.length);
        const left = 50 + Math.cos(angle) * 35;
        const top = 50 + Math.sin(angle) * 35;

        return (
          <div
            key={component.id}
            className="absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-[#2b2117]/20 bg-[#fff9ea] p-[2.5%] shadow-sm"
            style={{ left: `${left}%`, top: `${top}%`, width: "21%" }}
          >
            <Image
              src={component.assetPath}
              alt=""
              width={70}
              height={70}
              className="aspect-square h-full w-full object-contain"
            />
          </div>
        );
      })}

      <div className="absolute inset-x-[13%] top-1/2 h-px bg-[#2b2117]/18" />
      <div className="absolute inset-y-[13%] left-1/2 w-px bg-[#2b2117]/18" />

      {showLabels ? (
        <div className="absolute inset-x-[18%] bottom-[9%] truncate rounded-full bg-[#2b2117]/80 px-2 py-1 text-center text-[9px] font-bold uppercase tracking-[0.08em] text-[#fff7dc]">
          {spell.libraryComponents
            .map((component) => component.name)
            .join(" + ")}
        </div>
      ) : null}
    </div>
  );
}
