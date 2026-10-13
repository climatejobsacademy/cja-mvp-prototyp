import Link from "next/link";
import { ArrowRight, Check, Video, Wrench } from "lucide-react";

import { cn } from "@/lib/utils";

import { zeitText, type Block } from "./plan-modell";

// Stundenplan v2 (SR-13, SR-73): Termin im Zeitraster. Wunsch Anna 2026-10-11:
// kein Klick-Fenster -- "Zur Lektion →" steht direkt im Block, der ganze
// Block öffnet die Lektion (bzw. Praxisaufgabe). Ab 15 Min. vor Beginn bis
// zum Ende eines Live-Termins stattdessen der Live-Raum. Titel immer
// vollständig. Das Thema steht seit 0029 in lesson.thema (Datenlücke Nr. 4)
// und erscheint als zweite Zeile unter dem Titel, nicht mehr in der Klammer.

// Visuelles Update (docs/ux/visual-update, 2026-10-11): helle Typ-Fläche mit
// 3-px-Streifen; nur der nächste Termin ist der Anker (voller Verlauf, weiße
// Schrift, Lime-Button).
const ART = {
  live: { text: "Live-Unterricht", Icon: Video, flaeche: "bg-brand-tint", streifen: "border-l-brand-2", icon: "text-brand", anker: "bg-anchor-brand shadow-anchor-brand", inhalt: "Zur Lektion" },
  praxis: { text: "Praxisaufgabe", Icon: Wrench, flaeche: "bg-praxis-tint", streifen: "border-l-praxis", icon: "text-praxis-text", anker: "bg-anchor-praxis shadow-anchor-praxis", inhalt: "Zur Praxisaufgabe" },
} as const;

const STATUS_TEXT = { erledigt: "erledigt", vorbei: "vorbei", offen: "offen" } as const;

export function TerminBlock({ block, gross, style }: { block: Block; gross: boolean; style: React.CSSProperties }) {
  const art = ART[block.art];
  // Punkt 3 der Änderungsliste: Vergangenes weiß mit feinem Rand und grauem Text.
  const zurueck = !block.naechster && block.status !== "offen";
  const label = [
    art.text,
    `${zeitText(block)} Uhr`,
    block.titel,
    block.thema,
    block.ort,
    block.naechster ? "als Nächstes" : STATUS_TEXT[block.status],
  ]
    .filter(Boolean)
    .join(", ");
  const klickflaeche =
    "outline-none after:absolute after:inset-0 after:rounded-block after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-brand";
  const titel = (
    <span className={cn("leading-snug font-semibold", gross ? "text-base" : "line-clamp-3 text-[13px]")}>
      {block.titel}
      {block.thema && (
        <>
          <br />
          <span className={cn("font-normal", gross ? "text-sm" : "text-xs")}>{block.thema}</span>
        </>
      )}
    </span>
  );

  return (
    <div
      style={style}
      className={cn(
        "group/termin absolute flex flex-col overflow-hidden rounded-block",
        gross ? "gap-2 px-[18px] py-3.5" : "gap-1 px-2.5 py-2",
        block.naechster
          ? cn("z-10 text-white", art.anker)
          : zurueck
            ? "border border-line bg-card text-ink-muted"
            : cn("border-l-[3px] text-ink", art.flaeche, art.streifen),
        (block.inhalt || block.liveRaum) && !block.naechster && "transition-[box-shadow] duration-150 hover:shadow-card motion-reduce:transition-none"
      )}
    >
      <span className="flex items-center gap-1.5 text-xs font-semibold">
        {/* Symbol immer in der Typfarbe wie auf Home und Kompetenzen (Anna 2026-10-11). */}
        <art.Icon className={cn("size-[13px] shrink-0", block.naechster ? "text-white" : art.icon)} aria-hidden="true" />
        {zeitText(block)}
        {gross && ` · ${art.text}`}
        {block.ort && <span className="min-w-0 truncate font-normal">· {block.ort}</span>}
        {block.status === "erledigt" && <Check className={cn("ml-auto size-3", block.naechster ? "text-white" : "text-progress")} strokeWidth={3} aria-hidden="true" />}
      </span>
      {/* Immer genau eine Aktion (wie Veras Stundenplan, Anna 2026-10-11): ab
          15 Min. vor Beginn bis zum Ende führt der ganze Block in den Live-Raum,
          sonst zur Lektion bzw. Praxisaufgabe. */}
      {block.liveRaum ? (
        <a
          href={block.liveRaum}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${label}, Live-Unterricht beitreten (öffnet in neuem Tab)`}
          className={klickflaeche}
        >
          {titel}
        </a>
      ) : block.inhalt ? (
        <Link href={block.inhalt} aria-label={label} className={klickflaeche}>
          {titel}
        </Link>
      ) : (
        <span aria-label={label}>{titel}</span>
      )}
      {/* Nur Anzeige -- geklickt wird die Fläche des Links darüber. Ohne
          pointer-events-none fängt der Knopf beim Hover (filter = eigene
          Ebene) den Klick ab. */}
      <span className="pointer-events-none mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {block.liveRaum ? (
          <span
            aria-hidden="true"
            className={cn(
              "rounded-full font-bold transition-[filter] duration-150 group-hover/termin:brightness-95 motion-reduce:transition-none",
              block.naechster ? "bg-lime text-on-lime" : "bg-brand text-white",
              gross ? "px-3.5 py-2 text-[13px]" : "px-2 py-1 text-[11px] whitespace-nowrap"
            )}
          >
            Zum Live-Unterricht →
          </span>
        ) : (
          block.inhalt && (
            <span
              aria-hidden="true"
              className={cn(
                "inline-flex items-center gap-1 font-semibold whitespace-nowrap",
                // Anker: Lime-Button; sonst Nebenaktion als Textlink (Brief 4.4).
                block.naechster
                  ? cn("rounded-full bg-lime text-on-lime transition-[filter] duration-150 group-hover/termin:brightness-95 motion-reduce:transition-none", gross ? "px-3 py-1.5 text-[13px]" : "px-2 py-1 text-[11px]")
                  : cn("transition-[color] duration-150 group-hover/termin:text-brand motion-reduce:transition-none", gross ? "text-[13px]" : "text-[11px]")
              )}
            >
              {art.inhalt}
              <ArrowRight className={gross ? "size-3.5" : "size-3"} aria-hidden="true" />
            </span>
          )
        )}
      </span>
    </div>
  );
}
