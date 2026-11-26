"use server";

import { redirect } from "next/navigation";

import { ABMELDEN_SCOPE } from "@/lib/sitzung";
import { createClient } from "@/lib/supabase/server";

/**
 * SR-16 (Magic-Link-Anmeldung): bisher gab es keine Möglichkeit, sich
 * abzumelden -- eine Lücke im bestehenden Auth-Flow, keine neue Funktion.
 * supabase.auth.signOut() löscht die Session serverseitig (Auth-Cookie).
 * Der explizite redirect() ist eine Abkürzung: middleware.ts würde beim
 * nächsten Request ohnehin auf /login umleiten (kein User mehr vorhanden),
 * so spart sich der Klick den zusätzlichen Roundtrip.
 * SR-99 (26.11.2026): Abmelden betrifft nur dieses Gerät (scope "local");
 * ohne Angabe würde Supabase alle Geräte der Person abmelden.
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: ABMELDEN_SCOPE });
  redirect("/login");
}
