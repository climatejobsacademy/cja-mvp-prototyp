#!/usr/bin/env node
// scripts/invite-learner.mjs
//
// SR-49: automatisiert den bisher manuellen Schritt, den Magic-Link nach
// Anlage eines Learners weiterzuleiten. Die person-Zeile selbst wird
// weiterhin händisch per Supabase Table Editor/SQL angelegt (docs/data-
// model.md, Schritt 4d: "Händische Account-Anlage durch Admin (Prototyp)")
// -- es gibt bewusst keine Admin-UI dafür (docs/design-specifications.md,
// Abschnitt 3). Dieses Skript ersetzt nur den Einladungsmail-Versand.
//
// Nutzung (nach Anlage der person-Zeile, oder davor -- Reihenfolge ist
// egal, solange die id am Ende zusammengeführt wird):
//   node --env-file=.env.local scripts/invite-learner.mjs <email> ["Voller Name"]
//
// Braucht zusätzlich zu den bestehenden NEXT_PUBLIC_SUPABASE_URL/
// NEXT_PUBLIC_SUPABASE_ANON_KEY einen SUPABASE_SERVICE_ROLE_KEY (Supabase
// Dashboard -> Project Settings -> API -> service_role). Niemals committen
// -- nur lokal in .env.local eintragen oder direkt in der Shell setzen.

import { createClient } from "@supabase/supabase-js";

const [, , email, fullName] = process.argv;

if (!email) {
  console.error(
    'Nutzung: node --env-file=.env.local scripts/invite-learner.mjs <email> ["Voller Name"]'
  );
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Fehlt: NEXT_PUBLIC_SUPABASE_URL und/oder SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Service-Role-Key: Supabase Dashboard -> Project Settings -> API -> " +
      "service_role -- lokal in .env.local eintragen (nicht committen)."
  );
  process.exit(1);
}

// Bewusst fest verdrahtet, nicht aus NEXT_PUBLIC_SITE_URL gelesen: dieses
// Skript lädt .env.local für die Supabase-Zugangsdaten, aber dort steht
// NEXT_PUBLIC_SITE_URL lokal auf http://localhost:3000 (fürs App-Dev) --
// eine Einladung soll aber immer auf Production zeigen, unabhängig davon,
// von welchem Rechner/mit welcher lokalen .env sie verschickt wird.
const INVITE_REDIRECT_URL = "https://learn.climatejobsacademy.com/auth/callback";

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
  redirectTo: INVITE_REDIRECT_URL,
  data: fullName ? { full_name: fullName } : undefined,
});

if (error) {
  console.error("Einladung fehlgeschlagen:", error.message);
  process.exit(1);
}

console.log("Einladung versendet an", email);
console.log("Auth-User-ID (für die person-Zeile, id = auth.users.id):", data.user.id);
