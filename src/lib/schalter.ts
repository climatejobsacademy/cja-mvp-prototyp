// Funktionsschalter je Deployment (Entscheidung 2026-10-16, docs/decisions.md).
// Nur serverseitig: ohne NEXT_PUBLIC_-Präfix kommt der Wert nicht ins
// Browser-Bundle. Ohne gesetzte Variable ist jeder Schalter aus (Ausnahme:
// NATIVE_SELBSTLERNEN, siehe unten); gesetzt wird er in Vercel je Umgebung
// mit eigenem Wert, der nur in Vercel steht (docs/runbook.md, Abschnitt 7).
// Eine Änderung wirkt erst nach einem neuen Deployment. Getestet in
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

/** Tagesübersicht eines Praxistags mit mehreren Praxisaufträgen (SR-13) oder null, wenn der Link aus ist. */
export function praxistagHref(datum: string, an: boolean = PRAXISAUFGABE_LINK): string | null {
  return an ? `/praxistag/tag/${datum}` : null;
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

/**
 * Fragen-Thread in Lektionen (SR-74, ergänzt 26.11.2026): standardmäßig AN,
 * aus nur mit FRAGEN_THREAD=aus (Groß-/Kleinschreibung und Leerraum egal),
 * jeder andere Wert gilt als an. Aus heißt: keine Lektion zeigt einen
 * Fragen-Bereich und Schreiben, Antworten und Löschen werden abgelehnt,
 * unabhängig von lesson.chat_aktiv -- auch an neu angelegten Live-Lektionen,
 * die der Trigger aus 0054 einschaltet. Daten bleiben unverändert. In Vercel
 * nur für Production gesetzt; auf Staging bleibt der Thread je Lektion
 * schaltbar.
 */
export function fragenThreadAn(umgebung: Umgebung = process.env): boolean {
  return umgebung.FRAGEN_THREAD?.trim().toLowerCase() !== "aus";
}

export const FRAGEN_THREAD = fragenThreadAn();

/** Thread einer Lektion sichtbar: nur bei eingeschaltetem Schalter und chat_aktiv. */
export function threadSichtbar(chatAktiv: boolean, an: boolean = FRAGEN_THREAD): boolean {
  return an && chatAktiv;
}
