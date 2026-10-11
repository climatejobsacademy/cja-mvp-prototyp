import { heuteInBerlin, jetztInBerlin, montagDerWoche, plusTage } from "@/lib/date";
import { freiText, wochenrueckblick } from "@/lib/home-frei";
import { getDayState, parseNowParameter } from "@/lib/home-tag";
import { getKompetenzFortschritt } from "@/lib/queries/competencies";
import { getModuleMitTeilschritten } from "@/lib/queries/kompetenzen-seite";
import { getAktuellesGliederungsModul } from "@/lib/queries/programm";
import {
  getAktuellesModul,
  getHeutigeKompetenzen,
  getModulKompetenzIds,
  getNachholLektion,
  getZuletztKompetenzIds,
} from "@/lib/queries/home-modul";
import { getNaechsterTermin, getTagesAgenda } from "@/lib/queries/schedule";
import { requireCurrentLearner } from "@/lib/queries/session";
import { getKohortenStart, getStundenplan } from "@/lib/queries/stundenplan";
import { cn } from "@/lib/utils";

import { Begruessung, TestzeitHinweis } from "./begruessung";
import { DeinTag, type StaerktFn } from "./dein-tag";
import { AlleKompetenzen, FreiKarte, FreiZeilen } from "./freier-tag";
import { aktivitaeten, istOnline, tagestyp } from "./home-hilfen";
import { HeuteSpalte, ModulFortschritt, type RingKompetenz } from "./kompetenz-bereich";
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

  const ctx = {
    organisationId: learner.organisationId,
    cohortId: learner.cohortId,
    enrolmentId: learner.enrolmentId,
    programmeId: learner.programmeId,
  };
  const [tag, naechster, gliederungsModul, dbModul, alleKompetenzen, nachholen, zuletztIds] = await Promise.all([
    getTagesAgenda(learner.organisationId, learner.cohortId, learner.enrolmentId, learner.personId, heute),
    getNaechsterTermin(learner.organisationId, learner.cohortId, learner.enrolmentId, heute),
    // Punkt 6 der Änderungsliste "freier Tag": dasselbe Modul wie auf der
    // Programmseite (Gliederung), sonst die bisherige Regel.
    getAktuellesGliederungsModul(ctx, learner.programmeName, heute),
    getAktuellesModul(learner.organisationId, learner.cohortId, learner.enrolmentId, learner.programmeId, heute),
    getKompetenzFortschritt(learner.personId),
    getNachholLektion(learner.organisationId, learner.cohortId, learner.enrolmentId, learner.personId, heute),
    getZuletztKompetenzIds(learner.personId),
  ]);
  const modul = gliederungsModul?.modul ?? dbModul;
  const heuteAktiv = { ...aktivitaeten(tag), nachholen };
  const zustand = getDayState(jetzt, heuteAktiv);
  const [modulKompetenzIds, heutige] = await Promise.all([
    gliederungsModul
      ? getModuleMitTeilschritten(learner.programmeId).then((wochen) => {
          // Kompetenzen mit mindestens einem Teilschritt aus den Wochen des Moduls.
          const steps = new Set(wochen.filter((w) => gliederungsModul.wochenIds.has(w.id)).flatMap((w) => [...w.stepIds]));
          return new Set(alleKompetenzen.filter((k) => k.steps.some((st) => steps.has(st.id))).map((k) => k.id));
        })
      : modul
        ? getModulKompetenzIds(modul.id)
        : Promise.resolve(new Set<string>()),
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
    .map((k) => ({
      id: k.id,
      name: k.name,
      prozent: k.fortschrittProzent,
      heute: heuteIds.has(k.id),
      teilschritteErreicht: k.teilschritteErfuellt,
      teilschritteGesamt: k.teilschritteGesamt,
    }));

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

  // Home v13, Variante C (Entscheidung Anna 2026-10-10): rechts neben "Dein
  // Tag" die heute gestärkten Kompetenzen (ersatzweise die zuletzt geübte),
  // darunter über die volle Breite das ganze Modul mit Fortschritt. Ohne
  // ableitbares Modul oder ohne zugeordnete Kompetenzen entfällt beides,
  // statt etwas zu erfinden (Brief 8.6).
  const heuteRinge = ringe.filter((k) => k.heute);
  const zuletzt =
    heuteRinge.length === 0
      ? (zuletztIds.map((id) => ringe.find((k) => k.id === id)).find((k) => k !== undefined) ?? null)
      : null;
  const spalte =
    modul && (heuteRinge.length > 0 || zuletzt) ? (
      <HeuteSpalte modul={modul} programmName={learner.programmeName} kompetenzen={heuteRinge} zuletzt={zuletzt} />
    ) : null;

  const vorname = learner.name.trim().split(" ")[0];
  const begruessung = (
    <Begruessung vorname={vorname} heute={heute} typ={tagestyp(tag)} online={istOnline(tag)} />
  );

  // Änderungsliste "freier Tag": heute nichts geplant (Zustand F) → Karte
  // "Heute frei" mit Rückblick auf die letzte Programmwoche, zwei Zeilen,
  // rechts alle Kompetenzen des Moduls; kein Modul-Fortschritt darunter.
  if (zustand.zustand === "F") {
    const [plan, kohortenStart, aeltesteOffene] = await Promise.all([
      getStundenplan({ ...ctx, learnerId: learner.personId }, plusTage(montagDerWoche(heute), -7), plusTage(heute, -1)),
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
            <FreiKarte text={text} tage={rueckblick?.tage ?? []} />
            <FreiZeilen naechster={naechster} offen={aeltesteOffene} heute={heute} />
          </section>
          {modul && ringe.length > 0 && <AlleKompetenzen modulNummer={modul.nummer} kompetenzen={ringe} />}
        </div>
      </div>
    );
  }

  return (
    <div data-breit className="flex flex-col gap-10">
      {simuliert && <TestzeitHinweis heute={heute} jetzt={jetzt} />}
      {begruessung}
      {/* Rechte Spalte nur so hoch wie ihr Inhalt (Option 1, 2026-10-10). */}
      <div className={cn("grid gap-8", spalte && "min-[960px]:grid-cols-[2fr_1fr]")}>
        <DeinTag
          zustand={zustand}
          heute={heute}
          naechster={naechster}
          staerkt={staerkt}
          // In D stehen die heute gestärkten Ringe in der dunklen Karte, außer
          // die rechte Spalte zeigt sie schon.
          gestaerkt={heuteRinge.length > 0 ? [] : gestaerkt}
        />
        {spalte}
      </div>
      {modul && ringe.length > 0 && <ModulFortschritt modul={modul} kompetenzen={ringe} />}
    </div>
  );
}
