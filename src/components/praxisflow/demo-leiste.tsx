"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";

import { FOKUS } from "./stile";

const LINK = cn("rounded-sm text-[13px] font-semibold text-ink-muted hover:text-ink", FOKUS);

/**
 * Nur noch "Demo zurücksetzen" (mit Rückfrage) als kleiner Link unter dem
 * Flow -- ohne Kasten und Demo-Hinweistext (Entscheidung Anna 2026-10-12).
 */
export function DemoLeiste({ onZuruecksetzen }: { onZuruecksetzen: () => void }) {
  const [fragen, setFragen] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
      {fragen ? (
        <span className="flex items-center gap-3" role="group" aria-label="Demo zurücksetzen bestätigen">
          <button
            type="button"
            onClick={() => {
              setFragen(false);
              onZuruecksetzen();
            }}
            className={cn(LINK, "text-praxis-text hover:text-praxis-text")}
          >
            Ja, alles zurücksetzen
          </button>
          <button type="button" onClick={() => setFragen(false)} className={LINK}>
            Abbrechen
          </button>
        </span>
      ) : (
        <button type="button" onClick={() => setFragen(true)} className={cn(LINK, "inline-flex items-center gap-1.5")}>
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Demo zurücksetzen
        </button>
      )}
    </div>
  );
}
