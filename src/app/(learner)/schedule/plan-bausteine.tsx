import Link from "next/link";
import { ArrowRight, BookOpen, Check, Play, Video, Wrench } from "lucide-react";

import { spuren, stunden, type Tagestyp } from "@/lib/stundenplan";
import { TrainerZeile } from "@/components/trainer-zeile";
import { cn } from "@/lib/utils";

import { JetztLinie } from "./jetzt-linie";
import type { Chip, Ganztag, TagModell } from "./plan-modell";
import { TerminBlock } from "./termin-block";

// Stundenplan v2 (SR-13, SR-73): gemeinsame
// Bausteine von Woche, Tag und Monat. Aktivitätsfarben wie Home und
// Kompetenzen: Live = Lila (--brand), Selbstlernen = Eco Green, Praxis = Coral --
// immer Icon + Text, nie nur Farbe. Änderungsliste Anna 2026-10-10: ruhiger
// -- kein Rahmen, feine Stundenlinien, Vergangenes weiß und grau.

/**
 * Neben dem Zeitraum nur noch ein Symbol für die Art der Woche statt
 * "· Woche 2 · Theorie (online)" (Entscheidung Anna 2026-10-12): Kamera =
 * Theorie, Werkzeug = Praxis, Buch = Selbstlernen, in den Aktivitätsfarben.
 * Der Name steht für Screenreader und als Tooltip dabei.
 */
const WOCHENTYP: Record<Tagestyp, { text: string; Icon: typeof Video; farbe: string }> = {
  theorie: { text: "Theoriewoche", Icon: Video, farbe: "text-brand" },
  praxis: { text: "Praxiswoche", Icon: Wrench, farbe: "text-praxis-text" },
  lernen: { text: "Selbstlernwoche", Icon: BookOpen, farbe: "text-self" },
};

export function WochenTypIcon({ typ }: { typ: Tagestyp }) {
  const { text, Icon, farbe } = WOCHENTYP[typ];
  return (
    <span title={text} className="inline-flex">
      <Icon className={cn("size-5", farbe)} aria-hidden="true" />
      <span className="sr-only">{text}</span>
    </span>
  );
}

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
  const alle = [
    ...tag.bloecke.map((b) => b.status === "erledigt"),
    ...tag.ganztags.map((g) => g.status === "erledigt"),
    ...tag.chips.map((c) => c.erledigt),
  ];
  return alle.length > 0 && alle.every(Boolean);
}

/** Darstellung "begonnen" in der Wochenansicht (Varianten zum Vergleich, Anna 2026-10-20): ?flex=text */
export type FlexStil = "symbol" | "text";

/**
 * Selbstlern-Eintrag in "Flexibel" der Wochenansicht -- nie mit Uhrzeit
 * (Brief 5.5). Alle Einträge gleich hoch und gleich gerahmt wie
 * "Fachsprache", auch erledigte (Anna 2026-10-20: sonst "uneben"). Rechts
 * ein Zeichen: erledigt Häkchen, begonnen ein Weiter-Symbol bzw. (?flex=text)
 * "Weiter" in derselben Zeile; offen nichts.
 */
export function FlexChip({ chip, stil = "symbol" }: { chip: Chip; stil?: FlexStil }) {
  const status = chip.erledigt ? "erledigt" : chip.begonnen ? "weiterlernen" : "offen";
  return (
    <Link
      href={chip.href}
      title={chip.volltitel}
      aria-label={`Selbstlernen, flexibel, ${chip.festigen ? "Wissen festigen: " : ""}${chip.volltitel}, ${status}`}
      className={cn(
        "flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-line bg-card px-3 py-2 text-[13px] leading-snug font-semibold outline-none transition-[box-shadow] duration-150 hover:shadow-card focus-visible:ring-2 focus-visible:ring-brand motion-reduce:transition-none",
        chip.erledigt ? "text-ink-muted" : "text-ink"
      )}
    >
      <BookOpen className="size-4 shrink-0 text-self" aria-hidden="true" />
      {/* Thema als Titel bzw. "Wissen festigen" (Anna 2026-10-16, wie demo). */}
      <span className="min-w-0 flex-1 truncate">{chip.titel}</span>
      {chip.erledigt ? (
        <Check className="size-3.5 shrink-0 text-progress" strokeWidth={3} aria-hidden="true" />
      ) : chip.begonnen ? (
        stil === "text" ? (
          <span aria-hidden="true" className="inline-flex shrink-0 items-center gap-0.5 text-xs font-bold text-ink-muted">
            Weiter <ArrowRight className="size-3" aria-hidden="true" />
          </span>
        ) : (
          <span aria-hidden="true" title="Weiterlernen" className="flex size-5 shrink-0 items-center justify-center rounded-full bg-self-tint text-self">
            <Play className="size-2.5 fill-current" />
          </span>
        )
      ) : null}
    </Link>
  );
}

