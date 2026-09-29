import { BookOpen, ChevronDown, Wrench } from "lucide-react";

import { CurriculumCard } from "@/components/curriculum-card";
import { PageHeader } from "@/components/page-header";
import { SegmentProgress } from "@/components/segment-progress";
import { StepStatusBadge } from "@/components/status-badge";
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
      <PageHeader title="Kompetenzen" />

      <section aria-labelledby="alle-kompetenzen" className="flex flex-col gap-3">
        <h2 id="alle-kompetenzen" className="text-base font-semibold text-eco-deep-green">
          Alle Kompetenzen
        </h2>
        {kompetenzen.length === 0 && (
          <p className="text-sm text-muted-foreground">Noch keine Kompetenzen hinterlegt.</p>
        )}
        {kompetenzen.map((k) => (
          // Collapsible-Karte (Handoff 2a): shadow-sm, Kopf ist der Trigger.
          <details key={k.id} className="group overflow-hidden rounded-xl border border-border shadow-sm">
            <summary className="flex cursor-pointer list-none items-center gap-3 p-4 outline-none transition-[background-color] duration-150 hover:bg-eco-green/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-eco-green motion-reduce:transition-none">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="text-xs text-muted-foreground">{k.kompetenzbereich}</p>
                <h3 className="line-clamp-2 text-[15px] font-semibold text-eco-deep-green">{k.name}</h3>
                {/* SR-68: Segmente je Kompetenzschritt aus competency_fulfilment,
                    Zähltext bleibt sichtbar (K2). */}
                <SegmentProgress
                  className="mt-1"
                  value={k.teilschritteErfuellt}
                  max={k.teilschritteGesamt}
                  label={`${k.teilschritteErfuellt} von ${k.teilschritteGesamt} Kompetenzschritten abgeschlossen`}
                />
                {k.teilschritteGesamt > 0 && (
                  <p className="text-[13px] text-muted-foreground tabular-nums" aria-hidden="true">
                    {k.teilschritteErfuellt}/{k.teilschritteGesamt} Kompetenzschritte
                  </p>
                )}
              </div>
              <ChevronDown
                className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </summary>

            {/* Aufgeklappt: Info-Zeilen, nicht klickbar (kein Hover, kein Pfeil). */}
            {k.steps.map((step) => {
              const Icon = step.typ === "praktisch" ? Wrench : BookOpen;
              const typLabel = step.typ === "praktisch" ? "Praxis" : "Theorie";
              return (
                <div
                  key={step.id}
                  className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 border-t border-border px-4 py-2.5"
                >
                  <Icon className="size-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0 grow basis-40">
                    <p className="text-sm font-medium text-eco-deep-green">
                      {step.name} · {typLabel}
                    </p>
                    {/* SR-69: Zusatzinfo nur bei offen / in Prüfung. */}
                    {step.fortschritt && (step.status === "offen" || step.status === "in Prüfung") && (
                      <p className="text-[13px] text-muted-foreground tabular-nums">
                        {step.fortschritt.abgeschlossen}/{step.fortschritt.gesamt} {step.fortschritt.einheit}
                      </p>
                    )}
                  </div>
                  <StepStatusBadge status={step.status} />
                </div>
              );
            })}
            {k.steps.length === 0 && (
              <p className="border-t border-border p-4 text-sm text-muted-foreground">
                Keine Kompetenzschritte hinterlegt.
              </p>
            )}
          </details>
        ))}
      </section>

      {/* Sekundärer Kontext nach der Kompetenzliste (Entscheidung 2026-09-29). */}
      <CurriculumCard fortschritt={curriculum} kompakt />
    </div>
  );
}
