import { createClient } from "@/lib/supabase/server";

import { signierteFotoLinks } from "./trainer";

// Kohortensicht (SR-30, Migration 0034): die anderen Lernenden der eigenen
// Kohorte -- gleiche Kohorte, gleiche Organisation, nur aktive Einschreibungen
// -- aus fn_meine_kohorte(). Anzeigename = Rufname plus Initial des
// Nachnamens. Das Foto kommt als signierter Link (eine Stunde); der Upload
// ist die Freigabe, ohne Foto bleibt der Link leer. Keine E-Mail, kein
// Geburtsdatum, keine Vorerfahrung, kein Arbeitgeber, kein Logging von Namen.

export type KohortenMitglied = {
  personId: string;
  anzeigename: string;
  /** Signierter Link (1 Stunde), null = kein Foto */
  fotoUrl: string | null;
};

/** Andere Lernende der eigenen Kohorte, nach Anzeigename. Leer, wenn niemand sonst da ist. */
export async function getMeineKohorte(): Promise<KohortenMitglied[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("fn_meine_kohorte");
  const mitglieder = data ?? [];
  const links = await signierteFotoLinks(
    supabase,
    mitglieder.flatMap((m) => (m.foto_pfad ? [m.foto_pfad] : []))
  );
  return mitglieder.map((m) => ({
    personId: m.person_id,
    anzeigename: m.anzeigename,
    fotoUrl: m.foto_pfad ? (links.get(m.foto_pfad) ?? null) : null,
  }));
}
