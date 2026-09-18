import Link from "next/link";
import type { ReactNode } from "react";

/**
 * SR-60: Impressum, Datenschutzerklärung, Barrierefreiheitserklärung.
 * Bewusst außerhalb von (learner): kein requireCurrentLearner(), kein
 * Datenbankzugriff, keine Personalisierung, kein Employer-Bezug (Rule 1
 * "organization_id" greift hier nicht — plattformweiter, nicht
 * employer-owned Inhalt). Erreichbarkeit ohne Login ist zusätzlich über
 * PUBLIC_PATHS in lib/supabase/middleware.ts sichergestellt — ohne den
 * Eintrag dort würde die Session-Middleware trotzdem auf /login umleiten.
 */
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-16">
      <Link href="/login" className="text-sm text-muted-foreground hover:underline">
        ← Zurück
      </Link>
      {children}
    </main>
  );
}
