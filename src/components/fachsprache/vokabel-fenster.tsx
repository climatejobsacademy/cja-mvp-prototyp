"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";

import { VorlesenKnopf } from "@/components/fachsprache/vorlesen";
import type { Vokabel } from "@/lib/vokabeln";

// Vokabelklick (SR-24): Fenster über der Lektion mit Wort, Erklärung in
// einfacher Sprache, Beispielsatz, Bild (falls vorhanden) und Vorlesen. Die
// Lektion bleibt darunter stehen. Schließen per X, Klick daneben oder Esc;
// base-ui setzt den Fokus ins Fenster und danach zurück auf das Wort.
// Es wird nicht erfasst, welches Wort geöffnet wurde.

export function VokabelFenster({ vokabel, onSchliessen }: { vokabel: Vokabel | null; onSchliessen: () => void }) {
  return (
    <Dialog.Root open={vokabel !== null} onOpenChange={(offen) => !offen && onSchliessen()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-ink/40 data-open:animate-in data-open:fade-in-0 motion-reduce:animate-none" />
        <Dialog.Popup className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-h-[85dvh] max-w-lg flex-col gap-4 overflow-y-auto rounded-karte bg-card p-5 text-ink shadow-card outline-none data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-4 motion-reduce:animate-none md:top-1/2 md:bottom-auto md:-translate-y-1/2 md:p-6">
          {vokabel && (
            <>
              <div className="flex items-start gap-3">
                <Dialog.Title className="min-w-0 flex-1 text-[22px] leading-tight font-bold">{vokabel.wort}</Dialog.Title>
                <VorlesenKnopf text={vokabel.wort} label={`${vokabel.wort} vorlesen`} />
                <Dialog.Close
                  aria-label="Schließen"
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-subtle outline-none hover:bg-brand-tint focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <X className="size-[18px]" aria-hidden="true" />
                </Dialog.Close>
              </div>
              {vokabel.bildUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- signierter Link, kein next/image
                <img src={vokabel.bildUrl} alt={vokabel.bildAlt ?? ""} className="max-h-48 w-auto self-start rounded-xl object-contain" />
              )}
              <Dialog.Description className="text-[17px] leading-relaxed">{vokabel.erklaerung}</Dialog.Description>
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 text-[15px] text-ink-muted italic">„{vokabel.beispiel}“</p>
                <VorlesenKnopf text={vokabel.beispiel} label="Beispielsatz vorlesen" />
              </div>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
