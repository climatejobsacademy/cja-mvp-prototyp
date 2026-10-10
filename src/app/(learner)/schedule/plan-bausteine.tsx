import Link from "next/link";
import { ArrowRight, BookOpen, Check, Video, Wrench } from "lucide-react";

import { spuren, stunden, type Tagestyp } from "@/lib/stundenplan";
import { titelTeile } from "@/lib/home-tag";
import { cn } from "@/lib/utils";

import { JetztLinie } from "./jetzt-linie";
import { zeitText, type Block, type Chip, type TagModell } from "./plan-modell";

// Stundenplan v2 (docs/design_handoff_stundenplan_v2, SR folgt): gemeinsame
// Bausteine von Woche, Tag und Monat. Aktivitätsfarben wie Home und
// Kompetenzen: Live = Lylac, Selbstlernen = Eco Green, Praxis = Coral --
// immer Icon + Text, nie nur Farbe. Änderungsliste Anna 2026-10-10: ruhiger
// -- kein Rahmen, feine Stundenlinien, Vergangenes weiß und grau.

/** Zeitraum-Zusatz "· Theorie (online)" (Änderungsliste Punkt 1) */
export const WOCHENTYP_TEXT: Record<Tagestyp, string> = {
  theorie: "Theorie (online)",
  praxis: "Praxis",
  lernen: "Selbstlernen",
};

const TAGESTYP: Record<Tagestyp, { text: string; farbe: string }> = {
  theorie: { text: "Theorietag", farbe: "text-eco-deep-green" },
  praxis: { text: "Praxistag", farbe: "text-coral-text" },
  lernen: { text: "Lerntag", farbe: "text-eco-deep-green" },
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
      aria-label={`Selbstlernen, flexibel, ${chip.titel}, ${chip.erledigt ? "erledigt" : "offen"}`}
      className={cn(
        "flex min-w-0 items-start gap-1.5 rounded-lg px-2 py-[5px] text-xs leading-snug font-semibold outline-none transition-[background-color] duration-150 focus-visible:ring-2 focus-visible:ring-eco-green motion-reduce:transition-none",
        chip.erledigt ? "text-muted-foreground" : "text-eco-deep-green",
        "hover:bg-off-white"
      )}
    >
      <BookOpen className={cn("mt-px size-3.5 shrink-0", chip.erledigt ? "text-muted-foreground" : "text-eco-green")} aria-hidden="true" />
      <span className="min-w-0 flex-1 hyphens-auto break-words">{titelTeile(chip.titel).titel}</span>
      {chip.erledigt && <Check className="mt-px size-3 shrink-0 text-eco-green" strokeWidth={3} aria-hidden="true" />}
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
      aria-label={`Selbstlernen, flexibel, ${chip.titel}, ${chip.erledigt ? "erledigt" : "weiterlernen"}`}
      style={{ marginLeft: rand.links, marginRight: rand.rechts }}
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-[10px] px-3 py-2 text-[13px] font-semibold outline-none transition-[background-color] duration-150 focus-visible:ring-2 focus-visible:ring-eco-green motion-reduce:transition-none",
        chip.erledigt
          ? "border border-border bg-white text-muted-foreground hover:bg-off-white"
          : "bg-flex-flaeche text-eco-deep-green hover:bg-success"
      )}
    >
      <BookOpen className={cn("size-4 shrink-0", chip.erledigt ? "text-muted-foreground" : "text-eco-green")} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{titelTeile(chip.titel).titel}</span>
      {chip.erledigt ? (
        <Check className="size-3.5 shrink-0 text-eco-green" strokeWidth={3} aria-hidden="true" />
      ) : (
        <span aria-hidden="true" className="inline-flex shrink-0 items-center gap-1 text-xs font-bold">
          Weiterlernen
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </span>
      )}
    </Link>
  );
}

const ART = {
  live: { text: "Live-Unterricht", Icon: Video, flaeche: "bg-info", streifen: "border-l-lylac", icon: "text-lylac", cta: "Zum Live-Unterricht →" },
  praxis: { text: "Praxisaufgabe", Icon: Wrench, flaeche: "bg-warning", streifen: "border-l-coral", icon: "text-coral-text", cta: "Zur Praxisaufgabe →" },
} as const;

const STATUS_TEXT = { erledigt: "erledigt", vorbei: "vorbei", offen: "offen" } as const;

