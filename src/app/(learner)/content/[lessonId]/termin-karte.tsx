import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, BookOpen, Video } from "lucide-react";

import { datumLang, tagRelativ } from "@/lib/date";
import { cn } from "@/lib/utils";

// Live-Lektion (SR folgt), Entscheidung Anna 2026-10-12: der Termin als
// Anker-Karte wie die Fokus-Karte auf Home -- links Pill + große Uhrzeit,
// rechts Kamera-Symbol, Tag und Zeit, darunter "Beitreten" (bis zum Ende
// des Termins) und "Wissen festigen" mit Buch-Symbol in derselben Karte.
// "jetzt" und "heute" kommen aus den Berlin-Helfern (src/lib/date.ts).

export type Termin = { datum: string; start: string; ende: string; joinLink: string | null };

const hhmm = (zeit: string) => zeit.slice(0, 5);

function Pill({ children, puls, grau }: { children: ReactNode; puls?: boolean; grau?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-0.5 text-xs font-semibold",
        grau ? "bg-white/20 text-white" : "bg-lime text-on-lime"
      )}
    >
      {!grau && <span aria-hidden="true" className={cn("size-1.5 rounded-full bg-on-lime", puls && "motion-safe:animate-pulse")} />}
      {children}
    </span>
  );
}

const KNOPF = "inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-[15px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand";

export function TerminKarte({
  termin,
  heute,
  jetzt,
  festigenHref,
}: {
  termin: Termin | null;
  heute: string;
  jetzt: string;
  festigenHref: string | null;
}) {
  if (!termin) {
    return (
      <article className="rounded-karte bg-anchor-brand p-6 text-white shadow-anchor-brand md:px-7">
        <p className="text-sm text-white/85">Kein Termin hinterlegt.</p>
      </article>
    );
  }
  const beginn = `${termin.datum}T${termin.start}`;
  const ende = `${termin.datum}T${termin.ende}`;
  const vorbei = jetzt >= ende;
  const laeuft = !vorbei && jetzt >= beginn;
  // Anna 2026-10-12: "Beitreten" immer zeigen, bis der Termin vorbei ist --
  // ohne Knopf war es verwirrend.
  const beitretbar = !vorbei && !!termin.joinLink;
  const wann = tagRelativ(termin.datum, heute);

  const pill = vorbei ? (
    <Pill grau>Vorbei</Pill>
  ) : laeuft ? (
    <Pill puls>Läuft gerade</Pill>
  ) : (
    <Pill>{wann.charAt(0).toUpperCase() + wann.slice(1)}</Pill>
  );
  return (
    <article className="flex flex-wrap items-start gap-x-7 gap-y-4 rounded-karte bg-anchor-brand p-6 text-white shadow-anchor-brand md:px-7 md:py-7">
      <div className="flex flex-none flex-col gap-1.5 pt-0.5">
        {pill}
        <span className="font-heading text-[44px] leading-none tabular-nums md:text-[56px]">
          {laeuft ? "Jetzt" : hhmm(termin.start)}
        </span>
      </div>
      <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-2">
        <p className="flex items-center gap-2.5 text-[17px] font-semibold">
          <Video className="size-[22px] flex-none text-white/85" aria-hidden="true" />
          <span>
            <span className="sr-only">Live-Unterricht: </span>
            {datumLang(termin.datum)} · {hhmm(termin.start)}–{hhmm(termin.ende)} Uhr
          </span>
        </p>
        {(beitretbar || festigenHref) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {beitretbar && termin.joinLink && (
              <a
                href={termin.joinLink}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(KNOPF, "bg-lime text-on-lime hover:brightness-95")}
              >
                {laeuft ? "Jetzt beitreten" : "Beitreten"}
                <ArrowRight className="size-[17px]" aria-hidden="true" />
                <span className="sr-only">(öffnet in neuem Tab)</span>
              </a>
            )}
            {festigenHref && (
              <Link href={festigenHref} className={cn(KNOPF, "bg-white/15 text-white hover:bg-white/25")}>
                {/* Selbstlernen-Zeichen wie überall: Buch. */}
                <BookOpen className="size-[18px]" aria-hidden="true" />
                Wissen festigen
              </Link>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

