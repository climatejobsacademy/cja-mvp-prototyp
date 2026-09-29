import { BookOpen, FileText, Video, Wrench } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Icon-Kachel mit fester Farbe je Typ -- überall gleich (Stundenplan, Home,
 * Programm, Kompetenzen): Live-Termin Lylac, Selbstlernmodul/Theorie Grün,
 * Praxis Coral. Flächen nur als helle Töne, Icon immer Deep Green
 * (design-specifications.md Abschnitt 1: Lylac/Coral/Grün als Fläche).
 */
export type Typ = "live" | "selbstlern" | "theorie" | "praxis" | "dokument" | "kurs";

const TYPEN: Record<Typ, { icon: typeof BookOpen; flaeche: string }> = {
  live: { icon: Video, flaeche: "bg-lylac/20" },
  selbstlern: { icon: BookOpen, flaeche: "bg-eco-green/15" },
  theorie: { icon: BookOpen, flaeche: "bg-eco-green/15" },
  praxis: { icon: Wrench, flaeche: "bg-coral/25" },
  dokument: { icon: FileText, flaeche: "bg-muted" },
  kurs: { icon: BookOpen, flaeche: "bg-muted" },
};

const GROESSE = {
  gross: { kachel: "size-10 rounded-[10px]", icon: "size-5" },
  mittel: { kachel: "size-8 rounded-lg", icon: "size-[18px]" },
  klein: { kachel: "size-6 rounded-md", icon: "size-3.5" },
} as const;

/** Lektions-content_type → Typ der Kachel. */
export function typFuerContentType(contentType: string): Typ {
  if (contentType === "live") return "live";
  if (contentType === "scorm") return "selbstlern";
  if (contentType === "repository") return "dokument";
  return "kurs";
}

export function TypIcon({
  typ,
  groesse = "mittel",
  label,
  className,
}: {
  typ: Typ;
  groesse?: keyof typeof GROESSE;
  /** Screenreader-Text; ohne Label ist die Kachel rein dekorativ. */
  label?: string;
  className?: string;
}) {
  const { icon: Icon, flaeche } = TYPEN[typ];
  const g = GROESSE[groesse];
  return (
    <span
      className={cn("flex shrink-0 items-center justify-center", g.kachel, flaeche, className)}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <Icon className={cn(g.icon, "text-eco-deep-green")} aria-hidden="true" />
    </span>
  );
}
