"use client";

import { useState } from "react";
import { CircleHelp, Lock } from "lucide-react";

import { cn } from "@/lib/utils";

import { FOKUS } from "./stile";

type Schritt = { id: string; text: string; hinweis?: string };
type Status = "abhakbar" | "zuruecknehmbar" | "erledigt" | "gesperrt";

/**
 * Durchführen: die geplanten Schritte in Reihenfolge zum Abhaken. Welcher
 * Schritt abhakbar ist, kommt als `status` über Props (Regel in
 * src/lib/praxisflow-logik.ts, schrittStatus).
 *
 * "Ich komme nicht weiter" ist für das Demo ausgeblendet (Klickprüfung
 * 09.10.2026), bleibt aber hier erhalten und soll später wiederverwendet
 * werden: nichtWeiterAnzeigen und hinweisStandard setzen.
 */
export function SchritteCheckliste({
  schritte,
  erledigt,
  status,
  gesperrtHinweis,
  onUmschalten,
  nichtWeiterAnzeigen = false,
  hinweisStandard = "",
}: {
  schritte: Schritt[];
  erledigt: string[];
  status: Record<string, Status>;
  gesperrtHinweis: (nrVorgaenger: number) => string;
  onUmschalten: (id: string) => void;
  nichtWeiterAnzeigen?: boolean;
  hinweisStandard?: string;
}) {
  const [offen, setOffen] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {erledigt.length} von {schritte.length} Schritten erledigt
      </p>
      <ol className="flex flex-col gap-2">
        {schritte.map((s, i) => {
          const fertig = erledigt.includes(s.id);
          const st = status[s.id] ?? "gesperrt";
          const bedienbar = st === "abhakbar" || st === "zuruecknehmbar";
          const hinweisId = `schritt-${s.id}-gesperrt`;
          return (
            <li
              key={s.id}
              className={cn(
                "flex flex-col gap-2 rounded-lg border p-2",
                fertig ? "border-eco-deep-green bg-eco-green/10" : "border-border",
                st === "gesperrt" && "bg-muted/40"
              )}
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                <label
                  className={cn(
                    "flex min-h-11 flex-1 items-center gap-3 px-1 text-[15px]",
                    bedienbar ? "cursor-pointer text-eco-deep-green" : "cursor-not-allowed",
                    st === "gesperrt" ? "text-muted-foreground" : "text-eco-deep-green"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={fertig}
                    disabled={!bedienbar}
                    onChange={() => onUmschalten(s.id)}
                    aria-describedby={st === "gesperrt" && i > 0 ? hinweisId : undefined}
                    className="size-5 shrink-0 accent-eco-deep-green disabled:cursor-not-allowed"
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className={cn("break-words", fertig && "line-through decoration-eco-deep-green/50")}>
                      {i + 1}. {s.text}
                    </span>
                    {st === "gesperrt" && i > 0 && (
                      <span id={hinweisId} className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Lock className="size-3" aria-hidden="true" />
                        {gesperrtHinweis(i)}
                      </span>
                    )}
                  </span>
                </label>
                {nichtWeiterAnzeigen && (
                <button
                  type="button"
                  onClick={() => setOffen(offen === s.id ? null : s.id)}
                  aria-expanded={offen === s.id}
                  className={cn(
                    "inline-flex min-h-11 shrink-0 items-center gap-1.5 self-start rounded-lg px-2 text-sm text-muted-foreground hover:bg-eco-green/10 hover:text-eco-deep-green sm:self-auto",
                    FOKUS
                  )}
                >
                  <CircleHelp className="size-4" aria-hidden="true" />
                  Ich komme nicht weiter
                </button>
                )}
              </div>
              {nichtWeiterAnzeigen && offen === s.id && (
                <p className="rounded-lg bg-lylac/30 p-3 text-sm text-eco-deep-green">{s.hinweis ?? hinweisStandard}</p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
