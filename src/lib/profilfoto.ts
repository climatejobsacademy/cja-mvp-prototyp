// Profilfotos (SR-77, SR-78, Entscheidung 2026-10-13): privater Bucket
// profilfotos, Pfad "<person_id>/<uuid>.jpg", Abruf über signierte Links.
// Reine Hilfen ohne Datenbankzugriff, damit node:test sie prüfen kann.

export const PROFILFOTO_BUCKET = "profilfotos";
/** Gültigkeit der signierten Links in Sekunden (wie lesson-resources). */
export const FOTO_LINK_SEKUNDEN = 3600;
/** Kantenlänge nach dem Zuschnitt im Browser. */
export const FOTO_KANTE_PX = 512;
/** Obergrenze des Buckets für die fertige JPEG-Datei. */
export const FOTO_MAX_BYTES = 1024 * 1024;
/** Obergrenze für die ausgewählte Originaldatei vor dem Verkleinern. */
export const FOTO_EINGABE_MAX_BYTES = 10 * 1024 * 1024;
/** Dateiauswahl: JPEG, PNG, WebP, HEIC (HEIC öffnet nur Safari). */
export const FOTO_ANNEHMEN = "image/jpeg,image/png,image/webp,image/heic,image/heif";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** Neuer Objektname im eigenen Ordner -- gleiche Regel wie der Check in 0030. */
export function fotoPfad(personId: string, dateiId: string): string {
  return `${personId}/${dateiId}.jpg`;
}

export function istEigenerFotoPfad(personId: string, pfad: string): boolean {
  return new RegExp(`^${personId}/${UUID}\\.jpg$`).test(pfad);
}

/**
 * Quadratischer Ausschnitt aus der Bildmitte (Quelle) für ein Bild der
 * Größe breite x hoehe -- kürzere Seite bestimmt die Kante.
 */
export function mittigerAusschnitt(breite: number, hoehe: number): { x: number; y: number; kante: number } {
  const kante = Math.min(breite, hoehe);
  return { x: Math.round((breite - kante) / 2), y: Math.round((hoehe - kante) / 2), kante };
}

/** "Malte Schmiedinghoff" -> "M"; leer -> "?" */
export function initiale(name: string): string {
  return (name.trim()[0] ?? "?").toUpperCase();
}
