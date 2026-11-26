// Sitzung und Abmelden (SR-99, 26.11.2026). Ohne Server-Import, damit
// node:test die Regel prüfen kann.
//
// Dauer der Anmeldung: Production endet eine Sitzung nach 14 Tagen ohne
// Nutzung (Inactivity timeout 336 Stunden) und spätestens 30 Tage nach dem
// Login (Time-box 720 Stunden); "Single session per user" ist aus. Diese
// Werte stehen nur im Supabase-Dashboard (Authentication → Sessions), nicht
// im Code; Staging ohne Begrenzung. Beschreibung: docs/runbook.md, Abschnitt 7.

/**
 * Reichweite von "Abmelden": nur die Sitzung auf diesem Gerät. Ohne Angabe
 * meldet supabase.auth.signOut() alle Geräte der Person ab ("global").
 */
export const ABMELDEN_SCOPE = "local" as const;
