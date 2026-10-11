import { randomUUID } from "node:crypto";

import { FlaskConical } from "lucide-react";

import { datumKurz, heuteInBerlin, jetztInBerlin } from "@/lib/date";
import { parseNowParameter } from "@/lib/home-tag";
import {
  datumPunkt,
  gliederungFuer,
  letztesDatumImNamen,
  modulFuerDatum,
  modulStatus,
  zeitraumPunkt,
} from "@/lib/programm";
import { getKompetenzFortschritt } from "@/lib/queries/competencies";
import { getContentLibrary } from "@/lib/queries/content";
import { getModuleMitTeilschritten } from "@/lib/queries/kompetenzen-seite";
import { getDbModule, getKohortenZeitraum } from "@/lib/queries/programm";
import { requireCurrentLearner } from "@/lib/queries/session";
import { getStundenplan } from "@/lib/queries/stundenplan";
import { panelWochen } from "@/lib/programm-inhalte";

import { tagErledigt } from "../schedule/plan-bausteine";
import { planModell } from "../schedule/plan-modell";

import { KohorteKarten } from "./kohorte-karten";
import { ModulPfad, type PfadModul } from "./modul-pfad";
import { InhaltePanel } from "./inhalte-panel";
import { TrackingKarte, type Kachel } from "./tracking-karte";

// Programmseite v8 (docs/design_handoff_programm_v8, SR folgt): Überblick
// über das ganze Programm -- Kopf, Modulpfad "Dein Weg", Tracking des
// gewählten Moduls, Kohorte; die Wochen mit Kursen und Lektionen im
// Seitenpanel "Inhalte des Moduls". Entscheidungen Anna 2026-10-11: ca. 6 Module à ca. 4 Wochen
// (vorläufige Gliederung in src/lib/programm.ts), Zeitraum bei jedem Modul
// sichtbar; Breite 1080 px wie alle Seiten; Adresse bleibt /content.

