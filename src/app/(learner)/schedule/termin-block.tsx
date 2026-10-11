import Link from "next/link";
import { ArrowRight, Check, Video, Wrench } from "lucide-react";

import { cn } from "@/lib/utils";

import { zeitText, type Block } from "./plan-modell";

// Stundenplan v2 (SR folgt): Termin im Zeitraster. Wunsch Anna 2026-10-11:
// kein Klick-Fenster -- "Zur Lektion →" steht direkt im Block, der ganze
// Block öffnet die Lektion (bzw. Praxisaufgabe). Ab 15 Min. vor Beginn bis
// zum Ende eines Live-Termins stattdessen der Live-Raum. Titel immer
// vollständig: die Lektionen heißen z. B. "Grundlagen der Elektrotechnik
// (Der Transistor / Die Dioden)" -- das Thema steht in der Klammer.

const ART = {
  live: { text: "Live-Unterricht", Icon: Video, flaeche: "bg-info", streifen: "border-l-lylac", icon: "text-lylac", inhalt: "Zur Lektion" },
  praxis: { text: "Praxisaufgabe", Icon: Wrench, flaeche: "bg-warning", streifen: "border-l-coral", icon: "text-coral-text", inhalt: "Zur Praxisaufgabe" },
} as const;

const STATUS_TEXT = { erledigt: "erledigt", vorbei: "vorbei", offen: "offen" } as const;

export function TerminBlock({ block, gross, style }: { block: Block; gross: boolean; style: React.CSSProperties }) {
  const art = ART[block.art];
  // Punkt 3 der Änderungsliste: Vergangenes weiß mit feinem Rand und grauem Text.
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
    <span className={cn("leading-snug font-semibold", gross ? "text-base" : "line-clamp-3 text-[13px]")}>{block.titel}</span>
  );

  return (
    <div
      style={style}
      className={cn(
        "group/termin absolute flex flex-col overflow-hidden rounded-[10px]",
        gross ? "gap-2 px-[18px] py-3.5" : "gap-1 px-2.5 py-2",
        block.naechster
          ? cn("z-10 border-l-4 text-eco-deep-green", art.flaeche, art.streifen)
          : cn("border border-border bg-white", zurueck ? "text-muted-foreground" : "text-eco-deep-green"),
        (block.inhalt || block.liveRaum) && !block.naechster && "transition-[background-color] duration-150 hover:bg-off-white motion-reduce:transition-none"
      )}
    >
      <span className="flex items-center gap-1.5 text-xs font-semibold">
        {/* Symbol immer in der Typfarbe wie auf Home und Kompetenzen (Anna 2026-10-11). */}
        <art.Icon className={cn("size-[13px] shrink-0", art.icon)} aria-hidden="true" />
        {zeitText(block)}
        {gross && ` · ${art.text}`}
        {block.status === "erledigt" && <Check className="ml-auto size-3 text-eco-green" strokeWidth={3} aria-hidden="true" />}
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
      <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {block.liveRaum ? (
          <span
            aria-hidden="true"
            className={cn(
              "rounded-[9px] bg-eco-deep-green font-bold text-white transition-[background-color] duration-150 group-hover/termin:bg-eco-deep-green/90 motion-reduce:transition-none",
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
                "inline-flex items-center gap-1 rounded-lg border border-border bg-white font-semibold whitespace-nowrap text-eco-deep-green transition-[border-color,box-shadow] duration-150 group-hover/termin:border-eco-deep-green/40 group-hover/termin:shadow-sm motion-reduce:transition-none",
                gross ? "px-3 py-1.5 text-[13px]" : "px-2 py-1 text-[11px]"
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
