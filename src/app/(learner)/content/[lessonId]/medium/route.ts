import { NextResponse, type NextRequest } from "next/server";

import { istErlaubtesMedium } from "@/lib/elephant-kurs";
import { kursNutztMedium, mediumOeffnen } from "@/lib/elephant-paket";
import { entpacktSignieren, scormPaketSignieren } from "@/lib/queries/scorm-paket";
import { NATIVE_SELBSTLERNEN } from "@/lib/schalter";
import { createClient } from "@/lib/supabase/server";

// Medien der nativen Selbstlern-Ansicht (SR-85): Bild, Audio oder Video aus
// dem eigenen SCORM-Paket der Lektion. Läuft mit der Session der
// angemeldeten Person -- lesson, scorm_package, file_asset und
// storage.objects sind per RLS geschützt (0016/0017/0055), kein Service-Role-Key.
// Ausgeliefert wird nur, was der Kurs wirklich nutzt; kein SVG. Bewusst kein
// Logging von Pfaden (CLAUDE.md Regel 9). Bereichsanfragen (Range) für
// Audio/Video, weil Safari sonst nicht abspielt.
//
// Serverless: Die Route verlässt sich nicht darauf, dass die Lektionsseite
// oder ein früheres Bild auf derselben Instanz lief. Der kurze Zugriffs-
// Speicher unten spart nur bei vielen Bildern einer Lektion die Prüfung;
// fehlt der Eintrag (andere Instanz, abgelaufen), prüft die Route die Rechte
// neu und signiert die URL neu.
//
// Ausgepackte Pakete (SR-50, 0055): Liegt das Medium ausgepackt in Storage
// (Pfad-Schema src/lib/scorm-entpackt.ts, WAV als M4A), leitet die Route mit
// 307 auf eine mit der Session signierte URL (10 Minuten) um. Dann stellt der
// Browser auch Range-Anfragen direkt an Storage, und große Videos/Audios
// laufen nicht durch die Funktion (Antwortgrenze 4,5 MB). Schlägt das
// Signieren fehl (Datei fehlt), liest die Route wie bisher aus der Zip.

const KEIN_CACHE = { "Cache-Control": "no-store" };
const TYP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  mp4: "video/mp4",
};
/** Teilbereiche höchstens so groß (Antwortgrenze der Serverless-Funktion). */
const BEREICH_MAX = 3 * 1024 * 1024;

// Zugriff je Person und Lektion, 5 Minuten (deutlich kürzer als die
// signierte URL mit 1 Stunde), höchstens ZUGRIFF_MAX Einträge je Instanz.
const ZUGRIFF_MS = 5 * 60 * 1000;
const ZUGRIFF_MAX = 1000;
const zugriff = new Map<string, { speicherPfad: string; url: string; bis: number }>();

// Je Paket (Speicherpfad), ob es ausgepackt ist, 3 Minuten, höchstens
// AUSGEPACKT_MAX Einträge. Spart bei nicht ausgepackten Paketen den
// Fehlversuch. Gewährt nie ein Recht: Signiert wird immer mit der Session.
const AUSGEPACKT_MS = 3 * 60 * 1000;
const AUSGEPACKT_MAX = 200;
const ausgepackt = new Map<string, { ja: boolean; bis: number }>();

function ausgepacktMerken(speicherPfad: string, ja: boolean) {
  ausgepackt.delete(speicherPfad);
  ausgepackt.set(speicherPfad, { ja, bis: Date.now() + AUSGEPACKT_MS });
  while (ausgepackt.size > AUSGEPACKT_MAX) ausgepackt.delete(ausgepackt.keys().next().value!);
}

