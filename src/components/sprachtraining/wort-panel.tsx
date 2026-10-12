"use client";

import type { ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { MessageCircle, X } from "lucide-react";

import type { BildId } from "@/lib/sprachtraining-daten";

import { VorlesenKnopf } from "./vorlesen";
import { WortBild } from "./wort-bilder";

// Fachbegriff im Panel von rechts (SR-24, Sprachtraining-Demo, nur demo),
// wie "Inhalte des Moduls" auf der Programmseite (Anna 2026-10-12): Bild,
// Erklärung in einfacher Sprache, Beispielsatz, jeweils mit Vorlesen.
// Schließen per X, Klick daneben oder Esc.

export function WortPanel({
  begriff,
  erklaerung,
  beispiel,
  bild,
  ausloeserKlasse,
  ausloeserLabel,
  children,
}: {
  begriff: string;
  erklaerung: string;
  beispiel?: string;
  bild?: BildId;
  ausloeserKlasse: string;
  ausloeserLabel: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger className={ausloeserKlasse} aria-label={ausloeserLabel}>
        {children}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-ink/30 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none" />
        <Dialog.Popup className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[520px] flex-col gap-6 overflow-y-auto bg-self-tint px-5 pt-5 pb-12 text-left text-ink shadow-card outline-none data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right motion-reduce:animate-none md:px-8 md:pt-8">
          <div className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-ink-muted uppercase">
              <MessageCircle className="size-4 text-self" aria-hidden="true" /> Fachbegriff
            </span>
            <Dialog.Close
              aria-label="Schließen"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white shadow-card outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-brand"
            >
              <X className="size-[18px]" aria-hidden="true" />
            </Dialog.Close>
          </div>
          <div className="flex items-center gap-3">
            <Dialog.Title className="flex-1 font-heading text-[34px] leading-tight font-normal">{begriff}</Dialog.Title>
            <VorlesenKnopf text={begriff} />
          </div>
          {bild && (
            <div className="rounded-karte bg-white p-6 text-ink">
              <WortBild id={bild} className="h-auto w-full" />
            </div>
          )}
          <Dialog.Description className="text-[17px] leading-relaxed">{erklaerung}</Dialog.Description>
          {beispiel && (
            <div className="flex items-start gap-3 rounded-zeile bg-card p-4 shadow-card">
              <p className="flex-1 text-[15px] leading-relaxed italic">„{beispiel}“</p>
              <VorlesenKnopf text={beispiel} klein />
            </div>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
