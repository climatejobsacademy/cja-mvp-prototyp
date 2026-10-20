"use client";

import { useState } from "react";
import { Clock } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

import { FOKUS } from "./stile";

type Kriterium = {
  id: string;
  titel: string;
  /** Eigene Skala des Kriteriums (z. B. Funktion 10/0); sonst die gemeinsame. */
  skala?: readonly number[];
  /** Eigene Stufentexte; sonst die gemeinsamen. */
  beschreibungen?: Record<number, string>;
  /** K.-o.-Kriterium: wird in der Überschrift gekennzeichnet. */
  ko?: boolean;
};

/**
 * Einschätzung je Kriterium mit fester Punkteskala (Buttons). Wird für die
 * Selbst- und die Fremdeinschätzung verwendet. Keine Summe, kein Durchschnitt.
 * Unter jeder Skala steht die Beschreibung der Stufe unter der Maus, mit
 * Tastatur-Fokus oder (beim Antippen) der gewählten Stufe.
 */
export function Einschaetzung({
  id,
  titel,
  text,
  kriterien,
  skala,
  beschreibungen,
  werte,
  onWert,
  gesperrt = false,
}: {
  id: string;
  titel: string;
  text: string;
  kriterien: Kriterium[];
  skala: readonly number[];
  beschreibungen: Record<number, string>;
  werte: Record<string, number>;
  onWert: (kriteriumId: string, punkte: number) => void;
  gesperrt?: boolean;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-zeile bg-subtle p-4" aria-labelledby={`${id}-titel`}>
      <div className="flex flex-col gap-1">
        <h3 id={`${id}-titel`} className="text-base font-bold text-ink">
          {titel}
        </h3>
        <p className="text-sm text-ink-muted">{text}</p>
      </div>
      {kriterien.map((k) => (
        <KriteriumSkala
          key={k.id}
          id={`${id}-${k.id}`}
          titel={k.titel}
          ko={k.ko}
          skala={k.skala ?? skala}
          beschreibungen={k.beschreibungen ?? beschreibungen}
          wert={werte[k.id]}
          onWert={(p) => onWert(k.id, p)}
          gesperrt={gesperrt}
        />
      ))}
    </section>
  );
}

function KriteriumSkala({
  id,
  titel,
  ko,
  skala,
  beschreibungen,
  wert,
  onWert,
  gesperrt,
}: {
  id: string;
  titel: string;
  ko?: boolean;
  skala: readonly number[];
  beschreibungen: Record<number, string>;
  wert: number | undefined;
  onWert: (punkte: number) => void;
  gesperrt: boolean;
}) {
  // Hover nur mit Maus: bei Touch bliebe er nach dem Antippen hängen.
  const [hover, setHover] = useState<number | null>(null);
  const [fokus, setFokus] = useState<number | null>(null);
  const angezeigt = hover ?? fokus ?? wert ?? null;

  return (
    <fieldset disabled={gesperrt} className="flex flex-col gap-2 disabled:opacity-60">
      <legend className="mb-2 text-[15px] font-medium text-ink">
        {titel}
        {ko && (
          <span className="ml-2 inline-flex rounded-full bg-praxis-tint px-2 py-0.5 align-middle text-xs font-semibold text-praxis-text">
            K.-o.-Kriterium
          </span>
        )}
      </legend>
      <div
        className={cn("grid gap-2", skala.length === 2 ? "grid-cols-2" : "grid-cols-3 sm:grid-cols-6")}
        onPointerLeave={() => setHover(null)}
      >
        {skala.map((p) => {
          const gewaehlt = wert === p;
          return (
            <button
              key={p}
              type="button"
              aria-pressed={gewaehlt}
              aria-describedby={`${id}-${p}-text`}
              onClick={() => onWert(p)}
              onPointerEnter={(e) => e.pointerType === "mouse" && setHover(p)}
              onFocus={() => setFokus(p)}
              onBlur={() => setFokus(null)}
              className={cn(
                "flex min-h-11 flex-col items-center justify-center rounded-xl text-ink disabled:cursor-not-allowed",
                gewaehlt ? "bg-brand font-bold text-white" : "bg-white enabled:hover:bg-brand-tint",
                FOKUS
              )}
            >
              <span className="text-[15px]">{p}</span>
              <span className={cn("text-xs", gewaehlt ? "text-white/85" : "text-ink-subtle")}>Punkte</span>
            </button>
          );
        })}
      </div>
      {/* Beschreibungen für Screenreader (aria-describedby), außerhalb der Buttons */}
      <div className="sr-only">
        {skala.map((p) => (
          <span key={p} id={`${id}-${p}-text`}>
            {beschreibungen[p]}
          </span>
        ))}
      </div>
      <p className="min-h-5 text-sm text-ink-muted" aria-hidden="true">
        {angezeigt !== null && beschreibungen[angezeigt] ? `${angezeigt} Punkte: ${beschreibungen[angezeigt]}` : ""}
      </p>
    </fieldset>
  );
}

/** Statusanzeige nach Abschluss der Bewertung; im Demo ohne weitere Funktion. */
export function VerifizierungStatus({ label }: { label: string }) {
  return (
    <div role="status">
      <StatusBadge label={label} icon={Clock} variant="info" className="w-fit" />
    </div>
  );
}
