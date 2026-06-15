"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BookOpen, Compass, PenTool, Search, Sparkles, X } from "lucide-react";
import signsData from "@/data/signs.json";
import sigilsData from "@/data/sigils.json";
import MagicCircle from "@/components/onboarding/MagicCircle";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";

type SymbolType = "sign" | "sigil";

type RawSign = {
  id: string;
  name: string;
  kind?: string;
  category?: string;
  description?: string;
  spellsUsing?: string[];
  confidence?: string;
  needsReview?: boolean;
  vector?: {
    suggestedFileName?: string;
  };
};

type RawSigil = {
  id: string;
  name: string;
  componentType?: string;
  category?: string;
  description?: string;
  spellsUsing?: string[];
  confidence?: string;
  needsReview?: boolean;
  svg?: string | null;
};

type SymbolItem = {
  id: string;
  name: string;
  type: SymbolType;
  category: string;
  description: string;
  spellsUsing: string[];
  confidence: string;
  needsReview: boolean;
  assetPath: string | null;
};

const signs = (signsData.signs as RawSign[]).map<SymbolItem>((sign) => ({
  id: sign.id,
  name: sign.name,
  type: "sign",
  category: sign.category ?? "unknown",
  description: cleanText(sign.description),
  spellsUsing: cleanList(sign.spellsUsing),
  confidence: sign.confidence ?? "unknown",
  needsReview: Boolean(sign.needsReview),
  assetPath: signAssetPath(sign),
}));

const sigils = (sigilsData as RawSigil[]).map<SymbolItem>((sigil) => ({
  id: sigil.id,
  name: sigil.name,
  type: "sigil",
  category: sigil.category ?? "unknown",
  description: cleanText(sigil.description),
  spellsUsing: cleanList(sigil.spellsUsing),
  confidence: sigil.confidence ?? "unknown",
  needsReview: Boolean(sigil.needsReview),
  assetPath: sigilAssetPath(sigil),
}));

const collections: Record<SymbolType, SymbolItem[]> = {
  sign: signs,
  sigil: sigils,
};

function cleanText(value?: string) {
  return (value ?? "No description available.").replace(/\s+/g, " ").trim();
}

function cleanList(value?: string[]) {
  return (value ?? [])
    .map((item) => cleanText(item))
    .filter((item) => item && !["[", "]", "edit"].includes(item.toLowerCase()));
}

function signAssetPath(sign: RawSign) {
  const fileName =
    sign.vector?.suggestedFileName === "Region.svg"
      ? "Region_Sign_Demo.svg"
      : sign.vector?.suggestedFileName;

  return fileName ? `/vectors/signs/${fileName}` : null;
}

function sigilAssetPath(sigil: RawSigil) {
  const fileName = sigil.svg?.split("/").pop();
  return fileName ? `/vectors/sigils/${fileName}` : null;
}

