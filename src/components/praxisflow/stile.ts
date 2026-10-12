import { cn } from "@/lib/utils";

// Stil-Konstanten des Praxis-Flows (Demo). Angleichung an Home, Stundenplan,
// Kompetenzen und Lektion (Entscheidung Anna 2026-10-12, SR folgt): weiße
// Karten mit Schatten, runde Knöpfe. Farben wie überall: Lime für den
// Hauptknopf (wie "Zum Live-Unterricht" auf Home) und "jetzt", Lila für
// Auswahl und Häkchen, Dunkelgrün für Fortschritt, Marken-Coral
// (#FFA573, dunkle Schrift) für die Praxis-Karte und Nummern, Grau für
// Nebenaktionen. Der alte Flow
// (praxistag/[fieldJobId]) hat eigene Konstanten und bleibt unverändert.
export const FOKUS = "outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2";
export const PRIMAER = cn(
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-lime px-5 text-[15px] font-bold text-on-lime transition-[filter] duration-150 hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100 sm:w-auto [&_svg]:size-[17px] motion-reduce:transition-none",
  FOKUS
);
export const SEKUNDAER = cn(
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-subtle px-5 text-[15px] font-semibold text-ink hover:bg-brand-tint disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto [&_svg]:size-[17px]",
  FOKUS
);
export const ICON_BUTTON = cn(
  "inline-flex size-10 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-subtle hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent [&_svg]:size-[17px]",
  FOKUS
);
/** Inhalt einer Phase: weiße Karte wie auf den anderen Seiten. */
export const KARTE = "flex flex-col gap-6 rounded-karte bg-card p-5 text-ink shadow-card md:p-7";
/** Abschnitt innerhalb der Karte (Liste, Einschätzung, Freigabe): helle Fläche statt Rahmen. */
export const ABSCHNITT = "flex flex-col gap-3 rounded-zeile bg-subtle p-4";
/** Zwischenüberschrift in der Karte */
export const UEBERSCHRIFT = "text-base font-bold text-ink";
export const EINGABE = cn(
  "min-h-11 rounded-[22px] border border-line bg-white px-4 py-2 text-[15px] text-ink placeholder:text-ink-subtle",
  FOKUS
);
export const TEXT = "text-[15px] leading-relaxed text-ink";
