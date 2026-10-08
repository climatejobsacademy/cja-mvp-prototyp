import { NextResponse, type NextRequest } from "next/server";

import { dateinameAusPfad, hatVorschau } from "@/lib/materialien";
import { MATERIAL_BUCKET } from "@/lib/queries/materialien";
import { createClient } from "@/lib/supabase/server";

const GUELTIGKEIT_SEKUNDEN = 3600;

const KEIN_CACHE = { "Cache-Control": "no-store" };

function nichtGefunden() {
  return new NextResponse("Nicht gefunden", { status: 404, headers: KEIN_CACHE });
}

/**
 * Erzeugt beim Klick auf "Vorschau" oder "Download" einen signierten Link
 * (1 Stunde) und leitet dorthin weiter. Läuft mit der Session der
 * angemeldeten Person: lesson_resource und storage.objects sind per RLS aus
 * Migration 0023 auf veröffentlichte Lektionen im eingeschriebenen Programm
 * beschränkt, kein Service-Role-Key. Bewusst kein Logging von Pfad oder
 * Dateiname (CLAUDE.md Regel 9).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string; resourceId: string }> }
) {
  const { lessonId, resourceId } = await params;
  const aktion = request.nextUrl.searchParams.get("aktion") === "vorschau" ? "vorschau" : "download";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Nicht angemeldet", { status: 401, headers: KEIN_CACHE });
  }

  const { data: ressource } = await supabase
    .from("lesson_resource")
    .select("file_asset_id")
    .eq("id", resourceId)
    .eq("lesson_id", lessonId)
    .eq("typ", "datei")
    .maybeSingle();
  if (!ressource?.file_asset_id) return nichtGefunden();

  const { data: fileAsset } = await supabase
    .from("file_asset")
    .select("dateityp, storage_pfad")
    .eq("id", ressource.file_asset_id)
    .maybeSingle();
  if (!fileAsset) return nichtGefunden();

  // Vorschau nur für PDF und Bilder; alles andere immer als Download.
  const alsDownload = aktion === "download" || !hatVorschau(fileAsset.dateityp);

  const { data: signiert, error } = await supabase.storage
    .from(MATERIAL_BUCKET)
    .createSignedUrl(
      fileAsset.storage_pfad,
      GUELTIGKEIT_SEKUNDEN,
      alsDownload ? { download: dateinameAusPfad(fileAsset.storage_pfad) } : undefined
    );
  if (error || !signiert?.signedUrl) return nichtGefunden();

  return NextResponse.redirect(signiert.signedUrl, { status: 303, headers: KEIN_CACHE });
}
