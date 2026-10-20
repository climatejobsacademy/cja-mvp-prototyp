"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Maximize2, X } from "lucide-react";

import type { SeitenBild } from "@/lib/fachsprache-laden";

// Fachsprache-Einheit (Stufe 2, SR-84): Bild steht direkt auf der Karte und
// lässt sich per Knopf in einem Fenster vergrößern (Entscheidung O5). Der
// Alternativtext ist Pflicht im Inhalt (0051) und steht am Bild und im Fenster.
// Das Bild kommt über einen kurzlebigen signierten Link vom Server; bewusst ein
// einfaches <img>, damit der Link nicht durch den Bildoptimierer von Next
// zwischengespeichert wird.

export function KartenBild({ bild }: { bild: SeitenBild }) {
  return (
    <figure className="relative overflow-hidden rounded-xl bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={bild.url} alt={bild.alt} className="mx-auto max-h-64 w-auto max-w-full object-contain" />
      <Dialog.Root>
        <Dialog.Trigger
          aria-label="Bild vergrößern"
          title="Bild vergrößern"
          className="absolute top-2 right-2 inline-flex size-11 items-center justify-center rounded-full bg-white text-self shadow-card outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          <Maximize2 className="size-5" aria-hidden="true" />
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-[60] bg-ink/30 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none" />
          <Dialog.Popup className="fixed top-1/2 left-1/2 z-[60] flex max-h-[calc(100%-32px)] w-[calc(100%-32px)] max-w-[640px] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-auto rounded-karte bg-card p-5 text-ink shadow-card outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-90 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 motion-reduce:animate-none">
            <div className="flex items-center gap-3">
              <Dialog.Title className="flex-1 text-[17px] font-semibold">Bild</Dialog.Title>
              <Dialog.Close
                aria-label="Schließen"
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-subtle outline-none hover:bg-line focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                <X className="size-[18px]" aria-hidden="true" />
              </Dialog.Close>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bild.url} alt={bild.alt} className="mx-auto h-auto max-h-[70vh] w-auto max-w-full object-contain" />
            <Dialog.Description className="text-[15px] text-ink-muted">{bild.alt}</Dialog.Description>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </figure>
  );
}
