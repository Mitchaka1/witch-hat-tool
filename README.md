# Witch Hat Atelier — Sign & Sigil Workshop

A study bench and drawing workshop for the magic of **Witch Hat Atelier**, where
spells are *drawn, not spoken*. Browse the series' canon symbols, learn how they
fit together, then ink and identify your own magic seals.

## Features

- **The Library** — browse **35 signs** and **25 sigils** scraped from the wiki,
  with live search (name, effect, or the spells they appear in) and category
  filters. Each entry shows its effect, lore, confidence and the spells that use it.
- **The Workshop** (`/draw`) — a canvas for inking magic circles freehand and
  placing signs/sigils inside them. Rotate, resize and nest components like a witch
  laying out a seal, with circle detection, copy/paste and geometry analysis.
- **Reading the hand** — sketch a rough glyph and the workshop matches it against
  the library (rotation-aware) to name it, or import a photo of a spell and trace
  its components.
- **Onboarding tour** — a themed, first-run guided tour explains the whole atelier.
  It auto-opens once, persists completion in `localStorage`, and can be reopened
  any time from the floating *spellbook* button or the header **Guide** link.
  Fully keyboard-navigable (←/→/Esc), focus-trapped, and respects
  `prefers-reduced-motion`.

## Tech

- Next.js 16 (App Router, React 19, React Compiler) + TypeScript
- Tailwind CSS v4 with a parchment/ink/gold + arcane design-token system
  (`src/app/globals.css`)
- Display type: Cinzel (`next/font`); UI type: Geist

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build    # production build (also type-checks)
npm run lint     # eslint
```

## Project structure

```
src/
├── app/
│   ├── layout.tsx          # fonts, metadata, OnboardingProvider
│   ├── page.tsx            # Library (SymbolBrowser)
│   ├── draw/page.tsx       # Workshop (DrawingIdentifier)
│   └── globals.css         # design tokens, atmosphere, animations
├── components/
│   ├── SymbolBrowser.tsx   # the Library
│   ├── DrawingIdentifier.tsx # the Workshop canvas
│   └── onboarding/         # the guided tour system
│       ├── OnboardingProvider.tsx  # state, persistence, launcher
│       ├── OnboardingOverlay.tsx   # the tour dialog
│       ├── steps.tsx               # tour copy + art per step
│       ├── OnboardingArt.tsx       # illustrative scenes
│       └── MagicCircle.tsx         # the arcane seal / brand mark
└── data/                   # signs.json, sigils.json
public/vectors/             # sign & sigil SVGs
```
