"use client";

import { Clock } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

import { FOKUS } from "./stile";

type Kriterium = { id: string; titel: string };

/**
 * Einschätzung je Kriterium mit fester Punkteskala (Buttons). Wird für die
 * Selbst- und die Fremdeinschätzung verwendet. Keine Summe, kein Durchschnitt.
 */
export function Einschaetzung({
  id,
  titel,
  text,
  kriterien,
  skala,
  werte,
  onWert,
  gesperrt = false,
}: {
  id: string;
  titel: string;
  text: string;
  kriterien: Kriterium[];
  skala: readonly number[];
  werte: Record<string, number>;
  onWert: (kriteriumId: string, punkte: number) => void;
  gesperrt?: boolean;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border p-3" aria-labelledby={`${id}-titel`}>
      <div className="flex flex-col gap-1">
        <h3 id={`${id}-titel`} className="text-[15px] font-semibold text-eco-deep-green">
          {titel}
        </h3>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
      {kriterien.map((k) => (
        <fieldset key={k.id} disabled={gesperrt} className="flex flex-col gap-2 disabled:opacity-60">
          <legend className="mb-2 text-[15px] font-medium text-eco-deep-green">{k.titel}</legend>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {skala.map((p) => {
              const gewaehlt = werte[k.id] === p;
              return (
                <button
                  key={p}
                  type="button"
                  aria-pressed={gewaehlt}
                  onClick={() => onWert(k.id, p)}
                  className={cn(
                    "flex min-h-11 flex-col items-center justify-center rounded-lg border text-eco-deep-green disabled:cursor-not-allowed",
                    gewaehlt ? "border-eco-deep-green bg-eco-green/10 font-semibold" : "border-border enabled:hover:bg-eco-green/10",
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
    </section>
  );
}

/** Statusanzeige nach Abschluss der Bewertung; im Demo ohne weitere Funktion. */
export function VerifizierungStatus({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex flex-col gap-2" role="status">
      <StatusBadge label={label} icon={Clock} variant="info" className="w-fit" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
