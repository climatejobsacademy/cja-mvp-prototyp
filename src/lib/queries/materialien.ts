import { createClient } from "@/lib/supabase/server";
import {
  dateinameAusPfad,
  formatBezeichnung,
  groesseFormatieren,
  hatVorschau,
  istSichererLink,
} from "@/lib/materialien";

export const MATERIAL_BUCKET = "lesson-resources";

export type Material =
  | {
      id: string;
      art: "datei";
      titel: string;
      dateiname: string;
      format: string;
      groesse: string | null;
      vorschau: boolean;
    }
  | { id: string; art: "link"; titel: string; url: string };

// Storage-API list() liefert ohne Angabe höchstens 100 Objekte je Ordner.
// Bei der Konvention "keine Ordner" liegen alle Materialien im Wurzel-
// verzeichnis; die Policy aus 0023 lässt list() ohnehin nur die Objekte
// sehen, die die Person lesen darf. Fehlt ein Objekt in der Antwort, bleibt
// nur die Größe leer.
const LIST_LIMIT = 1000;

/**
 * Materialien einer Lektion in der Reihenfolge von lesson_resource.reihenfolge.
 * Sichtbarkeit regelt RLS (fn_kann_lektion_lesen, 0023): ohne Einschreibung
 * oder bei unveröffentlichter Lektion kommt eine leere Liste zurück.
 * Signierte Links entstehen erst beim Klick im Route Handler
 * (content/[lessonId]/material/[resourceId]/route.ts), nicht hier.
 */
export async function getLessonMaterialien(lessonId: string): Promise<Material[]> {
  const supabase = await createClient();

  const { data: ressourcen } = await supabase
    .from("lesson_resource")
    .select("id, reihenfolge, typ, titel, file_asset_id, external_url")
    .eq("lesson_id", lessonId)
    .order("reihenfolge", { ascending: true });

  if (!ressourcen?.length) return [];

  const fileAssetIds = ressourcen
    .map((r) => r.file_asset_id)
    .filter((id): id is string => id !== null);

  const { data: fileAssets } = fileAssetIds.length
    ? await supabase.from("file_asset").select("id, dateityp, storage_pfad").in("id", fileAssetIds)
    : { data: [] as { id: string; dateityp: string; storage_pfad: string }[] };
  const fileAssetById = new Map((fileAssets ?? []).map((fa) => [fa.id, fa]));

  // Größe und MIME-Typ aus den Storage-Metadaten, ein list()-Aufruf je Ordner.
  const ordner = new Set(
    (fileAssets ?? []).map((fa) => fa.storage_pfad.split("/").slice(0, -1).join("/"))
  );
  const metadatenByPfad = new Map<string, { size?: number; mimetype?: string }>();
  for (const prefix of ordner) {
    const { data: objekte } = await supabase.storage
      .from(MATERIAL_BUCKET)
      .list(prefix, { limit: LIST_LIMIT });
    for (const objekt of objekte ?? []) {
      if (!objekt.metadata) continue;
      const pfad = prefix ? `${prefix}/${objekt.name}` : objekt.name;
      metadatenByPfad.set(pfad, {
        size: typeof objekt.metadata.size === "number" ? objekt.metadata.size : undefined,
        mimetype: typeof objekt.metadata.mimetype === "string" ? objekt.metadata.mimetype : undefined,
      });
    }
  }

  const materialien: Material[] = [];
  for (const r of ressourcen) {
    if (r.typ === "link") {
      // Nur https-Links anzeigen; alles andere wird nicht als Link gerendert.
      if (istSichererLink(r.external_url)) {
        materialien.push({ id: r.id, art: "link", titel: r.titel, url: r.external_url });
      }
      continue;
    }

    const fa = r.file_asset_id ? fileAssetById.get(r.file_asset_id) : undefined;
    if (!fa) continue;
    const meta = metadatenByPfad.get(fa.storage_pfad);
    const mimetype = fa.dateityp || meta?.mimetype || null;
    const dateiname = dateinameAusPfad(fa.storage_pfad);
    materialien.push({
      id: r.id,
      art: "datei",
      titel: r.titel,
      dateiname,
      format: formatBezeichnung(mimetype, dateiname),
      groesse: groesseFormatieren(meta?.size),
      vorschau: hatVorschau(mimetype),
    });
  }

  return materialien;
}
