import Link from "next/link";
import { ChevronLeft, ChevronRight, Video, Wrench } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { datumLang, heuteInBerlin, jetztInBerlin, plusTage, tagRelativ } from "@/lib/date";
import { getTrainerTag, requireCurrentTrainer, type LiveTermin, type PraxisTermin } from "@/lib/queries/trainer-bereich";
import { parseNowParameter } from "@/lib/stundenplan";
import { bestaetigtZaehlen, datumAusParameter, terminZustand, type TerminZustand } from "@/lib/trainer-tag";
import { cn } from "@/lib/utils";

import { AnwesenheitListe } from "./anwesenheit-liste";

// Trainer:innen "Heute" (SR-81, Paket G2): Live-Termine und Praxistage der
// eigenen Kohorten an einem Tag, blätterbar. Bei Live-Terminen Anwesenheit
// bestätigen; Praxisberichte prüfen (SR-82) folgt in G3.

const FOKUS = "outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2";
const zeit = (t: string | null) => (t ? t.slice(0, 5) : null);
const grossAnfang = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function ZustandsMarke({ zustand }: { zustand: TerminZustand }) {
  if (zustand !== "jetzt") return null;
  return (
    <span className="rounded-full bg-lime px-2 py-0.5 text-xs font-semibold text-on-lime shadow-glow-charge-sm">jetzt</span>
  );
}

function LiveKarte({ termin, zustand }: { termin: LiveTermin; zustand: TerminZustand }) {
  const { bestaetigt, gesamt } = bestaetigtZaehlen(termin.teilnehmende.map((t) => t.anwesenheit));
  return (
    <section
      aria-label={`Live-Termin ${termin.titel}, ${zeit(termin.start)} bis ${zeit(termin.ende)} Uhr`}
      className={cn(
        "rounded-karte border-l-[3px] border-l-brand-2 bg-brand-tint p-4 md:p-5",
        zustand === "jetzt" && "ring-2 ring-lime",
        zustand === "vorbei" && "bg-card"
      )}
    >
      <div className="flex items-center gap-2 text-xs font-semibold text-ink">
        <Video className="size-[13px] text-brand" aria-hidden="true" />
        {zeit(termin.start)}–{zeit(termin.ende)} · Live-Unterricht
        <ZustandsMarke zustand={zustand} />
      </div>
      <h2 className="mt-2 text-base leading-snug font-semibold text-ink">{termin.titel}</h2>
      {termin.thema && <p className="text-sm text-ink-muted">{termin.thema}</p>}
      <p className="mt-1 text-xs text-ink-muted">
        {[termin.kohorten.join(", "), termin.eigener ? "dein Termin" : null].filter(Boolean).join(" · ")}
      </p>
      <p className="mt-3 text-sm font-semibold text-ink">
        Anwesenheit: {bestaetigt} von {gesamt} bestätigt
      </p>
      <AnwesenheitListe liveSessionId={termin.id} teilnehmende={termin.teilnehmende} />
    </section>
  );
}

function PraxisKarte({ termin, zustand }: { termin: PraxisTermin; zustand: TerminZustand }) {
  return (
    <section
      aria-label={`Praxisaufgabe ${termin.titel}`}
      className={cn(
        "rounded-karte border-l-[3px] border-l-praxis bg-praxis-tint p-4 md:p-5",
        zustand === "jetzt" && "ring-2 ring-lime",
        zustand === "vorbei" && "bg-card"
      )}
    >
      <div className="flex items-center gap-2 text-xs font-semibold text-ink">
        <Wrench className="size-[13px] text-praxis-text" aria-hidden="true" />
        {termin.start ? `${zeit(termin.start)}–${zeit(termin.ende)}` : "ganztägig"} · Praxisaufgabe
        <ZustandsMarke zustand={zustand} />
      </div>
      <h2 className="mt-2 text-base leading-snug font-semibold text-ink">{termin.titel}</h2>
      <p className="mt-1 text-xs text-ink-muted">
        {[termin.kohorten.join(", "), termin.eigener ? "dein Termin" : null].filter(Boolean).join(" · ")}
      </p>
      <ul className="mt-3 divide-y divide-line rounded-zeile bg-white">
        {termin.lernende.map((l) => (
          <li key={l.personId} className="flex min-h-11 items-center justify-between gap-3 px-3 py-2 text-sm text-ink">
            <span className="min-w-0 truncate">{l.name}</span>
            <span className={cn("shrink-0 text-xs", l.durchgefuehrt ? "font-semibold text-progress" : "text-ink-muted")}>
              {l.durchgefuehrt ? "durchgeführt" : "geplant"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function TrainerHeute({ searchParams }: { searchParams: Promise<{ datum?: string; now?: string }> }) {
  const trainer = await requireCurrentTrainer();
  const { datum: datumParam, now } = await searchParams;
  // ?now nur außerhalb von Production (wie Home und Stundenplan).
  const simuliert = process.env.VERCEL_ENV !== "production" ? parseNowParameter(now) : null;
  const jetzt = simuliert ?? jetztInBerlin();
  const heute = jetzt.slice(0, 10) || heuteInBerlin();
  const datum = datumAusParameter(datumParam, heute);
  const tag = await getTrainerTag(trainer.personId, datum);
  const leer = tag.live.length === 0 && tag.praxis.length === 0;
  const link = (d: string) => `/trainer?datum=${d}${simuliert && now ? `&now=${encodeURIComponent(now)}` : ""}`;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={datum === heute ? "Heute" : grossAnfang(tagRelativ(datum, heute))} />

      <nav aria-label="Tag wählen" className="flex items-center justify-between gap-2">
        <Link href={link(plusTage(datum, -1))} className={cn("flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm text-ink-muted hover:text-ink", FOKUS)}>
          <ChevronLeft className="size-4" aria-hidden="true" />
          Vortag
        </Link>
        <div className="flex flex-col items-center text-center">
          <span className="text-sm font-semibold text-ink">{datumLang(datum)}</span>
          {datum !== heute && (
            <Link href={link(heute)} className={cn("rounded text-xs text-brand underline-offset-4 hover:underline", FOKUS)}>
              zu heute
            </Link>
          )}
        </div>
        <Link href={link(plusTage(datum, 1))} className={cn("flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm text-ink-muted hover:text-ink", FOKUS)}>
          Folgetag
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </nav>

      {leer ? (
        <p className="rounded-karte bg-subtle p-5 text-sm text-ink-muted">
          An diesem Tag gibt es in deinen Kohorten keine Termine.
        </p>
      ) : (
        <>
          {tag.live.map((t) => (
            <LiveKarte key={t.id} termin={t} zustand={terminZustand(jetzt, datum, t.start, t.ende)} />
          ))}
          {tag.praxis.map((t) => (
            <PraxisKarte key={t.id} termin={t} zustand={terminZustand(jetzt, datum, t.start, t.ende)} />
          ))}
        </>
      )}
    </div>
  );
}
