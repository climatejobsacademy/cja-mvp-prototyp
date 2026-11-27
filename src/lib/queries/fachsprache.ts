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
import { bildPfad, parseInhalt } from "@/lib/fachsprache";
import { BILD_GUELTIGKEIT_SEKUNDEN } from "@/lib/fachsprache-laden";
import type { Vokabel } from "@/lib/vokabeln";
import { glossarAus, type GlossarEintrag } from "@/lib/glossar";
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
        .select("id, lesson_id, titel, status, dauer_minuten")
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
  if (links.size === 0) return new Map();
  // SR-84 (0074): erledigt nur für die angemeldete Person (RLS: eigene Zeilen).
  const supabase = await createClient();
  const { data: erledigt } = await supabase
    .from("fachsprache_erledigt")
    .select("einheit_id")
    .in("einheit_id", [...links.values()].map((l) => l.einheitId));
  return einstiegeJeTag(tage, links, von, new Set((erledigt ?? []).map((e) => e.einheit_id)));
}

/**
 * Glossar der Woche (SR-101): Wortkarten aller veröffentlichten Einheiten der
 * Live-Lektionen in `tage` (eine Stundenplan-Woche), alphabetisch, jedes Wort
 * einmal (src/lib/glossar.ts). null bei ausgeschaltetem Schalter (Seite 404),
 * sonst eine Liste, die leer sein kann. Mit dem Client der angemeldeten
 * Person: die RLS liefert nur lesbare, veröffentlichte Einheiten.
 */
export async function getGlossarWoche(tage: TagMitTerminen[]): Promise<GlossarEintrag[] | null> {
  if (!fachspracheEinheitAn()) return null;
  const lessonIds = lektionIdsFuerEinstiege(tage);
  if (lessonIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("fachsprache_einheit")
    .select("inhalt")
    .in("lesson_id", lessonIds)
    .eq("status", "veroeffentlicht");
  const karten = (data ?? []).flatMap((z) => parseInhalt(z.inhalt)?.wortkarten ?? []);
  return glossarAus(karten);
}

/**
 * Vokabelklick (SR-24): Wortkarten aller veröffentlichten Fachsprache-Einheiten
 * des Moduls, zu dem die Lektion gehört (ohne Modul: des Kurses), mit
 * signierten Bild-Links. Leer bei ausgeschaltetem Schalter oder ohne Einheiten;
 * mit dem Client der angemeldeten Person (RLS wie SR-84). Es wird nicht
 * erfasst, wer welches Wort antippt.
 */
export async function getVokabelnFuerLektion(lessonId: string): Promise<Vokabel[]> {
  if (!fachspracheEinheitAn()) return [];
  const supabase = await createClient();

  const { data: lektion } = await supabase.from("lesson").select("course_id").eq("id", lessonId).maybeSingle();
  if (!lektion?.course_id) return [];
  const { data: kurs } = await supabase.from("course").select("id, module_id").eq("id", lektion.course_id).maybeSingle();
  if (!kurs) return [];
  const { data: kurse } = kurs.module_id
    ? await supabase.from("course").select("id").eq("module_id", kurs.module_id)
    : { data: [{ id: kurs.id }] };
  const kursIds = (kurse ?? []).map((k) => k.id);
  if (kursIds.length === 0) return [];
  const { data: lektionen } = await supabase.from("lesson").select("id").in("course_id", kursIds);
  const lessonIds = (lektionen ?? []).map((l) => l.id);
  if (lessonIds.length === 0) return [];

  const { data: einheiten } = await supabase
    .from("fachsprache_einheit")
    .select("id, lesson_id, inhalt")
    .in("lesson_id", lessonIds)
    .eq("status", "veroeffentlicht")
    .order("lesson_id");

  const karten = (einheiten ?? []).flatMap((e) =>
    (parseInhalt(e.inhalt)?.wortkarten ?? []).map((k, i) => ({ id: `${e.id}:${i}`, lessonId: e.lesson_id, karte: k }))
  );
  const pfade = [...new Set(karten.flatMap((k) => (k.karte.bild ? [bildPfad(k.lessonId, k.karte.bild.datei)] : [])))];
  const links = new Map<string, string>();
  if (pfade.length > 0) {
    const { data } = await supabase.storage.from(FACHSPRACHE_BUCKET).createSignedUrls(pfade, BILD_GUELTIGKEIT_SEKUNDEN);
    for (const e of data ?? []) if (e.path && e.signedUrl && !e.error) links.set(e.path, e.signedUrl);
  }
  return karten.map(({ id, lessonId: lid, karte }) => ({
    id,
    wort: karte.wort,
    erklaerung: karte.erklaerung,
    beispiel: karte.beispiel,
    bildUrl: karte.bild ? (links.get(bildPfad(lid, karte.bild.datei)) ?? null) : null,
    bildAlt: karte.bild?.alt ?? null,
    formen: karte.formen ?? [],
  }));
}
