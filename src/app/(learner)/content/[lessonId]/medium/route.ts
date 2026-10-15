import { NextResponse, type NextRequest } from "next/server";

import { istErlaubtesMedium } from "@/lib/elephant-kurs";
import { nativePaketFuer } from "@/lib/demo-selbstlernen";
import { elephantMediumLaden, zugriffHolen, zugriffMerken } from "@/lib/elephant-paket";
import { createClient } from "@/lib/supabase/server";

// Medien der nativen Selbstlern-Lektion (VORLÄUFIG, nur Demo, Anna
// 2026-10-15; SR folgt): Bild, Audio oder Video aus dem Elephant-Paket der
// Lektion. Läuft mit der Session der angemeldeten Person -- scorm_package,
// file_asset und storage.objects sind per RLS (0016/0017) auf
// veröffentlichte Lektionen beschränkt, kein Service-Role-Key. Ausgeliefert
// wird nur, was der Kursinhalt wirklich nutzt. Bewusst kein Logging von
// Pfaden (CLAUDE.md Regel 9). Bereichsanfragen (Range) für Audio/Video,
// weil Safari sonst nicht abspielt.

const KEIN_CACHE = { "Cache-Control": "no-store" };
// Signierte URL gilt 1 Stunde; 50 Minuten merken, dann neu prüfen.
const MERKEN_MS = 50 * 60 * 1000;
const TYP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  svg: "image/svg+xml",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
};

function nichtGefunden() {
  return new NextResponse("Nicht gefunden", { status: 404, headers: KEIN_CACHE });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const pfad = request.nextUrl.searchParams.get("pfad") ?? "";
  const endung = pfad.split(".").pop()?.toLowerCase() ?? "";
  // SVG nicht ausliefern: kann Skripte enthalten.
  if (!istErlaubtesMedium(pfad) || !TYP[endung] || endung === "svg") return nichtGefunden();

  const supabase = await createClient();
  // getClaims prüft das Anmelde-Token im Server selbst (Signaturschlüssel),
  // ohne Rundreise zum Auth-Server wie getUser -- spart Zeit je Bild.
  const { data: anmeldung } = await supabase.auth.getClaims();
  const userId = anmeldung?.claims.sub;
  if (!userId) return new NextResponse("Nicht angemeldet", { status: 401, headers: KEIN_CACHE });

  // Zugriff je Person und Lektion für ein paar Minuten merken: eine Lektion
  // lädt viele Bilder, die Prüfung (RLS) läuft dann nur beim ersten.
  // (person.id = auth.users.id). Die Lektionsseite legt den Zugriff beim Laden schon ab.
  let signierteUrl = zugriffHolen(userId, lessonId);
  if (!signierteUrl) {
    // Dasselbe Paket wie auf der Lektionsseite (eigenes oder Demo-Ersatz).
    const paket = await nativePaketFuer(lessonId);
    if (!paket) return nichtGefunden();
    signierteUrl = paket.url;
    zugriffMerken(userId, lessonId, signierteUrl, MERKEN_MS);
  }

  let daten: Uint8Array | null;
  try {
    daten = await elephantMediumLaden(signierteUrl, pfad);
  } catch {
    return new NextResponse("Nicht lesbar", { status: 502, headers: KEIN_CACHE });
  }
  if (!daten) return nichtGefunden();

  const kopf = {
    "Content-Type": TYP[endung],
    "Accept-Ranges": "bytes",
    // Nur im Browser der Person, nicht in geteilten Zwischenspeichern.
    "Cache-Control": "private, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  };
  const bereich = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (bereich && (bereich[1] || bereich[2])) {
    const gesamt = daten.length;
    let start = bereich[1] ? Number(bereich[1]) : gesamt - Number(bereich[2]);
    let ende = bereich[1] && bereich[2] ? Number(bereich[2]) : gesamt - 1;
    start = Math.max(0, start);
    ende = Math.min(gesamt - 1, ende);
    if (start > ende) {
      return new NextResponse(null, { status: 416, headers: { ...kopf, "Content-Range": `bytes */${gesamt}` } });
    }
    return new NextResponse(daten.slice(start, ende + 1), {
      status: 206,
      headers: { ...kopf, "Content-Range": `bytes ${start}-${ende}/${gesamt}`, "Content-Length": String(ende - start + 1) },
    });
  }
  return new NextResponse(daten.slice(), { headers: { ...kopf, "Content-Length": String(daten.length) } });
}
