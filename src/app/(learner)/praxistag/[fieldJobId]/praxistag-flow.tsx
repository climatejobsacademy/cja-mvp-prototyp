"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  CircleAlert,
  CircleCheck,
  ClipboardList,
  MessageSquareText,
  Send,
  TriangleAlert,
  Wrench,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { SegmentProgress } from "@/components/segment-progress";
import { CaptureStatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import type { FieldJobDetail } from "@/lib/praxistag-shared";

import { confirmFieldJob, submitReflection } from "./actions";

type Step = "vorbereitung" | "bestaetigung" | "reflexion" | "abschluss";

// Handoff 2a, "Nicht gestaltete Screens": nur die drei Button-Varianten,
// Container-Karten, Segment-Schrittanzeige, Fokus-Ring in Eco Green.
const FOKUS = "outline-none focus-visible:ring-2 focus-visible:ring-eco-green focus-visible:ring-offset-2";
const PRIMAER = cn(
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-eco-deep-green px-4 text-[15px] font-medium text-white hover:bg-eco-deep-green/90 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-eco-deep-green sm:w-auto [&_svg]:size-[18px]",
  FOKUS
);
const SEKUNDAER = cn(
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-[15px] font-medium text-eco-deep-green hover:bg-eco-green/10 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto [&_svg]:size-[18px]",
  FOKUS
);
const KARTE = "flex flex-col gap-5 rounded-xl border border-border p-4";
const SCHRITT: Record<Step, number> = { vorbereitung: 1, bestaetigung: 2, reflexion: 3, abschluss: 3 };

function KartenKopf({ icon: Icon, titel }: { icon: typeof Wrench; titel: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-[18px] shrink-0 text-eco-deep-green" aria-hidden="true" />
      <h2 className="text-[15px] font-semibold text-eco-deep-green">{titel}</h2>
    </div>
  );
}

function initialStep(detail: FieldJobDetail): Step {
  if (detail.capture) return "abschluss";
  if (detail.status === "durchgeführt") return "reflexion";
  return "vorbereitung";
}

export function PraxistagFlow({
  detail,
  organisationId,
  zurueck,
}: {
  detail: FieldJobDetail;
  organisationId: string;
  zurueck: { href: string; label: string };
}) {
  const [step, setStep] = useState<Step>(initialStep(detail));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Keyed nach field_job_type_frage.id statt Array-Index, weil die Fragen
  // jetzt dynamisch aus der DB kommen (queries/praxistag.ts), nicht mehr aus
  // einer festen, immer gleich langen Konstante.
  const [antworten, setAntworten] = useState<Record<string, string>>({});
  const [problemMeldung, setProblemMeldung] = useState(false);
  const [problemText, setProblemText] = useState("");

  function handleBestaetigen(ergebnis: "erledigt" | "problem") {
    if (ergebnis === "problem" && !problemText.trim()) {
      setError("Bitte kurz beschreiben, worum es geht.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await confirmFieldJob(
        detail.fieldJobId,
        ergebnis,
        ergebnis === "problem" ? problemText.trim() : undefined
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStep("reflexion");
    });
  }

  function handleReflexionAbsenden() {
    if (detail.reflexionsFragen.some((f) => !antworten[f.id])) {
      setError("Bitte alle Fragen beantworten.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await submitReflection(
        detail.fieldJobId,
        organisationId,
        detail.reflexionsFragen.map((f) => ({ fragId: f.id, gewaehlteOption: antworten[f.id] }))
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStep("abschluss");
    });
  }

  const alleBeantwortet = detail.reflexionsFragen.every((f) => antworten[f.id]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        {/* Zurück-Link (Handoff: Ghost über der H1, "‹ Stundenplan"). */}
        <Link
          href={zurueck.href}
          className={cn(
            "-ml-2 inline-flex min-h-11 w-fit items-center gap-1 rounded-lg px-2 text-sm font-medium text-muted-foreground hover:bg-eco-green/10 hover:text-eco-deep-green",
            FOKUS
          )}
        >
          <ChevronLeft className="size-4" aria-hidden="true" /> {zurueck.label}
        </Link>
        <PageHeader title={detail.titel} />
      </div>

      <SegmentProgress
        value={step === "abschluss" ? 3 : SCHRITT[step]}
        max={3}
        label={step === "abschluss" ? "Alle 3 Schritte abgeschlossen" : `Schritt ${SCHRITT[step]} von 3`}
      />

      {error && (
        <p className="flex items-start gap-2 rounded-lg border-2 border-coral p-3 text-sm text-eco-deep-green" role="alert">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-coral" aria-hidden="true" />
          {error}
        </p>
      )}

      {step === "vorbereitung" && (
        <section className={KARTE}>
          <KartenKopf icon={ClipboardList} titel="Vorbereitung" />
          {detail.beschreibung && <p className="text-[15px] leading-relaxed text-eco-deep-green">{detail.beschreibung}</p>}
          {detail.vorbereitungText ? (
            <p className="text-[15px] leading-relaxed whitespace-pre-line text-eco-deep-green">{detail.vorbereitungText}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Keine Vorbereitungs-Instruktion hinterlegt.</p>
          )}
          <button type="button" onClick={() => setStep("bestaetigung")} className={PRIMAER}>
            Vorbereitung abgeschlossen, Einsatz starten
          </button>
        </section>
      )}

      {step === "bestaetigung" && (
        <section className={KARTE}>
          <KartenKopf icon={Wrench} titel="Durchführung" />
          <p className="text-[15px] leading-relaxed text-eco-deep-green">
            Führe die Aufgabe jetzt vor Ort durch. Bestätige hier, sobald du fertig bist.
          </p>

          {!problemMeldung ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => handleBestaetigen("erledigt")} disabled={pending} className={PRIMAER}>
                <CheckCircle2 aria-hidden="true" />
                {pending ? "Wird bestätigt …" : "Erledigt"}
              </button>
              <button type="button" onClick={() => setProblemMeldung(true)} disabled={pending} className={SEKUNDAER}>
                <TriangleAlert aria-hidden="true" />
                Problem melden
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-eco-deep-green" htmlFor="problem-beschreibung">
                  Was ist passiert?
                </label>
                <textarea
                  id="problem-beschreibung"
                  value={problemText}
                  onChange={(e) => setProblemText(e.target.value)}
                  rows={4}
                  placeholder="Kurz beschreiben, worum es geht …"
                  className={cn(
                    "rounded-lg border border-border bg-white px-3 py-2.5 text-[15px] text-eco-deep-green placeholder:text-muted-foreground",
                    FOKUS
                  )}
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setProblemMeldung(false);
                    setProblemText("");
                    setError(null);
                  }}
                  disabled={pending}
                  className={SEKUNDAER}
                >
                  Zurück
                </button>
                <button type="button" onClick={() => handleBestaetigen("problem")} disabled={pending} className={PRIMAER}>
                  <Send aria-hidden="true" />
                  {pending ? "Wird gesendet …" : "Problem absenden"}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {step === "reflexion" && (
        <section className={KARTE}>
          <KartenKopf icon={MessageSquareText} titel="Reflexion" />
          {detail.reflexionsFragen.length === 0 && (
            <p className="text-sm text-muted-foreground">Für diese Übung sind keine Reflexionsfragen hinterlegt.</p>
          )}
          {detail.reflexionsFragen.map((f) => (
            <fieldset key={f.id} className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium text-eco-deep-green">{f.frageText}</legend>
              {f.antwortoptionen.map((option) => (
                // Ganze Zeile klickbar; gewählt: Rand Deep Green, Fläche hellgrün.
                <label
                  key={option}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm text-eco-deep-green hover:bg-eco-green/10 has-[:checked]:border-eco-deep-green has-[:checked]:bg-eco-green/10 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-eco-green has-[:focus-visible]:ring-offset-2"
                >
                  <input
                    type="radio"
                    name={`frage-${f.id}`}
                    value={option}
                    checked={antworten[f.id] === option}
                    onChange={() => setAntworten((prev) => ({ ...prev, [f.id]: option }))}
                    className="size-4 shrink-0 accent-eco-deep-green outline-none"
                  />
                  {option}
                </label>
              ))}
            </fieldset>
          ))}
          <button
            type="button"
            onClick={handleReflexionAbsenden}
            disabled={pending || !alleBeantwortet}
            className={PRIMAER}
          >
            <Send aria-hidden="true" />
            {pending ? "Wird gesendet …" : "Reflexion absenden"}
          </button>
        </section>
      )}

      {step === "abschluss" && (
        <section className={cn(KARTE, "gap-4")} role="status">
          <span className="flex size-10 items-center justify-center rounded-[10px] bg-eco-green/10">
            <CircleCheck className="size-5 text-eco-green" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-[15px] font-semibold text-eco-deep-green">Praxisaufgabe abgeschlossen</p>
            <p className="text-sm text-muted-foreground">Deine Reflexion ist abgesendet und wird verifiziert.</p>
          </div>
          <CaptureStatusBadge status={detail.capture?.status ?? "pending"} />
          <Link href="/schedule" className={cn(SEKUNDAER, "sm:self-start")}>
            Zum Stundenplan
            <ArrowRight aria-hidden="true" />
          </Link>
        </section>
      )}
    </div>
  );
}
