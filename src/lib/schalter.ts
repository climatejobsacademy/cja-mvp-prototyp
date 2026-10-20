// Funktionsschalter je Deployment (Entscheidung 2026-10-16, docs/decisions.md).
// Nur serverseitig: ohne NEXT_PUBLIC_-Präfix kommt der Wert nicht ins
// Browser-Bundle. Ohne gesetzte Variable ist jeder Schalter aus (Ausnahme:
// NATIVE_SELBSTLERNEN, siehe unten); gesetzt wird er in Vercel je Umgebung
// (Preview/Development an, Production aus). Eine
// Änderung wirkt erst nach einem neuen Deployment. Getestet in
// src/lib/schalter.test.ts.

type Umgebung = Record<string, string | undefined>;

/**
 * Fachsprache-Einheit (Stufe 2): Seite /fachsprache/[einheitId], Chip im
 * Stundenplan, Kästchen auf Home. An nur mit FACHSPRACHE_EINHEIT=an.
 */
export function fachspracheEinheitAn(umgebung: Umgebung = process.env): boolean {
  return umgebung.FACHSPRACHE_EINHEIT?.trim().toLowerCase() === "an";
}

export const FACHSPRACHE_EINHEIT = fachspracheEinheitAn();

/**
 * Link zur Praxisaufgabe (/praxistag/[fieldJobId]) im Stundenplan, auf Home,
 * in der Programm-Übersicht und in den Kompetenzen (Anna 2026-10-17). Aus:
 * die Einträge stehen als Text ohne Link da; die Seite selbst bleibt über die
 * Adresse erreichbar. An nur mit PRAXISAUFGABE_LINK=an.
 */
export function praxisaufgabeLinkAn(umgebung: Umgebung = process.env): boolean {
  return umgebung.PRAXISAUFGABE_LINK?.trim().toLowerCase() === "an";
}

export const PRAXISAUFGABE_LINK = praxisaufgabeLinkAn();

/** Ziel einer Praxisaufgabe oder null, wenn der Link ausgeschaltet ist. */
export function praxisaufgabeHref(fieldJobId: string, von?: string, an: boolean = PRAXISAUFGABE_LINK): string | null {
  if (!an) return null;
  return von ? `/praxistag/${fieldJobId}?von=${von}` : `/praxistag/${fieldJobId}`;
}

/**
 * Native Selbstlern-Ansicht (SR-85): Selbstlern-Lektionen mit Elephant-Paket
 * erscheinen Schritt für Schritt im Plattform-Design statt im SCORM-Player;
 * die Medien-Route /content/[lessonId]/medium liefert nur bei an. Bewusst
 * anders als die übrigen Schalter (Entscheidung Anna 2026-10-17):
 * standardmäßig AN -- ohne Variable an, aus nur mit NATIVE_SELBSTLERNEN=aus
 * (Groß-/Kleinschreibung und Leerraum egal), jeder andere Wert gilt als an.
 * Notbremse: in Vercel NATIVE_SELBSTLERNEN=aus setzen und neu deployen, dann
 * zeigt jede Selbstlern-Lektion wieder den SCORM-Player.
 */
export function nativeSelbstlernenAn(umgebung: Umgebung = process.env): boolean {
  return umgebung.NATIVE_SELBSTLERNEN?.trim().toLowerCase() !== "aus";
}

export const NATIVE_SELBSTLERNEN = nativeSelbstlernenAn();
