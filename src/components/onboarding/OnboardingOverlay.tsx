"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react";
import { ONBOARDING_STEPS } from "./steps";

type OnboardingOverlayProps = {
  onClose: (options?: { completed?: boolean }) => void;
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';

export default function OnboardingOverlay({ onClose }: OnboardingOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const step = ONBOARDING_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === ONBOARDING_STEPS.length - 1;

  const finish = useCallback(() => onClose({ completed: true }), [onClose]);
  const goNext = useCallback(() => {
    setStepIndex((index) => {
      if (index >= ONBOARDING_STEPS.length - 1) {
        finish();
        return index;
      }
      return index + 1;
    });
  }, [finish]);
  const goBack = useCallback(() => setStepIndex((index) => Math.max(0, index - 1)), []);

  // Lock background scroll, capture focus and restore it on close.
  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, []);

  // Keyboard: Esc skips, arrows navigate, Tab is trapped inside the dialog.
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        finish();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goBack();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((node) => node.offsetParent !== null);

      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [finish, goNext, goBack],
  );

  return (
    <div
      className="animate-backdrop-in fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          finish();
        }
      }}
    >
      {/* Arcane night backdrop. Position is set inline so it wins over
          .paper-grain's `position: relative` and fills the overlay. */}
      <div
        className="paper-grain"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(120% 90% at 50% 0%, #2a2552 0%, #161329 45%, #0c0a18 100%)",
        }}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-body"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="animate-float-up relative grid w-full max-w-4xl overflow-hidden rounded-3xl border border-[var(--color-gold)]/40 bg-[var(--color-parchment-bright)] shadow-2xl outline-none md:grid-cols-2"
      >
        {/* Art column */}
        <div className="paper-grain relative hidden items-center justify-center overflow-hidden bg-[var(--color-surface-sunken)] p-8 md:flex">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(80% 70% at 50% 38%, rgba(123,111,207,0.18) 0%, rgba(241,233,214,0) 62%)",
            }}
            aria-hidden="true"
          />
          <div key={step.id} className="animate-slide-fade relative flex items-center justify-center">
            {step.art}
          </div>
        </div>

        {/* Content column */}
        <div className="flex flex-col p-6 sm:p-8">
          <div className="mb-5 flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-gold)]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {step.eyebrow}
            </span>
            <button
              type="button"
              onClick={finish}
              className="grid h-8 w-8 place-items-center rounded-full text-ink-faint transition hover:bg-[var(--color-surface-sunken)] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-arcane-bright)]"
              aria-label="Skip the guide"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Art shows on small screens too, above the title (auto height so
              taller art never overlaps the heading). */}
          <div className="mb-5 flex items-center justify-center md:hidden" aria-hidden="true">
            <div key={`${step.id}-mobile`} className="animate-slide-fade flex items-center justify-center">
              {step.art}
            </div>
          </div>

          <div key={step.id} className="animate-slide-fade flex flex-1 flex-col">
            <h2
              id="onboarding-title"
              className="font-[family-name:var(--font-cinzel)] text-2xl font-semibold leading-tight text-ink sm:text-[1.7rem]"
            >
              {step.title}
            </h2>
            <div className="my-3 h-px w-16 rule-filigree" aria-hidden="true" />
            <p id="onboarding-body" className="text-[15px] leading-7 text-ink-soft">
              {step.body}
            </p>

            <ul className="mt-5 space-y-2.5">
              {step.points.map((point, index) => (
                <li key={index} className="flex items-center gap-3 text-sm font-medium text-ink">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--color-arcane)]/10 text-[var(--color-arcane)]">
                    {point.icon}
                  </span>
                  {point.text}
                </li>
              ))}
            </ul>
          </div>

          {/* Controls */}
          <div className="mt-7 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2" role="tablist" aria-label="Guide progress">
              {ONBOARDING_STEPS.map((dotStep, index) => (
                <button
                  key={dotStep.id}
                  type="button"
                  role="tab"
                  aria-selected={index === stepIndex}
                  aria-label={`Step ${index + 1}: ${dotStep.title}`}
                  onClick={() => setStepIndex(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === stepIndex
                      ? "w-6 bg-[var(--color-gold)]"
                      : "w-2 bg-[var(--color-line-strong)] hover:bg-[var(--color-gold-soft)]"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {!isFirst ? (
                <button
                  type="button"
                  onClick={goBack}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-4 text-sm font-semibold text-ink transition hover:border-[var(--color-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-arcane-bright)]"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Back
                </button>
              ) : null}

              <button
                type="button"
                onClick={goNext}
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[var(--color-arcane)] px-5 text-sm font-semibold text-[var(--color-parchment-bright)] shadow-sm transition hover:bg-[var(--color-arcane-bright)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-arcane-glow)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-parchment-bright)]"
              >
                {isLast ? "Begin" : "Next"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
