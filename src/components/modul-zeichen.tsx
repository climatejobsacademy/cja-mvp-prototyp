import { cn } from "@/lib/utils";

// Entscheidung Anna 2026-10-12, auf allen Seiten gleich: das Modul klein als
// Text "Modul I · Grundlagen Elektrotechnik", groß steht das Thema der
// Lektion. Ohne Symbol (Anna: zu viele Symbole, Zahl allein zu unklar).
// Überzeile und Name aus der Modul-Ebene (0028), nicht aus einer Gliederung.

export function ModulZeichen({
  ueberzeile,
  name,
  hell,
  klein,
}: {
  /** modul.ueberzeile, z. B. "Modul I" oder "Abschluss" */
  ueberzeile: string;
  name: string;
  /** Auf einer Anker-Fläche (Lila): weiß statt grau */
  hell?: boolean;
  /** Kleinere Schrift, z. B. in Meta-Zeilen */
  klein?: boolean;
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", klein ? "text-[13px]" : "text-sm", hell ? "text-white/85" : "text-ink-muted")}>
      <span className="min-w-0">
        {ueberzeile} · {name}
      </span>
    </span>
  );
}
