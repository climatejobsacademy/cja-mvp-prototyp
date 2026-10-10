// Stundenplan v2 (docs/design_handoff_stundenplan_v2, SR folgt): reine
// Kalender-Logik ohne Datenbank und ohne Uhr -- Zeitraum-Texte,
// Stundenbereich, Überlappungen, nächster Termin, Woche seit Kohortenstart,
// Wochentyp, Monatsraster. Getestet
// in src/lib/stundenplan.test.ts.

// @ts-expect-error TS5097: .ts-Endung für node:test nötig (wie die Tests)
import { montagDerWoche, plusTage, tageZwischen } from "./date.ts";

/**
 * VORLÄUFIG (Entscheidung Anna 2026-10-10): Praxistage haben in der
 * Datenbank keine Uhrzeit (field_job nur mit Datum, siehe Vera-Liste). Bis
 * Start/Ende ergänzt sind, stehen sie mit dieser Standardzeit im Raster --
 * in der Oberfläche immer als "ca." gekennzeichnet, nie als echte Zeit.
 */
export const PRAXIS_STANDARDZEIT = { start: "08:30:00", ende: "16:30:00" } as const;

/** Raster ohne Termine: 08:00-17:00. */
const RASTER_VON = 8;
const RASTER_BIS = 17;

/** "13:30:00" → 13.5 */
export function stunden(zeit: string): number {
  const [h, m] = zeit.split(":").map(Number);
  return h + (m || 0) / 60;
}

/**
 * Änderungsliste Anna 2026-10-10, Punkt 4: Raster von 1 h vor dem ersten
 * bis 1 h nach dem letzten Termin (volle Stunden). Ohne Termine 08-17 Uhr.
 */
export function stundenBereich(termine: { start: string; ende: string }[]): { von: number; bis: number } {
  if (termine.length === 0) return { von: RASTER_VON, bis: RASTER_BIS };
  const erster = Math.min(...termine.map((t) => stunden(t.start)));
  const letzter = Math.max(...termine.map((t) => stunden(t.ende)));
  return { von: Math.max(0, Math.floor(erster) - 1), bis: Math.min(24, Math.ceil(letzter) + 1) };
}

/**
 * Überlappende Termine nebeneinander (Brief 2.4, "wie Google"): jeder
 * Termin bekommt eine Spalte innerhalb seiner Überlappungsgruppe und die
 * Anzahl Spalten dieser Gruppe.
 */
export function spuren<T extends { id: string; start: string; ende: string }>(
  termine: T[]
): Map<string, { spalte: number; spalten: number }> {
  const sortiert = [...termine].sort((a, b) => a.start.localeCompare(b.start) || b.ende.localeCompare(a.ende));
  const ergebnis = new Map<string, { spalte: number; spalten: number }>();
  let gruppe: { id: string; spalte: number }[] = [];
  let spaltenEnde: string[] = [];
  let gruppenEnde = "";

  const abschliessen = () => {
    for (const g of gruppe) ergebnis.set(g.id, { spalte: g.spalte, spalten: spaltenEnde.length });
    gruppe = [];
    spaltenEnde = [];
  };

  for (const t of sortiert) {
    if (gruppe.length > 0 && t.start >= gruppenEnde) abschliessen();
    let spalte = spaltenEnde.findIndex((ende) => ende <= t.start);
    if (spalte === -1) {
      spalte = spaltenEnde.length;
      spaltenEnde.push(t.ende);
    } else {
      spaltenEnde[spalte] = t.ende;
    }
    gruppe.push({ id: t.id, spalte });
    gruppenEnde = gruppe.length === 1 ? t.ende : t.ende > gruppenEnde ? t.ende : gruppenEnde;
  }
  abschliessen();
  return ergebnis;
}

export type Tagestyp = "theorie" | "praxis" | "lernen";

/** Brief 4 (Fallback-Regel): Praxis → Praxistag, Live → Theorietag, sonst Lerntag; nichts geplant → null. */
export function tagestypAus(tag: { live: number; praxis: number; flex: number }): Tagestyp | null {
  if (tag.praxis > 0) return "praxis";
  if (tag.live > 0) return "theorie";
  if (tag.flex > 0) return "lernen";
  return null;
}

/**
 * Brief 2.4/5: der nächste bzw. laufende Termin ab `jetzt` (über die ganze
 * angezeigte Woche) -- der, dessen Ende noch nicht vorbei ist.
 */
