"use client";

import type { ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { ExternalLink, X } from "lucide-react";

// Vorschau für PDFs (und Bilder) als Fenster über der Seite statt in einem
// neuen Tab (Wunsch Anna 2026-10-12, SR folgt; Materialien SR-68). Die Datei
// lädt im Fenster erst beim Öffnen; "In neuem Fenster öffnen" zeigt dieselbe
// Adresse wie bisher im neuen Tab. Schließen per X, Klick daneben oder Esc
// (base-ui Dialog: Fokus ins Fenster, beim Schließen zurück zum Knopf).

export function DateiVorschau({
  titel,
  href,
  ausloeserKlasse,
  ausloeserLabel,
  children,
}: {
  /** Name der Datei, steht oben im Fenster */
  titel: string;
  /** Adresse der Datei (bei Materialien der Route Handler mit ?aktion=vorschau) */
  href: string;
  ausloeserKlasse: string;
  /** Zugänglicher Name des Knopfs, z. B. "Vorschau: Schaltplan" */
  ausloeserLabel: string;
  /** Inhalt des Knopfs (Icon + Text) */
  children: ReactNode;
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger aria-label={ausloeserLabel} className={ausloeserKlasse}>
        {children}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-ink/40 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none" />
        <Dialog.Popup className="fixed inset-2 z-50 mx-auto flex max-w-5xl flex-col overflow-hidden rounded-karte bg-page text-ink shadow-card outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 motion-reduce:animate-none md:inset-8">
          <div className="flex items-center gap-3 border-b border-line px-4 py-3 md:px-6">
            <Dialog.Title className="min-w-0 flex-1 truncate text-base font-bold">{titel}</Dialog.Title>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full bg-subtle px-4 text-sm font-semibold outline-none hover:bg-brand-tint hover:text-brand focus-visible:ring-2 focus-visible:ring-brand"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">In neuem Fenster öffnen</span>
              <span className="sr-only sm:hidden">In neuem Fenster öffnen</span>
            </a>
            <Dialog.Close
              aria-label="Schließen"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white shadow-card outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-brand"
            >
              <X className="size-[18px]" aria-hidden="true" />
            </Dialog.Close>
          </div>
          <iframe src={href} title={`Vorschau: ${titel}`} className="w-full flex-1 bg-white" />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
