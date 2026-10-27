import { randomUUID } from "node:crypto";

import { FlaskConical } from "lucide-react";

import { ProgrammZeile } from "@/components/programm-zeile";
import { datumKurz, heuteInBerlin, jetztInBerlin } from "@/lib/date";
import { datumPunkt, zeitraumPunkt } from "@/lib/programm";
import { panelWochen } from "@/lib/programm-inhalte";
import { getKompetenzFortschritt } from "@/lib/queries/competencies";
import { getContentLibrary } from "@/lib/queries/content";
import { getKohortenZeitraum, getModulKompetenzen, getModuleDerKohorte } from "@/lib/queries/modul";
import { requireCurrentLearner } from "@/lib/queries/session";
import { getStundenplan } from "@/lib/queries/stundenplan";
import { getMeineKohorte } from "@/lib/queries/kohorte";
import { getMeineTrainer } from "@/lib/queries/trainer";
import { parseNowParameter } from "@/lib/stundenplan";

import { tagErledigt, tagZaehlt } from "../schedule/plan-bausteine";
import { planModell } from "../schedule/plan-modell";

import { InhaltePanel } from "./inhalte-panel";
import { KohorteKarten } from "./kohorte-karten";
import { ModulPfad, type PfadModul } from "./modul-pfad";
import { TrackingKarte, type Kachel } from "./tracking-karte";

// Programmseite (docs/design_handoff_programm_v8; SR-14, SR-59): Überblick
// über das ganze Programm -- Kopf, Modulpfad "Dein Weg", Tracking des
// gewählten Moduls, Kohorte und Ansprechpersonen; die Wochen mit Kursen und
// Lektionen im Seitenpanel "Inhalte des Moduls". Seit Paket D auf der
// Modul-Ebene (0028): Module aus `modul`, Zeiträume aus dem Stundenplan der
// Kohorte (fn_modul_zeitraum), Wochen über module.modul_id, Kompetenzen je
// Modul ausdrücklich aus modul_competency (Entscheidung 2026-10-13). Keine
// feste Gliederung, keine Beispielpersonen. Adresse bleibt /content.

