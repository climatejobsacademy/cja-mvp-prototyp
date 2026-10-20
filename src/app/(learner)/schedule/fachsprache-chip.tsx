import Link from "next/link";
import { MessageCircle } from "lucide-react";

import type { EinstiegEintrag } from "@/lib/fachsprache-einstiege";
import { cn } from "@/lib/utils";

import { BLOCK_RAND } from "./plan-bausteine";

// Fachsprache-Einheit (Etappe 2, SR-84): Chip "Fachsprache" im Stundenplan an
// den Tagen, an denen zu einer Live-Lektion eine veröffentlichte Einheit
// gehört. Eigener Link unter dem Zeitraster (neben "Flexibel"), nicht im Block:
// die Blöcke haben feste Mindesthöhen (#127, #128), ein 44-px-Ziel passt dort
// nicht hinein. Symbol und Text, kein reines Farbsignal; Ziel mindestens 44 px;
// Focus-Ring. Nur ein Link, kein Lernstand, kein Tracking.

const FOKUS = "outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2";

// Der zugängliche Name enthält den sichtbaren Text (Fachsprache bzw. "Fachsprache: Titel").
function beschriftung(e: EinstiegEintrag, mitTitel: boolean) {
  return mitTitel ? `Fachsprache: ${e.titel}, zur Live-Lektion` : `Fachsprache, ${e.titel}, zur Live-Lektion`;
}

/** Wochenansicht: ein Chip in der Tagesspalte (Titel nur, wenn mehrere an einem Tag). */
export function FachspracheChip({ eintrag, mitTitel }: { eintrag: EinstiegEintrag; mitTitel: boolean }) {
  return (
    <Link
      href={eintrag.href}
      title={eintrag.titel}
      aria-label={beschriftung(eintrag, mitTitel)}
      className={cn(
        "flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-line bg-card px-3 py-2 text-[13px] leading-snug font-semibold text-ink transition-[box-shadow] duration-150 hover:shadow-card motion-reduce:transition-none",
        FOKUS
      )}
    >
      <MessageCircle className="size-4 shrink-0 text-self" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{mitTitel ? `Fachsprache: ${eintrag.titel}` : "Fachsprache"}</span>
    </Link>
  );
}

/** Tagesansicht und mobil: Leiste so breit wie die Blöcke (wie die Flexibel-Leiste). */
export function FachspracheLeiste({ eintrag, gross, mitTitel }: { eintrag: EinstiegEintrag; gross: boolean; mitTitel: boolean }) {
  const rand = gross ? BLOCK_RAND.gross : BLOCK_RAND.klein;
  return (
    <Link
      href={eintrag.href}
      title={eintrag.titel}
      aria-label={beschriftung(eintrag, mitTitel)}
      style={{ marginLeft: rand.links, marginRight: rand.rechts }}
      className={cn(
        "flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-line bg-card px-3 py-2 text-[13px] font-semibold text-ink transition-[box-shadow] duration-150 hover:shadow-card motion-reduce:transition-none",
        FOKUS
      )}
    >
      <MessageCircle className="size-4 shrink-0 text-self" aria-hidden="true" />
      <span className="min-w-0 flex-1">{mitTitel ? `Fachsprache: ${eintrag.titel}` : "Fachsprache"}</span>
    </Link>
  );
}
