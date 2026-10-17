import Link from "next/link";
import { BookOpen, Check, Video, Wrench } from "lucide-react";

import { Ring } from "@/components/fortschritts-ring";
import { datumKurz, tageZwischen, wochentagLang } from "@/lib/date";
import type { FreiText, WochenTag } from "@/lib/home-frei";
import type { NachholLektion } from "@/lib/home-tag";
import type { ModulMitZeitraum } from "@/lib/queries/modul";
import type { NaechsterTermin } from "@/lib/queries/schedule";
import { cn } from "@/lib/utils";

import type { RingKompetenz } from "./kompetenz-bereich";
import { kompetenzHref } from "./tages-karten";

// Home, Zustand "freier Tag" (docs/design_handoff_home_v6/claude-code-aenderungen-home-freier-tag.md
// + design/home-freier-tag-referenz.html; SR-79): an Tagen ohne Termin
// statt "Heute ist nichts geplant" eine Karte "Heute frei" (Anker, Lila) mit
// Rückblick auf die laufende Woche, darunter zwei schlichte Zeilen, rechts
// alle Kompetenzen des aktuellen Moduls (modul_competency).

const ZEILE =
  "flex items-center gap-3.5 rounded-zeile bg-card px-[22px] py-4 text-ink shadow-card outline-none transition-[color] duration-150 hover:text-brand focus-visible:ring-2 focus-visible:ring-brand motion-reduce:transition-none";

/**
 * Karte "Heute frei": Label, Headline, Unterzeile, Zählzeile (nur mit
 * Aktivität), ggf. Wochenreihe (nur Zustand 1 und 2).
 */
export function FreiKarte({ text, zaehlung, tage }: { text: FreiText; zaehlung: string | null; tage: WochenTag[] }) {
  return (
    <article className="flex flex-col gap-7 rounded-karte bg-anchor-brand px-6 py-7 text-white shadow-anchor-brand md:px-10 md:py-9">
      <div className="flex flex-col gap-3">
        <span className="self-start rounded-full bg-white/15 px-3 py-[5px] text-xs font-semibold">Heute frei</span>
        <h3 className="text-[24px] leading-tight font-bold md:text-[26px]">{text.headline}</h3>
        <p className="text-[17px] text-white/85">{text.unterzeile}</p>
        {zaehlung && <p className="text-sm font-semibold text-white">{zaehlung}</p>}
      </div>
      {text.wochenreihe && tage.length > 0 && (
        <ul aria-label="Deine Woche" className="flex gap-3.5">
          {tage.map((t) => (
            <li key={t.datum} className="flex flex-col items-center gap-1.5">
              {t.geschafft ? (
                <span className="flex size-10 items-center justify-center rounded-full bg-lime">
                  <Check className="size-4 text-on-lime" strokeWidth={3} aria-hidden="true" />
                </span>
              ) : (
                <span aria-hidden="true" className="size-10 rounded-full border-2 border-white/40" />
              )}
              <span className="text-xs font-semibold text-white/85">
                {t.kurz}
                <span className="sr-only">{t.geschafft ? ", geschafft" : ", offen"}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

const ART: Record<NaechsterTermin["art"], { text: string; Icon: typeof Video; farbe: string }> = {
  live: { text: "Live-Unterricht", Icon: Video, farbe: "text-brand" },
  feld: { text: "Praxistag", Icon: Wrench, farbe: "text-praxis-text" },
  asynchron: { text: "Selbstlernen", Icon: BookOpen, farbe: "text-self" },
};

/** "Montag, 13:00"; ab einer Woche Abstand mit Datum ("Mo, 19.10., 13:00"). */
function wann(t: NaechsterTermin, heute: string): string {
  const tag = tageZwischen(heute, t.datum) < 7 ? wochentagLang(t.datum) : datumKurz(t.datum);
  return `${tag}${t.start ? `, ${t.start.slice(0, 5)}` : ""}`;
}

/** Zeile 1 nächster Termin ("Montag · Praxistag"; ohne "Weiter geht's", das steht schon in der Überschrift, Anna 2026-10-17) und Zeile 2 "Wenn du magst: …" (nur wenn etwas offen ist). */
export function FreiZeilen({
  naechster,
  offen,
  heute,
}: {
  naechster: NaechsterTermin | null;
  offen: NachholLektion | null;
  heute: string;
}) {
  return (
    <>
      {naechster && (
        <Link href="/schedule?ansicht=woche" className={ZEILE}>
          {(() => {
            const { Icon, farbe, text } = ART[naechster.art];
            return (
              <>
                <Icon className={cn("size-[18px] shrink-0", farbe)} aria-hidden="true" />
                <span className="min-w-0 flex-1 text-[15px]">
                  <span className="font-bold">{wann(naechster, heute)}</span>{" "}
                  <span className="text-ink-muted">· {text}</span>
                </span>
              </>
            );
          })()}
          <span className="shrink-0 text-sm font-semibold">Stundenplan →</span>
        </Link>
      )}
      {/* Ersetzt "Noch offen von …"; bei mehreren offenen die älteste. */}
      {offen && (
        <Link href={`/content/${offen.lessonId}?von=home`} className={ZEILE}>
          <BookOpen className="size-[18px] shrink-0 text-self" aria-hidden="true" />
          <span className="min-w-0 flex-1 text-[15px]">
            <span className="text-ink-muted">Wenn du magst:</span>{" "}
            <span className="font-semibold">{offen.titel}</span>{" "}
            <span className="text-ink-muted">· Selbstlernen</span>
          </span>
          <span className="shrink-0 text-sm font-semibold">{offen.begonnen ? "Weiterlernen →" : "Starten →"}</span>
        </Link>
      )}
    </>
  );
}

/** Rechte Spalte: alle Kompetenzen des aktuellen Moduls -- kein Kasten, kein "Heute dran", kein Leuchten. */
export function AlleKompetenzen({ modul, kompetenzen }: { modul: ModulMitZeitraum; kompetenzen: RingKompetenz[] }) {
  return (
    <aside aria-labelledby="frei-kompetenzen" className="flex min-w-0 flex-col gap-[22px] self-start rounded-karte bg-card p-7 text-ink shadow-card">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="frei-kompetenzen" className="text-lg font-bold">
          Deine Kompetenzen · {modul.ueberzeile.startsWith("Modul") ? modul.ueberzeile : modul.name}
        </h2>
        <Link
          href="/kompetenzen"
          className="rounded-sm text-sm font-semibold text-ink outline-none hover:text-brand focus-visible:ring-2 focus-visible:ring-brand"
        >
          Alle →
        </Link>
      </div>
      <ul className="flex flex-col gap-4">
        {kompetenzen.map((k) => (
          <li key={k.id}>
            <Link
              href={kompetenzHref(k.id)}
              aria-label={`${k.name}, ${k.prozent} Prozent`}
              className="flex items-center gap-3.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4"
            >
              <Ring prozent={k.prozent} groesse={44} />
              <span className="text-[15px] leading-snug">{k.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
