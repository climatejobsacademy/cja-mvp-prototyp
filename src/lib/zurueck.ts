// Zurück-Link oben auf Detailseiten: zur Seite, von der man kam. Gleich für
// Lektionen, Fachsprache, Praxisauftrag, Labortag und Tagesübersicht
// (SR-64 Navigation, ergänzt 12.11.2026). Nur feste, interne Ziele.

export type ZurueckZiel = { href: string; label: string };
export type Herkunft = "stundenplan" | "home" | "programm" | "kompetenzen" | "tagesuebersicht";

const DATUM = /^\d{4}-\d{2}-\d{2}$/;

/** Ziel und Beschriftung je Herkunft; ein gültiges Datum führt auf den Tag. */
export function zurueckZu(ziel: Herkunft, datum?: string): ZurueckZiel {
  const tag = datum && DATUM.test(datum) ? datum : undefined;
  switch (ziel) {
    case "home":
      return { href: "/home", label: "Zurück zu Home" };
    case "programm":
      return { href: "/content", label: "Zurück zum Programm" };
    case "kompetenzen":
      return { href: "/kompetenzen", label: "Zurück zu den Kompetenzen" };
    case "tagesuebersicht":
      return tag ? { href: `/praxistag/tag/${tag}`, label: "Zurück zur Tagesübersicht" } : zurueckZu("stundenplan");
    case "stundenplan":
      return { href: tag ? `/schedule?datum=${tag}` : "/schedule", label: "Zurück zum Stundenplan" };
  }
}

/**
 * Praxisauftrag und Labortag: zurück dorthin, woher der Auftrag geöffnet
 * wurde (?von=, siehe EINSTIEGE in praxisflow-ereignis.ts). Nach dem Knopf
 * „nächster Praxisauftrag“ zur Tagesübersicht; ohne bekannte Herkunft zum
 * Stundenplan auf dem Tag des Auftrags.
 */
export function praxisZurueck(von: string | undefined, datum: string): ZurueckZiel {
  switch (von) {
    case "tagesuebersicht":
    case "naechster":
      return zurueckZu("tagesuebersicht", datum);
    case "home":
    case "programm":
    case "kompetenzen":
      return zurueckZu(von);
    default:
      return zurueckZu("stundenplan", datum);
  }
}
