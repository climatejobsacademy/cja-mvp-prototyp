// "Heute" und "jetzt" immer in Europe/Berlin, unabhängig davon, wo der Code
// läuft (Vercel-Server in UTC, Browser in beliebiger Zone). Datums- und
// Uhrzeitwerte aus der Datenbank (date, time ohne Zone) sind Berliner Ortszeit.
//
// `jetzt` ist nur für Tests übergebbar; im App-Code ohne Argument aufrufen.

const ZEITZONE = "Europe/Berlin";

const datumUndZeit = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZEITZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function teile(jetzt: Date): Record<string, string> {
  return Object.fromEntries(datumUndZeit.formatToParts(jetzt).map((t) => [t.type, t.value]));
}

/** Heutiges Datum in Berlin als "JJJJ-MM-TT". */
export function heuteInBerlin(jetzt: Date = new Date()): string {
  const t = teile(jetzt);
  return `${t.year}-${t.month}-${t.day}`;
}

/** Aktueller Zeitpunkt in Berlin als "JJJJ-MM-TTTHH:MM:SS" (lexikografisch vergleichbar). */
export function jetztInBerlin(jetzt: Date = new Date()): string {
  const t = teile(jetzt);
  return `${t.year}-${t.month}-${t.day}T${t.hour}:${t.minute}:${t.second}`;
}

const anzeigeZeitpunkt = new Intl.DateTimeFormat("de-DE", {
  timeZone: ZEITZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Zeitstempel (ISO, z. B. timestamptz aus der Datenbank) in Berlin als "TT.MM.JJJJ, HH:MM". */
export function zeitpunktInBerlin(iso: string): string {
  return anzeigeZeitpunkt.format(new Date(iso));
}

// Anzeige von Kalendertagen "JJJJ-MM-TT" (Berliner Datum aus heuteInBerlin()
// bzw. date-Spalten der Datenbank). Gerechnet als Mitternacht UTC, damit die
// Anzeige nie um einen Tag verrutscht. Gemeinsam für Home und Kompetenzseite.
const alsTag = (datum: string) => new Date(`${datum}T00:00:00Z`);

/** Ganze Tage von `von` bis `bis` (negativ, wenn `bis` davor liegt). */
export function tageZwischen(von: string, bis: string): number {
  return Math.round((alsTag(bis).getTime() - alsTag(von).getTime()) / 86_400_000);
}

/** "Montag" */
export function wochentagLang(datum: string): string {
  return alsTag(datum).toLocaleDateString("de-DE", { weekday: "long", timeZone: "UTC" });
}

/** "Mo, 12.10." */
export function datumKurz(datum: string): string {
  const d = alsTag(datum);
  const tag = d.toLocaleDateString("de-DE", { weekday: "short", timeZone: "UTC" }).replace(".", "");
  // de-DE liefert "12.10." inklusive Schlusspunkt.
  return `${tag}, ${d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", timeZone: "UTC" })}`;
}

/** "Freitag, 9. Oktober" */
export function datumLang(datum: string): string {
  return alsTag(datum).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

/** Kommender Tag relativ zu heute: "heute", "morgen", "Montag" (bis 6 Tage), sonst "Mo, 12.10." */
export function tagRelativ(datum: string, heute: string): string {
  const tage = tageZwischen(heute, datum);
  if (tage === 0) return "heute";
  if (tage === 1) return "morgen";
  if (tage > 1 && tage < 7) return wochentagLang(datum);
  return datumKurz(datum);
}

/** Kalendertag plus/minus `tage` ("JJJJ-MM-TT"). */
export function plusTage(datum: string, tage: number): string {
  const d = alsTag(datum);
  d.setUTCDate(d.getUTCDate() + tage);
  return d.toISOString().slice(0, 10);
}

/** Montag der Woche, in der `datum` liegt (Woche beginnt Montag). */
export function montagDerWoche(datum: string): string {
  const wochentag = alsTag(datum).getUTCDay(); // 0 = Sonntag
  return plusTage(datum, wochentag === 0 ? -6 : 1 - wochentag);
}
