import { FlaskConical } from "lucide-react";

import { datumKurz, datumLang, heuteInBerlin, jetztInBerlin, montagDerWoche, plusTage } from "@/lib/date";
import { parseNowParameter } from "@/lib/home-tag";
import { requireCurrentLearner } from "@/lib/queries/session";
import { getKohortenStart, getStundenplan } from "@/lib/queries/stundenplan";
import {
  arbeitstage,
  haupttyp,
  monatsWochen,
  monatText,
  naechsterArbeitstag,
  plusMonate,
  wocheSeit,
  zeitraumText,
} from "@/lib/stundenplan";

import { inWochen, MobilAnsicht, MonatsAnsicht, Steuerleiste, TagesAnsicht, WochenAnsicht, type Ansicht } from "./ansichten";
import { AbweichungsLabel, WOCHENTYP_TEXT } from "./plan-bausteine";
import { planModell } from "./plan-modell";

// Stundenplan v2 (docs/design_handoff_stundenplan_v2, SR folgt): Kalender
// nach dem Prinzip von Google -- Woche (Desktop-Standard), Tag (Desktop und
// mobil) und Monat (nur Desktop). Entscheidungen Anna 2026-10-10:
// Praxistage vorläufig 08:30-16:30 ("ca."), Häkchen bei Live nur mit
// bestätigter Anwesenheit, kein Reiter "Programm", Breite wie alle Seiten
// 1080 px. Änderungsliste 2026-10-10: ruhigere Darstellung, "Woche n" ab
// Kohortenstart statt Modul, Monatsansicht.

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
  const datum = datumParam && DATUM.test(datumParam) ? datumParam : heute;
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
  const [plan, kohortenStart] = await Promise.all([getStundenplan(ctx, von, bis), getKohortenStart(learner.cohortId)]);
  const modelle = planModell(plan, heute, jetzt);
  const wochenTage = modelle.filter((t) => woche.includes(t.datum));
  const tag = modelle.find((t) => t.datum === datum)!;

  const wocheNr = wocheSeit(kohortenStart, datum);
  const haupt = haupttyp(wochenTage.map((t) => t.typ));

  const nowZusatz = simuliert && now ? `&now=${encodeURIComponent(now)}` : "";
  const href = (a: Ansicht, d: string) => `/schedule?ansicht=${a}&datum=${d}${nowZusatz}`;
  const tagHref = (d: string) => href("tag", d);

  // Punkt 1: "5. – 9. Oktober · Woche 2 · Theorie (online)"
  const zusatzTeile = [wocheNr ? `Woche ${wocheNr}` : null, haupt ? WOCHENTYP_TEXT[haupt] : null].filter(Boolean);
  const zusatz = zusatzTeile.length ? `· ${zusatzTeile.join(" · ")}` : null;
  const ohneJahr = (text: string) => text.replace(/\s\d{4}$/, "");

  return (
    <div data-breit className="flex flex-col gap-5">
      {simuliert && (
        <p className="inline-flex items-center gap-2 self-start rounded-full bg-info px-3 py-1 text-[13px] text-eco-deep-green">
          <FlaskConical className="size-4 shrink-0 text-lylac" aria-hidden="true" />
          Testansicht: simulierte Zeit {datumKurz(heute)}, {jetzt.slice(11, 16)} Uhr
        </p>
      )}

      {/* Desktop (ab 768 px): Woche, Tag oder Monat */}
      <div className="hidden flex-col gap-6 md:flex">
        <div className="flex flex-col gap-2 text-eco-deep-green">
          <span className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">{learner.programmeName}</span>
          <h1 className="font-heading text-[48px] leading-none">Stundenplan</h1>
        </div>

        {desktopAnsicht === "woche" && (
          <>
            <Steuerleiste
              ansicht="woche"
              heuteHref={href("woche", heute)}
              zurueckHref={href("woche", plusTage(datum, -7))}
              vorHref={href("woche", plusTage(datum, 7))}
              zurueckLabel="Vorherige Woche"
              vorLabel="Nächste Woche"
              titel={ohneJahr(zeitraumText(montag))}
              zusatz={zusatz}
              umschalterHref={(a) => href(a, woche.includes(heute) && a === "tag" ? heute : datum)}
            />
            <WochenAnsicht tage={wochenTage} haupt={haupt} jetzt={jetzt} simuliert={!!simuliert} tagHref={tagHref} />
          </>
        )}

        {desktopAnsicht === "tag" && (
          <>
            <Steuerleiste
              ansicht="tag"
              heuteHref={href("tag", heute)}
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
          </>
        )}

        {desktopAnsicht === "monat" && (
          <>
            <Steuerleiste
              ansicht="monat"
              heuteHref={href("monat", heute)}
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
          </>
        )}
      </div>

      {/* Mobil (< 768 px): immer Tagesansicht (Brief 2.6) */}
      <div className="md:hidden">
        <MobilAnsicht
          tag={tag}
          tage={wochenTage}
          haupt={haupt}
          wochenText={wocheNr ? `Woche ${wocheNr} · ${zeitraumText(montag, true)}` : zeitraumText(montag, true)}
          heuteHref={href("tag", heute)}
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
