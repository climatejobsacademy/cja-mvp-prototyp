import { heuteInBerlin, jetztInBerlin, montagDerWoche, plusTage } from "@/lib/date";
import { FachspracheKaestchen } from "@/components/fachsprache/einstieg-kaestchen";
import { freiText, wochenrueckblick, zaehlText } from "@/lib/home-frei";
import { getDayState } from "@/lib/home-tag";
import { getKompetenzFortschritt } from "@/lib/queries/competencies";
import { getEinstiegeJeTag } from "@/lib/queries/fachsprache";
import { getHeutigeKompetenzen, getNachholLektion } from "@/lib/queries/home";
import { getAktuellesModul, getModulKompetenzen } from "@/lib/queries/modul";
import { getNaechsterTermin, getTagesAgenda } from "@/lib/queries/schedule";
import { requireCurrentLearner } from "@/lib/queries/session";
import { getKohortenStart, getStundenplan } from "@/lib/queries/stundenplan";
import { getMeineTrainer } from "@/lib/queries/trainer";
import { parseNowParameter } from "@/lib/stundenplan";
import { cn } from "@/lib/utils";

import { Begruessung, TestzeitHinweis } from "./begruessung";
import { DeinTag, type StaerktFn } from "./dein-tag";
import { AlleKompetenzen, FreiKarte, FreiZeilen } from "./freier-tag";
import { aktivitaeten } from "./home-hilfen";
import { ModulFortschritt, type RingKompetenz } from "./kompetenz-bereich";
import type { GestaerkteKompetenz } from "./tages-karten";

// Home (docs/design_handoff_home_v6; SR-73): lädt die Daten und setzt
// Begrüßung, "Dein Tag" und Kompetenzbereich zusammen. Seit Paket D auf der
// Modul-Ebene (0028): aktuelles Modul aus fn_modul_zeitraum, seine
// Kompetenzen ausdrücklich aus modul_competency (Entscheidung 2026-10-13);
// Thema, "Wissen festigen", "begonnen" und Rufname aus den Feldern von 0029;
// Trainer:innen aus fn_meine_trainer() (0030); "Heute frei" mit
// Wochenrückblick (SR-79). Ersetzt die frühere CurriculumCard.

