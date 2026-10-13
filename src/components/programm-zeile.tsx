import { GraduationCap } from "lucide-react";

// Programmname über der Seitenüberschrift von Home, Stundenplan und
// Kompetenzen -- überall gleich (SR folgt). Entscheidung Anna 2026-10-12:
// präsenter als die frühere kleine graue Zeile, aber ohne Pill und ohne
// Lila-Text: dunkel, halbfett, mit kleinem Doktorhut wie das Ziel in "Dein Weg".

export function ProgrammZeile({ name }: { name: string }) {
  const programm = name.trim();
  if (!programm) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
      <GraduationCap className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
      {programm}
    </span>
  );
}
