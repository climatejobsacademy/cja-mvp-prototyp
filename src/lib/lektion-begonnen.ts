// Stand "begonnen" (SR-73, Datenlücke Nr. 9, Entscheidung 2026-10-13): beim
// ersten Öffnen einer Selbstlern-Lektion wird unit_progress mit
// "in Bearbeitung" angelegt. Live-Lektionen nicht -- dort zählt die
// Anwesenheit. Ein vorhandener Eintrag wird nie überschrieben, damit
// "abgeschlossen" nicht zurückgestuft wird.

import type { ContentType, UnitProgressStatus } from "@/lib/database.types";

export function begonnenSetzen(contentType: ContentType, status: UnitProgressStatus): boolean {
  return contentType !== "live" && status === "offen";
}

/** Postgres unique_violation: der Eintrag existiert schon (zweites Öffnen, zweiter Tab). */
export const SCHON_VORHANDEN = "23505";
