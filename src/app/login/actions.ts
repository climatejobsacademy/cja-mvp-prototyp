"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Magic-Link-Login (data-model.md 4d: "Magic-Link-Mechanismus strukturell
 * gebaut (SR-16), automatisierter Versand erst ab Build next" — d. h. der
 * Mechanismus selbst darf schon existieren, auch wenn im Prototyp Accounts
 * händisch von einem Admin angelegt werden statt per Self-Signup).
 */
export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { ok: false as const, error: "Bitte E-Mail-Adresse angeben." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
      // Kein automatisches Anlegen unbekannter Accounts — Prototyp legt
      // Accounts händisch an (data-model.md 4d).
      shouldCreateUser: false,
    },
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const };
}
