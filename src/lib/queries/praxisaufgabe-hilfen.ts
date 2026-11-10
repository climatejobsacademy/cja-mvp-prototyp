import { istSichererLink } from "@/lib/materialien";
import type { PraxisDatei } from "@/lib/praxisflow-shared";
import { MATERIAL_BUCKET } from "@/lib/queries/materialien";
import { createClient } from "@/lib/supabase/server";

const LINK_SEKUNDEN = 3600;

export type PraxisaufgabeHilfen = {
  /** Dateien als Hilfsunterlagen (art hilfe, vonAfcj), mit signiertem Link */
  dateien: PraxisDatei[];
  /** Links, nur https */
  links: { id: string; titel: string; url: string }[];
};

/**
 * Hilfsunterlagen einer Praxisaufgabe (SR-68, Migration 0069) in der
 * Reihenfolge von field_job_type_resource.reihenfolge. Sichtbarkeit regelt
 * RLS (fn_kann_praxisaufgabe_lesen): ohne eigenen Praxisauftrag dieser Aufgabe
 * oder bei unveröffentlichter Aufgabe kommt nichts zurück. Fehler blenden nur
 * die Unterlagen aus, der Praxisauftrag bleibt bedienbar. Kein Logging von
 * Pfaden oder Dateinamen (CLAUDE.md Regel 9).
 */
export async function getPraxisaufgabeHilfen(fieldJobTypeId: string): Promise<PraxisaufgabeHilfen> {
  const supabase = await createClient();
  const { data: ressourcen } = await supabase
    .from("field_job_type_resource")
    .select("id, reihenfolge, typ, titel, file_asset_id, external_url")
    .eq("field_job_type_id", fieldJobTypeId)
    .order("reihenfolge", { ascending: true });
  if (!ressourcen?.length) return { dateien: [], links: [] };

  const assetIds = ressourcen.map((r) => r.file_asset_id).filter((id): id is string => id !== null);
  const { data: assets } = assetIds.length
    ? await supabase.from("file_asset").select("id, dateityp, storage_pfad").in("id", assetIds)
    : { data: [] as { id: string; dateityp: string; storage_pfad: string }[] };
  const assetById = new Map((assets ?? []).map((a) => [a.id, a]));

  const pfade = (assets ?? []).map((a) => a.storage_pfad);
  const signiert = new Map<string, string>();
  if (pfade.length > 0) {
    const { data } = await supabase.storage.from(MATERIAL_BUCKET).createSignedUrls(pfade, LINK_SEKUNDEN);
    for (const e of data ?? []) if (e.path && e.signedUrl && !e.error) signiert.set(e.path, e.signedUrl);
  }

  const dateien: PraxisDatei[] = [];
  const links: PraxisaufgabeHilfen["links"] = [];
  for (const r of ressourcen) {
    if (r.typ === "link") {
      if (istSichererLink(r.external_url)) links.push({ id: r.id, titel: r.titel, url: r.external_url });
      continue;
    }
    const asset = r.file_asset_id ? assetById.get(r.file_asset_id) : undefined;
    if (!asset) continue;
    dateien.push({
      id: r.id,
      art: "hilfe",
      dateiname: r.titel,
      mimeType: asset.dateityp,
      storagePfad: asset.storage_pfad,
      url: signiert.get(asset.storage_pfad) ?? null,
      vonAfcj: true,
    });
  }
  return { dateien, links };
}
