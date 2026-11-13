import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * „Geschafft“ (SR-13, ergänzt 13.11.2026): ein Zeichen für alle Ansichten,
 * gefüllter Kreis in Eco Green (progress) mit weißem Haken wie Phasenleiste
 * und Fortschrittskreise. Das Wort steht in Ink (Kontrast), ohne Wort nur für
 * Screenreader.
 */
export function GeschafftZeichen({ wort, klein, className }: { wort?: boolean; klein?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 text-xs font-bold text-ink", className)}>
      <span aria-hidden="true" className={cn("flex items-center justify-center rounded-full bg-progress text-white", klein ? "size-3.5" : "size-[18px]")}>
        <Check className={klein ? "size-2.5" : "size-3"} strokeWidth={4} />
      </span>
      {wort ? <span>Geschafft</span> : <span className="sr-only">geschafft</span>}
    </span>
  );
}
