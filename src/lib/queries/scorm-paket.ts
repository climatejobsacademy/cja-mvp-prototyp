import { entpacktPfad } from "@/lib/scorm-entpackt";
import { createClient } from "@/lib/supabase/server";

/** Signierte URL gilt 1 Stunde (wie bisher beim SCORM-Player). */
export const SCORM_URL_GUELTIG_SEKUNDEN = 3600;

export type ScormPaket = {
  entryPointPfad: string;
  /** Bucket-relativer Pfad in scorm-packages (file_asset.storage_pfad, 0017) */
  speicherPfad: string;
  zipSignedUrl: string;
};

/**
 * Das eigene SCORM-Paket einer Lektion mit kurzlebiger signierter URL
 * (SR-50/51/52, SR-85). Läuft mit der Session der angemeldeten Person; RLS
 * greift zweifach -- scorm_package über scorm_package_read_published (0016),
 * storage.objects über scorm_packages_read_published (0017) --, kein
 * Service-Role-Key. Nichts lesbar -> null. Route Handler geben ihren Client
 * mit (dort wirkt `cache()` nicht; ein zweiter Client könnte das Token ein
 * zweites Mal auffrischen, siehe src/lib/supabase/server.ts).
 */
export async function scormPaketSignieren(
  lessonId: string,
  client?: Awaited<ReturnType<typeof createClient>>
): Promise<ScormPaket | null> {
  const supabase = client ?? (await createClient());
  const { data: scormPackage } = await supabase
    .from("scorm_package")
    .select("entry_point_pfad, file_asset_id")
    .eq("lesson_id", lessonId)
    .maybeSingle();
  if (!scormPackage) return null;

  const { data: fileAsset } = await supabase
    .from("file_asset")
    .select("storage_pfad")
    .eq("id", scormPackage.file_asset_id)
    .maybeSingle();
  if (!fileAsset) return null;

  const { data: signed } = await supabase.storage
    .from("scorm-packages")
    .createSignedUrl(fileAsset.storage_pfad, SCORM_URL_GUELTIG_SEKUNDEN);
  if (!signed?.signedUrl) return null;

  return {
    entryPointPfad: scormPackage.entry_point_pfad,
    speicherPfad: fileAsset.storage_pfad,
    zipSignedUrl: signed.signedUrl,
  };
}

/** Signierte URL einer ausgepackten Datei gilt 10 Minuten (nur für den Redirect der Medien-Route). */
export const ENTPACKT_URL_GUELTIG_SEKUNDEN = 600;

/**
 * Signierte URL für die ausgepackte Datei eines Paket-Mediums (SR-50, SR-85,
 * Pfad-Schema in src/lib/scorm-entpackt.ts). Immer mit der Session der
 * Person: Storage prüft dabei die Policy scorm_packages_entpackt_read_published
 * (0055). Fehlt die Datei (Paket nicht ausgepackt) oder fehlt das Recht -> null.
 */
export async function entpacktSignieren(
  supabase: Awaited<ReturnType<typeof createClient>>,
  speicherPfad: string,
  innererPfad: string
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("scorm-packages")
    .createSignedUrl(entpacktPfad(speicherPfad, innererPfad), ENTPACKT_URL_GUELTIG_SEKUNDEN);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
