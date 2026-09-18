"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * SR-16 (Magic-Link-Anmeldung): bisher gab es keine Möglichkeit, sich
 * abzumelden -- eine Lücke im bestehenden Auth-Flow, keine neue Funktion.
 * supabase.auth.signOut() löscht die Session serverseitig (Auth-Cookie).
 * Der explizite redirect() ist eine Abkürzung: middleware.ts würde beim
 * nächsten Request ohnehin auf /login umleiten (kein User mehr vorhanden),
 * so spart sich der Klick den zusätzlichen Roundtrip.
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