function nichtGefunden() {
  return new NextResponse("Nicht gefunden", { status: 404, headers: KEIN_CACHE });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  if (!NATIVE_SELBSTLERNEN) return nichtGefunden();

  const { lessonId } = await params;
  const pfad = request.nextUrl.searchParams.get("pfad") ?? "";
  const endung = pfad.split(".").pop()?.toLowerCase() ?? "";
  // SVG gar nicht erst in TYP: kann Skripte enthalten.
  if (!istErlaubtesMedium(pfad) || !TYP[endung]) return nichtGefunden();

  const supabase = await createClient();
  // getClaims prüft das Anmelde-Token (Signatur), ohne Rundreise je Bild.
  const { data: anmeldung } = await supabase.auth.getClaims();
  const userId = anmeldung?.claims.sub;
  if (!userId) return new NextResponse("Nicht angemeldet", { status: 401, headers: KEIN_CACHE });

  const zugriffKey = `${userId}:${lessonId}`;
  let z = zugriff.get(zugriffKey);
  if (!z || z.bis <= Date.now()) {
    zugriff.delete(zugriffKey);
    // Rechte neu prüfen: Lektion lesbar (RLS) und eine Selbstlern-Lektion,
    // dann das eigene Paket mit der Session signieren.
    const { data: lesson } = await supabase
      .from("lesson")
      .select("id")
      .eq("id", lessonId)
      .eq("content_type", "scorm")
      .maybeSingle();
    if (!lesson) return nichtGefunden();
    const paket = await scormPaketSignieren(lessonId, supabase);
    if (!paket) return nichtGefunden();
    z = { speicherPfad: paket.speicherPfad, url: paket.zipSignedUrl, bis: Date.now() + ZUGRIFF_MS };
    zugriff.set(zugriffKey, z);
    while (zugriff.size > ZUGRIFF_MAX) zugriff.delete(zugriff.keys().next().value!);
  }

  try {
    // Nur was der Kurs nutzt, auch wenn es ausgepackt vorliegt.
    if (!(await kursNutztMedium(z.speicherPfad, z.url, pfad))) return nichtGefunden();

    const stand = ausgepackt.get(z.speicherPfad);
    const bekannt = stand && stand.bis > Date.now() ? stand.ja : undefined;
    if (bekannt !== false) {
      const url = await entpacktSignieren(supabase, z.speicherPfad, pfad);
      if (url) {
        ausgepacktMerken(z.speicherPfad, true);
        return NextResponse.redirect(url, { status: 307, headers: KEIN_CACHE });
      }
      // Einzelne Datei fehlt in einem ausgepackten Paket: nur diese aus der
      // Zip, das Paket bleibt als ausgepackt gemerkt.
      if (bekannt === undefined) ausgepacktMerken(z.speicherPfad, false);
    }

    const medium = await mediumOeffnen(z.speicherPfad, z.url, pfad);
    if (!medium) return nichtGefunden();
    const gesamt = medium.groesse;
    const kopf = {
      "Content-Type": TYP[endung],
      "Accept-Ranges": "bytes",
      // Nur im Browser der Person, nicht in geteilten Zwischenspeichern.
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    };

    const bereich = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
    if (bereich && (bereich[1] || bereich[2])) {
      let start = bereich[1] ? Number(bereich[1]) : gesamt - Number(bereich[2]);
      let ende = bereich[1] && bereich[2] ? Number(bereich[2]) : gesamt - 1;
      start = Math.max(0, start);
      ende = Math.min(gesamt - 1, ende, start + BEREICH_MAX - 1);
      if (start > ende) {
        return new NextResponse(null, { status: 416, headers: { ...kopf, "Content-Range": `bytes */${gesamt}` } });
      }
      const daten = await medium.lesen(start, ende);
      return new NextResponse(daten.slice(), {
        status: 206,
        headers: { ...kopf, "Content-Range": `bytes ${start}-${start + daten.length - 1}/${gesamt}`, "Content-Length": String(daten.length) },
      });
    }
    const daten = gesamt > 0 ? await medium.lesen(0, gesamt - 1) : new Uint8Array();
    return new NextResponse(daten.slice(), { headers: { ...kopf, "Content-Length": String(daten.length) } });
  } catch {
    // Signierte URL abgelaufen oder Paket nicht lesbar: beim nächsten Mal neu prüfen und signieren.
    zugriff.delete(zugriffKey);
    return new NextResponse("Nicht lesbar", { status: 502, headers: KEIN_CACHE });
  }
}
