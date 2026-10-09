"use client";

import { Clock } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

import { FOKUS, PRIMAER } from "./stile";

type Schritt = { id: string; text: string };

/** Bewerten: feste Punkteskala je kontrollierbarem Schritt, danach nur Statusanzeige. */
export function Bewertung({
  schritte,
  skala,
  noten,
  onNote,
  vollstaendig,
  abgeschlossen,
  onAbschliessen,
  ohneSchritteText,
  statusLabel,
  statusText,
}: {
  schritte: Schritt[];
  skala: readonly number[];
  noten: Record<string, number>;
  onNote: (id: string, punkte: number) => void;
  vollstaendig: boolean;
  abgeschlossen: boolean;
  onAbschliessen: () => void;
  ohneSchritteText: string;
  statusLabel: string;
  statusText: string;
}) {
  if (abgeschlossen) {
    return (
      <div className="flex flex-col gap-3" role="status">
        <StatusBadge label={statusLabel} icon={Clock} variant="info" className="w-fit" />
        <p className="text-sm text-muted-foreground">{statusText}</p>
        {schritte.length > 0 && (
          <ul className="flex flex-col gap-1 text-sm text-eco-deep-green">
            {schritte.map((s) => (
              <li key={s.id} className="flex justify-between gap-3 border-b border-border py-1.5 last:border-b-0">
                <span className="min-w-0 break-words">{s.text}</span>
                <span className="shrink-0 font-semibold">{noten[s.id]} Punkte</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {schritte.length === 0 && <p className="text-sm text-muted-foreground">{ohneSchritteText}</p>}
      {schritte.map((s) => (
        <fieldset key={s.id} className="flex flex-col gap-2">
          <legend className="mb-2 text-[15px] font-medium text-eco-deep-green">{s.text}</legend>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {skala.map((p) => {
              const gewaehlt = noten[s.id] === p;
              return (
                <button
                  key={p}
                  type="button"
                  aria-pressed={gewaehlt}
                  onClick={() => onNote(s.id, p)}
                  className={cn(
                    "flex min-h-11 flex-col items-center justify-center rounded-lg border text-eco-deep-green",
                    gewaehlt ? "border-eco-deep-green bg-eco-green/10 font-semibold" : "border-border hover:bg-eco-green/10",
                    FOKUS
                  )}
                >
                  <span className="text-[15px]">{p}</span>
                  <span className="text-xs text-muted-foreground">Punkte</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
      <button type="button" onClick={onAbschliessen} disabled={!vollstaendig} className={PRIMAER}>
        Bewertung abschließen
      </button>
    </div>
  );
}
