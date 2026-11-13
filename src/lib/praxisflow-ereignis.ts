// Ereignisse aus der Oberfläche des Praxisflows (SR-92). Nur Art und
// Schritt-Kennung, nie Inhalte oder Dateinamen; die Datenbank prüft beides
// (fn_praxis_ereignis_melden, 0064). Melden ist "fire and forget": ein
// Fehler darf den Praxisflow nie stören.

export type PraxisEreignisArt = "auftrag_geoeffnet" | "schritt_geoeffnet" | "schritt_beendet" | "hilfe_geoeffnet" | "vorschau_geoeffnet";
export type PraxisEreignis = { art: PraxisEreignisArt; schritt: string };

const KENNUNG = /^[a-z0-9:_-]{1,80}$/;

/**
 * Einstieg in einen Praxisauftrag (SR-92, 0072): woher die Person kommt, aus
 * dem Parameter ?von= der Links. Unbekannt oder ohne Parameter: "direkt".
 * Dieselbe Liste prüft fn_praxis_ereignis_melden.
 */
export const EINSTIEGE = ["home", "stundenplan", "tagesuebersicht", "programm", "kompetenzen", "naechster", "direkt"] as const;
export type Einstieg = (typeof EINSTIEGE)[number];

export function einstiegAus(von: string | undefined): Einstieg {
  return (EINSTIEGE as readonly string[]).includes(von ?? "") ? (von as Einstieg) : "direkt";
}

/** Nur gültige Kennungen; ungültige fallen still heraus. */
export function ereignisseFiltern(liste: PraxisEreignis[]): PraxisEreignis[] {
  return liste.filter((e) => KENNUNG.test(e.schritt)).slice(0, 20);
}

export function ereignisseMelden(fieldJobId: string, liste: PraxisEreignis[], signal?: AbortSignal) {
  const ereignisse = ereignisseFiltern(liste);
  if (ereignisse.length === 0) return;
  fetch(`/praxistag/${fieldJobId}/ereignis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ereignisse),
    keepalive: true,
    signal,
  }).catch(() => {
    // still: Auswertung ist zweitrangig gegenüber dem Ablauf
  });
}