/**
 * Termin im Zeitraster. `gross` = Tagesansicht (mit Untertitel). Der ganze
 * Block ist klickbar (gestreckter Link). Punkt 3: Vergangenes weiß mit
 * feinem Rand und grauem Text (Häkchen nur bei bestätigter Anwesenheit),
 * der nächste Termin in seiner Farbe mit Knopf, ohne dunklen Rahmen.
 */
function TerminBlock({ block, gross, style }: { block: Block; gross: boolean; style: React.CSSProperties }) {
  const art = ART[block.art];
  const teile = titelTeile(block.titel);
  const zurueck = !block.naechster && block.status !== "offen";
  const label = [
    art.text,
    `${zeitText(block)} Uhr${block.standardzeit ? " (Uhrzeit vorläufig)" : ""}`,
    block.titel,
    block.naechster ? "als Nächstes" : STATUS_TEXT[block.status],
  ].join(", ");
  const klickflaeche =
    "outline-none after:absolute after:inset-0 after:rounded-[10px] after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-eco-green";
  const titel = (
    <span className={cn("leading-snug font-semibold", gross ? "text-base" : "line-clamp-2 text-[13px]")}>{teile.titel}</span>
  );
  return (
    <div
      style={style}
      className={cn(
        "absolute flex flex-col overflow-hidden rounded-[10px]",
        gross ? "gap-2 px-[18px] py-3.5" : "gap-1 px-2.5 py-2",
        // Wunsch Anna 2026-10-10: Woche im Stil des Monats -- nur der
        // nächste Termin hat Farbfläche, alle anderen weiß mit feinem Rand.
        block.naechster
          ? cn("border-l-4 text-eco-deep-green", art.flaeche, art.streifen)
          : cn("border border-border bg-white", zurueck ? "text-muted-foreground" : "text-eco-deep-green"),
        block.naechster && "z-10"
      )}
    >
      <span className="flex items-center gap-1.5 text-xs font-semibold">
        <art.Icon className={cn("size-[13px] shrink-0", zurueck ? "text-muted-foreground" : art.icon)} aria-hidden="true" />
        {zeitText(block)}
        {gross && ` · ${art.text}`}
        {block.status === "erledigt" && <Check className="ml-auto size-3 text-eco-green" strokeWidth={3} aria-hidden="true" />}
      </span>
      {block.href ? (
        block.extern ? (
          <a href={block.href} target="_blank" rel="noopener noreferrer" aria-label={`${label} (öffnet in neuem Tab)`} className={klickflaeche}>
            {titel}
          </a>
        ) : (
          <Link href={block.href} aria-label={label} className={klickflaeche}>
            {titel}
          </Link>
        )
      ) : (
        <span aria-label={label}>{titel}</span>
      )}
      {gross && teile.untertitel && <span className="text-[13px] text-muted-foreground">{teile.untertitel}</span>}
      {block.naechster && (
        <span
          aria-hidden="true"
          className={cn(
            "mt-auto self-start rounded-[9px] bg-eco-deep-green font-bold text-white",
            gross ? "px-3.5 py-2 text-[13px]" : "px-2 py-1 text-[11px] whitespace-nowrap"
          )}
        >
          {art.cta}
        </span>
      )}
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
          className="absolute right-2.5 -translate-y-1/2 text-[11px] text-muted-foreground tabular-nums"
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
        backgroundImage: "linear-gradient(var(--raster-linie) 1px, transparent 1px)",
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
      punkt: b.art === "live" ? "bg-lylac" : "bg-coral",
    })),
    ...tag.chips.map((c) => ({
      id: c.id,
      text: "Selbstlernen",
      lang: `Selbstlernen: ${c.titel}`,
      erledigt: c.erledigt,
      vorbei: c.erledigt,
      punkt: "bg-eco-green",
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
            t.vorbei ? "text-muted-foreground" : "font-medium text-eco-deep-green"
          )}
        >
          <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", t.vorbei ? "bg-border" : t.punkt)} />
          <span aria-hidden="true" className="truncate">
            {t.text}
          </span>
          <span className="sr-only">
            {t.lang}
            {t.erledigt ? ", erledigt" : ""}
          </span>
          {t.erledigt && <Check className="size-3 shrink-0 text-eco-green" strokeWidth={3} aria-hidden="true" />}
        </li>
      ))}
    </ul>
  );
}
