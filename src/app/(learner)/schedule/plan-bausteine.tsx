import Link from "next/link";
import { ArrowRight, BookOpen, Check } from "lucide-react";

import { spuren, stunden, type Tagestyp } from "@/lib/stundenplan";
import { cn } from "@/lib/utils";

import { JetztLinie } from "./jetzt-linie";
import type { Chip, TagModell } from "./plan-modell";
import { TerminBlock } from "./termin-block";

// Stundenplan v2 (docs/design_handoff_stundenplan_v2, SR folgt): gemeinsame
// Bausteine von Woche, Tag und Monat. Aktivitätsfarben wie Home und
// Kompetenzen: Live = Lila (--brand), Selbstlernen = Eco Green, Praxis = Coral --
// immer Icon + Text, nie nur Farbe. Änderungsliste Anna 2026-10-10: ruhiger
// -- kein Rahmen, feine Stundenlinien, Vergangenes weiß und grau.

/** Zeitraum-Zusatz "· Theorie (online)" (Änderungsliste Punkt 1) */
export const WOCHENTYP_TEXT: Record<Tagestyp, string> = {
  theorie: "Theorie (online)",
  praxis: "Praxis",
  lernen: "Selbstlernen",
};

const TAGESTYP: Record<Tagestyp, { text: string; farbe: string }> = {
  theorie: { text: "Theorietag", farbe: "text-ink" },
  praxis: { text: "Praxistag", farbe: "text-praxis-text" },
  lernen: { text: "Lerntag", farbe: "text-ink" },
};

/**
 * Änderungsliste Punkt 1: nur Tage, deren Typ vom Haupttyp des Zeitraums
 * abweicht, bekommen ein Label -- als Text, ohne Hintergrund.
 */
export function AbweichungsLabel({ typ, haupt }: { typ: Tagestyp | null; haupt: Tagestyp | null }) {
  if (!typ || typ === haupt) return null;
  return <span className={cn("text-xs font-semibold", TAGESTYP[typ].farbe)}>{TAGESTYP[typ].text}</span>;
}

/** Tag mit Inhalten, die alle erledigt sind (Häkchen in der Tagesliste, Punkt 8). */
export function tagErledigt(tag: TagModell): boolean {
  const alle = [...tag.bloecke.map((b) => b.status === "erledigt"), ...tag.chips.map((c) => c.erledigt)];
  return alle.length > 0 && alle.every(Boolean);
}

/**
 * Selbstlern-Eintrag in "Flexibel" der Wochenansicht -- nie mit Uhrzeit
 * (Brief 5.5). Punkt 7: voller Titel (umbrechen), kein Status-Text; offen
 * hellgrün, erledigt weiß mit grauem Text und Häkchen.
 */
export function FlexChip({ chip }: { chip: Chip }) {
  return (
    <Link
      href={chip.href}
      title={chip.refresher ? chip.titel : undefined}
      aria-label={`Selbstlernen, flexibel, ${chip.refresher ? "Wissen festigen: " : ""}${chip.titel}, ${chip.erledigt ? "erledigt" : "offen"}`}
      className={cn(
        "flex min-w-0 items-start gap-2 rounded-xl px-3 py-2.5 text-[13px] leading-snug font-semibold outline-none transition-[box-shadow] duration-150 hover:shadow-card focus-visible:ring-2 focus-visible:ring-brand motion-reduce:transition-none",
        chip.erledigt ? "text-ink-muted" : "bg-self-tint text-ink"
      )}
    >
      <BookOpen className="mt-px size-4 shrink-0 text-self" aria-hidden="true" />
      {/* Voller Titel (Anna 2026-10-11): das Thema steht oft in der Klammer.
          Gleicher Titel wie der Live-Unterricht des Tages: nur "Wissen festigen" (Anna 2026-10-11, vorher "Refresher"). */}
      <span className="min-w-0 flex-1 hyphens-auto break-words">{chip.refresher ? "Wissen festigen" : chip.titel}</span>
      {chip.erledigt && <Check className="mt-0.5 size-3.5 shrink-0 text-progress" strokeWidth={3} aria-hidden="true" />}
    </Link>
  );
}

/** Ränder der Blöcke in der Tagesspalte -- die Flexibel-Leiste der Tagesansicht nutzt dieselben (Punkt 9). */
export const BLOCK_RAND = { gross: { links: 8, rechts: 16 }, klein: { links: 6, rechts: 8 } } as const;

/**
 * Punkt 9: Flexibel in der Tagesansicht als schmale hellgrüne Leiste, genau
 * so breit wie der Live-Block -- Buch-Icon, Titel, Aktion.
 */
export function FlexLeiste({ chip, gross }: { chip: Chip; gross: boolean }) {
  const rand = gross ? BLOCK_RAND.gross : BLOCK_RAND.klein;
  return (
    <Link
      href={chip.href}
      title={chip.refresher ? chip.titel : undefined}
      aria-label={`Selbstlernen, flexibel, ${chip.refresher ? "Wissen festigen: " : ""}${chip.titel}, ${chip.erledigt ? "erledigt" : "weiterlernen"}`}
      style={{ marginLeft: rand.links, marginRight: rand.rechts }}
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold outline-none transition-[box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-brand motion-reduce:transition-none",
        chip.erledigt
          ? "border border-line bg-card text-ink-muted hover:shadow-card"
          : "bg-self-tint text-ink hover:shadow-card"
      )}
    >
      <BookOpen className="size-4 shrink-0 text-self" aria-hidden="true" />
      <span className="min-w-0 flex-1">{chip.refresher ? "Wissen festigen" : chip.titel}</span>
      {chip.erledigt ? (
        <Check className="size-3.5 shrink-0 text-progress" strokeWidth={3} aria-hidden="true" />
      ) : (
        <span aria-hidden="true" className="inline-flex shrink-0 items-center gap-1 text-xs font-bold">
          Weiterlernen
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </span>
      )}
    </Link>
  );
}

