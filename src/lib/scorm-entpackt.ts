// Pfad-Schema für ausgepackte SCORM-Medien (SR-50, SR-85, Migration 0055).
// Verbindlich, das Einspiel-Skript (scripts/scorm-einspielen.mjs) legt die
// Dateien genau so ab:
//   Zip:          file_asset.storage_pfad
//   Ausgepackt:   <storage_pfad>.entpackt/<innerer Zip-Pfad>
//   Audio, das nicht MP3/M4A ist (z. B. WAV), liegt umgewandelt als M4A (AAC)
//   mit ersetzter Endung; das Original wird nicht ausgepackt.
// Die Storage-Policy scorm_packages_entpackt_read_published prüft das Präfix
// '<storage_pfad>.entpackt/' -- ein anderer Pfad wäre für Lernende nicht lesbar.

export const ENTPACKT_TRENNER = ".entpackt/";

/** Audio-Endungen, die das Einspiel-Skript in M4A umwandelt (alles außer MP3/M4A). */
const UMZUWANDELNDES_AUDIO = new Set(["wav", "wave", "aif", "aiff", "flac", "ogg", "oga", "opus", "aac", "wma"]);

/** Innerer Pfad, unter dem ein Medium ausgepackt liegt (umzuwandelndes Audio -> .m4a). */
export function entpackterInnererPfad(innererPfad: string): string {
  const punkt = innererPfad.lastIndexOf(".");
  if (punkt <= innererPfad.lastIndexOf("/")) return innererPfad;
  const endung = innererPfad.slice(punkt + 1).toLowerCase();
  return UMZUWANDELNDES_AUDIO.has(endung) ? `${innererPfad.slice(0, punkt)}.m4a` : innererPfad;
}

/** Bucket-relativer Storage-Pfad der ausgepackten Datei in scorm-packages. */
export function entpacktPfad(speicherPfad: string, innererPfad: string): string {
  return `${speicherPfad}${ENTPACKT_TRENNER}${entpackterInnererPfad(innererPfad)}`;
}
