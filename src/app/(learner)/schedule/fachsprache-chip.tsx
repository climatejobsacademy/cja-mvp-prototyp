import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { GeschafftZeichen } from "@/components/geschafft-zeichen";
import type { EinstiegEintrag } from "@/lib/fachsprache-einstiege";
import { cn } from "@/lib/utils";

import { BLOCK_RAND } from "./plan-bausteine";

// Fachsprache-Einheit als Warm-up (SR-84, Acceptance Check ergänzt
// 27.11.2026): an Tagen, an denen zu einer Live-Lektion eine veröffentlichte
// Einheit gehört, steht sie zu Beginn des Tages -- in der Tagesansicht als
// erste Zeile über dem Zeitraster („Zum Start: Fachsprache“), in der
// Wochenansicht als Eintrag in der Zeile „Start“ über dem Raster. Nicht im
// Block: die Blöcke haben feste Mindesthöhen (#127, #128), ein 44-px-Ziel
// passt dort nicht hinein. Symbol und Text, kein reines Farbsignal; Ziel
// mindestens 44 px; Focus-Ring. Ist die Einheit durchgearbeitet („erledigt“,
// 0074), erscheint der grüne Haken wie bei anderen geschafften Einträgen.

const FOKUS = "outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2";

function dauer(e: EinstiegEintrag): string {
  return e.dauerMinuten ? ` · ${e.dauerMinuten} Min` : "";
}

// Der zugängliche Name enthält den sichtbaren Text und den Stand.
function beschriftung(e: EinstiegEintrag, mitTitel: boolean) {
  const stand = e.erledigt ? ", erledigt" : "";
  return mitTitel
    ? `Zum Start: Fachsprache: ${e.titel}${dauer(e)}, passend zum Live-Unterricht${stand}`
    : `Zum Start: Fachsprache${dauer(e)}, ${e.titel}, passend zum Live-Unterricht${stand}`;
}

/** Wochenansicht: ein Eintrag in der Zeile „Start“ (Titel nur, wenn mehrere an einem Tag). */
export function FachspracheChip({ eintrag, mitTitel }: { eintrag: EinstiegEintrag; mitTitel: boolean }) {
  return (
    <Link
      href={eintrag.href}
      title={eintrag.titel}
      aria-label={beschriftung(eintrag, mitTitel)}
      className={cn(
        "flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-line bg-card px-3 py-2 text-[13px] leading-snug font-semibold transition-[box-shadow] duration-150 hover:shadow-card motion-reduce:transition-none",
        eintrag.erledigt ? "text-ink-muted" : "text-ink",
        FOKUS
      )}
    >
      <MessageCircle className="size-4 shrink-0 text-self" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{mitTitel ? `Fachsprache: ${eintrag.titel}` : "Fachsprache"}</span>
      {eintrag.erledigt && <GeschafftZeichen klein />}
    </Link>
  );
}

/** Tagesansicht und mobil: erste Zeile des Tages, so breit wie die Blöcke. */
export function FachspracheLeiste({ eintrag, gross, mitTitel }: { eintrag: EinstiegEintrag; gross: boolean; mitTitel: boolean }) {
  const rand = gross ? BLOCK_RAND.gross : BLOCK_RAND.klein;
  return (
    <Link
      href={eintrag.href}
      title={eintrag.titel}
      aria-label={beschriftung(eintrag, mitTitel)}
      style={{ marginLeft: rand.links, marginRight: rand.rechts }}
      className={cn(
        "flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-l-[3px] border-line px-3 py-2 text-[13px] font-semibold transition-[box-shadow] duration-150 hover:shadow-card motion-reduce:transition-none",
        eintrag.erledigt ? "border-l-progress bg-card text-ink-muted" : "border-l-self bg-self-tint text-ink",
        FOKUS
      )}
    >
      <MessageCircle className="size-4 shrink-0 text-self" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        Zum Start: {mitTitel ? `Fachsprache: ${eintrag.titel}` : "Fachsprache"}
        <span className="font-normal text-ink-muted">{dauer(eintrag)}</span>
      </span>
      {eintrag.erledigt && <GeschafftZeichen wort={gross} klein={!gross} />}
    </Link>
  );
}
