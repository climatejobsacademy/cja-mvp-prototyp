"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Minus, Plus, RotateCcw, X } from "lucide-react";

import { cn } from "@/lib/utils";

// Bilder vergrößern und zoomen (Anna 2026-10-27): Ein Klick auf das Bild
// öffnet es groß über dem ganzen Bildschirm. Dort zoomen die Knöpfe + und −
// (oder ein Klick ins Bild zwischen 100 % und 200 %); bei Zoom lässt sich das
// Bild durch Ziehen bzw. Wischen verschieben (Scrollbereich). Esc, X oder
// Klick daneben schließt. Für Selbstlern-Lektionen und Fachsprache.

const STUFEN = [1, 1.5, 2, 3, 4];

export function ZoomFenster({ src, alt, children }: { src: string; alt: string; children: React.ReactNode }) {
  const [stufe, setStufe] = useState(0);
  const faktor = STUFEN[stufe];
  const knopf =
    "flex size-11 items-center justify-center rounded-full bg-white text-ink shadow-card outline-none hover:bg-subtle disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-brand";
  return (
    <Dialog.Root onOpenChange={(offen) => !offen && setStufe(0)}>
      <Dialog.Trigger
        aria-label={alt ? `Bild vergrößern: ${alt}` : "Bild vergrößern"}
        className="block w-full cursor-zoom-in rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        {children}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[70] bg-ink/80 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none" />
        <Dialog.Popup className="fixed inset-0 z-[70] flex flex-col outline-none data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none">
          <Dialog.Title className="sr-only">{alt || "Bild"}</Dialog.Title>
          <div className="flex items-center justify-end gap-2 p-3">
            <button type="button" className={knopf} aria-label="Verkleinern" disabled={stufe === 0} onClick={() => setStufe((s) => Math.max(0, s - 1))}>
              <Minus className="size-5" aria-hidden="true" />
            </button>
            <span className="min-w-14 text-center text-sm font-semibold text-white tabular-nums" aria-live="polite">
              {Math.round(faktor * 100)} %
            </span>
            <button
              type="button"
              className={knopf}
              aria-label="Vergrößern"
              disabled={stufe === STUFEN.length - 1}
              onClick={() => setStufe((s) => Math.min(STUFEN.length - 1, s + 1))}
            >
              <Plus className="size-5" aria-hidden="true" />
            </button>
            <button type="button" className={knopf} aria-label="Zurück auf 100 %" disabled={stufe === 0} onClick={() => setStufe(0)}>
              <RotateCcw className="size-5" aria-hidden="true" />
            </button>
            <Dialog.Close className={cn(knopf, "ml-2")} aria-label="Schließen">
              <X className="size-5" aria-hidden="true" />
            </Dialog.Close>
          </div>
          {/* Scrollbereich: bei Zoom das Bild verschieben (Maus, Finger, Pfeiltasten). */}
          <div className="flex min-h-0 flex-1 overflow-auto p-4 pt-0" style={{ touchAction: "pan-x pan-y pinch-zoom" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- signierte, private Links; kein Bildoptimierer */}
            <img
              src={src}
              alt={alt}
              onClick={() => setStufe((s) => (s === 0 ? 2 : 0))}
              className={cn("m-auto block select-none", faktor === 1 ? "max-h-full max-w-full cursor-zoom-in object-contain" : "max-w-none cursor-zoom-out")}
              style={faktor === 1 ? undefined : { width: `${faktor * 100}%` }}
            />
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
