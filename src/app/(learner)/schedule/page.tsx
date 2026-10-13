import { FlaskConical } from "lucide-react";

import { ModulZeichen } from "@/components/modul-zeichen";
import { ProgrammZeile } from "@/components/programm-zeile";
import { datumKurz, datumLang, heuteInBerlin, jetztInBerlin, montagDerWoche, plusTage } from "@/lib/date";
import { getModuleDerKohorte } from "@/lib/queries/modul";
import { requireCurrentLearner } from "@/lib/queries/session";
import { getKohortenStart, getStundenplan } from "@/lib/queries/stundenplan";
import {
  arbeitstage,
  haupttyp,
  monatsWochen,
  monatText,
  naechsterArbeitstag,
  parseNowParameter,
  plusMonate,
  wocheSeit,
  zeitraumText,
} from "@/lib/stundenplan";

import { inWochen, MobilAnsicht, MonatsAnsicht, Steuerleiste, TagesAnsicht, WochenAnsicht, type Ansicht } from "./ansichten";
import { AbweichungsLabel, WochenTypIcon } from "./plan-bausteine";
import { planModell } from "./plan-modell";

// Stundenplan v2 (SR-13, SR-73; Design aus dem Branch demo): Kalender nach
// dem Prinzip von Google -- Woche (Desktop-Standard), Tag (Desktop und
// mobil) und Monat (nur Desktop). Entscheidungen Anna 2026-10-10: Häkchen
// bei Live nur mit bestätigter Anwesenheit, kein Reiter "Programm", Breite
// 1080 px (data-breit). Praxistage mit Uhrzeit aus field_job.start/ende
// (0026), ohne Uhrzeit ganztägig -- keine Platzhalterzeit.

