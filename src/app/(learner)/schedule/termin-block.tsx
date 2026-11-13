import Link from "next/link";
import { ArrowRight, Check, FlaskConical, Video, Wrench } from "lucide-react";

import { GeschafftZeichen } from "@/components/geschafft-zeichen";

import { TrainerZeile } from "@/components/trainer-zeile";
import { fortschrittMittel, fortschrittText, type PraxistagFortschritt } from "@/lib/praxistag-kachel";
import { cn } from "@/lib/utils";

import { zeitText, type Block } from "./plan-modell";

// Stundenplan v2 (SR-13, SR-73): Termin im Zeitraster. Wunsch Anna 2026-10-11:
// kein Klick-Fenster -- "Zur Lektion →" steht direkt im Block, der ganze
// Block öffnet die Lektion (bzw. Praxisauftrag). Ab 15 Min. vor Beginn bis
// zum Ende eines Live-Termins stattdessen der Live-Raum. Titel immer
// vollständig. Bei Live ist der Titel das Thema der Lektion (lesson.thema,
// 0029), ohne den Lektionsnamen darüber (Anna 2026-10-16, wie demo); der volle
// Name steht im Tooltip und für Bildschirmleser.

// Visuelles Update (docs/ux/visual-update, 2026-10-11): helle Typ-Fläche mit
// 3-px-Streifen; nur der nächste Termin ist der Anker (volle Fläche,
// Lime-Button; Live mit weißer, Praxis auf Marken-Coral mit dunkler Schrift --
// Anna 2026-10-12, Kontrast Weiß auf Coral nur 1.93:1).
const ART = {
  live: { text: "Live-Unterricht", Icon: Video, flaeche: "bg-brand-tint", streifen: "border-l-brand-2", icon: "text-brand", anker: "bg-anchor-brand text-white shadow-anchor-brand", ankerIcon: "text-white", inhalt: "Zur Lektion" },
  praxis: { text: "Praxisauftrag", Icon: Wrench, flaeche: "bg-praxis-tint", streifen: "border-l-praxis", icon: "text-praxis-text", anker: "bg-anchor-praxis text-ink shadow-anchor-praxis", ankerIcon: "text-ink", inhalt: "Zum Praxisauftrag" },
  // Labortag (SR-94): Farben wie Praxis, eigener Name und Ziel.
  labor: { text: "Labortag", Icon: FlaskConical, flaeche: "bg-praxis-tint", streifen: "border-l-praxis", icon: "text-praxis-text", anker: "bg-anchor-praxis text-ink shadow-anchor-praxis", ankerIcon: "text-ink", inhalt: "Zu den Unterlagen" },
  // Praxistag (SR-13): ein Block je Tag mit Praxisaufträgen.
  praxistag: { text: "Praxistag", Icon: Wrench, flaeche: "bg-praxis-tint", streifen: "border-l-praxis", icon: "text-praxis-text", anker: "bg-anchor-praxis text-ink shadow-anchor-praxis", ankerIcon: "text-ink", inhalt: "Zum Praxistag" },
} as const;

/**
 * Fortschritt eines Praxistags (SR-13): immer genau eine Zeile, bricht nie um,
 * damit die Trainer-Zeile in allen Praxistagen gleich hoch steht. Text vorne
 * ("2 von 6" schmal, "2 von 6 erledigt" breit), dahinter ein Kreis je Auftrag
 * in fester Reihenfolge, erledigte gefüllt mit Haken; bei sehr vielen
 * Aufträgen werden die Kreise rechts abgeschnitten, nie der Text. Farbe wie
 * aller Fortschritt (--progress). Bildschirmleser lesen die lange Form.
 */
export function FortschrittZeile({ f, klein, className }: { f: PraxistagFortschritt; klein?: boolean; className?: string }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-1.5 overflow-hidden font-semibold whitespace-nowrap", klein ? "text-[11px]" : "text-[13px]", className)}>
      <span aria-hidden="true" className="shrink-0">{klein ? fortschrittMittel(f) : fortschrittText(f)}</span>
      <span className="sr-only">{fortschrittText(f)}</span>
      <span aria-hidden="true" className="flex min-w-0 items-center gap-1 overflow-hidden">
        {f.erledigt.map((ok, i) => (
          <span
            key={i}
            className={cn(
              "inline-flex shrink-0 items-center justify-center rounded-full border-[1.5px] border-progress",
              klein ? "size-3" : "size-4",
              ok && "bg-progress"
            )}
          >
            {ok && <Check className={cn("text-white", klein ? "size-2" : "size-2.5")} strokeWidth={4} />}
          </span>
        ))}
      </span>
    </span>
  );
}

