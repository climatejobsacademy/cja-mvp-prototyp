import { cache } from "react";

import { FOTO_LINK_SEKUNDEN, PROFILFOTO_BUCKET } from "@/lib/profilfoto";
import { createClient } from "@/lib/supabase/server";

// Trainer:innen je Termin und Profilfotos (SR-77, SR-78, Migration 0030).
// Lernende lesen die Tabelle person nur für sich selbst; Name, Rufname und
// Fotopfad der eigenen Trainer:innen kommen aus fn_meine_trainer(). Die
// signierten Links erzeugt die Session der Person -- die Storage-Policy
// profilfotos_lesen lässt nur eigene Fotos und die der eigenen
// Trainer:innen zu. Kein Service-Role-Key, kein Logging von Pfaden.

export type TrainerAnzeige = {
  personId: string;
  name: string;
  rufname: string;
  /** Signierter Link (1 Stunde), null = kein Foto */
  fotoUrl: string | null;
};

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

/** Signierte Links für mehrere Fotopfade in einem Aufruf; fehlende fallen weg. */
export async function signierteFotoLinks(supabase: SupabaseServer, pfade: string[]): Promise<Map<string, string>> {
  if (pfade.length === 0) return new Map();
  const { data } = await supabase.storage.from(PROFILFOTO_BUCKET).createSignedUrls(pfade, FOTO_LINK_SEKUNDEN);
  return new Map(
    (data ?? []).flatMap((e) => (e.path && e.signedUrl && !e.error ? [[e.path, e.signedUrl] as const] : []))
  );
}

/**
 * Trainer:innen im eigenen Plan, nach person_id. Leer, wenn keine eingetragen sind.
 * Mit React cache(): Seite und Stundenplan rufen sie im selben Request auf,
 * geladen wird einmal (Ladezeit, Anna 2026-10-21).
 */
export const getMeineTrainer = cache(async (): Promise<Map<string, TrainerAnzeige>> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("fn_meine_trainer");
  const trainer = data ?? [];
  const links = await signierteFotoLinks(
    supabase,
    trainer.flatMap((t) => (t.foto_pfad ? [t.foto_pfad] : []))
  );
  return new Map(
    trainer.map((t) => [
      t.person_id,
      {
        personId: t.person_id,
        name: t.name,
        rufname: t.rufname,
        fotoUrl: t.foto_pfad ? (links.get(t.foto_pfad) ?? null) : null,
      },
    ])
  );
});
