import { cn } from "@/lib/utils";

/**
 * Segment-Fortschritt (Handoff 2a, "Fortschritt"): ein Segment je Einheit,
 * gefüllt bg-eco-green, leer bg-border. Kein sichtbarer Zähltext -- der Wert
 * steht für Screenreader in `label` (z. B. "1 von 2 Lektionen"), die
 * Segmente selbst sind aria-hidden.
 *
 * size="curriculum": h-2, volle Breite. size="kompakt": h-1.5, max-w-[200px]
 * (Karten/Zeilen).
 */
export function SegmentProgress({
  value,
  max,
  label,
  size = "kompakt",
  className,
}: {
  value: number;
  max: number;
  label: string;
  size?: "curriculum" | "kompakt";
  className?: string;
}) {
  if (max <= 0) return null;
  const filled = Math.min(Math.max(value, 0), max);

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={filled}
      aria-valuetext={label}
      className={cn("flex w-full gap-[3px]", size === "kompakt" && "max-w-[200px]", className)}
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={cn(
            "flex-1 rounded-sm",
            size === "curriculum" ? "h-2" : "h-1.5",
            i < filled ? "bg-eco-green" : "bg-border"
          )}
        />
      ))}
    </div>
  );
}
