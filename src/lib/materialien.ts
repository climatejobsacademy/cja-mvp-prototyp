// Hilfsfunktionen für Lernmaterialien an Lektionen (lesson_resource, Bucket
// lesson-resources, Migration 0023; SR-68). Ohne Server-Import, damit sie
// in Server- und Client-Komponenten sowie in node:test nutzbar sind.

const FORMAT_JE_MIMETYPE: Record<string, string> = {
  "application/pdf": "PDF",
  "image/png": "PNG",
  "image/jpeg": "JPEG",
  "image/webp": "WebP",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word (DOCX)",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PowerPoint (PPTX)",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel (XLSX)",
};

// Vorschau im neuen Tab nur für Formate, die jeder Browser selbst anzeigt.
const VORSCHAU_MIMETYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

/** Dateiname aus dem bucket-relativen Storage-Pfad (letztes Segment). */
export function dateinameAusPfad(pfad: string): string {
  const segmente = pfad.split("/").filter((s) => s.length > 0);
  return segmente[segmente.length - 1] ?? "";
}

/** Lesbare Formatbezeichnung, sonst die Dateiendung in Großbuchstaben. */
export function formatBezeichnung(mimetype: string | null, dateiname: string): string {
  if (mimetype && FORMAT_JE_MIMETYPE[mimetype]) return FORMAT_JE_MIMETYPE[mimetype];
  const punkt = dateiname.lastIndexOf(".");
  if (punkt > 0 && punkt < dateiname.length - 1) return dateiname.slice(punkt + 1).toUpperCase();
  return "Datei";
}

const ZAHL_EINE_STELLE = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });
const ZAHL_GANZ = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });

/** Dateigröße mit 1024er-Schritten, deutsche Schreibweise, z. B. "95 KB", "1,2 MB". */
export function groesseFormatieren(bytes: number | null | undefined): string | null {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return null;
  if (bytes < 1024) return `${ZAHL_GANZ.format(bytes)} B`;
  if (bytes < 1024 * 1024) return `${ZAHL_GANZ.format(Math.max(1, Math.round(bytes / 1024)))} KB`;
  return `${ZAHL_EINE_STELLE.format(bytes / (1024 * 1024))} MB`;
}

/**
 * Nur https-Links werden als Link angezeigt (Entscheidung 2026-10-07). Die
 * Datenbank prüft das nicht, nur die Upload-Vorlage und diese Anzeige.
 */
export function istSichererLink(url: string | null | undefined): url is string {
  if (!url || !url.startsWith("https://")) return false;
  try {
    const geparst = new URL(url);
    return geparst.protocol === "https:" && geparst.hostname.length > 0;
  } catch {
    return false;
  }
}

/** Vorschau im neuen Tab für PDF und Bilder; Office-Dateien nur als Download. */
export function hatVorschau(mimetype: string | null): boolean {
  return mimetype !== null && VORSCHAU_MIMETYPES.has(mimetype);
}
