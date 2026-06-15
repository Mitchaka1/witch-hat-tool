"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Droplet,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import GrimoirePreview from "@/components/GrimoirePreview";
import SpellList from "@/components/SpellList";
import SpellTraceCanvas from "@/components/SpellTraceCanvas";
import { demoSpellById, demoSpells } from "@/data/demoSpells";
import {
  qualityLabel,
  type CircleQualityResult,
} from "@/lib/circleQuality";
import {
  canAffordSpell,
  createPreparedSpell,
  loadGrimoire,
  saveGrimoire,
  spentPreparationInk,
  type PreparedSpell,
} from "@/lib/grimoireStorage";

const INK_BUDGET = 100;

export default function SpellPreparationScreen() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>(demoSpells[0].id);
  const [prepared, setPrepared] = useState<PreparedSpell[]>([]);
  const [quality, setQuality] = useState<CircleQualityResult | null>(null);
  const [traceKey, setTraceKey] = useState(0);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setPrepared(loadGrimoire());
      setRestored(true);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  const selectedSpell = demoSpellById.get(selectedId) ?? demoSpells[0];
  const spentInk = spentPreparationInk(prepared);
  const remainingInk = INK_BUDGET - spentInk;
  const canBind =
    quality?.acceptable === true &&
    canAffordSpell(spentInk, INK_BUDGET, selectedSpell);
  const qualityPercent = quality ? Math.round(quality.score * 100) : 0;
  const qualityMessage = useMemo(() => {
    if (!quality) return "Trace the outer ring in one continuous motion.";
    if (!quality.acceptable) {
      return quality.coverage < 0.72
        ? "Complete more of the ring before closing it."
        : "Bring the endpoints together and keep the radius steadier.";
    }
    return `${qualityLabel(quality.score)} preparation. This page will cast at ${
      65 + Math.round(quality.score * 65)
    }% power.`;
  }, [quality]);

  const bindSpell = () => {
    if (!quality || !canBind) return;

    setPrepared((current) => [
      ...current,
      createPreparedSpell(selectedSpell, quality.score),
    ]);
    setQuality(null);
    setTraceKey((current) => current + 1);
  };

  const removePrepared = (preparedId: string) => {
    setPrepared((current) =>
      current.filter((spell) => spell.preparedId !== preparedId),
    );
  };

  const startBattle = () => {
    if (prepared.length === 0) return;
    saveGrimoire(prepared);
    router.push("/arena");
  };

  return (
    <main className="game-page min-h-screen text-ink">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#17152b]/95 px-4 py-3 text-white shadow-xl">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              aria-label="Back to signs and sigils"
              className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 bg-white/5 text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#d9bd70]">
                Ink Grimoire Arena
              </p>
              <h1 className="font-[family-name:var(--font-cinzel)] text-xl font-semibold sm:text-2xl">
                Prepare your spellbook
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2">
            <Droplet className="h-5 w-5 text-[#d9bd70]" aria-hidden="true" />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/55">
                Preparation ink
              </p>
              <p className="font-mono text-lg font-bold">
                {remainingInk}
                <span className="text-sm font-normal text-white/45">
                  {" "}
                  / {INK_BUDGET}
                </span>
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[330px_minmax(430px,1fr)_390px]">
          <section className="rounded-2xl border border-[var(--color-line)] bg-[rgba(250,245,232,0.94)] p-4 shadow-xl">
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-gold)]">
                Known designs
              </p>
              <h2 className="mt-1 font-[family-name:var(--font-cinzel)] text-xl font-semibold">
                Choose a spell
              </h2>
            </div>
            <SpellList
              spells={demoSpells}
              selectedId={selectedSpell.id}
              spentInk={spentInk}
              inkBudget={INK_BUDGET}
              onSelect={(spellId) => {
                setSelectedId(spellId);
                setQuality(null);
                setTraceKey((current) => current + 1);
              }}
            />
          </section>

          <section className="rounded-2xl border border-[var(--color-line)] bg-[rgba(250,245,232,0.96)] p-4 shadow-xl sm:p-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p
                  className="text-xs font-bold uppercase tracking-[0.18em]"
                  style={{ color: selectedSpell.accent }}
                >
                  {selectedSpell.element} · complexity {selectedSpell.complexity}
                </p>
                <h2 className="mt-1 font-[family-name:var(--font-cinzel)] text-2xl font-semibold">
                  {selectedSpell.name}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
                  {selectedSpell.effectDescription}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--color-line)] bg-white/60 px-3 py-2 text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-ink-faint">
                  Page cost
                </p>
                <p className="font-mono text-xl font-bold">
                  {selectedSpell.preparationInkCost} ink
                </p>
              </div>
            </div>

            <SpellTraceCanvas
              key={`${selectedSpell.id}-${traceKey}`}
              spell={selectedSpell}
              onQualityChange={setQuality}
            />

            <div
              className={`mx-auto mt-4 max-w-[520px] rounded-xl border p-4 ${
                quality?.acceptable
                  ? "border-emerald-300 bg-emerald-50"
                  : quality
                    ? "border-amber-300 bg-amber-50"
                    : "border-[var(--color-line)] bg-white/50"
              }`}
              aria-live="polite"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  {quality?.acceptable ? (
                    <ShieldCheck
                      className="h-5 w-5 text-emerald-700"
                      aria-hidden="true"
                    />
                  ) : (
                    <Sparkles
                      className="h-5 w-5 text-[var(--color-gold)]"
                      aria-hidden="true"
                    />
                  )}
                  <p className="font-semibold">
                    {quality ? qualityLabel(quality.score) : "Awaiting trace"}
                  </p>
                </div>
                <span className="font-mono text-lg font-bold">
                  {quality ? `${qualityPercent}%` : "--"}
                </span>
              </div>
              <p className="mt-2 text-sm leading-5 text-ink-soft">
                {qualityMessage}
              </p>
              <button
                type="button"
                onClick={bindSpell}
                disabled={!canBind}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-arcane)] px-4 py-3 font-semibold text-white shadow-lg transition hover:bg-[#3b336d] disabled:cursor-not-allowed disabled:opacity-35"
              >
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                Bind to grimoire
              </button>
            </div>
          </section>

          <aside className="rounded-2xl border border-[var(--color-line)] bg-[rgba(250,245,232,0.94)] p-4 shadow-xl xl:sticky xl:top-5 xl:self-start">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-gold)]">
                  Battle loadout
                </p>
                <h2 className="mt-1 font-[family-name:var(--font-cinzel)] text-xl font-semibold">
                  Prepared pages
                </h2>
              </div>
              <p className="font-mono text-sm font-bold text-ink-soft">
                {prepared.length} pages
              </p>
            </div>

            <div className="mt-4 max-h-[58vh] overflow-y-auto pr-1">
              <GrimoirePreview
                prepared={prepared}
                onRemove={removePrepared}
              />
            </div>

            <div className="mt-4 rounded-xl border border-[var(--color-line)] bg-white/45 p-3 text-xs leading-5 text-ink-soft">
              No cooldowns in battle. Page charges are your only casting limit,
              so mix reliable low-cost spells with one decisive page.
            </div>

            <button
              type="button"
              disabled={!restored || prepared.length === 0}
              onClick={startBattle}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#b64f2c] px-5 py-3.5 font-[family-name:var(--font-cinzel)] font-semibold text-white shadow-lg transition hover:bg-[#963d22] disabled:cursor-not-allowed disabled:opacity-35"
            >
              <Play className="h-4 w-4 fill-current" aria-hidden="true" />
              Enter the arena
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
}
