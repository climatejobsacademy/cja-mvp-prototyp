import { cn } from "@/lib/utils";

// Fortschrittsring: erreichte Teilschritte / alle Teilschritte einer
// Kompetenz (competency_fulfilment, SR-63) -- nie "Lektion angesehen".

export type RingGroesse = 112 | 84 | 80 | 64 | 56 | 48;
const RING: Record<RingGroesse, { klasse: string; strich: number; text: string }> = {
  112: { klasse: "size-28", strich: 9, text: "font-heading text-[26px] font-normal" },
  84: { klasse: "size-[84px]", strich: 8, text: "text-[15px]" },
  80: { klasse: "size-20", strich: 8, text: "text-[15px]" },
  64: { klasse: "size-16", strich: 6, text: "text-[13px]" },
  56: { klasse: "size-14", strich: 5, text: "text-xs" },
  48: { klasse: "size-12", strich: 5, text: "text-[11px]" },
};

/**
 * Fortschrittsring mit Prozentzahl, gemeinsam für Home v13 und die
 * Kompetenzseite v1: 112 px (Kompetenz-Detail, Zahl in Anton), 84/64 px
 * ("Heute stärkst du"), 80 px (Zustand D, dunkle Karte), 56 px
 * (Kompetenzliste), 48 px (Modul-Übersicht). `glow` = heute gestärkt.
 */
export function Ring({
  prozent,
  glow,
  dunkel,
  groesse = 80,
}: {
  prozent: number;
  glow?: boolean;
  dunkel?: boolean;
  groesse?: RingGroesse;
}) {
  const { klasse, strich, text } = RING[groesse];
  const r = (groesse - strich) / 2;
  const mitte = groesse / 2;
  const umfang = 2 * Math.PI * r;
  return (
    <span
      className={cn(
        "relative flex flex-none items-center justify-center rounded-full",
        klasse,
        glow && "shadow-glow-charge"
      )}
    >
      <svg viewBox={`0 0 ${groesse} ${groesse}`} className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
        <circle
          cx={mitte}
          cy={mitte}
          r={r}
          fill="none"
          strokeWidth={strich}
          className={dunkel ? "stroke-white/15" : "stroke-border"}
        />
        {prozent > 0 && (
          <circle
            cx={mitte}
            cy={mitte}
            r={r}
            fill="none"
            strokeWidth={strich}
            strokeLinecap="round"
            strokeDasharray={umfang}
            strokeDashoffset={umfang * (1 - prozent / 100)}
            className={dunkel ? "stroke-eco-green-on-dark" : "stroke-eco-green"}
          />
        )}
      </svg>
      <span className={cn("relative font-semibold tabular-nums", text)} aria-hidden="true">
        {prozent} %
      </span>
    </span>
  );
}
