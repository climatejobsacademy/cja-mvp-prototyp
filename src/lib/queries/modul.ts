import { cache } from "react";

import { aktuellerModulIndex, modulStatus, type ModulStatus } from "@/lib/programm";
import { createClient } from "@/lib/supabase/server";

// Modul-Ebene (Migration 0028, SR-14, SR-73): Module des eigenen Programms
// mit Zeitraum aus dem Stundenplan der Kohorte (fn_modul_zeitraum), das
// aktuelle Modul und die Kompetenzen je Modul (modul_competency, ausdrücklich
// zugeordnet, nicht aus den Wochen abgeleitet -- Entscheidung 2026-10-13).
// Nur lesend, alles über die RLS der lernenden Person: modul und
// modul_competency nur veröffentlicht, fn_modul_zeitraum ist security invoker.

export type ModulMitZeitraum = {
  id: string;
  /** z. B. "Modul I" oder "Abschluss" */
  ueberzeile: string;
  name: string;
  reihenfolge: number;
  /** erster/letzter Termin im Stundenplan der Kohorte; null = noch nicht geplant */
  von: string | null;
  bis: string | null;
  status: ModulStatus;
};

/**
 * Module des Programms in Reihenfolge, mit Zeitraum und Status für `heute`.
 * Leer, wenn das Programm (noch) keine veröffentlichten Module hat. Pro
 * Request gecacht: Home lädt das aus zwei Bereichen.
 */
export const getModuleDerKohorte = cache(
  async (programmeId: string, cohortId: string, heute: string): Promise<ModulMitZeitraum[]> => {
    const supabase = await createClient();
    const [{ data: modulZeilen }, { data: zeitraeume }] = await Promise.all([
      supabase
        .from("modul")
        .select("id, ueberzeile, name, reihenfolge")
        .eq("programme_id", programmeId)
        .order("reihenfolge", { ascending: true }),
      supabase.rpc("fn_modul_zeitraum", { p_cohort_id: cohortId }),
    ]);
    const zeitraum = new Map((zeitraeume ?? []).map((z) => [z.modul_id, z]));
    const liste = (modulZeilen ?? []).map((m) => ({
      ...m,
      von: zeitraum.get(m.id)?.von ?? null,
      bis: zeitraum.get(m.id)?.bis ?? null,
    }));
    const status = modulStatus(liste, heute);
    return liste.map((m, i) => ({ ...m, status: status[i] }));
  }
);

/** Das aktuelle Modul ("Hier bist du"); null = nichts geplant oder Programm vorbei. */
export async function getAktuellesModul(
  programmeId: string,
  cohortId: string,
  heute: string
): Promise<ModulMitZeitraum | null> {
  const alle = await getModuleDerKohorte(programmeId, cohortId, heute);
  const index = aktuellerModulIndex(alle, heute);
  return index === -1 ? null : alle[index];
}

export type ModulKompetenz = {
  competencyId: string;
  /** z. B. "M2.01"; null, wenn beim Import keins vergeben wurde */
  kuerzel: string | null;
  reihenfolge: number;
};

/**
 * Kompetenzen je Modul aus modul_competency, nach Reihenfolge. Module ohne
 * Zuordnung fehlen in der Map -- bis zum Import (14.10.2026) sind das alle.
 */
export async function getModulKompetenzen(modulIds: string[]): Promise<Map<string, ModulKompetenz[]>> {
  if (modulIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase
    .from("modul_competency")
    .select("modul_id, competency_id, kuerzel, reihenfolge")
    .in("modul_id", modulIds)
    .order("reihenfolge", { ascending: true });
  const ergebnis = new Map<string, ModulKompetenz[]>();
  for (const z of data ?? []) {
    const liste = ergebnis.get(z.modul_id) ?? [];
    liste.push({ competencyId: z.competency_id, kuerzel: z.kuerzel, reihenfolge: z.reihenfolge });
    ergebnis.set(z.modul_id, liste);
  }
  return ergebnis;
}
