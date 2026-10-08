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
