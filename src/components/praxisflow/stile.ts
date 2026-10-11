import { cn } from "@/lib/utils";

// Kopie der Stil-Konstanten aus praxistag/[fieldJobId]/praxistag-flow.tsx
// (dort nicht exportiert), damit der alte Flow unverändert bleibt.
// Handoff 2a: drei Button-Varianten, Container-Karten, Fokus-Ring Eco Green.
export const FOKUS = "outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2";
export const PRIMAER = cn(
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand px-4 text-[15px] font-medium text-white hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-brand sm:w-auto [&_svg]:size-[18px]",
  FOKUS
);
export const SEKUNDAER = cn(
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border bg-white px-4 text-[15px] font-medium text-ink hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto [&_svg]:size-[18px]",
  FOKUS
);
export const ICON_BUTTON = cn(
  "inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-ink hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent [&_svg]:size-[18px]",
  FOKUS
);
export const KARTE = "flex flex-col gap-5 rounded-xl border border-border p-4";
export const EINGABE = cn(
  "min-h-11 rounded-lg border border-border bg-white px-3 py-2 text-[15px] text-ink placeholder:text-muted-foreground",
  FOKUS
);
export const TEXT = "text-[15px] leading-relaxed text-ink";