export default async function ProgrammPage({
  searchParams,
}: {
  searchParams: Promise<{ modul?: string; inhalte?: string; now?: string }>;
}) {
  const learner = await requireCurrentLearner();
  const { modul: modulParam, inhalte, now } = await searchParams;

  // Wie Home, Kompetenzen und Stundenplan: simuliertes "jetzt" zum Testen,
  // nur lokal und in Previews, nie auf Production.
  const simuliert = process.env.VERCEL_ENV !== "production" ? parseNowParameter(now) : null;
  const heute = simuliert ? simuliert.slice(0, 10) : heuteInBerlin();
  const jetzt = simuliert ?? jetztInBerlin();
  const nowZusatz = simuliert && now ? `&now=${encodeURIComponent(now)}` : "";

  const [modulListe, kohorte, groups, kompetenzen, trainer, mitglieder] = await Promise.all([
    getModuleDerKohorte(learner.programmeId, learner.cohortId, heute),
    getKohortenZeitraum(learner.cohortId),
    getContentLibrary(learner.programmeId, learner.personId),
    getKompetenzFortschritt(learner.personId, learner.programmeId),
    getMeineTrainer(),
    getMeineKohorte(),
  ]);

  const pfad: PfadModul[] = modulListe.map((m, i) => ({
    id: m.id,
    nummer: i + 1,
    ueberzeile: m.ueberzeile,
    name: m.name,
    status: m.status,
    zeitraum: m.von && m.bis ? zeitraumPunkt(m.von, m.bis) : null,
    ziel: m.ueberzeile === "Abschluss",
  }));
  // Brief 2.3: beim Öffnen ist das aktuelle Modul gewählt, sonst das erste.
  const gewaehltIndex = Math.max(
    0,
    pfad.findIndex((m) => m.id === modulParam) !== -1
      ? pfad.findIndex((m) => m.id === modulParam)
      : pfad.findIndex((m) => m.status === "aktuell")
  );
  const gewaehlt = pfad[gewaehltIndex] ?? null;
  const gewaehltesModul = modulListe[gewaehltIndex] ?? null;

  const [modulKompetenzen, plan] = await Promise.all([
    getModulKompetenzen(gewaehltesModul ? [gewaehltesModul.id] : []),
    gewaehltesModul?.von && gewaehltesModul.bis
      ? getStundenplan(
          {
            organisationId: learner.organisationId,
            cohortId: learner.cohortId,
            enrolmentId: learner.enrolmentId,
            learnerId: learner.personId,
          },
          gewaehltesModul.von,
          gewaehltesModul.bis
        )
      : Promise.resolve([]),
  ]);

  // Brief 2.4, Kacheln: Kompetenzen des Moduls ausdrücklich aus
  // modul_competency; Kompetenzschritte = deren Teilschritte, erreicht wie auf
  // der Kompetenzseite (competency_fulfilment). Bis zum Import leer -- dann
  // fallen beide Kacheln weg.
  const kompetenzIds = new Set((gewaehltesModul ? (modulKompetenzen.get(gewaehltesModul.id) ?? []) : []).map((k) => k.competencyId));
  const imModul = kompetenzen.filter((k) => kompetenzIds.has(k.id));
  const steps = new Map(imModul.flatMap((k) => k.steps.map((st) => [st.id, st.status] as const)));
  const stepsErreicht = [...steps.values()].filter((st) => st === "abgeschlossen").length;

  // Lerntage (Entscheidung Anna 2026-10-11): geplante Tage im Zeitraum des
  // Moduls; absolviert = alles an dem Tag erledigt -- derselbe Haken wie im
  // Stundenplan (Live nur mit bestätigter Anwesenheit; Live ohne eigene
  // Lektion wie Deutsch oder Coaching zählt nicht, Anna 2026-10-20).
  const lernTage = planModell(plan, heute, jetzt).filter(tagZaehlt);

  const kacheln: Kachel[] = [
    imModul.length > 0 ? { wert: String(imModul.length), label: imModul.length === 1 ? "Kompetenz" : "Kompetenzen" } : null,
    steps.size > 0 ? { wert: `${stepsErreicht} / ${steps.size}`, label: "Kompetenzschritte erreicht" } : null,
    lernTage.length > 0 ? { wert: `${lernTage.filter(tagErledigt).length} / ${lernTage.length}`, label: "Lerntage absolviert" } : null,
  ].filter((k): k is Kachel => !!k);

  // Brief 2.2, angepasst (Anna 2026-10-11): "Start {Datum} · Ende {Datum} · {n} Module".
  // Ende: Kohorte, sonst Ende des letzten geplanten Moduls; Fehlendes weglassen.
  // Gezählt werden Module mit Überzeile "Modul …", nicht der Abschluss.
  const anzahl = modulListe.filter((m) => m.ueberzeile.startsWith("Modul")).length;
  const ende = kohorte?.ende ?? modulListe.findLast((m) => m.bis)?.bis ?? null;
  const kopfZeile = [
    kohorte ? `Start ${datumPunkt(kohorte.start)}` : null,
    ende ? `Ende ${datumPunkt(ende)}` : null,
    anzahl ? `${anzahl} ${anzahl === 1 ? "Modul" : "Module"}` : null,
  ].filter(Boolean);

  const wochen = gewaehltesModul ? groups.filter((g) => g.modulId === gewaehltesModul.id) : [];

  return (
    <div data-breit className="flex flex-col gap-10 text-ink">
      {simuliert && (
        <p className="inline-flex items-center gap-2 self-start rounded-full bg-brand-tint px-3 py-1 text-[13px]">
          <FlaskConical className="size-4 shrink-0 text-brand" aria-hidden="true" />
          Testansicht: simulierte Zeit {datumKurz(heute)}, {jetzt.slice(11, 16)} Uhr
        </p>
      )}

      <section className="flex flex-col gap-2.5">
        <ProgrammZeile name="Dein Programm" />
        <h1 className="font-heading text-[34px] leading-[1.05] md:text-[52px]">{learner.programmeName}</h1>
        {kopfZeile.length > 0 && <span className="text-[15px] text-ink-muted">{kopfZeile.join(" · ")}</span>}
      </section>

      {pfad.length > 0 ? (
        <ModulPfad module={pfad} gewaehltId={gewaehlt?.id ?? null} href={(id) => `/content?modul=${id}&inhalte=1${nowZusatz}`} />
      ) : (
        <p className="text-sm text-ink-muted">Die Module deines Programms werden gerade eingerichtet.</p>
      )}

      {/* Tracking über die volle Breite, darunter Kohorte und Ansprechpersonen
          als zwei gleich hohe Karten; mobil untereinander (Anna 2026-10-11). */}
      <div className="flex flex-col gap-6">
        {gewaehlt && (
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
                wochen={panelWochen(wochen, plan, heute, jetzt, gewaehlt.status === "aktuell")}
                // Neue Kennung je Aufruf mit &inhalte=1 (Klick auf eine Modulkarte).
                oeffnen={inhalte === "1" ? randomUUID() : null}
              />
            }
            kompetenzenHref={imModul.length > 0 ? `/kompetenzen?modul=${gewaehlt.id}${nowZusatz}` : null}
          />
        )}
        <KohorteKarten kohortenName={learner.cohortName} mitglieder={mitglieder} trainer={[...trainer.values()]} />
      </div>
    </div>
  );
}
