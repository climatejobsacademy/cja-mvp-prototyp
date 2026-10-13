import { BookOpen, FileText, Video, Wrench } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Icon-Kachel mit fester Farbe je Typ -- überall gleich (Stundenplan, Home,
 * Programm, Kompetenzen): Live-Termin Lila, Selbstlernmodul/Theorie Grün,
 * Praxis Coral. Helle Typ-Fläche, Icon in der Typfarbe (visuelles Update
 * 2026-10-11, docs/ux/visual-update).
 */
export type Typ = "live" | "selbstlern" | "theorie" | "praxis" | "dokument" | "kurs";

const TYPEN: Record<Typ, { icon: typeof BookOpen; flaeche: string }> = {
  live: { icon: Video, flaeche: "bg-brand-tint text-brand" },
  selbstlern: { icon: BookOpen, flaeche: "bg-self-tint text-self" },
  theorie: { icon: BookOpen, flaeche: "bg-self-tint text-self" },
  praxis: { icon: Wrench, flaeche: "bg-praxis-tint text-praxis-text" },
  dokument: { icon: FileText, flaeche: "bg-subtle text-ink" },
  kurs: { icon: BookOpen, flaeche: "bg-subtle text-ink" },
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
      <Icon className={g.icon} aria-hidden="true" />
    </span>
  );
}
