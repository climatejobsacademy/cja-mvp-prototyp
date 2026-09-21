"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Ermittelt die Basis-URL für den Magic-Link-Redirect serverseitig über
 * Vercels automatisch bereitgestellte System-Environment-Variablen statt
 * über einen manuell pro Environment gepflegten NEXT_PUBLIC_SITE_URL-Wert
 * (der ist bereits zweimal gebrochen: einmal auf Production, einmal auf
 * Preview, weil er nicht automatisch mit der tatsächlichen Deployment-URL
 * mitzieht). VERCEL_BRANCH_URL ist die stabile, branch-gebundene
 * Preview-Domain (z. B. cja-mvp-prototyp-git-<branch>-af-cj-s.vercel.app) —
 * kein NEXT_PUBLIC_-Prefix nötig, da diese Funktion nur serverseitig in der
 * Login-Action läuft, nie im Client-Bundle landet.
 */
function getSiteUrl() {
  if (process.env.VERCEL_ENV === "production") {
    return process.env.NEXT_PUBLIC_SITE_URL ?? "https://learn.climatejobsacademy.com";
  }
  if (process.env.VERCEL_BRANCH_URL) {
    return `https://${process.env.VERCEL_BRANCH_URL}`;
  }
  return "http://localhost:3000";
}

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
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
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
