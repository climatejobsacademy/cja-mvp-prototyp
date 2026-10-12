import { cn } from "@/lib/utils";

// Entscheidung Anna 2026-10-12 (SR folgt), auf allen Seiten gleich: das Modul klein
// als Text "Modul 1 · Grundlagen Elektrotechnik", groß steht dann das Thema
// der Lektion. Ohne Symbol (Anna: zu viele Symbole, Zahl allein zu unklar).

export function ModulZeichen({
  nummer,
  name,
  hell,
  aufCoral,
  klein,
}: {
  nummer: number;
  name: string;
  /** Auf einer Anker-Fläche (Lila/Coral): weiß statt Lila */
  hell?: boolean;
  /** Auf Coral (Praxis): dunkle Schrift */
  aufCoral?: boolean;
  /** Kleinere Schrift, z. B. in Meta-Zeilen */
  klein?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-1.5",
        klein ? "text-[13px]" : "text-sm",
        aufCoral ? "text-ink" : hell ? "text-white/85" : "text-ink-muted"
      )}
    >
      <span className="min-w-0">
        Modul {nummer} · {name}
      </span>
    </span>
  );
}
