"use server";

import { revalidatePath } from "next/cache";

import { fachspracheEinheitAn } from "@/lib/schalter";
import { createClient } from "@/lib/supabase/server";

/**
 * SR-84 (Acceptance Check ergänzt 27.11.2026, Migration 0074): Die Einheit
 * wurde bis zum Ende durchgearbeitet. Speichert „erledigt“ für die angemeldete
 * Person über fn_fachsprache_erledigt_setzen (einmal je Person und Einheit;
 * die Datenbank prüft, dass die Einheit veröffentlicht und lesbar ist). Kein
 * Lektionsabschluss, kein Nachweis. Fehler (z. B. Entwurf, den nur AfCJ admin
 * sieht) bleiben still: die Seite funktioniert auch ohne Speichern. Es wird
 * nichts geloggt.
 */
export async function fachspracheErledigt(einheitId: string): Promise<void> {
  if (!fachspracheEinheitAn()) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("fn_fachsprache_erledigt_setzen", { p_einheit: einheitId });
  if (error) return;
  revalidatePath("/schedule");
  revalidatePath("/home");
}
