"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";

// Kompetenzseite (SR-62), Entscheidung Anna 2026-10-12: die Details einer
// Kompetenz fahren wie "Inhalte des Moduls" auf der Programmseite als Panel
// von rechts herein (mobil volle Breite), die Übersicht bleibt dahinter.
// Schließen per X, Klick daneben oder Esc (base-ui Dialog: Fokus ins Panel).
// ?kompetenz=… in der Adresse öffnet es -- so verlinkt Home direkt; beim
// Schließen fällt der Parameter weg.

export function KompetenzPanel({
  ueberzeile,
  schliessenHref,
  children,
}: {
  /** z. B. "Kompetenz" */
  ueberzeile: string;
  /** Adresse der Übersicht ohne ?kompetenz=… */
  schliessenHref: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [offen, setOffen] = useState(true);
  return (
    <Dialog.Root
      open={offen}
      onOpenChange={(neu) => {
        setOffen(neu);
        if (!neu) router.replace(schliessenHref, { scroll: false });
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-ink/30 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none" />
        <Dialog.Popup
          aria-labelledby="kompetenz-detail"
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[680px] flex-col gap-5 overflow-y-auto bg-page px-4 pt-5 pb-12 text-ink shadow-card outline-none data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right motion-reduce:animate-none md:px-8 md:pt-8"
        >
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-semibold tracking-[0.12em] text-ink-muted uppercase">{ueberzeile}</span>
            <Dialog.Close
              aria-label="Schließen"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white shadow-card outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-brand"
            >
              <X className="size-[18px]" aria-hidden="true" />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