const DATUM = /^\d{4}-\d{2}-\d{2}$/;

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ ansicht?: string; datum?: string; now?: string }>;
}) {
  const learner = await requireCurrentLearner();
  const { ansicht: ansichtParam, datum: datumParam, now } = await searchParams;

  // Wie Home: simuliertes "jetzt" zum Testen (?now=…), nie auf Production.
  const simuliert = process.env.VERCEL_ENV !== "production" ? parseNowParameter(now) : null;
  const jetzt = simuliert ?? jetztInBerlin();
  const heute = simuliert ? simuliert.slice(0, 10) : heuteInBerlin();

  // Brief 3: Ansicht und Datum in der URL. Ohne Ansicht: Desktop Woche, mobil Tag.
  const ansicht: Ansicht | null =
    ansichtParam === "tag" || ansichtParam === "woche" || ansichtParam === "monat" ? ansichtParam : null;
  const desktopAnsicht: Ansicht = ansicht ?? "woche";
  // Wunsch Anna 2026-10-11: am Wochenende zeigt der Stundenplan ohne
  // ausgewähltes Datum schon die kommende Woche (die vergangene ist vorbei).
  const wochenende = !arbeitstage(heute).includes(heute);
  const datum = datumParam && DATUM.test(datumParam) ? datumParam : wochenende ? naechsterArbeitstag(heute, 1) : heute;
  const montag = montagDerWoche(datum);
  const woche = arbeitstage(datum);

  // Eine gebündelte Abfrage: die ganze Woche (Mo–So, damit auch ein
  // Wochenendtag als Tag geöffnet werden kann) bzw. alle Wochen des Monats.
  const monatsMontage = desktopAnsicht === "monat" ? monatsWochen(datum) : [montag];
  const von = monatsMontage[0];
  const bis = plusTage(monatsMontage[monatsMontage.length - 1], 6);
  const ctx = {
    organisationId: learner.organisationId,
    cohortId: learner.cohortId,
    enrolmentId: learner.enrolmentId,
    learnerId: learner.personId,
  };
  const [plan, kohortenStart, modulListe] = await Promise.all([
    getStundenplan(ctx, von, bis),
    getKohortenStart(learner.cohortId),
    getModuleDerKohorte(learner.programmeId, learner.cohortId, heute),
  ]);
  // Module der gezeigten Woche (Anna 2026-10-12: eigene Zeile unter der
  // Überschrift): Module, deren Zeitraum im Stundenplan der Kohorte
  // (fn_modul_zeitraum, 0028) die Woche berührt -- keine feste Gliederung.
  const wochenModule = modulListe.filter((m) => m.von && m.bis && m.von <= woche[woche.length - 1] && m.bis >= woche[0]);
  const modelle = planModell(plan, heute, jetzt);
  const wochenTage = modelle.filter((t) => woche.includes(t.datum));
  const tag = modelle.find((t) => t.datum === datum)!;

  const wocheNr = wocheSeit(kohortenStart, datum);
  const haupt = haupttyp(wochenTage.map((t) => t.typ));

  const nowZusatz = simuliert && now ? `&now=${encodeURIComponent(now)}` : "";
  // "Heute"-Link nur noch mobil; am Desktop entfällt er (Entscheidung Anna
  // 2026-10-12). Zeigt die Ansicht schon heute, ist der Link aus (null).
  const href = (a: Ansicht, d: string) => `/schedule?ansicht=${a}&datum=${d}${nowZusatz}`;
  const tagHref = (d: string) => href("tag", d);

  // Entscheidung Anna 2026-10-12: neben dem Zeitraum nur das Symbol der
  // Wochenart, ohne "Woche 2 · Theorie (online)".
  const zusatz = haupt ? <WochenTypIcon typ={haupt} /> : null;
  const ohneJahr = (text: string) => text.replace(/\s\d{4}$/, "");
  // Visuelles Update (Anna 2026-10-11, wie im Mock-up): Steuerleiste und
  // Kalender stehen auf einer weißen Karte.
  const KALENDER_KARTE = "flex flex-col gap-6 rounded-karte bg-card p-6 shadow-card";

  return (
    <div data-breit className="flex flex-col gap-5">
      {simuliert && (
        <p className="inline-flex items-center gap-2 self-start rounded-full bg-brand-tint px-3 py-1 text-[13px] text-ink">
          <FlaskConical className="size-4 shrink-0 text-brand" aria-hidden="true" />
          Testansicht: simulierte Zeit {datumKurz(heute)}, {jetzt.slice(11, 16)} Uhr
        </p>
      )}

      {/* Desktop (ab 768 px): Woche, Tag oder Monat */}
      <div className="hidden flex-col gap-6 md:flex">
        <div className="flex flex-col gap-2 text-ink">
          <ProgrammZeile name={learner.programmeName} />
          <h1 className="font-heading text-[52px] leading-none">Stundenplan</h1>
          {wochenModule.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {wochenModule.map((m) => (
                <ModulZeichen key={m.id} ueberzeile={m.ueberzeile} name={m.name} />
              ))}
            </div>
          )}
        </div>

        {desktopAnsicht === "woche" && (
          <div className={KALENDER_KARTE}>
            <Steuerleiste
              ansicht="woche"
              zurueckHref={href("woche", plusTage(datum, -7))}
              vorHref={href("woche", plusTage(datum, 7))}
              zurueckLabel="Vorherige Woche"
              vorLabel="Nächste Woche"
              titel={ohneJahr(zeitraumText(montag))}
              zusatz={zusatz}
              umschalterHref={(a) => href(a, woche.includes(heute) && a === "tag" ? heute : datum)}
            />
            <WochenAnsicht tage={wochenTage} haupt={haupt} jetzt={jetzt} simuliert={!!simuliert} tagHref={tagHref} />
          </div>
        )}

        {desktopAnsicht === "tag" && (
          <div className={KALENDER_KARTE}>
            <Steuerleiste
              ansicht="tag"
              zurueckHref={href("tag", naechsterArbeitstag(datum, -1))}
              vorHref={href("tag", naechsterArbeitstag(datum, 1))}
              zurueckLabel="Vorheriger Tag"
              vorLabel="Nächster Tag"
              titel={datumLang(datum)}
              zusatz={
                <>
                  {zusatz} <AbweichungsLabel typ={tag.typ} haupt={haupt} />
                </>
              }
              umschalterHref={(a) => href(a, datum)}
            />
            <TagesAnsicht
              tag={tag}
              tage={wochenTage}
              haupt={haupt}
              wochenText={ohneJahr(zeitraumText(montag))}
              jetzt={jetzt}
              simuliert={!!simuliert}
              tagHref={tagHref}
            />
          </div>
        )}

        {desktopAnsicht === "monat" && (
          <div className={KALENDER_KARTE}>
            <Steuerleiste
              ansicht="monat"
              zurueckHref={href("monat", plusMonate(datum, -1))}
              vorHref={href("monat", plusMonate(datum, 1))}
              zurueckLabel="Vorheriger Monat"
              vorLabel="Nächster Monat"
              titel={monatText(datum)}
              zusatz={null}
              umschalterHref={(a) => href(a, a === "monat" || !datum.startsWith(heute.slice(0, 7)) ? datum : heute)}
            />
            <MonatsAnsicht
              wochen={inWochen(modelle, monatsMontage)}
              monat={datum.slice(0, 7)}
              wocheNr={(m) => wocheSeit(kohortenStart, m)}
              tagHref={tagHref}
            />
          </div>
        )}
      </div>

      {/* Mobil (< 768 px): immer Tagesansicht (Brief 2.6) */}
      <div className="md:hidden">
        <MobilAnsicht
          tag={tag}
          tage={wochenTage}
          haupt={haupt}
          wochenText={wocheNr ? `Woche ${wocheNr} · ${zeitraumText(montag, true)}` : zeitraumText(montag, true)}
          heuteHref={datum === heute ? null : href("tag", heute)}
          zurueckHref={href("tag", plusTage(datum, -7))}
          vorHref={href("tag", plusTage(datum, 7))}
          jetzt={jetzt}
          simuliert={!!simuliert}
          tagHref={tagHref}
        />
      </div>
    </div>
  );
}