function categoryLabel(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function includesQuery(item: SymbolItem, query: string) {
  const haystack = [
    item.name,
    item.category,
    item.description,
    item.spellsUsing.join(" "),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

function SymbolImage({
  item,
  size,
  className = "",
}: {
  item: SymbolItem;
  size: "card" | "detail";
  className?: string;
}) {
  const dimensions = size === "detail" ? "h-56 w-56" : "h-24 w-24";

  if (!item.assetPath) {
    return (
      <div
        className={`${dimensions} ${className} grid place-items-center rounded-md border border-dashed border-[var(--color-line)] bg-[var(--color-surface-sunken)] text-center text-xs font-medium uppercase tracking-wide text-ink-faint`}
      >
        No vector
      </div>
    );
  }

  return (
    <Image
      src={item.assetPath}
      alt={`${item.name} ${item.type}`}
      width={size === "detail" ? 224 : 96}
      height={size === "detail" ? 224 : 96}
      className={`${dimensions} ${className} object-contain`}
    />
  );
}

export default function SymbolBrowser() {
  const { startGuide } = useOnboarding();
  const [activeType, setActiveType] = useState<SymbolType>("sign");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(
    collections.sign[0]?.id ?? null,
  );

  const activeItems = collections[activeType];
  const categories = useMemo(
    () => ["all", ...Array.from(new Set(activeItems.map((item) => item.category))).sort()],
    [activeItems],
  );

  const visibleItems = useMemo(
    () =>
      activeItems.filter((item) => {
        const matchesCategory = category === "all" || item.category === category;
        const matchesQuery = query.trim() === "" || includesQuery(item, query.trim());

        return matchesCategory && matchesQuery;
      }),
    [activeItems, category, query],
  );

  const selectedItem =
    visibleItems.find((item) => item.id === selectedId) ?? visibleItems[0] ?? null;

  return (
    <div className="page-atmosphere min-h-screen text-ink">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 border-b border-[var(--color-line)] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-4">
            <MagicCircle className="h-14 w-14 shrink-0 text-[var(--color-arcane)]" />
            <div className="space-y-1.5">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-gold)]">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Witch Hat Atelier
              </p>
              <h1 className="font-[family-name:var(--font-cinzel)] text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                Signs &amp; Sigils
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={startGuide}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-4 text-sm font-semibold text-ink shadow-sm transition hover:border-[var(--color-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-arcane-bright)]"
            >
              <Compass className="h-4 w-4" aria-hidden="true" />
              Guide
            </button>
            <Link
              href="/draw"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-4 text-sm font-semibold text-ink shadow-sm transition hover:border-[var(--color-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-arcane-bright)]"
            >
              <PenTool className="h-4 w-4" aria-hidden="true" />
              Workshop
            </Link>
            <div className="grid grid-cols-2 rounded-lg border border-[var(--color-line-strong)] bg-[var(--color-surface-sunken)] p-1">
              {(["sign", "sigil"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setActiveType(type);
                    setCategory("all");
                    setQuery("");
                    setSelectedId(collections[type][0]?.id ?? null);
                  }}
                  className={`rounded-md px-5 py-2 text-sm font-semibold capitalize transition ${
                    activeType === type
                      ? "bg-[var(--color-arcane)] text-[var(--color-parchment-bright)] shadow-sm"
                      : "text-ink-soft hover:bg-[var(--color-surface)]"
                  }`}
                >
                  {type === "sign" ? `Signs (${signs.length})` : `Sigils (${sigils.length})`}
                </button>
              ))}
            </div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            <div className="grid gap-3 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] p-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_220px]">
              <label className="relative block">
                <span className="sr-only">Search symbols</span>
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
                  aria-hidden="true"
                />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search name, effect, or spell"
                  className="h-11 w-full rounded border border-[var(--color-line)] bg-[var(--color-surface-sunken)] pl-10 pr-10 text-sm outline-none transition placeholder:text-ink-faint focus:border-[var(--color-gold)] focus:bg-[var(--color-surface)]"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded text-ink-faint transition hover:bg-[var(--color-surface-sunken)] hover:text-ink"
                    aria-label="Clear search"
                    title="Clear search"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : null}
              </label>

              <label className="block">
                <span className="sr-only">Filter by category</span>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="h-11 w-full rounded border border-[var(--color-line)] bg-[var(--color-surface-sunken)] px-3 text-sm font-medium text-ink outline-none transition focus:border-[var(--color-gold)] focus:bg-[var(--color-surface)]"
                >
                  {categories.map((itemCategory) => (
                    <option key={itemCategory} value={itemCategory}>
                      {itemCategory === "all" ? "All categories" : categoryLabel(itemCategory)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-soft">
              <p>
                Showing{" "}
                <span className="font-semibold text-ink">{visibleItems.length}</span>{" "}
                of <span className="font-semibold text-ink">{activeItems.length}</span>{" "}
                {activeType === "sign" ? "signs" : "sigils"}
              </p>
              {(query || category !== "all") ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setCategory("all");
                    setSelectedId(activeItems[0]?.id ?? null);
                  }}
                  className="rounded border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1.5 font-semibold text-ink-soft transition hover:border-[var(--color-gold)] hover:text-ink"
                >
                  Clear filters
                </button>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibleItems.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`group flex min-h-48 flex-col items-start gap-3 rounded-md border bg-[var(--color-surface)] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--color-gold)] hover:shadow-md ${
                    selectedItem?.id === item.id
                      ? "border-[var(--color-gold)] ring-2 ring-[var(--color-gold-soft)]"
                      : "border-[var(--color-line)]"
                  }`}
                >
                  <div className="flex w-full items-center justify-center rounded bg-[var(--color-surface-sunken)] p-4">
                    <SymbolImage item={item} size="card" />
                  </div>
                  <div className="w-full space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-lg font-semibold leading-6 text-ink">
                        {item.name}
                      </h2>
                      {item.needsReview ? (
                        <span className="shrink-0 rounded bg-[var(--color-gold-soft)] px-2 py-1 text-[11px] font-bold uppercase text-[var(--color-gold)]">
                          Review
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm font-medium text-ink-soft">
                      {categoryLabel(item.category)}
                    </p>
                    <p className="line-clamp-3 text-sm leading-6 text-ink-soft">
                      {item.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {visibleItems.length === 0 ? (
              <div className="rounded-md border border-dashed border-[var(--color-line)] bg-[var(--color-surface)] p-8 text-center text-sm font-medium text-ink-soft">
                No symbols match this search.
              </div>
            ) : null}
          </div>

          <aside className="lg:sticky lg:top-5 lg:self-start">
            <div className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] p-5 shadow-sm">
              {selectedItem ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-center rounded bg-[var(--color-surface-sunken)] p-5">
                    <SymbolImage item={selectedItem} size="detail" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-[var(--color-arcane)] px-2.5 py-1 text-xs font-semibold uppercase text-[var(--color-parchment-bright)]">
                        {selectedItem.type}
                      </span>
                      <span className="rounded bg-[var(--color-surface-sunken)] px-2.5 py-1 text-xs font-semibold uppercase text-ink-soft">
                        {categoryLabel(selectedItem.category)}
                      </span>
                    </div>
                    <h2 className="font-[family-name:var(--font-cinzel)] text-2xl font-semibold tracking-tight text-ink">
                      {selectedItem.name}
                    </h2>
                    <p className="text-sm leading-6 text-ink-soft">
                      {selectedItem.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded bg-[var(--color-surface-sunken)] p-3">
                      <p className="font-semibold text-ink">Confidence</p>
                      <p className="mt-1 text-ink-soft">
                        {categoryLabel(selectedItem.confidence)}
                      </p>
                    </div>
                    <div className="rounded bg-[var(--color-surface-sunken)] p-3">
                      <p className="font-semibold text-ink">Status</p>
                      <p className="mt-1 text-ink-soft">
                        {selectedItem.needsReview ? "Needs review" : "Reviewed"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                      <BookOpen className="h-4 w-4" aria-hidden="true" />
                      Spells using it
                    </p>
                    {selectedItem.spellsUsing.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedItem.spellsUsing.slice(0, 18).map((spell) => (
                          <span
                            key={spell}
                            className="rounded border border-[var(--color-line)] bg-[var(--color-surface-sunken)] px-2.5 py-1 text-xs font-medium text-ink-soft"
                          >
                            {spell}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-ink-soft">No spells listed.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-[var(--color-line)] p-8 text-center text-sm font-medium text-ink-soft">
                  Select a symbol to inspect it.
                </div>
              )}
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
