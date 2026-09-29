import { Target } from "lucide-react";

import { LinkRow } from "@/components/link-row";
import { SegmentProgress } from "@/components/segment-progress";
import type { CurriculumFortschritt } from "@/lib/queries/competencies";

/**
 * Container "Curriculum-Fortschritt" (Handoff 2a). Home: Prozent groß plus
 * Link-Zeile. Kompetenzen (`kompakt`, Entscheidung 2026-09-29): nur Kontext
 * unter der Kompetenzliste -- ohne Prozentwert, nur Segmente + Zähltext.
 * Zähltext bleibt in beiden Varianten sichtbar (K2).
 */
export function CurriculumCard({
  fortschritt,
  link,
  kompakt = false,
}: {
  fortschritt: CurriculumFortschritt;
  link?: { href: string; label: string };
  kompakt?: boolean;
}) {
  const { abgeschlosseneLektionen: done, gesamtLektionen: gesamt, prozent } = fortschritt;

  return (
    <section
      aria-labelledby="curriculum-fortschritt"
      className="flex flex-col overflow-hidden rounded-xl border border-border"
    >
      <div className={kompakt ? "flex flex-col gap-2 p-4" : "flex flex-col gap-3 p-4"}>
        <div className="flex items-center gap-2">
          <Target
            className={kompakt ? "size-4 shrink-0 text-muted-foreground" : "size-[18px] shrink-0 text-eco-deep-green"}
            aria-hidden="true"
          />
          <h2
            id="curriculum-fortschritt"
            className={kompakt ? "text-sm font-medium text-muted-foreground" : "text-[15px] font-semibold text-eco-deep-green"}
          >
            Curriculum-Fortschritt
          </h2>
        </div>
        {!kompakt && (
          <p className="text-eco-deep-green">
            <span className="text-[40px] font-bold tracking-tight text-eco-green">{prozent}</span>
            <span className="text-xl text-muted-foreground"> %</span>
          </p>
        )}
        <SegmentProgress
          size={kompakt ? "kompakt" : "curriculum"}
          className={kompakt ? "max-w-none" : undefined}
          value={done}
          max={gesamt}
          label={`${done} von ${gesamt} Lektionen`}
        />
        {gesamt > 0 && (
          <p className="text-[13px] text-muted-foreground" aria-hidden="true">
            {done}/{gesamt} Lektionen
          </p>
        )}
      </div>
      {link && (
        <div className="mt-auto">
          <LinkRow href={link.href}>{link.label}</LinkRow>
        </div>
      )}
    </section>
  );
}
