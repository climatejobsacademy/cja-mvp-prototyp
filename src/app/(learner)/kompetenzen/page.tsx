import { heuteInBerlin } from "@/lib/date";
import { getKompetenzFortschritt } from "@/lib/queries/competencies";
import { getHeuteStepIds, getLernaktivitaeten } from "@/lib/queries/kompetenzen-seite";
import { getTagesAgenda } from "@/lib/queries/schedule";
import { requireCurrentLearner } from "@/lib/queries/session";
import { parseNowParameter } from "@/lib/stundenplan";

import { KompetenzDetail } from "./kompetenz-detail";
import { KompetenzListe, type ListenKompetenz } from "./kompetenz-liste";
import { KompetenzPanel } from "./kompetenz-panel";
import { KompetenzenKopf } from "./kopf";

// Kompetenzseite v1 (SR-61, SR-62, SR-63, SR-69, SR-70, SR-72, SR-73; Design
// aus dem Branch demo) ohne Modul-Reiter: eine Liste aller Kompetenzen des
// Programms der aktiven Einschreibung (competency_programme), "heute dran"
// zuerst, sonst Lehrplan-Reihenfolge. Mit ?kompetenz=… kommen
// Kompetenzschritte und "Hier lernst du das" als Panel von rechts dazu.

export default async function KompetenzenPage({
  searchParams,
}: {
  searchParams: Promise<{ kompetenz?: string; now?: string }>;
}) {
  const learner = await requireCurrentLearner();
  const { kompetenz: kompetenzParam, now } = await searchParams;

  // Wie Stundenplan: simuliertes "jetzt" zum Testen (?now=…), nie auf Production.
  const simuliert = process.env.VERCEL_ENV !== "production" ? parseNowParameter(now) : null;
  const heute = simuliert ? simuliert.slice(0, 10) : heuteInBerlin();
  // Testzeit beim Klicken in der Liste mitnehmen.
  const zusatz = simuliert && now ? `&now=${encodeURIComponent(now)}` : "";

  const [kompetenzen, tag] = await Promise.all([
    getKompetenzFortschritt(learner.personId, learner.programmeId),
    getTagesAgenda(learner.organisationId, learner.cohortId, learner.enrolmentId, learner.personId, heute),
  ]);
  // "Heute dran" (Brief 2.4): Teilschritte, auf die heutige Lektionen oder
  // Praxistage einzahlen.
  const heuteStepIds = await getHeuteStepIds(
    tag.theorie.flatMap((e) => (e.lessonId ? [e.lessonId] : [])),
    tag.feld.map((e) => e.fieldJobId)
  );

  // getKompetenzFortschritt liefert die Lehrplan-Reihenfolge; "heute dran"
  // zuerst (sort ist stabil).
  const liste: ListenKompetenz[] = kompetenzen
    .map((k) => ({
      id: k.id,
      name: k.name,
      prozent: k.fortschrittProzent,
      erreicht: k.teilschritteErfuellt,
      gesamt: k.teilschritteGesamt,
      heute: k.steps.some((s) => heuteStepIds.has(s.id)),
    }))
    .sort((a, b) => Number(b.heute) - Number(a.heute));

  const detail = kompetenzParam ? (kompetenzen.find((k) => k.id === kompetenzParam) ?? null) : null;
  const aktivitaeten = detail
    ? await getLernaktivitaeten(
        detail.steps.map((s) => s.id),
        {
          organisationId: learner.organisationId,
          cohortId: learner.cohortId,
          enrolmentId: learner.enrolmentId,
          learnerId: learner.personId,
        }
      )
    : [];

  return (
    <div data-breit className="flex flex-col gap-8">
      <KompetenzenKopf programmName={learner.programmeName} />
      <KompetenzListe kompetenzen={liste} zusatz={zusatz} />
      {detail && (
        <KompetenzPanel key={detail.id} ueberzeile="Kompetenz" schliessenHref={`/kompetenzen${zusatz ? `?${zusatz.slice(1)}` : ""}`}>
          <KompetenzDetail kompetenz={detail} aktivitaeten={aktivitaeten} heute={heute} heuteStepIds={heuteStepIds} />
        </KompetenzPanel>
      )}
    </div>
  );
}