export default async function HomePage({ searchParams }: { searchParams: Promise<{ now?: string }> }) {
  const learner = await requireCurrentLearner();
  const { now } = await searchParams;

  // Brief 8.2: simuliertes "jetzt" zum Testen der Zustände, z. B.
  // /home?now=2026-10-09T13:05 (Berliner Zeit). Nur lokal und in Previews,
  // nie auf Production. Sonst wie der Stundenplan über die Berlin-Helfer.
  const simuliert = process.env.VERCEL_ENV !== "production" ? parseNowParameter(now) : null;
  const jetzt = simuliert ?? jetztInBerlin();
  const heute = simuliert ? simuliert.slice(0, 10) : heuteInBerlin();

  const [tag, naechster, modul, alleKompetenzen, nachholen, trainer] = await Promise.all([
    getTagesAgenda(learner.organisationId, learner.cohortId, learner.enrolmentId, learner.personId, heute),
    getNaechsterTermin(learner.organisationId, learner.cohortId, learner.enrolmentId, heute),
    getAktuellesModul(learner.programmeId, learner.cohortId, heute),
    getKompetenzFortschritt(learner.personId, learner.programmeId),
    getNachholLektion(learner.organisationId, learner.cohortId, learner.enrolmentId, learner.personId, heute),
    getMeineTrainer(),
  ]);
  const heuteAktiv = { ...aktivitaeten(tag), nachholen };
  const zustand = getDayState(jetzt, heuteAktiv);
  const [modulKompetenzen, heutige, fachsprache] = await Promise.all([
    getModulKompetenzen(modul ? [modul.id] : []),
    getHeutigeKompetenzen(
      [...heuteAktiv.live.flatMap((l) => (l.lessonId ? [l.lessonId] : [])), ...heuteAktiv.flex.map((f) => f.lessonId)],
      heuteAktiv.praxis.map((p) => p.fieldJobId)
    ),
    // Fachsprache (SR-84): Einheiten zu den Live-Lektionen des Tages, nur Veröffentlichtes bei Schalter an.
    getEinstiegeJeTag([tag], "home"),
  ]);
  // Alle Kompetenzen, die eine heutige Aktivität stärkt (Glow, Brief 2.4).
  const heuteIds = new Set([...heutige.proLektion.values(), ...heutige.proFieldJob.values()].flat());

  // Ringe in der Reihenfolge von modul_competency. Ring-Prozent wie auf der
  // Kompetenzseite: nur erreichte Teilschritte zählen (competency_fulfilment).
  const kompetenzById = new Map(alleKompetenzen.map((k) => [k.id, k]));
  const ringe: RingKompetenz[] = (modul ? (modulKompetenzen.get(modul.id) ?? []) : []).flatMap((mk) => {
    const k = kompetenzById.get(mk.competencyId);
    return k
      ? [
          {
            id: k.id,
            name: k.name,
            prozent: k.fortschrittProzent,
            heute: heuteIds.has(k.id),
            teilschritteErreicht: k.teilschritteErfuellt,
            teilschritteGesamt: k.teilschritteGesamt,
          },
        ]
      : [];
  });

  // alleKompetenzen ist nach Lehrplan sortiert -- so auch die "Stärkt"-Namen.
  // Höchstens zwei, damit die Zeile auf der Fokus-Karte kurz bleibt.
  const staerkt: StaerktFn = (art, id) => {
    const ids = new Set(id ? ((art === "lektion" ? heutige.proLektion : heutige.proFieldJob).get(id) ?? []) : []);
    return alleKompetenzen
      .filter((k) => ids.has(k.id))
      .slice(0, 2)
      .map((k) => ({ id: k.id, name: k.name }));
  };
  const gestaerkt: GestaerkteKompetenz[] = alleKompetenzen
    .filter((k) => heuteIds.has(k.id))
    .map((k) => ({ id: k.id, name: k.name, prozent: k.fortschrittProzent }));

  // Stand demo (Anna 2026-10-12): keine rechte Spalte; unter "Dein Tag" über
  // die volle Breite das ganze Modul, heute gestärkte zuerst. Ohne
  // aktuelles Modul entfällt der Bereich; ohne zugeordnete Kompetenzen (bis
  // zum Import) steht dort ein ruhiger Hinweis.
  const heuteRinge = ringe.filter((k) => k.heute);
  const stil = { modul: modul ? { ueberzeile: modul.ueberzeile, name: modul.name } : null };

  const vorname = learner.rufname.trim();
  const begruessung = <Begruessung vorname={vorname} programmName={learner.programmeName} heute={heute} />;

  // SR-79: heute nichts geplant (Zustand F) → Karte "Heute frei" mit
  // Rückblick auf die laufende Woche (Montag bis gestern), zwei Zeilen
  // darunter, rechts alle Kompetenzen des Moduls; kein Modul-Fortschritt.
  if (zustand.zustand === "F") {
    const montag = montagDerWoche(heute);
    const [plan, kohortenStart, aeltesteOffene] = await Promise.all([
      montag < heute
        ? getStundenplan(
            {
              organisationId: learner.organisationId,
              cohortId: learner.cohortId,
              enrolmentId: learner.enrolmentId,
              learnerId: learner.personId,
            },
            montag,
            plusTage(heute, -1)
          )
        : Promise.resolve([]),
      getKohortenStart(learner.cohortId),
      getNachholLektion(learner.organisationId, learner.cohortId, learner.enrolmentId, learner.personId, heute, true),
    ]);
    const rueckblick = wochenrueckblick(plan, heute);
    const text = freiText(rueckblick, vorname, heute, naechster?.datum ?? null, !!kohortenStart && kohortenStart < heute);
    return (
      <div data-breit className="flex flex-col gap-9">
        {simuliert && <TestzeitHinweis heute={heute} jetzt={jetzt} />}
        {begruessung}
        <div className={cn("grid items-start gap-12", modul && ringe.length > 0 && "min-[960px]:grid-cols-[2fr_1fr]")}>
          <section aria-label="Dein Tag" className="flex min-w-0 flex-col gap-4">
            <FreiKarte text={text} zaehlung={zaehlText(rueckblick)} tage={rueckblick?.tage ?? []} />
            <FreiZeilen naechster={naechster} offen={aeltesteOffene} heute={heute} />
          </section>
          {modul && ringe.length > 0 && <AlleKompetenzen modul={modul} kompetenzen={ringe} />}
        </div>
      </div>
    );
  }

  return (
    <div data-breit className="flex flex-col gap-10">
      {simuliert && <TestzeitHinweis heute={heute} jetzt={jetzt} />}
      {begruessung}
      <DeinTag
        zustand={zustand}
        heute={heute}
        naechster={naechster}
        staerkt={staerkt}
        // In D stehen die heute gestärkten Ringe in der dunklen Karte, außer
        // der Modulbereich zeigt sie schon.
        gestaerkt={heuteRinge.length > 0 ? [] : gestaerkt}
        trainer={trainer}
        stil={stil}
      />
      <FachspracheKaestchen einheiten={fachsprache.get(tag.datum) ?? []} />
      {modul && <ModulFortschritt modul={modul} kompetenzen={ringe} />}
    </div>
  );
}
