"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Wortmarke } from "@/components/nav/app-nav";

// Kopf der rechtlichen Seiten (Impressum, Datenschutz, Barrierefreiheit,
// SR-60): Sie haben keine Navigation; ohne diesen Kopf kam man nur über den
// Zurück-Knopf des Browsers wieder heraus (Anna 2026-10-16). "Zurück" führt zur
// vorherigen Seite, ohne Verlauf zur Startseite (dort entscheidet die
// Anmeldung, ob Home oder Login erscheint).
export function RechtsseiteKopf() {
  const router = useRouter();

  function zurueck() {
    // Innerhalb der App setzt Next.js document.referrer nicht; deshalb reicht
    // ein Verlauf im selben Tab. Direkt geöffnet (neuer Tab): zur Startseite.
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex h-[60px] max-w-3xl items-center gap-3 px-4 md:px-6">
        <Wortmarke href="/" />
        <span className="flex-1" />
        <button
          type="button"
          onClick={zurueck}
          className="flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-ink-muted outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-brand"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Zurück
        </button>
      </div>
    </header>
  );
}
