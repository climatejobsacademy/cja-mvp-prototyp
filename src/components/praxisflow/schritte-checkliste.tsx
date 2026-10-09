"use client";

import { useState } from "react";
import { CircleHelp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { FOKUS } from "./stile";

type Schritt = { id: string; text: string; kontrollierbar: boolean; hinweis?: string };

/** Durchführen: die geplanten Schritte in Reihenfolge zum Abhaken, je Schritt "Ich komme nicht weiter". */
export function SchritteCheckliste({
  schritte,
  erledigt,
  onUmschalten,
  hinweisStandard,
}: {
  schritte: Schritt[];
  erledigt: string[];
  onUmschalten: (id: string) => void;
  hinweisStandard: string;
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
          return (
            <li key={s.id} className={cn("flex flex-col gap-2 rounded-lg border p-2", fertig ? "border-eco-deep-green bg-eco-green/10" : "border-border")}>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3 px-1 text-[15px] text-eco-deep-green">
                  <input
                    type="checkbox"
                    checked={fertig}
                    onChange={() => onUmschalten(s.id)}
                    className="size-5 shrink-0 accent-eco-deep-green"
                  />
                  <span className={cn("min-w-0 break-words", fertig && "line-through decoration-eco-deep-green/50")}>
                    {i + 1}. {s.text}
                  </span>
                  {s.kontrollierbar && (
                    <Badge variant="outline" className="shrink-0">
                      kontrollierbar
                    </Badge>
                  )}
                </label>
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
              </div>
              {offen === s.id && (
                <p className="rounded-lg bg-lylac/30 p-3 text-sm text-eco-deep-green">{s.hinweis ?? hinweisStandard}</p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
