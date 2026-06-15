import type { ReactNode } from "react";
import { BookOpen, Compass, PenTool, ScanLine, Sparkles, Wand2 } from "lucide-react";
import MagicCircle from "./MagicCircle";
import {
  IdentifyScene,
  SignsVsSigils,
  SymbolCluster,
  WorkshopScene,
} from "./OnboardingArt";

export type OnboardingStep = {
  id: string;
  eyebrow: string;
  title: string;
  body: ReactNode;
  points: { icon: ReactNode; text: string }[];
  art: ReactNode;
};

const iconClass = "h-4 w-4";

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    eyebrow: "Witch Hat Atelier",
    title: "Welcome to the Atelier",
    body: (
      <>
        In this world, magic is <strong className="text-ink">drawn, not spoken</strong>. Every spell
        is a seal — rings, signs and sigils inked in just the right place. This atelier is your bench
        for studying and composing them.
      </>
    ),
    points: [
      { icon: <BookOpen className={iconClass} aria-hidden="true" />, text: "Study 60 canon symbols" },
      { icon: <PenTool className={iconClass} aria-hidden="true" />, text: "Compose your own seals" },
      { icon: <ScanLine className={iconClass} aria-hidden="true" />, text: "Let the atelier read your hand" },
    ],
    art: <MagicCircle className="h-52 w-52 text-[var(--color-arcane)] sm:h-72 sm:w-72" />,
  },
  {
    id: "library",
    eyebrow: "The Library",
    title: "A catalogue of every symbol",
    body: (
      <>
        Browse <strong className="text-ink">35 signs</strong> and{" "}
        <strong className="text-ink">25 sigils</strong> pulled from the series. Search by name, effect
        or the spells they appear in, and filter by element or behaviour to find exactly what a seal
        needs.
      </>
    ),
    points: [
      { icon: <Sparkles className={iconClass} aria-hidden="true" />, text: "Live search & category filters" },
      { icon: <BookOpen className={iconClass} aria-hidden="true" />, text: "Effects, lore & spell references" },
    ],
    art: <SymbolCluster />,
  },
  {
    id: "grammar",
    eyebrow: "The Grammar of Magic",
    title: "Signs shape, sigils anchor",
    body: (
      <>
        Think of a seal as a sentence. <strong className="text-ink">Sigils</strong> are the nouns —
        the element a spell acts on. <strong className="text-ink">Signs</strong> are the modifiers —
        they bend, direct and amplify. Read either one and the atelier explains its role.
      </>
    ),
    points: [
      { icon: <Wand2 className={iconClass} aria-hidden="true" />, text: "Sigil = core magical element" },
      { icon: <Compass className={iconClass} aria-hidden="true" />, text: "Sign = directional instruction" },
    ],
    art: <SignsVsSigils />,
  },
  {
    id: "workshop",
    eyebrow: "The Workshop",
    title: "Draw a seal of your own",
    body: (
      <>
        Open the workshop to ink magic circles freehand, then drop signs and sigils inside them. The
        atelier tracks each ring and component — rotate, resize and nest them just like a witch laying
        out a spell.
      </>
    ),
    points: [
      { icon: <PenTool className={iconClass} aria-hidden="true" />, text: "Pen, eraser & circle detection" },
      { icon: <Compass className={iconClass} aria-hidden="true" />, text: "Rotate, scale & nest components" },
    ],
    art: <WorkshopScene />,
  },
  {
    id: "identify",
    eyebrow: "Reading the Hand",
    title: "Sketch it — the atelier names it",
    body: (
      <>
        Draw a rough glyph and the atelier matches it against the library, accounting for rotation, to
        tell you what you sketched. Have a photo of a spell from the page? Import it and let the
        workshop trace the components for you.
      </>
    ),
    points: [
      { icon: <ScanLine className={iconClass} aria-hidden="true" />, text: "Rotation-aware shape matching" },
      { icon: <Sparkles className={iconClass} aria-hidden="true" />, text: "Import a spell from an image" },
    ],
    art: <IdentifyScene />,
  },
  {
    id: "begin",
    eyebrow: "Your bench is ready",
    title: "Begin your study",
    body: (
      <>
        That is the whole atelier. Wander the library when you want to learn, step into the workshop
        when you want to make. You can reopen this guide any time from the{" "}
        <strong className="text-ink">spellbook</strong> button.
      </>
    ),
    points: [
      { icon: <BookOpen className={iconClass} aria-hidden="true" />, text: "Start in the Library" },
      { icon: <PenTool className={iconClass} aria-hidden="true" />, text: "Or open the Workshop" },
    ],
    art: <MagicCircle className="h-52 w-52 text-[var(--color-gold)] sm:h-72 sm:w-72" />,
  },
];
