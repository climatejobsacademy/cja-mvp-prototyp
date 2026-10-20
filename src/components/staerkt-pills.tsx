import Link from "next/link";

import { cn } from "@/lib/utils";

export type StaerktKompetenz = { id: string; name: string };

/** Kompetenzseite v1, Brief 3: Links öffnen die Seite mit der Kompetenz ausgewählt. */
export const kompetenzHref = (id: string) => `/kompetenzen?kompetenz=${id}`;

/**
 * "Stärkt"-Pills (Home v12): je gestärkter Kompetenz eine Pill mit
 * Mini-Ring und kleinem Glow, Klick führt auf die Kompetenzseite. Ohne
 * Zuordnung Lektion → Kompetenz: nichts. Auf Home und in der Termin-Karte
 * der Live-Lektion (Anna 2026-10-20).
 */
export function StaerktPills({ kompetenzen, aufCoral }: { kompetenzen?: StaerktKompetenz[]; aufCoral?: boolean }) {
  if (!kompetenzen || kompetenzen.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {kompetenzen.map(({ id, name }) => (
        <li key={id}>
          <Link
            href={kompetenzHref(id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-[13px] outline-none transition-[background-color] duration-150 focus-visible:ring-2 motion-reduce:transition-none",
              aufCoral
                ? "bg-white/45 text-ink hover:bg-white/65 focus-visible:ring-ink"
                : "bg-white/15 text-white hover:bg-white/25 focus-visible:ring-white"
            )}
          >
            <span aria-hidden="true" className="flex size-5 rounded-full shadow-glow-charge-sm">
              <svg viewBox="0 0 20 20" className="size-5">
                <circle cx="10" cy="10" r="7" strokeWidth="3" className={cn("fill-transparent", aufCoral ? "stroke-ink/30" : "stroke-white/40")} />
              </svg>
            </span>
            <span>
              <span className={aufCoral ? "text-ink" : "text-white/85"}>Stärkt</span>{" "}
              <span className="font-semibold">{name}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
