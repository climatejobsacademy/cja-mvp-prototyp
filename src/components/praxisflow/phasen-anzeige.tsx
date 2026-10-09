import { SegmentProgress } from "@/components/segment-progress";
import { cn } from "@/lib/utils";

/** Fortschritt über die sechs Phasen; Phasennamen ab sm sichtbar. */
export function PhasenAnzeige({ phasen, aktuell }: { phasen: { id: string; name: string }[]; aktuell: number }) {
  const nummer = aktuell + 1;
  const label = `Phase ${nummer} von ${phasen.length}: ${phasen[aktuell]?.name ?? ""}`;
  return (
    <div className="flex flex-col gap-2">
      <SegmentProgress value={nummer} max={phasen.length} label={label} size="curriculum" />
      <p className="text-sm text-muted-foreground sm:hidden" aria-hidden="true">
        {label}
      </p>
      <ol className="hidden grid-cols-6 gap-[3px] text-xs sm:grid" aria-hidden="true">
        {phasen.map((p, i) => (
          <li
            key={p.id}
            className={cn(
              "truncate",
              i === aktuell ? "font-semibold text-eco-deep-green" : "text-muted-foreground"
            )}
          >
            {p.name}
          </li>
        ))}
      </ol>
    </div>
  );
}
