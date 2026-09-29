import { Target } from "lucide-react";

import { LinkRow } from "@/components/link-row";
import { SegmentProgress } from "@/components/segment-progress";
import type { CurriculumFortschritt } from "@/lib/queries/competencies";

/**
 * Container "Curriculum-Fortschritt" (Handoff 2a): identisch auf Home (mit
 * Link-Zeile) und Kompetenzen (ohne). Prozent groß, ein Segment je Lektion,
 * Zähltext bleibt sichtbar (Entscheidung K2, 2026-09-29).
 */
export function CurriculumCard({
  fortschritt,
  link,
}: {
  fortschritt: CurriculumFortschritt;
  link?: { href: string; label: string };
}) {
  const { abgeschlosseneLektionen: done, gesamtLektionen: gesamt, prozent } = fortschritt;

  return (
    <section
      aria-labelledby="curriculum-fortschritt"
      className="flex flex-col overflow-hidden rounded-xl border border-border"
    >
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <Target className="size-[18px] shrink-0 text-eco-deep-green" aria-hidden="true" />
          <h2 id="curriculum-fortschritt" className="text-[15px] font-semibold text-eco-deep-green">
            Curriculum-Fortschritt
          </h2>
        </div>
        <p className="text-eco-deep-green">
          <span className="text-[40px] font-bold tracking-tight">{prozent}</span>
          <span className="text-xl text-muted-foreground"> %</span>
        </p>
        <SegmentProgress
          size="curriculum"
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