/**
 * Positionen im Raster in Prozent der Rasterhöhe -- so passt das Raster sich
 * der verfügbaren Höhe an (Entscheidung Anna 2026-10-10: die ganze Woche auf
 * einen Blick, ohne Scrollen). Die Höhe gibt die Ansicht vor.
 */
const prozent = (h: number, von: number, bis: number) => `${((h - von) / (bis - von)) * 100}%`;

/** Stundenbeschriftung links (ausgenommen Anfang und Ende). */
export function StundenSpalte({ von, bis, hoehe }: { von: number; bis: number; hoehe: string }) {
  const stundenListe = Array.from({ length: bis - von - 1 }, (_, i) => von + i + 1);
  return (
    <div aria-hidden="true" className="relative" style={{ height: hoehe }}>
      {stundenListe.map((h) => (
        <span
          key={h}
          className="absolute right-2.5 -translate-y-1/2 text-[11px] text-ink-subtle tabular-nums"
          style={{ top: prozent(h, von, bis) }}
        >
          {String(h).padStart(2, "0")}:00
        </span>
      ))}
    </div>
  );
}

/**
 * Eine Tagesspalte im Zeitraster: feine Stundenlinien, Blöcke nach Uhrzeit
 * (Höhe = Dauer, Überlappungen nebeneinander), Jetzt-Linie nur heute.
 * Punkt 2: keine Linien zwischen den Tagen; heute nur leicht getönt.
 */
export function TagSpalte({
  tag,
  von,
  bis,
  hoehe,
  gross,
  jetzt,
  simuliert,
  heuteToenen = false,
}: {
  tag: TagModell;
  von: number;
  bis: number;
  /** CSS-Höhe des Rasters, z. B. "max(360px, calc(100dvh - 500px))" */
  hoehe: string;
  gross: boolean;
  jetzt: string;
  simuliert: boolean;
  /** Wochenansicht: heutige Spalte leicht tönen */
  heuteToenen?: boolean;
}) {
  const lanes = spuren(tag.bloecke);
  const { links, rechts } = gross ? BLOCK_RAND.gross : BLOCK_RAND.klein;
  return (
    <div
      className={cn("relative", tag.heute && heuteToenen && "bg-heute-flaeche")}
      style={{
        height: hoehe,
        backgroundImage: "linear-gradient(var(--line) 1px, transparent 1px)",
        backgroundSize: `100% calc(100% / ${bis - von})`,
      }}
    >
      {tag.bloecke.map((b) => {
        const { spalte, spalten } = lanes.get(b.id) ?? { spalte: 0, spalten: 1 };
        const anteil = (stunden(b.ende) - stunden(b.start)) / (bis - von);
        return (
          <TerminBlock
            key={b.id}
            block={b}
            gross={gross}
            style={{
              top: `calc(${prozent(stunden(b.start), von, bis)} + 2px)`,
              height: `max(calc(${anteil * 100}% - 4px), 28px)`,
              left: `calc(${links}px + (100% - ${links + rechts}px) * ${spalte / spalten})`,
              width: `calc((100% - ${links + rechts}px) / ${spalten} - ${spalten > 1 ? 4 : 0}px)`,
            }}
          />
        );
      })}
      {tag.heute && <JetztLinie von={von} bis={bis} startJetzt={jetzt} simuliert={simuliert} />}
    </div>
  );
}

/**
 * Monatsansicht (Punkt 11): kurze Tags je Tag -- "13:00 Live", "Praxis",
 * "Selbstlernen"; erledigt grau mit Häkchen. Der volle Titel steht im
 * Tooltip und im Screenreader-Text.
 */
export function MonatsTags({ tag }: { tag: TagModell }) {
  const tags = [
    ...tag.bloecke.map((b) => ({
      id: b.id,
      text: b.art === "live" ? `${b.start.slice(0, 5)} Live` : "Praxis",
      lang: `${b.art === "live" ? "Live-Unterricht" : "Praxisaufgabe"}: ${b.titel}`,
      erledigt: b.status === "erledigt",
      vorbei: b.status !== "offen",
      punkt: b.art === "live" ? "bg-brand" : "bg-praxis",
    })),
    ...tag.chips.map((c) => ({
      id: c.id,
      text: "Selbstlernen",
      lang: `Selbstlernen: ${c.titel}`,
      erledigt: c.erledigt,
      vorbei: c.erledigt,
      punkt: "bg-self",
    })),
  ];
  if (tags.length === 0) return null;
  return (
    <ul className="flex flex-col gap-0.5">
      {tags.map((t) => (
        <li
          key={t.id}
          title={t.lang}
          className={cn(
            "flex min-w-0 items-center gap-1.5 text-xs",
            t.vorbei ? "text-ink-muted" : "font-medium text-ink"
          )}
        >
          <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", t.punkt)} />
          <span aria-hidden="true" className="truncate">
            {t.text}
          </span>
          <span className="sr-only">
            {t.lang}
            {t.erledigt ? ", erledigt" : ""}
          </span>
          {t.erledigt && <Check className="size-3 shrink-0 text-progress" strokeWidth={3} aria-hidden="true" />}
        </li>
      ))}
    </ul>
  );
}
