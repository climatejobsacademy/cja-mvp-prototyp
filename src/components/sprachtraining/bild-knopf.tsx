"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Image as BildSymbol, X } from "lucide-react";

import type { BildId } from "@/lib/sprachtraining-daten";
import { cn } from "@/lib/utils";

import { WortBild } from "./wort-bilder";

// Sprachtraining-Demo (SR-24/SR-31, nur demo): Bild-Symbol neben dem Wort,
// gleich groß wie 🔊, weiß
// mit Schatten, damit es auf dem hellen Grün auffällt; Klick öffnet das Bild in einem kleinen Fenster in der
// Mitte (Anna 2026-10-13). Schließen per X, Klick daneben oder Esc.

export function BildKnopf({ id, titel, klein }: { id: BildId; titel: string; klein?: boolean }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger
        aria-label={`Bild ansehen: ${titel}`}
        title="Bild ansehen"
        className={cn(
          "inline-flex flex-none items-center justify-center rounded-full bg-white text-self shadow-card outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-brand",
          klein ? "size-8" : "size-10"
        )}
      >
        <BildSymbol className={klein ? "size-4" : "size-5"} aria-hidden="true" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[60] bg-ink/30 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-[60] flex w-[calc(100%-32px)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-karte bg-card p-5 text-ink shadow-card outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-90 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 motion-reduce:animate-none">
          <div className="flex items-center gap-3">
            <Dialog.Title className="flex-1 text-[17px] font-semibold">{titel}</Dialog.Title>
            <Dialog.Close
              aria-label="Schließen"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-subtle outline-none hover:bg-line focus-visible:ring-2 focus-visible:ring-brand"
            >
              <X className="size-[18px]" aria-hidden="true" />
            </Dialog.Close>
          </div>
          <WortBild id={id} className="h-auto w-full" />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
