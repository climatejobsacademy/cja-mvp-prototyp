import { ChevronDown } from "lucide-react";

import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { StepStatusBadge, StepTypBadge } from "@/components/status-badge";
import { requireCurrentLearner } from "@/lib/queries/session";
import { getCurriculumFortschritt, getKompetenzFortschritt } from "@/lib/queries/competencies";

export default async function KompetenzenPage() {
  const learner = await requireCurrentLearner();
  const [kompetenzen, curriculum] = await Promise.all([
    getKompetenzFortschritt(learner.personId),
    getCurriculumFortschritt(learner.personId, learner.programmeId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-xl text-eco-deep-green">Kompetenzen</h1>
        <p className="text-sm text-muted-foreground">{learner.programmeName}</p>
      </div>

      <section aria-labelledby="curriculum-fortschritt" className="flex flex-col gap-2">
        <h2 id="curriculum-fortschritt" className="text-sm font-medium text-eco-deep-green">
          Curriculum-Fortschritt
        </h2>
        <Progress value={curriculum.prozent}>
          <div className="flex w-full justify-between">
            <ProgressLabel>
              {curriculum.abgeschlosseneLektionen} von {curriculum.gesamtLektionen} Lektionen
            </ProgressLabel>
            <ProgressValue />
          </div>
        </Progress>
      </section>

      <section aria-labelledby="kompetenz-fortschritt" className="flex flex-col gap-3">
        <h2 id="kompetenz-fortschritt" className="text-sm font-medium text-eco-deep-green">
          Kompetenz-Fortschritt
        </h2>
        {kompetenzen.length === 0 && (
          <p className="text-sm text-muted-foreground">Noch keine Kompetenzen hinterlegt.</p>
        )}
        {kompetenzen.map((k) => (
          <details key={k.id} className="group rounded-lg border border-border">
            <summary className="flex cursor-pointer list-none items-center gap-3 p-3">
              <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-eco-deep-green">{k.name}</p>
                <p className="text-xs text-muted-foreground">{k.kompetenzbereich}</p>
              </div>
              <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                {k.fortschrittProzent}%
              </span>
            </summary>
            <div className="flex flex-col gap-2 border-t border-border p-3">
              {k.steps.map((step) => (
                <div key={step.id} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <StepTypBadge typ={step.typ} />
                    <span className="truncate text-sm text-eco-deep-green">{step.name}</span>
                  </div>
                  <StepStatusBadge status={step.status} />
                </div>
              ))}
              {k.steps.length === 0 && (
                <p className="text-sm text-muted-foreground">Keine Teilschritte hinterlegt.</p>
              )}
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}
