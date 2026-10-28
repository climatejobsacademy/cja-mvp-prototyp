"use client";

import { CalendarClock, ClipboardCheck, FileText, History, Printer, Star, UserCheck, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { PlanUebersicht } from "./plan-uebersicht";
import { FOKUS, SEKUNDAER, UEBERSCHRIFT } from "./stile";

type Eintrag = { id: string; text: string };
type Kriterium = { id: string; titel: string; ko?: boolean };

/** "JJJJ-MM-TTTHH:MM:SS" (Berlin) als "TT.MM.JJJJ, HH:MM". */
export function zeitAnzeige(zeit: string): string {
  return `${zeit.slice(8, 10)}.${zeit.slice(5, 7)}.${zeit.slice(0, 4)}, ${zeit.slice(11, 16)}`;
}

function Abschnitt({ icon: Icon, titel, children }: { icon: LucideIcon; titel: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-line pt-5 first:border-t-0 first:pt-0 break-inside-avoid">
      <h3 className={cn(UEBERSCHRIFT, "flex items-center gap-2")}>
        <Icon className="size-[18px] text-praxis-text" aria-hidden="true" />
        {titel}
      </h3>
      {children}
    </section>
  );
}

function Zeile({ name, wert }: { name: string; wert: React.ReactNode }) {
  return (
    <>
      <dt className="text-ink-muted">{name}</dt>
      <dd className="text-ink">{wert}</dd>
    </>
  );
}

function DateiNamen({ dateien, leer }: { dateien: string[]; leer: string }) {
  if (dateien.length === 0) return <p className="text-sm text-ink-subtle">{leer}</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      {dateien.map((d, i) => (
        <li key={`${d}-${i}`} className="flex items-center gap-2 text-[15px] text-ink">
          <FileText className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
          <span className="min-w-0 truncate">{d}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Digitale Auftragsakte (Plan Anna 2026-10-20, Partner-Feedback 15.10.):
 * alles zu einem abgeschlossenen Praxisauftrag auf einen Blick, als Nachweis
 * für Prüfdienst und Arbeitsagentur. In der Demo aus dem Browser-Stand;
 * Drucken bzw. "Als PDF sichern" über den Browser.
 */
export function Auftragsakte({
  auftrag,
  auftragDateien,
  hilfeDateien,
  werkzeuge,
  materialien,
  schritte,
  planDateien,
  pruefungenOhneSpannung,
  unterSpannung,
  pruefungenUnterSpannung,
  protokollDateien,
  freigabe,
  kriterien,
  einschaetzungen,
  abgabe,
  verlauf,
}: {
  /** Abgabefrist entfällt (Malte 2026-10-28: Lernende schätzen die Dauer selbst ein). */
  auftrag: { titel: string; ausgabe: string; trainer: string };
  auftragDateien: string[];
  hilfeDateien?: string[];
  werkzeuge: Eintrag[];
  materialien: Eintrag[];
  schritte: Eintrag[];
  planDateien: string[];
  pruefungenOhneSpannung: { titel: string; erledigt: boolean }[];
  /** Auftrag mit Inbetriebnahme unter Spannung (sonst ohne Freigabe). */
  unterSpannung: boolean;
  pruefungenUnterSpannung: { titel: string; erledigt: boolean }[];
  protokollDateien: string[];
  freigabe: string | null;
  kriterien: Kriterium[];
  einschaetzungen: { name: string; werte: Record<string, number> }[];
  abgabe: string | null;
  verlauf: { zeit: string; text: string }[];
}) {
  const raster = { gridTemplateColumns: `1fr repeat(${einschaetzungen.length}, 4.5rem)` };
  const pruefListe = (liste: { titel: string; erledigt: boolean }[]) => (
    <ul className="flex flex-col gap-1">
      {liste.map((p) => (
        <li key={p.titel} className="text-[15px] text-ink">
          {p.erledigt ? "✓" : "–"} {p.titel}
        </li>
      ))}
    </ul>
  );

  return (
    <article className="flex flex-col gap-5 rounded-karte bg-card p-5 text-ink shadow-card md:p-7" aria-labelledby="akte-titel">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-ink-muted">Auftragsakte</span>
          <h2 id="akte-titel" className="font-heading text-[26px] leading-tight md:text-[32px]">
            {auftrag.titel}
          </h2>
        </div>
        <button type="button" onClick={() => window.print()} className={cn(SEKUNDAER, "w-auto print:hidden", FOKUS)}>
          <Printer aria-hidden="true" />
          Drucken oder als PDF sichern
        </button>
      </header>

      <Abschnitt icon={CalendarClock} titel="Auftrag und Annahme">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[15px]">
          <Zeile name="Ausgegeben" wert={auftrag.ausgabe} />
          <Zeile name="Trainer:in" wert={auftrag.trainer} />
        </dl>
        <DateiNamen dateien={auftragDateien} leer="Kein unterschriebener Auftrag hochgeladen." />
        {hilfeDateien && hilfeDateien.length > 0 && (
          <>
            <span className="text-sm font-semibold text-ink-muted">Eigene Hilfsunterlagen</span>
            <DateiNamen dateien={hilfeDateien} leer="" />
          </>
        )}
      </Abschnitt>

      <Abschnitt icon={FileText} titel="Planung und Materialliste">
        <PlanUebersicht werkzeuge={werkzeuge} materialien={materialien} schritte={schritte} />
      </Abschnitt>

      <Abschnitt icon={FileText} titel="Pläne und Zeichnungen">
        <DateiNamen dateien={planDateien} leer="Keine Pläne hochgeladen." />
      </Abschnitt>

      <Abschnitt icon={ClipboardCheck} titel="Kontrolle und Prüfprotokoll">
        <span className="text-sm font-semibold text-ink-muted">Ohne Spannung</span>
        {pruefListe(pruefungenOhneSpannung)}
        {unterSpannung ? (
          <>
            <p className="inline-flex items-center gap-2 text-[15px] text-ink">
              <UserCheck className="size-4 text-praxis-text" aria-hidden="true" />
              {freigabe
                ? `Inbetriebnahme freigegeben durch ${auftrag.trainer} am ${zeitAnzeige(freigabe)}`
                : "Keine Freigabe zur Inbetriebnahme"}
            </p>
            <span className="text-sm font-semibold text-ink-muted">Unter Spannung</span>
            {pruefListe(pruefungenUnterSpannung)}
          </>
        ) : (
          <p className="text-[15px] text-ink-muted">Auftrag ohne Spannung: keine Freigabe zur Inbetriebnahme nötig.</p>
        )}
        <DateiNamen dateien={protokollDateien} leer="Kein Prüfprotokoll hochgeladen." />
      </Abschnitt>

      <Abschnitt icon={Star} titel="Drei Einschätzungen">
        <ul className="flex flex-col gap-1.5">
          <li className="grid gap-x-2 text-xs font-semibold text-ink-muted" style={raster} aria-hidden="true">
            <span>Kriterium</span>
            {einschaetzungen.map((e) => (
              <span key={e.name} className="text-center">
                {e.name}
              </span>
            ))}
          </li>
          {kriterien.map((k) => (
            <li key={k.id} className="grid items-center gap-x-2 rounded-zeile bg-subtle px-3 py-2" style={raster}>
              <span className="min-w-0 text-[15px]">
                {k.titel}
                {k.ko && <span className="ml-1.5 text-xs font-semibold text-praxis-text">K.-o.</span>}
              </span>
              {einschaetzungen.map((e) => (
                <span key={e.name} className="text-center font-bold tabular-nums" aria-label={`${e.name}: ${e.werte[k.id] ?? "–"} Punkte`}>
                  {e.werte[k.id] ?? "–"}
                </span>
              ))}
            </li>
          ))}
        </ul>
      </Abschnitt>

      <Abschnitt icon={CalendarClock} titel="Abgabe und Status">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[15px]">
          <Zeile name="Abgegeben" wert={abgabe ? zeitAnzeige(abgabe) : "–"} />
          <Zeile name="Status" wert="Abgeschlossen, Bestätigung durch die Akademie läuft" />
        </dl>
      </Abschnitt>

      <Abschnitt icon={History} titel="Verlauf">
        <ol className="flex flex-col gap-1">
          {verlauf.map((v, i) => (
            <li key={`${v.zeit}-${i}`} className="grid grid-cols-[9.5rem_1fr] gap-x-3 text-[15px]">
              <span className="tabular-nums text-ink-muted">{zeitAnzeige(v.zeit)}</span>
              <span className="text-ink">{v.text}</span>
            </li>
          ))}
        </ol>
      </Abschnitt>
    </article>
  );
}