export default async function ProgrammPage({
  searchParams,
}: {
  searchParams: Promise<{ modul?: string; inhalte?: string; now?: string }>;
}) {
  const learner = await requireCurrentLearner();
  const { modul: modulParam, inhalte, now } = await searchParams;

  // Wie Home, Kompetenzen und Stundenplan: simuliertes "jetzt" zum Testen, nie auf Production.
  const simuliert = process.env.VERCEL_ENV !== "production" ? parseNowParameter(now) : null;
  const heute = simuliert ? simuliert.slice(0, 10) : heuteInBerlin();
  const nowZusatz = simuliert && now ? `&now=${encodeURIComponent(now)}` : "";

  const ctx = {
    organisationId: learner.organisationId,
    cohortId: learner.cohortId,
    enrolmentId: learner.enrolmentId,
  };
  const [dbModule, kohorte, groups, kompetenzen, stepsJeWoche] = await Promise.all([
    getDbModule({ ...ctx, programmeId: learner.programmeId }),
    getKohortenZeitraum(learner.cohortId),
    getContentLibrary(learner.programmeId, learner.personId),
    getKompetenzFortschritt(learner.personId),
    getModuleMitTeilschritten(learner.programmeId),
  ]);

  // Module mit ihren Wochen (= Zeilen aus "module"). Mit Gliederung: Wochen
  // über ihr Datum (Stundenplan, sonst Datum im Namen) zuordnen; ohne
  // Gliederung ist jede Zeile ein eigenes Modul.
  const gliederung = gliederungFuer(learner.programmeName, kohorte?.start ?? null);
  const modulListe = gliederung
    ? gliederung.map((g) => ({
        ...g,
        wochenIds: new Set(
          dbModule.filter((w) => modulFuerDatum(gliederung, w.von ?? letztesDatumImNamen(w.name)) === g.nummer).map((w) => w.id)
        ),
      }))
    : dbModule.map((m) => ({
        nummer: m.nummer,
        ueberzeile: `Modul ${m.nummer}`,
        name: m.name,
        von: m.von,
        bis: m.bis,
        wochenIds: new Set([m.id]),
      }));

  const status = modulStatus(
    modulListe.map((m) => ({ von: m.von ?? "9999-12-31", bis: m.bis ?? "9999-12-31" })),
    heute
  );
  const pfad: PfadModul[] = modulListe.map((m, i) => ({
    id: String(m.nummer),
    nummer: m.nummer,
    ueberzeile: m.ueberzeile,
    name: m.name,
    status: status[i],
    zeitraum: m.von && m.bis ? zeitraumPunkt(m.von, m.bis) : null,
    ziel: m.ueberzeile === "Abschluss",
  }));
  // Brief 2.3: beim Öffnen ist das aktuelle Modul gewählt.
  const gewaehltIndex = Math.max(
    0,
    pfad.findIndex((m) => m.id === modulParam) !== -1
      ? pfad.findIndex((m) => m.id === modulParam)
      : pfad.findIndex((m) => m.status === "aktuell")
  );
  const gewaehlt = pfad[gewaehltIndex] ?? null;
  const gewaehltesModul = modulListe[gewaehltIndex] ?? null;
  const gewaehlteWochen = gewaehltesModul?.wochenIds ?? new Set<string>();

  // Brief 2.4, Kacheln -- dieselben Regeln wie auf der Kompetenzseite:
  // Teilschritte des Moduls = Teilschritte, auf die Inhalte seiner Wochen
  // einzahlen; Kompetenzen = mit mindestens einem dieser Teilschritte.
  const modulSteps = new Set(stepsJeWoche.filter((w) => gewaehlteWochen.has(w.id)).flatMap((w) => [...w.stepIds]));
  const erreichteSteps = new Set(
    kompetenzen.flatMap((k) => k.steps.filter((st) => st.status === "abgeschlossen").map((st) => st.id))
  );
  const kompetenzAnzahl = kompetenzen.filter((k) => k.steps.some((st) => modulSteps.has(st.id))).length;
  const stepsErreicht = [...modulSteps].filter((id) => erreichteSteps.has(id)).length;

  // Lerntage (Entscheidung Anna 2026-10-11): geplante Tage im Zeitraum des
  // Moduls; absolviert = alles an dem Tag erledigt -- derselbe Haken wie in
  // der Tagesliste des Stundenplans (Live nur mit bestätigter Anwesenheit).
  const plan =
    gewaehltesModul?.von && gewaehltesModul.bis
      ? await getStundenplan({ ...ctx, learnerId: learner.personId }, gewaehltesModul.von, gewaehltesModul.bis)
      : [];
  const jetzt = simuliert ?? jetztInBerlin();
  const lernTage = planModell(plan, heute, jetzt).filter(
    (t) => t.bloecke.length > 0 || t.chips.length > 0
  );

  const kacheln: Kachel[] = [
    kompetenzAnzahl > 0 ? { wert: String(kompetenzAnzahl), label: kompetenzAnzahl === 1 ? "Kompetenz" : "Kompetenzen" } : null,
    modulSteps.size > 0 ? { wert: `${stepsErreicht} / ${modulSteps.size}`, label: "Kompetenzschritte erreicht" } : null,
    lernTage.length > 0 ? { wert: `${lernTage.filter(tagErledigt).length} / ${lernTage.length}`, label: "Lerntage absolviert" } : null,
  ].filter((k): k is Kachel => !!k);

  // Brief 2.2, angepasst (Anna 2026-10-11): "Start {Datum} · Ende {Datum} · {n} Module"
  // statt Dauer. Ende: Kohorte, sonst Ende des letzten Moduls; Fehlendes weglassen.
  const anzahl = modulListe.filter((m) => m.ueberzeile.startsWith("Modul")).length;
  const ende = kohorte?.ende ?? modulListe.at(-1)?.bis ?? null;
  const kopfZeile = [
    kohorte ? `Start ${datumPunkt(kohorte.start)}` : null,
    ende ? `Ende ${datumPunkt(ende)}` : null,
    anzahl ? `${anzahl} ${anzahl === 1 ? "Modul" : "Module"}` : null,
  ].filter(Boolean);

  return (
    <div data-breit className="flex flex-col gap-10 text-ink">
      {simuliert && (
        <p className="inline-flex items-center gap-2 self-start rounded-full bg-brand-tint px-3 py-1 text-[13px]">
          <FlaskConical className="size-4 shrink-0 text-brand" aria-hidden="true" />
          Testansicht: simulierte Zeit {datumKurz(heute)}, {simuliert.slice(11, 16)} Uhr
        </p>
      )}

      <section className="flex flex-col gap-2.5">
        <span className="text-[13px] text-ink-subtle">Dein Programm</span>
        <h1 className="font-heading text-[34px] leading-[1.05] md:text-[52px]">{learner.programmeName}</h1>
        {kopfZeile.length > 0 && <span className="text-[15px] text-ink-muted">{kopfZeile.join(" · ")}</span>}
      </section>

      {pfad.length > 0 && (
        <ModulPfad module={pfad} gewaehltId={gewaehlt?.id ?? null} href={(id) => `/content?modul=${id}&inhalte=1${nowZusatz}`} />
      )}

      {/* Brief 2.4 sah Tracking links und Kohorte rechts vor. Rückmeldung Anna
          2026-10-11 ("zu uneben"): Tracking über die volle Breite, darunter
          Kohorte und Ansprechpersonen als zwei gleich hohe Karten; mobil untereinander. */}
      <div className="flex flex-col gap-6">
        {gewaehlt && gewaehltesModul && (
          <TrackingKarte
            ueberzeile={gewaehlt.ueberzeile}
            zeitraum={gewaehlt.zeitraum}
            name={gewaehlt.name}
            status={gewaehlt.status}
            kacheln={kacheln}
            inhalte={
              <InhaltePanel
                ueberzeile={gewaehlt.ueberzeile}
                zeitraum={gewaehlt.zeitraum}
                name={gewaehlt.name}
                status={gewaehlt.status}
                wochen={panelWochen(
                  dbModule.filter((w) => gewaehlteWochen.has(w.id)),
                  groups,
                  plan,
                  heute,
                  jetzt,
                  gewaehlt.status === "aktuell"
                )}
                // Neue Kennung je Aufruf mit &inhalte=1 (Klick auf eine Modulkarte).
                oeffnen={inhalte === "1" ? randomUUID() : null}
              />
            }
            kompetenzenHref={
              gliederung
                ? gewaehlt.ueberzeile.startsWith("Modul")
                  ? `/kompetenzen?modul=${gewaehlt.id}${nowZusatz}`
                  : null
                : `/kompetenzen?modul=${[...gewaehlteWochen][0] ?? ""}${nowZusatz}`
            }
          />
        )}
        <KohorteKarten kohortenName={learner.cohortName} />
      </div>

    </div>
  );
}
