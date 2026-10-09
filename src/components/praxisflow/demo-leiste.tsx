"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { SEKUNDAER } from "./stile";

/** Kennzeichnung als Demo plus "Demo zurücksetzen" (mit Rückfrage), auf jeder Phase sichtbar. */
export function DemoLeiste({
  kennzeichnung,
  text,
  onZuruecksetzen,
}: {
  kennzeichnung: string;
  text: string;
  onZuruecksetzen: () => void;
}) {
  const [fragen, setFragen] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dashed border-eco-deep-green/40 bg-eco-green/5 p-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <Badge variant="info" className="shrink-0">
          {kennzeichnung}
        </Badge>
        <p className="text-sm text-eco-deep-green">{text}</p>
      </div>
      {fragen ? (
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row" role="group" aria-label="Demo zurücksetzen bestätigen">
          <button
            type="button"
            onClick={() => {
              setFragen(false);
              onZuruecksetzen();
            }}
            className={SEKUNDAER}
          >
            Ja, alles zurücksetzen
          </button>
          <button type="button" onClick={() => setFragen(false)} className={SEKUNDAER}>
            Abbrechen
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setFragen(true)} className={SEKUNDAER}>
          <RotateCcw aria-hidden="true" />
          Demo zurücksetzen
        </button>
      )}
    </div>
  );
}
