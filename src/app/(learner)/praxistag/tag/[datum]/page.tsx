import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, FlaskConical, Wrench } from "lucide-react";

import { FOKUS } from "@/components/praxisflow/stile";
import { datumLang } from "@/lib/date";
import { PHASEN } from "@/lib/praxisflow-inhalte";
import { getPraxistag, type PraxistagAuftrag } from "@/lib/queries/praxistag";
import { requireCurrentLearner } from "@/lib/queries/session";
import { cn } from "@/lib/utils";

function stand(a: PraxistagAuftrag): string {
  if (a.labor) return "Labortag";
  if (a.phase === "abgeschlossen") return a.ergebnis === "angerechnet" ? "Geschafft, angerechnet" : "Geschafft";
  const nr = PHASEN.findIndex((x) => x.id === a.phase);
  return nr >= 0 ? `${PHASEN[nr].name} · Phase ${nr + 1} von ${PHASEN.length}` : "Noch nicht begonnen";
}

function aktion(a: PraxistagAuftrag): string {
  if (a.labor) return "Unterlagen öffnen";
  if (a.phase === "abgeschlossen") return "Ansehen";
  return a.phase === "informieren" ? "Starten" : "Fortsetzen";
}

// Tagesübersicht eines Praxistags (SR-13): alle Praxisaufträge des Tages in
// fester Reihenfolge (SR-64) mit ihrer Phase. Der nächste offene ist
// hervorgehoben; nach dem Abschluss führt der Flow selbst zum nächsten.
export default async function PraxistagPage({ params }: { params: Promise<{ datum: string }> }) {
  const { datum } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) notFound();
  const learner = await requireCurrentLearner();
  const auftraege = await getPraxistag(learner.personId, datum);
  if (auftraege.length === 0) notFound();
  const naechster = auftraege.find((a) => !a.labor && a.phase !== "abgeschlossen");
  const fertig = auftraege.filter((a) => !a.labor && a.phase === "abgeschlossen").length;
  const anzahl = auftraege.filter((a) => !a.labor).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Link href="/schedule" className={cn("inline-flex w-fit items-center gap-1 rounded-sm text-sm text-ink-muted hover:text-ink", FOKUS)}>
          <ArrowLeft className="size-4" aria-hidden="true" /> Stundenplan
        </Link>
        <h1 className="text-[22px] leading-tight font-semibold text-ink md:text-[26px]">Praxistag · {datumLang(datum)}</h1>
        <p className="text-[15px] text-ink-muted">
          {anzahl} Praxisaufträge · {fertig} abgeschlossen
        </p>
      </div>
      <ol className="flex flex-col gap-3">
        {auftraege.map((a, i) => {
          const istNaechster = a.fieldJobId === naechster?.fieldJobId;
          return (
            <li key={a.fieldJobId}>
              <Link
                href={`/praxistag/${a.fieldJobId}?von=tagesuebersicht`}
                className={cn(
                  "flex items-center gap-3 rounded-karte p-4 text-ink shadow-card md:px-6",
                  istNaechster ? "border-l-[3px] border-l-praxis bg-praxis-tint hover:brightness-[0.98]" : "bg-card hover:bg-subtle",
                  FOKUS
                )}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold tabular-nums" aria-hidden="true">
                  {a.phase === "abgeschlossen" ? <Check className="size-4 text-progress" strokeWidth={3} /> : i + 1}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-praxis-text">
                    {a.labor ? <FlaskConical className="size-3.5" aria-hidden="true" /> : <Wrench className="size-3.5" aria-hidden="true" />}
                    {stand(a)}
                  </span>
                  <span className="text-[16px] leading-snug font-semibold break-words">{a.titel}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold">
                  {aktion(a)} <ArrowRight className="size-4" aria-hidden="true" />
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
