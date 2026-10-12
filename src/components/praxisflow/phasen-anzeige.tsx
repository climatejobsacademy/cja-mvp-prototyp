import { Check, ClipboardCheck, Hammer, ListOrdered, Lock, Search, Star, UserCheck, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

// Level-Karte auf der Coral-Anker-Karte (Vorschau Anna 2026-10-12, Praxis
// spielerischer): sechs Stationen mit Symbol, verbunden durch eine Linie wie
// "Dein Weg" -- geschafft Dunkelgrün mit Häkchen, aktuell Lime, kommend hell
// mit Schloss; rechts ein kleiner Ring "2 von 6". Schrift dunkel auf Coral.

const SYMBOL: Record<string, LucideIcon> = {
  analyse: Search,
  planen: ListOrdered,
  entscheiden: UserCheck,
  durchfuehren: Hammer,
  kontrolle: ClipboardCheck,
  bewerten: Star,
};

function Ring({ geschafft, gesamt }: { geschafft: number; gesamt: number }) {
  const r = 20;
  const umfang = 2 * Math.PI * r;
  return (
    <span className="relative -mt-1 flex size-12 flex-none items-center justify-center" aria-hidden="true">
      <svg viewBox="0 0 48 48" className="absolute inset-0 size-12 -rotate-90">
        <circle cx="24" cy="24" r={r} strokeWidth="5" className="fill-transparent stroke-white/55" />
        <circle
          cx="24"
          cy="24"
          r={r}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={umfang}
          strokeDashoffset={umfang * (1 - geschafft / gesamt)}
          className="fill-transparent stroke-ink transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none"
        />
      </svg>
      <span className="text-[11px] font-bold tabular-nums">
        {geschafft}/{gesamt}
      </span>
    </span>
  );
}

export function PhasenAnzeige({ phasen, aktuell }: { phasen: { id: string; name: string }[]; aktuell: number }) {
  const label = `Phase ${aktuell + 1} von ${phasen.length}: ${phasen[aktuell]?.name ?? ""}, ${aktuell} geschafft`;
  return (
    <div className="flex items-start gap-4">
      <ol aria-label={label} className="grid min-w-0 flex-1 grid-cols-6 items-start">
        {phasen.map((p, i) => {
          const Icon = SYMBOL[p.id] ?? Star;
          const geschafft = i < aktuell;
          const jetzt = i === aktuell;
          return (
            <li key={p.id} className="flex flex-col items-center gap-1.5" aria-current={jetzt ? "step" : undefined}>
              <div className="flex w-full items-center">
                <span className={cn("h-0.5 flex-1", i === 0 ? "bg-transparent" : i <= aktuell ? "bg-ink" : "bg-white/70")} />
                <span
                  className={cn(
                    // Alle Stationen gleich groß (Anna: "uneben"); die aktuelle nur über Farbe + Glow.
                    "relative flex size-10 flex-none items-center justify-center rounded-full",
                    jetzt && "bg-lime text-on-lime shadow-glow-charge-sm",
                    geschafft && "bg-ink text-white",
                    !geschafft && !jetzt && "bg-white/55 text-ink/60"
                  )}
                >
                  {geschafft ? (
                    <Check className="size-4" strokeWidth={3} aria-hidden="true" />
                  ) : (
                    <Icon className="size-[18px]" aria-hidden="true" />
                  )}
                  {!geschafft && !jetzt && (
                    <span className="absolute -right-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full bg-white">
                      <Lock className="size-2.5 text-ink/60" aria-hidden="true" />
                    </span>
                  )}
                </span>
                <span className={cn("h-0.5 flex-1", i === phasen.length - 1 ? "bg-transparent" : i < aktuell ? "bg-ink" : "bg-white/70")} />
              </div>
              <span className={cn("hidden truncate text-xs sm:block", jetzt ? "font-bold" : "font-medium")}>
                {p.name}
                <span className="sr-only">{geschafft ? " (geschafft)" : jetzt ? " (jetzt)" : " (kommt noch)"}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <Ring geschafft={aktuell} gesamt={phasen.length} />
    </div>
  );
}
