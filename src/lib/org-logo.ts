// Organisations-Logo im Header (SR-76, Migration 0025). Ohne Server-Import,
// damit es in Server- und Client-Komponenten sowie in node:test nutzbar ist.

export const ORG_LOGO_BUCKET = "org-logos";

// Gleiches Muster wie organisation_logo_pfad_format in 0025: UUID in
// Kleinbuchstaben plus Endung, direkt im Bucket-Wurzelverzeichnis.
const LOGO_PFAD = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|webp|jpg|jpeg)$/;

export type HeaderLogo = { src: string; alt: string };

/**
 * Logo für den Header oder null (Fallback: nur Academy-Wortmarke, kein
 * Trennstrich). Die Public-URL wird nur berechnet, ohne Netzwerkzugriff.
 * Alt-Text ist der Name der Organisation.
 */
export function headerLogo(
  organisation: { name: string | null; logoPfad: string | null } | null,
  supabaseUrl: string | undefined
): HeaderLogo | null {
  if (!organisation || !supabaseUrl) return null;
  const name = organisation.name?.trim() ?? "";
  const pfad = organisation.logoPfad ?? "";
  if (!name || !LOGO_PFAD.test(pfad)) return null;
  const basis = supabaseUrl.replace(/\/+$/, "");
  return { src: `${basis}/storage/v1/object/public/${ORG_LOGO_BUCKET}/${pfad}`, alt: name };
}
