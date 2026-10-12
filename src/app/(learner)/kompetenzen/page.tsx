import { heuteInBerlin } from "@/lib/date";
import { parseNowParameter } from "@/lib/home-tag";
import { getKompetenzFortschritt } from "@/lib/queries/competencies";
import { getAktuellesModul } from "@/lib/queries/home-modul";
import { modulStatus } from "@/lib/programm";
import { getHeuteStepIds, getLernaktivitaeten, getModuleMitTeilschritten, type ModulInfo } from "@/lib/queries/kompetenzen-seite";
import { getGliederungsModule } from "@/lib/queries/programm";
import { getTagesAgenda } from "@/lib/queries/schedule";
import { requireCurrentLearner } from "@/lib/queries/session";

import { KompetenzDetail } from "./kompetenz-detail";
import { KompetenzListe, type ListenKompetenz } from "./kompetenz-liste";
import { KompetenzPanel } from "./kompetenz-panel";
import { KompetenzenKopf, ModulFortschrittZeile, type ModulTab } from "./kopf";

// Kompetenzseite v1 (docs/design_handoff_kompetenzen_v1, SR folgt; baut auf
// SR-61/62/63 auf): Lernaktivität → Teilschritt → Kompetenz sichtbar machen.

export default async function KompetenzenPage({
  searchParams,
}: {
  searchParams: Promise<{ modul?: string; kompetenz?: string; now?: string }>;
}) {
  const learner = await requireCurrentLearner();
  const { modul: modulParam, kompetenz: kompetenzParam, now } = await searchParams;

  // Wie auf Home: simuliertes "jetzt" zum Testen (?now=2026-10-09T09:00),
  // nie auf Production; sonst der Berliner Tag.
  const simuliert = process.env.VERCEL_ENV !== "production" ? parseNowParameter(now) : null;
  const heute = simuliert ? simuliert.slice(0, 10) : heuteInBerlin();
  // Testzeit beim Klicken in Tabs und Liste mitnehmen.
  const zusatz = simuliert && now ? `&now=${encodeURIComponent(now)}` : "";

  const [kompetenzen, wochen, dbAktuell, tag, gliederung] = await Promise.all([
    getKompetenzFortschritt(learner.personId),
    getModuleMitTeilschritten(learner.programmeId),
    getAktuellesModul(learner.organisationId, learner.cohortId, learner.enrolmentId, learner.programmeId, heute),
    getTagesAgenda(learner.organisationId, learner.cohortId, learner.enrolmentId, learner.personId, heute),
    getGliederungsModule(
      {
        organisationId: learner.organisationId,
        cohortId: learner.cohortId,
        enrolmentId: learner.enrolmentId,
        programmeId: learner.programmeId,
      },
      learner.programmeName
    ),
  ]);
  // Wie Home und Programmseite (Anna 2026-10-11): In der Datenbank steht unter
  // "module" je eine Woche. Mit vorläufiger Gliederung sind die Reiter die
  // echten Module (ohne den Abschluss); ihre Teilschritte sind die aller
  // zugehörigen Wochen. Ohne Gliederung bleiben es die Module der Datenbank.
  const modulListe: ModulInfo[] = gliederung
    ? gliederung
        .filter((g) => g.ueberzeile.startsWith("Modul"))
        .map((g) => ({
          id: String(g.nummer),
          name: g.name,
          nummer: g.nummer,
          stepIds: new Set(wochen.filter((w) => g.wochenIds.has(w.id)).flatMap((w) => [...w.stepIds])),
        }))
    : wochen;
  const aktuell = gliederung
    ? (modulListe[modulStatus(gliederung, heute).indexOf("aktuell")] ?? null)
    : dbAktuell;
  // "Heute dran" (Brief 2.4): Teilschritte, auf die heutige Lektionen oder
  // Praxistage einzahlen -- dieselbe Zuordnung wie "Stärkt …" auf Home.
  const heuteStepIds = await getHeuteStepIds(
    tag.theorie.flatMap((e) => (e.lessonId ? [e.lessonId] : [])),
    tag.feld.map((e) => e.fieldJobId)
  );

  // Status je Teilschritt (SR-63, gleiche Regel wie competency_fulfilment):
  // ein Teilschritt kann an mehreren Kompetenzen hängen, sein Status ist gleich.
  const erreichteSteps = new Set(
    kompetenzen.flatMap((k) => k.steps.filter((s) => s.status === "abgeschlossen").map((s) => s.id))
  );
  const aktuellIndex = modulListe.findIndex((m) => m.id === aktuell?.id);
  const tabs: ModulTab[] = modulListe.map((m, i) => {
    const erreicht = [...m.stepIds].filter((id) => erreichteSteps.has(id)).length;
    return {
      id: m.id,
      nummer: m.nummer,
      aktuell: i === aktuellIndex,
      // Entscheidung Anna 2026-10-10: abgeschlossen = alle Teilschritte erreicht.
      abgeschlossen: m.stepIds.size > 0 && erreicht === m.stepIds.size,
      zukuenftig: aktuellIndex >= 0 && i > aktuellIndex,
    };
  });

  // Modul: aus der URL; kommt man nur mit ?kompetenz=… (Link von Home), das
  // aktuelle Modul, wenn die Kompetenz dazugehört, sonst das erste Modul mit
  // ihr; sonst das aktuelle bzw. erste Modul (Brief 2.2).
  const zielKompetenz = kompetenzParam ? kompetenzen.find((k) => k.id === kompetenzParam) : undefined;
  const enthaelt = (m: (typeof modulListe)[number]) => !!zielKompetenz?.steps.some((s) => m.stepIds.has(s.id));
  const gewaehlt =
    modulListe.find((m) => m.id === modulParam) ??
    (zielKompetenz
      ? (modulListe[aktuellIndex] && enthaelt(modulListe[aktuellIndex]) ? modulListe[aktuellIndex] : modulListe.find(enthaelt))
      : undefined) ??
    modulListe[aktuellIndex] ??
    modulListe[0] ??
    null;

  // Kompetenzen des Moduls: mindestens ein Teilschritt hängt an Inhalten des
  // Moduls; modulübergreifende erscheinen so in jedem Modul (Brief 2.4).
  // Reihenfolge: "heute dran" zuerst, sonst Lehrplan (sort ist stabil).
  const liste: ListenKompetenz[] = gewaehlt
    ? kompetenzen
        .filter((k) => k.steps.some((s) => gewaehlt.stepIds.has(s.id)))
        .map((k) => ({
          id: k.id,
          name: k.name,
          prozent: k.fortschrittProzent,
          erreicht: k.teilschritteErfuellt,
          gesamt: k.teilschritteGesamt,
          heute: k.steps.some((s) => heuteStepIds.has(s.id)),
        }))
        .sort((a, b) => Number(b.heute) - Number(a.heute))
    : [];
  // Entscheidung Anna 2026-10-12: immer alle Kompetenzen als Übersicht; mit
  // ?kompetenz=… (Klick, Link von Home) kommen Kompetenzschritte und "Hier
  // lernst du das" als Panel von rechts dazu, wie auf der Programmseite.
  const gewaehlteKompetenz = liste.find((k) => k.id === kompetenzParam) ?? null;
  const detail = gewaehlteKompetenz ? (kompetenzen.find((k) => k.id === gewaehlteKompetenz.id) ?? null) : null;
  // Balken (Entscheidung Anna 2026-10-12): Durchschnitt der Kompetenz-Ringe
  // des Moduls statt gezählter Kompetenzschritte.
  const modulProzent = liste.length
    ? Math.round(liste.reduce((summe, k) => summe + k.prozent, 0) / liste.length)
    : 0;
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
      <KompetenzenKopf
        programmName={learner.programmeName}
        modulTabs={tabs}
        gewaehltId={gewaehlt?.id ?? null}
        zusatz={zusatz}
      />
      {gewaehlt && (
        <>
          <ModulFortschrittZeile nummer={gewaehlt.nummer} prozent={modulProzent} anzahl={liste.length} />
          <KompetenzListe modulId={gewaehlt.id} modulNummer={gewaehlt.nummer} kompetenzen={liste} zusatz={zusatz} />
        </>
      )}
      {gewaehlt && detail && (
        <KompetenzPanel
          key={detail.id}
          ueberzeile={`Kompetenz · Modul ${gewaehlt.nummer}`}
          schliessenHref={`/kompetenzen?modul=${gewaehlt.id}${zusatz}`}
        >
          <KompetenzDetail kompetenz={detail} aktivitaeten={aktivitaeten} heute={heute} heuteStepIds={heuteStepIds} />
        </KompetenzPanel>
      )}
    </div>
  );
}