export function naechsterTerminId(
  termine: { id: string; datum: string; start: string; ende: string }[],
  jetzt: string
): string | null {
  const offen = termine
    .filter((t) => `${t.datum}T${t.ende}` > jetzt)
    .sort((a, b) => `${a.datum}T${a.start}`.localeCompare(`${b.datum}T${b.start}`));
  return offen[0]?.id ?? null;
}

/** Montag bis Freitag der Woche von `datum`. */
export function arbeitstage(datum: string): string[] {
  const montag = montagDerWoche(datum);
  return [0, 1, 2, 3, 4].map((i) => plusTage(montag, i));
}

/** Tagesansicht: vorheriger/nächster Arbeitstag (Wochenende wird übersprungen). */
export function naechsterArbeitstag(datum: string, richtung: 1 | -1): string {
  let d = plusTage(datum, richtung);
  while ([0, 6].includes(new Date(`${d}T00:00:00Z`).getUTCDay())) d = plusTage(d, richtung);
  return d;
}

/**
 * "Woche 2": Woche 1 ist die Woche, in der die Kohorte startet
 * (Änderungsliste Anna 2026-10-10, Punkt 6: Start 28.09.2026 → 05.-09.10.
 * ist Woche 2). Vor dem Start oder ohne Start: null.
 */
export function wocheSeit(start: string | null, datum: string): number | null {
  if (!start) return null;
  const wochen = Math.floor(tageZwischen(montagDerWoche(start), montagDerWoche(datum)) / 7);
  return wochen >= 0 ? wochen + 1 : null;
}

const TYP_REIHENFOLGE: Tagestyp[] = ["theorie", "praxis", "lernen"];

/**
 * Änderungsliste Punkt 1: der Typ, den die meisten Tage des Zeitraums
 * haben (bei Gleichstand Theorie vor Praxis vor Lernen). Nur Tage mit
 * anderem Typ bekommen ein eigenes Label. Nichts geplant: null.
 */
export function haupttyp(typen: (Tagestyp | null)[]): Tagestyp | null {
  let bester: Tagestyp | null = null;
  let anzahl = 0;
  for (const typ of TYP_REIHENFOLGE) {
    const n = typen.filter((t) => t === typ).length;
    if (n > anzahl) {
      bester = typ;
      anzahl = n;
    }
  }
  return bester;
}

/**
 * Monatsansicht: die Montage aller Wochen, die einen Tag des Monats von
 * `datum` enthalten (4-6 Zeilen à Mo-So).
 */
export function monatsWochen(datum: string): string[] {
  const erster = `${datum.slice(0, 7)}-01`;
  const naechsterErster = plusMonate(erster, 1);
  const wochen: string[] = [];
  for (let m = montagDerWoche(erster); m < naechsterErster; m = plusTage(m, 7)) wochen.push(m);
  return wochen;
}

/** Erster Tag des Monats `n` Monate nach dem Monat von `datum`. */
export function plusMonate(datum: string, n: number): string {
  const [j, m] = datum.split("-").map(Number);
  const index = j * 12 + (m - 1) + n;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}-01`;
}

/** "Oktober 2026" */
export function monatText(datum: string): string {
  const [j, m] = datum.split("-").map(Number);
  return `${MONAT_LANG[m - 1]} ${j}`;
}

const MONAT_LANG = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const MONAT_KURZ = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."];

/**
 * Zeitraum der Arbeitswoche: "5. – 9. Oktober 2026", über Monatsgrenzen
 * "28. September – 2. Oktober 2026", über Jahresgrenzen mit beiden Jahren.
 * `kurz`: "5. – 9. Okt." (mobil, ohne Jahr).
 */
export function zeitraumText(montag: string, kurz = false): string {
  const freitag = plusTage(montag, 4);
  const [j1, m1, t1] = montag.split("-").map(Number);
  const [j2, m2, t2] = freitag.split("-").map(Number);
  const monat = kurz ? MONAT_KURZ : MONAT_LANG;
  const jahr = (j: number) => (kurz ? "" : ` ${j}`);
  if (j1 !== j2) return `${t1}. ${monat[m1 - 1]}${jahr(j1)} – ${t2}. ${monat[m2 - 1]}${jahr(j2)}`;
  if (m1 !== m2) return `${t1}. ${monat[m1 - 1]} – ${t2}. ${monat[m2 - 1]}${jahr(j2)}`;
  return `${t1}. – ${t2}. ${monat[m2 - 1]}${jahr(j2)}`;
}