/** Ränder der Blöcke in der Tagesspalte -- die Flexibel-Leiste der Tagesansicht nutzt dieselben (Punkt 9). */
export const BLOCK_RAND = { gross: { links: 8, rechts: 16 }, klein: { links: 6, rechts: 8 } } as const;

/**
 * Punkt 9: Flexibel in der Tagesansicht als schmale weiße Leiste (Anna 2026-10-13), genau
 * so breit wie der Live-Block -- Buch-Icon, Titel, Aktion.
 */
export function FlexLeiste({ chip, gross }: { chip: Chip; gross: boolean }) {
  const rand = gross ? BLOCK_RAND.gross : BLOCK_RAND.klein;
  return (
    <Link
      href={chip.href}
      title={chip.festigen ? chip.volltitel : undefined}
      aria-label={`Selbstlernen, flexibel, ${chip.festigen ? "Wissen festigen: " : ""}${chip.volltitel}${chip.erledigt ? ", erledigt" : chip.begonnen ? ", weiterlernen" : ""}`}
      style={{ marginLeft: rand.links, marginRight: rand.rechts }}
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold outline-none transition-[box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-brand motion-reduce:transition-none",
        chip.erledigt
          ? "border border-line bg-card text-ink-muted hover:shadow-card"
          : "border border-line bg-card text-ink hover:shadow-card"
      )}
    >
      <BookOpen className="size-4 shrink-0 text-self" aria-hidden="true" />
      <span className="min-w-0 flex-1">{chip.titel}</span>
      {/* "Weiterlernen" nur, wenn schon begonnen; sonst nur der Pfeil (Anna 2026-10-20, Handy und Laptop gleich). */}
      {chip.erledigt ? (
        <Check className="size-3.5 shrink-0 text-progress" strokeWidth={3} aria-hidden="true" />
      ) : (
        <span aria-hidden="true" className="inline-flex shrink-0 items-center gap-1 text-xs font-bold">
          {chip.begonnen && "Weiterlernen"}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </span>
      )}
    </Link>
  );
}

/**
 * Praxistag ohne Uhrzeit (field_job.start/ende leer, SR-13): ganztägig über
 * dem Raster statt einer Platzhalterzeit. Coral wie Praxis-Blöcke, Icon +
 * Text; Ort, wenn eingetragen. Klick öffnet den Praxistag-Ablauf.
 */
export function GanztagsLeiste({ tag: g, gross }: { tag: Ganztag; gross: boolean }) {
  const zurueck = g.status !== "offen";
  const label = `Praxisaufgabe, ganztägig, ${g.titel}${g.ort ? `, ${g.ort}` : ""}${g.trainer ? `, Praxis mit ${g.trainer.rufname}` : ""}, ${g.status === "erledigt" ? "erledigt" : g.status === "vorbei" ? "vorbei" : "offen"}`;
  const klasse = cn(
    "flex min-w-0 items-start gap-2 rounded-xl px-3 py-2 font-semibold outline-none",
    g.href && "transition-[box-shadow] duration-150 hover:shadow-card focus-visible:ring-2 focus-visible:ring-brand motion-reduce:transition-none",
    gross ? "text-sm" : "text-[13px] leading-snug",
    zurueck ? "border border-line bg-card text-ink-muted" : "border-l-[3px] border-l-praxis bg-praxis-tint text-ink"
  );
  const inhalt = (
    <>
      <Wrench className="mt-px size-4 shrink-0 text-praxis-text" aria-hidden="true" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="hyphens-auto break-words">{g.titel}</span>
        <span className="text-xs font-normal text-ink-muted">Ganztägig{g.ort ? ` · ${g.ort}` : ""}</span>
        {/* Begleitende Person des Praxistags (SR-78). */}
        {g.trainer && <TrainerZeile art="praxis" trainer={g.trainer} klein className="mt-1 font-normal text-ink-muted" />}
      </span>
      {g.status === "erledigt" && <Check className="mt-0.5 size-3.5 shrink-0 text-progress" strokeWidth={3} aria-hidden="true" />}
    </>
  );
  // Ohne Link (PRAXISAUFGABE_LINK aus) dieselbe Leiste als reiner Text.
  return g.href ? (
    <Link href={g.href} aria-label={label} className={klasse}>
      {inhalt}
    </Link>
  ) : (
    <div role="group" aria-label={label} className={klasse}>
      {inhalt}
    </div>
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
    ...tag.ganztags.map((g) => ({
      id: g.id,
      text: "Praxis",
      lang: `Praxisaufgabe, ganztägig: ${g.titel}`,
      erledigt: g.status === "erledigt",
      vorbei: g.status !== "offen",
      punkt: "bg-praxis",
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
