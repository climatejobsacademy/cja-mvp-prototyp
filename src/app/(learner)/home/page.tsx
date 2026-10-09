import { heuteInBerlin, jetztInBerlin } from "@/lib/date";
import { getDayState, parseNowParameter } from "@/lib/home-tag";
import { getKompetenzFortschritt } from "@/lib/queries/competencies";
import { getAktuellesModul, getHeutigeKompetenzen, getModulKompetenzIds } from "@/lib/queries/home-modul";
import { getNaechsterTermin, getTagesAgenda } from "@/lib/queries/schedule";
import { requireCurrentLearner } from "@/lib/queries/session";

import { Begruessung, TestzeitHinweis } from "./begruessung";
import { DeinTag, type StaerktFn } from "./dein-tag";
import { aktivitaeten, tagestyp } from "./home-hilfen";
import { KompetenzBereich, type RingKompetenz } from "./kompetenz-bereich";
import type { GestaerkteKompetenz } from "./tages-karten";

// Home v6 (docs/design_handoff_home_v6, SR folgt): lädt die Daten und setzt
// Begrüßung, "Dein Tag" und Kompetenzbereich zusammen.

export default async function HomePage({ searchParams }: { searchParams: Promise<{ now?: string }> }) {
  const learner = await requireCurrentLearner();
  const { now } = await searchParams;

  // Brief 8.2: simuliertes "jetzt" zum Testen der Zustände, z. B.
  // /home?now=2026-10-09T13:05 (Berliner Zeit). Nie auf Production.
  const simuliert = process.env.VERCEL_ENV !== "production" ? parseNowParameter(now) : null;
  // Sonst wie der Stundenplan über die Berlin-Helfer, damit alle Seiten
  // denselben Tag als "heute" nehmen.
  const jetzt = simuliert ?? jetztInBerlin();
  const heute = simuliert ? simuliert.slice(0, 10) : heuteInBerlin();

  const [tag, naechster, modul, alleKompetenzen] = await Promise.all([
    getTagesAgenda(learner.organisationId, learner.cohortId, learner.enrolmentId, learner.personId, heute),
    getNaechsterTermin(learner.organisationId, learner.cohortId, learner.enrolmentId, heute),
    getAktuellesModul(learner.organisationId, learner.cohortId, learner.enrolmentId, learner.programmeId, heute),
    getKompetenzFortschritt(learner.personId),
  ]);
  const heuteAktiv = aktivitaeten(tag);
  const [modulKompetenzIds, heutige] = await Promise.all([
    modul ? getModulKompetenzIds(modul.id) : Promise.resolve(new Set<string>()),
    getHeutigeKompetenzen(
      [...heuteAktiv.live.flatMap((l) => (l.lessonId ? [l.lessonId] : [])), ...heuteAktiv.flex.map((f) => f.lessonId)],
      heuteAktiv.praxis.map((p) => p.fieldJobId)
    ),
  ]);
  // Alle Kompetenzen, die eine heutige Aktivität stärkt (Glow, Brief 2.4).
  const heuteIds = new Set([...heutige.proLektion.values(), ...heutige.proFieldJob.values()].flat());

  // Ring-Prozent wie auf der Kompetenzseite: nur erreichte Teilschritte
  // zählen (competency_fulfilment), nie "Lektion angesehen" (Brief 6).
  const ringe: RingKompetenz[] = alleKompetenzen
    .filter((k) => modulKompetenzIds.has(k.id))
    .map((k) => ({ id: k.id, name: k.name, prozent: k.fortschrittProzent, heute: heuteIds.has(k.id) }));

  // alleKompetenzen ist nach Lehrplan sortiert -- so auch die "Stärkt"-Namen.
  // Höchstens zwei, damit die Zeile auf der Fokus-Karte kurz bleibt.
  const staerkt: StaerktFn = (art, id) => {
    const ids = new Set(id ? ((art === "lektion" ? heutige.proLektion : heutige.proFieldJob).get(id) ?? []) : []);
    return alleKompetenzen.filter((k) => ids.has(k.id)).slice(0, 2).map((k) => k.name);
  };
  const gestaerkt: GestaerkteKompetenz[] = alleKompetenzen
    .filter((k) => heuteIds.has(k.id))
    .map((k) => ({ id: k.id, name: k.name, prozent: k.fortschrittProzent }));

  return (
    <div data-breit className="flex flex-col gap-10 md:gap-[52px]">
      {simuliert && <TestzeitHinweis heute={heute} jetzt={jetzt} />}
      <Begruessung vorname={learner.name.trim().split(" ")[0]} heute={heute} typ={tagestyp(tag)} />
      <DeinTag zustand={getDayState(jetzt, heuteAktiv)} naechster={naechster} staerkt={staerkt} gestaerkt={gestaerkt} />
      {/* Ohne ableitbares Modul oder ohne zugeordnete Kompetenzen: Bereich
          ausblenden statt etwas zu erfinden (Brief 8.6). */}
      {modul && ringe.length > 0 && <KompetenzBereich modul={modul} kompetenzen={ringe} />}
    </div>
  );
}
