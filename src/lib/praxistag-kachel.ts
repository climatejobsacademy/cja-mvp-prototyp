// Praxistag-Kachel im Stundenplan (SR-13): jeder Tag mit Praxisaufträgen
// erscheint als gleich aufgebauter Block „Praxistag“ mit Fortschritt, egal
// ob ein oder mehrere Aufträge. Reine Funktionen, getestet in
// praxistag-kachel.test.ts.

/** Fortschritt eines Praxistags: ein Eintrag je Auftrag in fester Reihenfolge. */
export type PraxistagFortschritt = {
  anzahl: number;
  fertig: number;
  /** je Auftrag: erledigt (Phase abgeschlossen oder durchgeführt) */
  erledigt: boolean[];
};

type Auftrag = { titel: string; phase: string; status: string };

/** Erledigt heißt: Praxisflow abgeschlossen oder als durchgeführt markiert. */
export function auftragErledigt(a: Pick<Auftrag, "phase" | "status">): boolean {
  return a.phase === "abgeschlossen" || a.status === "durchgeführt";
}

export function praxistagFortschritt(auftraege: Pick<Auftrag, "phase" | "status">[]): PraxistagFortschritt {
  const erledigt = auftraege.map(auftragErledigt);
  return { anzahl: auftraege.length, fertig: erledigt.filter(Boolean).length, erledigt };
}

/** Titel der Kachel: bei einem Auftrag sein Titel, sonst die Zahl. */
export function praxistagTitel(auftraege: Pick<Auftrag, "titel">[]): string {
  return auftraege.length === 1 ? auftraege[0].titel : `${auftraege.length} Praxisaufträge`;
}

/** "1 von 3 erledigt" */
export function fortschrittText(f: Pick<PraxistagFortschritt, "anzahl" | "fertig">): string {
  return `${f.fertig} von ${f.anzahl} erledigt`;
}

/** Kurzform für die Monatsansicht: "1/3" */
export function fortschrittKurz(f: Pick<PraxistagFortschritt, "anzahl" | "fertig">): string {
  return `${f.fertig}/${f.anzahl}`;
}
