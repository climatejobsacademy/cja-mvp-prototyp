// Welches Elephant-Paket die native Selbstlern-Lektion zeigt (VORLÄUFIG, nur
// Demo, Anna 2026-10-15; SR folgt). Jede Selbstlern-Lektion soll in der Demo
// nativ erscheinen, an jedem Tag:
//   1. eigenes Paket der Lektion, wenn es ein Elephant-Paket ist und nicht
//      ausgeschlossen (Anna: "Schaltpläne" sieht zu altmodisch aus),
//   2. sonst ein anderes Paket aus dem Speicher, je Lektion abwechselnd.
// Gelesen wird mit der Session der Person: nur Pakete, die per RLS (0016/0017)
// an veröffentlichten Lektionen hängen. Keine Datenbank-Änderung; dev und
// "Energiehelden" sehen weiter genau das, was in der Datenbank hängt.

import type { ElephantKurs } from "@/lib/elephant-kurs";
import { elephantKursLaden } from "@/lib/elephant-paket";
import { createClient } from "@/lib/supabase/server";

const AUSGESCHLOSSEN = /schaltpl/i;
const GUELTIG_SEKUNDEN = 3600;

export type NativePaket = { url: string; kurs: ElephantKurs; ersatz: boolean };

/** Fester, aber über die Lektionen verteilter Startpunkt. */
function streuwert(text: string): number {
  let h = 0;
  for (const z of text) h = (h * 31 + z.charCodeAt(0)) >>> 0;
  return h;
}

export async function nativePaketFuer(lessonId: string): Promise<NativePaket | null> {
  const supabase = await createClient();
  const { data: pakete } = await supabase.from("scorm_package").select("lesson_id, file_asset_id");
  if (!pakete?.length) return null;
  const { data: dateien } = await supabase
    .from("file_asset")
    .select("id, storage_pfad")
    .in(
      "id",
      pakete.map((p) => p.file_asset_id)
    );
  const pfadVon = new Map((dateien ?? []).map((d) => [d.id, d.storage_pfad]));

  const eigenes = pakete.find((p) => p.lesson_id === lessonId);
  const eigenerPfad = eigenes ? pfadVon.get(eigenes.file_asset_id) : undefined;
  // Jede Datei nur einmal (mehrere Lektionen können dasselbe Paket nutzen).
  const andere = [...new Set(pakete.map((p) => pfadVon.get(p.file_asset_id)).filter((p): p is string => !!p))]
    .filter((p) => p !== eigenerPfad && !AUSGESCHLOSSEN.test(p))
    .sort();
  const start = andere.length ? streuwert(lessonId) % andere.length : 0;
  const reihe = [
    ...(eigenerPfad && !AUSGESCHLOSSEN.test(eigenerPfad) ? [{ pfad: eigenerPfad, ersatz: false }] : []),
    ...andere.map((_, i) => ({ pfad: andere[(start + i) % andere.length], ersatz: true })),
  ];

  for (const { pfad, ersatz } of reihe) {
    const { data: signiert } = await supabase.storage.from("scorm-packages").createSignedUrl(pfad, GUELTIG_SEKUNDEN);
    if (!signiert?.signedUrl) continue;
    const kurs = await elephantKursLaden(signiert.signedUrl);
    if (kurs) return { url: signiert.signedUrl, kurs, ersatz };
  }
  return null;
}
