import { einstiegeJeTag, lektionIdsFuerEinstiege, type EinstiegEintrag, type TagMitTerminen } from "@/lib/fachsprache-einstiege";
import {
  einheitFuerLektion as einheitFuerLektionRegel,
  einheitenFuerLektionen as einheitenFuerLektionenRegel,
  ladeEinheitSeite,
  type EinheitenListeQuelle,
  type EinheitLink,
  type EinheitQuelle,
  type SeitenErgebnis,
} from "@/lib/fachsprache-laden";
import { fachspracheEinheitAn } from "@/lib/schalter";
import { createClient } from "@/lib/supabase/server";

// Fachsprache-Einheit (Stufe 2, Migration 0051, SR-84): Abfragen mit dem
// Client der angemeldeten Person. Die RLS entscheidet, was lesbar ist
// (fachsprache_einheit_lesen: veröffentlicht und Lektion lesbar; AfCJ admin
// alles), kein Service-Role-Key. Nur Lesen und Links signieren; kein Lernstand,
// keine competency_evidence (Regel 6). Bewusst kein Logging von Pfaden oder
// Dateinamen (Regel 9). Die Regeln stehen in src/lib/fachsprache-laden.ts.

export const FACHSPRACHE_BUCKET = "fachsprache-bilder";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

function einheitQuelle(supabase: SupabaseServer): EinheitQuelle {
  return {
    async einheit(id) {
      const { data } = await supabase
        .from("fachsprache_einheit")
        .select("id, lesson_id, titel, dauer_minuten, inhalt, status")
        .eq("id", id)
        .maybeSingle();
      return data ?? null;
    },
    async istAfcjAdmin() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;
      const { data } = await supabase
        .from("role_assignment")
        .select("id")
        .eq("person_id", user.id)
        .eq("rolle", "afcj_admin")
        .limit(1);
      return (data ?? []).length > 0;
    },
    async signierteLinks(pfade, gueltigSekunden) {
      const { data } = await supabase.storage.from(FACHSPRACHE_BUCKET).createSignedUrls(pfade, gueltigSekunden);
      return new Map((data ?? []).flatMap((e) => (e.path && e.signedUrl && !e.error ? [[e.path, e.signedUrl] as const] : [])));
    },
  };
}

function listeQuelle(supabase: SupabaseServer): EinheitenListeQuelle {
  return {
    async fuerLektionen(lessonIds) {
      const { data } = await supabase
        .from("fachsprache_einheit")
        .select("id, lesson_id, titel, status")
        .in("lesson_id", lessonIds)
        .eq("status", "veroeffentlicht");
      return data ?? [];
    },
  };
}

/** Einheit für die Seite /fachsprache/[einheitId]; "nicht_gefunden" heißt 404. */
export async function getEinheitSeite(einheitId: string): Promise<SeitenErgebnis> {
  const schalterAn = fachspracheEinheitAn();
  // Ohne Schalter wird weder ein Client angelegt noch gefragt.
  if (!schalterAn) return { art: "nicht_gefunden" };
  const supabase = await createClient();
  return ladeEinheitSeite({ schalterAn, einheitId }, einheitQuelle(supabase));
}

/**
 * Für Etappe 2 (Home, Stundenplan): zu jeder Lektion die veröffentlichte
 * Einheit samt Link; leer bei ausgeschaltetem Schalter. Noch nirgends
 * eingebaut.
 */
export async function getEinheitenFuerLektionen(
  lessonIds: string[],
  von?: "stundenplan" | "home"
): Promise<Map<string, EinheitLink>> {
  const schalterAn = fachspracheEinheitAn();
  if (!schalterAn || lessonIds.length === 0) return new Map();
  const supabase = await createClient();
  return einheitenFuerLektionenRegel({ schalterAn, lessonIds, von }, listeQuelle(supabase));
}

/** Die veröffentlichte Einheit einer Lektion samt Link, sonst null (auch bei ausgeschaltetem Schalter). */
export async function getEinheitFuerLektion(lessonId: string, von?: "stundenplan" | "home"): Promise<EinheitLink | null> {
  const schalterAn = fachspracheEinheitAn();
  if (!schalterAn) return null;
  const supabase = await createClient();
  return einheitFuerLektionRegel({ schalterAn, lessonId, von }, listeQuelle(supabase));
}

/**
 * Einstiege für Home und Stundenplan: je Tag die veröffentlichten Einheiten zu
 * den Live-Lektionen des Tages (Regeln in src/lib/fachsprache-einstiege.ts).
 * Leer bei ausgeschaltetem Schalter, nicht lesbaren Einheiten oder Entwürfen,
 * ohne Fehlermeldung; ohne Live-Lektion wird nicht gefragt. Eine Abfrage für
 * alle Tage, mit dem Client der angemeldeten Person (RLS).
 */
export async function getEinstiegeJeTag(
  tage: TagMitTerminen[],
  von: "stundenplan" | "home"
): Promise<Map<string, EinstiegEintrag[]>> {
  if (!fachspracheEinheitAn()) return new Map();
  const lessonIds = lektionIdsFuerEinstiege(tage);
  if (lessonIds.length === 0) return new Map();
  const links = await getEinheitenFuerLektionen(lessonIds);
  return einstiegeJeTag(tage, links, von);
}