const STATUS_TEXT = { erledigt: "erledigt", vorbei: "vorbei", offen: "offen" } as const;

export function TerminBlock({ block, gross, style }: { block: Block; gross: boolean; style: React.CSSProperties }) {
  const art = ART[block.labor ? "labor" : block.sammel ? "praxistag" : block.art];
  // Punkt 3 der Änderungsliste: Vergangenes weiß mit feinem Rand und grauem Text.
  const zurueck = !block.naechster && block.status === "vorbei";
  // Geschafft (SR-13, 13.11.2026): weiß mit grünem Streifen, Titel bleibt dunkel.
  const geschafft = !block.naechster && block.status === "erledigt";
  const label = [
    art.text,
    `${zeitText(block)} Uhr`,
    block.volltitel,
    block.sammel ? fortschrittText(block.sammel) : null,
    block.trainer ? `${block.art === "live" ? "Live" : "Praxis"} mit ${block.trainer.rufname}${block.trainer2 ? ` und ${block.trainer2.rufname}` : ""}` : null,
    block.ort,
    // Der Anker bleibt nach dem letzten Termin des Tages stehen (Anna 2026-10-12): dann "vorbei", nicht "als Nächstes".
    block.naechster && block.status === "offen" ? "als Nächstes" : STATUS_TEXT[block.status],
  ]
    .filter(Boolean)
    .join(", ");
  const klickflaeche =
    "outline-none after:absolute after:inset-0 after:rounded-block after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-brand";
  const titel = (
    // Platz für zwei Titelzeilen, damit „Live mit …“ und „Praxis mit …“ in
    // allen Blöcken einer Reihe auf derselben Höhe stehen (Anna 2026-10-29).
    <span title={block.volltitel} className={cn("min-h-[2lh] leading-snug font-semibold", gross ? "block text-base" : "line-clamp-3 text-[13px]")}>
      {block.titel}
    </span>
  );

  return (
    <div
      style={style}
      className={cn(
        "group/termin absolute flex flex-col overflow-hidden rounded-block",
        gross ? "gap-2 px-[18px] py-3.5" : "gap-1 px-2.5 py-2",
        block.naechster
          ? cn("z-10", art.anker)
          : zurueck
            ? "border border-line bg-card text-ink-muted"
            : geschafft
              ? "border border-l-[3px] border-line border-l-progress bg-card text-ink"
            : cn("border-l-[3px] text-ink", art.flaeche, art.streifen),
        (block.inhalt || block.liveRaum) && !block.naechster && "transition-[box-shadow] duration-150 hover:shadow-card motion-reduce:transition-none"
      )}
    >
      <span className="flex items-center gap-1.5 text-xs font-semibold">
        {/* Symbol immer in der Typfarbe wie auf Home und Kompetenzen (Anna 2026-10-11). */}
        <art.Icon className={cn("size-[13px] shrink-0", block.naechster ? art.ankerIcon : art.icon)} aria-hidden="true" />
        <span className="whitespace-nowrap">{zeitText(block)}</span>
        {gross && ` · ${art.text}`}
        {block.ort && <span className="min-w-0 truncate font-normal">· {block.ort}</span>}
        {block.status === "erledigt" && <GeschafftZeichen wort={gross} klein={!gross} className="ml-auto" />}
      </span>
      {/* Immer genau eine Aktion (wie Veras Stundenplan, Anna 2026-10-11): ab
          15 Min. vor Beginn bis zum Ende führt der ganze Block in den Live-Raum,
          sonst zur Lektion bzw. Praxisauftrag. */}
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
      {block.sammel && <FortschrittZeile f={block.sammel} klein={!gross} className="pointer-events-none" />}
      {/* Trainer:in des Termins (SR-78); steht auch im aria-label des Links. */}
      {block.trainer && (
        <TrainerZeile
          art={block.art}
          trainer={block.trainer}
          zweite={block.trainer2}
          klein={!gross}
          className={cn("pointer-events-none", block.naechster ? art.ankerIcon : undefined)}
        />
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
              {block.sammel?.anzahl === 1 ? ART.praxis.inhalt : art.inhalt}
              <ArrowRight className={gross ? "size-3.5" : "size-3"} aria-hidden="true" />
            </span>
          )
        )}
      </span>
    </div>
  );
}
