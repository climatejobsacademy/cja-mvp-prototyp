import { heuteInBerlin } from "@/lib/date";
import { waehleModul } from "@/lib/programm";
import { getKompetenzFortschritt } from "@/lib/queries/competencies";
import { getHeuteStepIds, getLernaktivitaeten } from "@/lib/queries/kompetenzen-seite";
import { getModulKompetenzen, getModuleDerKohorte } from "@/lib/queries/modul";
import { getTagesAgenda } from "@/lib/queries/schedule";
import { requireCurrentLearner } from "@/lib/queries/session";
import { parseNowParameter } from "@/lib/stundenplan";

import { KompetenzDetail } from "./kompetenz-detail";
import { KompetenzListe, type ListenKompetenz } from "./kompetenz-liste";
import { KompetenzPanel } from "./kompetenz-panel";
import { KompetenzenKopf, ModulFortschrittZeile, type ModulTab } from "./kopf";

// Kompetenzseite v1 (SR-61, SR-62, SR-63, SR-69, SR-70, SR-72, SR-73; Design
// aus dem Branch demo): Kompetenzen des Programms der aktiven Einschreibung
// (competency_programme), "heute dran" zuerst, sonst Lehrplan-Reihenfolge.
// Mit Modul-Reitern (Paket D): je Modul die Kompetenzen aus modul_competency
// (ausdrücklich zugeordnet, Entscheidung 2026-10-13), Reiter nur für Module
// mit Überzeile "Modul …" oder mit Kompetenzen. Solange kein Modul
// Kompetenzen hat (bis zum Import), keine Reiter und alle Kompetenzen wie
// bisher. Mit ?kompetenz=… kommen Kompetenzschritte und "Hier lernst du
// das" als Panel von rechts dazu.

export default async function KompetenzenPage({
  searchParams,
}: {
  searchParams: Promise<{ modul?: string; kompetenz?: string; now?: string }>;
}) {
  const learner = await requireCurrentLearner();
  const { modul: modulParam, kompetenz: kompetenzParam, now } = await searchParams;

  // Wie Stundenplan: simuliertes "jetzt" zum Testen (?now=…), nie auf Production.
  const simuliert = process.env.VERCEL_ENV !== "production" ? parseNowParameter(now) : null;
  const heute = simuliert ? simuliert.slice(0, 10) : heuteInBerlin();
  // Testzeit beim Klicken in der Liste mitnehmen.
  const zusatz = simuliert && now ? `&now=${encodeURIComponent(now)}` : "";

  const [kompetenzen, tag, modulListe] = await Promise.all([
    getKompetenzFortschritt(learner.personId, learner.programmeId),
    getTagesAgenda(learner.organisationId, learner.cohortId, learner.enrolmentId, learner.personId, heute),
    getModuleDerKohorte(learner.programmeId, learner.cohortId, heute),
  ]);
  const zuordnung = await getModulKompetenzen(modulListe.map((m) => m.id));

  // Modul-Reiter: Kompetenzen je Modul in der Reihenfolge von modul_competency,
  // nur solche des Programms (competency_programme). Status eines Reiters:
  // abgeschlossen = alle Kompetenzschritte seiner Kompetenzen erreicht.
  const kompetenzById = new Map(kompetenzen.map((k) => [k.id, k]));
  const reiterModule = zuordnung.size === 0
    ? []
    : modulListe
        .map((m) => {
          const ids = (zuordnung.get(m.id) ?? []).map((z) => z.competencyId).filter((id) => kompetenzById.has(id));
          const steps = new Map(
            ids.flatMap((id) => kompetenzById.get(id)!.steps.map((st) => [st.id, st.status === "abgeschlossen"] as const))
          );
          return {
            ...m,
            kompetenzReihenfolge: ids,
            kompetenzIds: new Set(ids),
            stepsGesamt: steps.size,
            stepsErreicht: [...steps.values()].filter(Boolean).length,
          };
        })
        .filter((m) => m.ueberzeile.startsWith("Modul") || m.kompetenzIds.size > 0);
  const aktuellIndex = reiterModule.findIndex((m) => m.status === "aktuell");
  const tabs: ModulTab[] = reiterModule.map((m, i) => ({
    id: m.id,
    ueberzeile: m.ueberzeile.startsWith("Modul") ? m.ueberzeile : m.name,
    aktuell: i === aktuellIndex,
    abgeschlossen: m.stepsGesamt > 0 && m.stepsErreicht === m.stepsGesamt,
    zukuenftig: aktuellIndex >= 0 && i > aktuellIndex,
  }));
  const gewaehlt = waehleModul(reiterModule, reiterModule[aktuellIndex]?.id ?? null, modulParam, kompetenzParam);
  const gewaehltTab = tabs.find((t) => t.id === gewaehlt?.id) ?? null;
  // Modul in allen Links der Seite mitnehmen (Liste, Panel schließen).
  const modulZusatz = `${gewaehlt ? `&modul=${gewaehlt.id}` : ""}${zusatz}`;
  // "Heute dran" (Brief 2.4): Teilschritte, auf die heutige Lektionen oder
  // Praxistage einzahlen.
  const heuteStepIds = await getHeuteStepIds(
    tag.theorie.flatMap((e) => (e.lessonId ? [e.lessonId] : [])),
    tag.feld.map((e) => e.fieldJobId)
  );

  // getKompetenzFortschritt liefert die Lehrplan-Reihenfolge; "heute dran"
  // zuerst (sort ist stabil).
  // Mit gewähltem Modul nur dessen Kompetenzen, in der Reihenfolge des Moduls.
  const sichtbar = gewaehlt
    ? gewaehlt.kompetenzReihenfolge.map((id) => kompetenzById.get(id)!)
    : kompetenzen;
  const liste: ListenKompetenz[] = sichtbar
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
      <KompetenzenKopf programmName={learner.programmeName} modulTabs={tabs} gewaehltId={gewaehlt?.id ?? null} zusatz={zusatz} />
      {gewaehlt && gewaehltTab && gewaehlt.kompetenzIds.size > 0 && (
        <ModulFortschrittZeile ueberzeile={gewaehltTab.ueberzeile} erreicht={gewaehlt.stepsErreicht} gesamt={gewaehlt.stepsGesamt} />
      )}
      <KompetenzListe
        kompetenzen={liste}
        zusatz={modulZusatz}
        leerText={gewaehltTab ? `Für ${gewaehltTab.ueberzeile} sind noch keine Kompetenzen hinterlegt.` : undefined}
        label={gewaehltTab ? `Kompetenzen in ${gewaehltTab.ueberzeile}` : undefined}
      />
      {detail && (
        <KompetenzPanel
          key={detail.id}
          ueberzeile="Kompetenz"
          schliessenHref={`/kompetenzen${modulZusatz ? `?${modulZusatz.slice(1)}` : ""}`}
        >
          <KompetenzDetail kompetenz={detail} aktivitaeten={aktivitaeten} heute={heute} heuteStepIds={heuteStepIds} />
        </KompetenzPanel>
      )}
    </div>
  );
}
