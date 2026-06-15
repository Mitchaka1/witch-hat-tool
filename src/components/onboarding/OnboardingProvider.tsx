"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { BookOpen } from "lucide-react";
import { usePathname } from "next/navigation";
import OnboardingOverlay from "./OnboardingOverlay";

const STORAGE_KEY = "wha:onboarding:v1";
const FIRST_RUN_DELAY = 550;

type OnboardingContextValue = {
  isOpen: boolean;
  startGuide: () => void;
  closeGuide: (options?: { completed?: boolean }) => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);

  if (!context) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }

  return context;
}

function readCompleted(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "done";
  } catch {
    return false;
  }
}

function writeCompleted(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, "done");
  } catch {
    // Storage may be unavailable (private mode); the guide simply re-shows next time.
  }
}

export default function OnboardingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const showGuide = pathname === "/" || pathname === "/draw";

  // First-run detection runs after mount so server and client markup match.
  // The only state update happens inside the timer callback, never synchronously.
  useEffect(() => {
    if (!showGuide || readCompleted()) {
      return;
    }

    const timer = window.setTimeout(() => setIsOpen(true), FIRST_RUN_DELAY);
    return () => window.clearTimeout(timer);
  }, [showGuide]);

  const startGuide = useCallback(() => setIsOpen(true), []);

  const closeGuide = useCallback((options?: { completed?: boolean }) => {
    setIsOpen(false);

    if (options?.completed) {
      writeCompleted();
    }
  }, []);

  const value = useMemo<OnboardingContextValue>(
    () => ({ isOpen, startGuide, closeGuide }),
    [isOpen, startGuide, closeGuide],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}

      {showGuide ? (
        <button
          type="button"
          onClick={startGuide}
          className="group fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-[var(--color-gold)]/60 bg-[var(--color-surface)]/95 py-2.5 pl-3 pr-3 text-ink shadow-lg backdrop-blur transition hover:border-[var(--color-gold)] hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-arcane-bright)] sm:pr-4"
          aria-label="Open the atelier guide"
          title="How it works"
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--color-arcane)]/12 text-[var(--color-arcane)] transition group-hover:bg-[var(--color-arcane)]/20">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="hidden text-sm font-semibold sm:inline">How it works</span>
        </button>
      ) : null}

      {showGuide && isOpen ? <OnboardingOverlay onClose={closeGuide} /> : null}
    </OnboardingContext.Provider>
  );
}
