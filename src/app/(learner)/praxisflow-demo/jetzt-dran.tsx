"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Camera,
  ClipboardCheck,
  Check,
  KeyRound,
  PartyPopper,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

import { CodewortGate } from "@/components/praxisflow/codewort-gate";
import { DemoLeiste } from "@/components/praxisflow/demo-leiste";
import { DateienBlock } from "@/components/praxisflow/instruktion-karte";
import { ListenEditor } from "@/components/praxisflow/listen-editor";
import { PhasenAnzeige } from "@/components/praxisflow/phasen-anzeige";
import { PlanUebersicht } from "@/components/praxisflow/plan-uebersicht";
import { FOKUS, PRIMAER, SEKUNDAER, TEXT } from "@/components/praxisflow/stile";
import {
  DATEIEN,
  DATEIEN_ORDNER,
  DEMO_AUFTRAG,
  NOTEN_BESCHREIBUNGEN,
  JA_NEIN_BESCHREIBUNGEN,
  PHASEN,
  PRUEFLISTE_STANDARD,
  SPEICHER_PRAEFIX,
  TEXTE,
  UPLOAD_FORMATE,
  type PhaseId,
} from "@/lib/praxisflow-daten";
import {
  demoZuruecksetzen,
  eintragBearbeiten,
  eintragLoeschen,
  eintraegeAnhaengen,
  eintragVerschieben,
  erledigtBereinigen,
  nacharbeitNoetig,
  startZustand,
  zurNacharbeit,
  zustandLaden,
  zustandSpeichern,
  type DemoZustand,
  type Eintrag,
} from "@/lib/praxisflow-logik";
import { TRAINER_PRAXIS_DEMO } from "@/lib/demo-personen";
import { cn } from "@/lib/utils";

import {
  AkteAusZustand,
  BOGEN,
  DateienListe,
  EDITOR,
  VERLAUF,
  neueId,
  protokolliert,
  pruefen,
  speicher,
  type Liste,
} from "./praxisflow-demo";

// ---------------------------------------------------------------------------
// "Jetzt dran" (Anna 2026-10-20, ?ansicht=neu): beim Öffnen genau ein
// nächster Schritt als Karte mit einer Frage und einer einfachen Antwort.
// Gleiche Funktionen und gleicher gespeicherter Stand wie die bisherige
// Ansicht; neu ist nur die Führung. Rückmeldung klein auf der Karte bzw. als
// kurze Meldung, ein großer Moment nur bei der Freigabe und am Ende.
// Übergaben (Freigabe, Peer, Trainer:in) haben ein eigenes, gleiches Muster.
//
// Farben, je eine Bedeutung (Anna 2026-10-20):
//   Weiß       – du arbeitest (alle Schritte, auch Übergänge zwischen Phasen)
//   Lime       – du bist dran (Beginn der eigenen Einschätzung)
//   Lila       – eine Person aus deiner Gruppe ist dran
//   Coral      – deine Trainer:in ist dran (Freigabe, Einschätzung)
//   Dunkelgrün – geschafft (Freigabe erteilt, Auftrag fertig)
// ---------------------------------------------------------------------------

type Schritt = { id: string; phase: PhaseId };

/** Alle Schritte des Auftrags in Reihenfolge; hängt vom Plan und vom Auftrag ab. */
function alleSchritte(z: DemoZustand, unterSpannung: boolean): Schritt[] {
  const s = (phase: PhaseId, ids: string[]) => ids.map((id) => ({ id, phase }));
  return [
    ...s("analyse", ["auftrag", "lesen"]),
    ...s("planen", ["werkzeuge", "materialien", "schritte", "plaene"]),
    ...s("entscheiden", ["rueckblick"]),
    ...s("durchfuehren", z.schritte.map((x) => `tun:${x.id}`)),
    ...s("kontrolle", [
      "start-kontrolle",
      ...PRUEFLISTE_STANDARD.spannungsfrei.map((p) => `a:${p.id}`),
      ...(unterSpannung ? ["freigabe", ...PRUEFLISTE_STANDARD.unterSpannung.map((p) => `c:${p.id}`)] : []),
      "protokoll",
    ]),
    ...s("bewerten", [
      "uebergabe-selbst",
      ...BOGEN.map((k) => `selbst:${k.id}`),
      "uebergabe-peer",
      ...BOGEN.map((k) => `peer:${k.id}`),
      "uebergabe-trainer",
      ...BOGEN.map((k) => `fremd:${k.id}`),
      "ergebnis",
    ]),
    { id: "fertig", phase: "bewerten" },
  ];
}

const POSITION = `${SPEICHER_PRAEFIX}jetzt-dran-position`;

function positionLaden(): string | null {
  try {
    return speicher()?.getItem(POSITION) ?? null;
  } catch {
    return null;
  }
}

function vibrieren() {
  try {
    navigator.vibrate?.(15);
  } catch {
    // ohne Vibration weiter
  }
}

const phasenName = (id: PhaseId) => PHASEN.find((p) => p.id === id)?.name ?? "";

export function JetztDranFlow({ unterSpannung }: { unterSpannung: boolean }) {
  const [zustand, setZustand] = useState<DemoZustand>(() => zustandLaden(speicher(), SPEICHER_PRAEFIX));
  const [position, setPosition] = useState<string>(() => positionLaden() ?? "auftrag");
  const [meldung, setMeldung] = useState<string | null>(null);

  useEffect(() => {
    zustandSpeichern(speicher(), SPEICHER_PRAEFIX, zustand);
  }, [zustand]);

  useEffect(() => {
    try {
      speicher()?.setItem(POSITION, position);
    } catch {
      // Demo läuft ohne Speichern weiter
    }
  }, [position]);

  useEffect(() => {
    if (!meldung) return;
    const t = setTimeout(() => setMeldung(null), 2200);
    return () => clearTimeout(t);
  }, [meldung]);

  const schritte = alleSchritte(zustand, unterSpannung);
  const index = Math.max(
    0,
    schritte.findIndex((s) => s.id === position)
  );
  const aktuell = schritte[index];
  const inPhase = schritte.filter((s) => s.phase === aktuell.phase && s.id !== "fertig");
  const nrInPhase = inPhase.findIndex((s) => s.id === aktuell.id) + 1;
  const phasenIndex = PHASEN.findIndex((p) => p.id === aktuell.phase);

  /** Zum nächsten Schritt; beim Wechsel der Phase eine kurze Meldung. */
  function weiter(aendern?: (z: DemoZustand) => DemoZustand) {
    const neu = aendern ? aendern(zustand) : zustand;
    const liste = alleSchritte(neu, unterSpannung);
    const i = liste.findIndex((s) => s.id === aktuell.id);
    const naechster = liste[Math.min(i + 1, liste.length - 1)];
    vibrieren();
    if (naechster.phase !== aktuell.phase) setMeldung(`${phasenName(aktuell.phase)} erledigt`);
    setZustand({ ...neu, phase: naechster.phase, erledigt: erledigtBereinigen(neu.erledigt, neu.schritte) });
    setPosition(naechster.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function zurueck() {
    const vorher = schritte[Math.max(0, index - 1)];
    setZustand((z) => ({ ...z, phase: vorher.phase }));
    setPosition(vorher.id);
  }

  function springen(phase: PhaseId) {
    const ziel = schritte.find((s) => s.phase === phase);
    if (!ziel) return;
    setZustand((z) => ({ ...z, phase }));
    setPosition(ziel.id);
  }

  function liste(name: Liste, aendern: (l: Eintrag[]) => Eintrag[]) {
    setZustand((z) => {
      const neu = aendern(z[name]);
      return name === "schritte" ? { ...z, schritte: neu, erledigt: erledigtBereinigen(z.erledigt, neu) } : { ...z, [name]: neu };
    });
  }

  function zuruecksetzen() {
    demoZuruecksetzen(speicher(), SPEICHER_PRAEFIX);
    setZustand(startZustand());
    setPosition("auftrag");
  }

  return (
    <div className="flex flex-col gap-4">
      <Kopf phasenIndex={phasenIndex} fertig={aktuell.id === "fertig"} onPhase={springen} />
      <p role="status" aria-live="polite" className={cn("min-h-6 text-center text-sm font-semibold text-progress", !meldung && "sr-only")}>
        {meldung && (
          <span className="inline-flex items-center gap-1.5 animate-in fade-in-0 duration-200 motion-reduce:animate-none">
            <Check className="size-4" strokeWidth={3} aria-hidden="true" /> {meldung}
          </span>
        )}
      </p>
      <div key={aktuell.id} className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
        <SchrittKarte
          schritt={aktuell}
          nr={nrInPhase}
          von={inPhase.length}
          zustand={zustand}
          setZustand={setZustand}
          liste={liste}
          weiter={weiter}
          zurueck={index > 0 && aktuell.id !== "fertig" ? zurueck : undefined}
          onPosition={setPosition}
          unterSpannung={unterSpannung}
        />
      </div>
      <DemoLeiste onZuruecksetzen={zuruecksetzen} />
    </div>
  );
}

/** Schmale Leiste: sechs Punkte, Name der Phase, Frist. Erledigte Phasen antippbar. */
/**
 * Kopf: dieselbe Phasen-Leiste wie in der bisherigen Ansicht (Stationen mit
 * Symbol, Linie, "2/6"), hier auf weißer Karte wie die übrigen Karten
 * (Anna 2026-10-20). Erledigte Stationen sind antippbar. Darunter die Frist.
 */
function Kopf({ phasenIndex, fertig, onPhase }: { phasenIndex: number; fertig: boolean; onPhase: (p: PhaseId) => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-karte bg-card px-4 pt-4 pb-3 text-ink shadow-card md:px-6">
      <PhasenAnzeige phasen={PHASEN} aktuell={fertig ? PHASEN.length : phasenIndex} hell onPhase={(id) => onPhase(id as PhaseId)} />
      <span className="inline-flex items-center gap-1.5 self-end text-[13px] text-ink-muted">
        <CalendarClock className="size-4" aria-hidden="true" />
        Abgabe bis {DEMO_AUFTRAG.frist}
      </span>
    </div>
  );
}

/** Eine Karte: oben klein die Phase, groß die Frage, darunter die Antwort. */
function Karte({
  phase,
  nr,
  von,
  frage,
  hinweis,
  zurueck,
  ton = "weiss",
  children,
}: {
  phase: string;
  nr?: number;
  von?: number;
  frage: string;
  hinweis?: string;
  zurueck?: () => void;
  ton?: "weiss" | "praxis" | "brand" | "lime";
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-5 rounded-karte p-5 shadow-card md:p-7",
        ton === "weiss" && "bg-card text-ink",
        ton === "praxis" && "bg-praxis text-ink",
        ton === "brand" && "bg-brand text-white",
        ton === "lime" && "bg-lime text-on-lime"
      )}
      aria-labelledby="frage"
    >
      <div className="flex items-center justify-between gap-3">
        <span className={cn("text-sm font-semibold", ton === "brand" ? "text-white/85" : "text-ink-muted")}>
          {phase}
          {nr && von && von > 1 ? ` · ${nr} von ${von}` : ""}
        </span>
        {zurueck && (
          <button
            type="button"
            onClick={zurueck}
            className={cn("inline-flex items-center gap-1 rounded-sm text-sm", ton === "brand" ? "text-white/85 hover:text-white" : "text-ink-muted hover:text-ink", FOKUS)}
          >
            <ArrowLeft className="size-4" aria-hidden="true" /> Zurück
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <h2 id="frage" className="font-heading text-[28px] leading-tight md:text-[36px]">
          {frage}
        </h2>
        {hinweis && <p className={cn(TEXT, ton === "brand" && "text-white/90")}>{hinweis}</p>}
      </div>
      {children}
    </section>
  );
}

const GROSS = cn(PRIMAER, "min-h-14 w-full text-[17px] sm:w-full");

function SchrittKarte({
  schritt,
  nr,
  von,
  zustand,
  setZustand,
  liste,
  weiter,
  zurueck,
  onPosition,
  unterSpannung,
}: {
  schritt: Schritt;
  nr: number;
  von: number;
  zustand: DemoZustand;
  setZustand: React.Dispatch<React.SetStateAction<DemoZustand>>;
  liste: (name: Liste, aendern: (l: Eintrag[]) => Eintrag[]) => void;
  weiter: (aendern?: (z: DemoZustand) => DemoZustand) => void;
  zurueck?: () => void;
  onPosition: (id: string) => void;
  unterSpannung: boolean;
}) {
  const phase = phasenName(schritt.phase);
  const k = { phase, nr, von, zurueck };
  const [art, id] = schritt.id.includes(":") ? schritt.id.split(":") : [schritt.id, ""];

  // ----- Informieren
  if (art === "auftrag") {
    return (
      <Karte {...k} frage="Hast du deinen Auftrag bekommen?" hinweis={TEXTE.analyse.auftragText}>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[15px] text-ink">
          <dt className="text-ink-muted">{TEXTE.analyse.ausgabe}</dt>
          <dd>{DEMO_AUFTRAG.ausgabe}</dd>
          <dt className="text-ink-muted">{TEXTE.analyse.frist}</dt>
          <dd className="font-semibold">{DEMO_AUFTRAG.frist}</dd>
        </dl>
        <DateienListe
          id="auftrag"
          accept={UPLOAD_FORMATE.auftrag}
          dateien={zustand.auftragDateien}
          onDateien={(d) => setZustand((z) => ({ ...z, auftragDateien: d }))}
        />
        <button
          type="button"
          disabled={zustand.auftragDateien.length === 0}
          onClick={() => weiter(protokolliert(VERLAUF.angenommen))}
          className={GROSS}
        >
          Auftrag angenommen <ArrowRight aria-hidden="true" />
        </button>
      </Karte>
    );
  }
  if (art === "lesen") {
    return (
      <Karte {...k} frage="Das ist dein Auftrag" hinweis={TEXTE.analyse.arbeitsauftrag}>
        <UnterlagenAnsehen />
        <button type="button" onClick={() => weiter()} className={GROSS}>
          Verstanden <ArrowRight aria-hidden="true" />
        </button>
      </Karte>
    );
  }

  // ----- Planen
  if (art === "werkzeuge" || art === "materialien" || art === "schritte") {
    const name = art as Liste;
    const fragen: Record<Liste, string> = {
      werkzeuge: "Welche Werkzeuge brauchst du?",
      materialien: "Welches Material brauchst du?",
      schritte: "In welchen Schritten arbeitest du?",
    };
    const hinweise: Record<Liste, string> = {
      werkzeuge: "Schreib jedes Werkzeug in eine Zeile.",
      materialien: "Das wird deine Materialliste für das Lager.",
      schritte: "Bring die Schritte in die Reihenfolge, in der du arbeitest.",
    };
    const gesperrt = name === "schritte" && zustand.schritte.length === 0;
    return (
      <Karte {...k} frage={fragen[name]} hinweis={hinweise[name]}>
        <ListenEditor
          id={name}
          titel={EDITOR[name].einzahl === "Schritt" ? "Arbeitsschritte" : name === "werkzeuge" ? "Werkzeuge" : "Material"}
          {...EDITOR[name]}
          eintraege={zustand[name]}
          onHinzufuegen={(t) => liste(name, (l) => eintraegeAnhaengen(l, t, neueId))}
          onBearbeiten={(eid, t) => liste(name, (l) => eintragBearbeiten(l, eid, t))}
          onLoeschen={(eid) => liste(name, (l) => eintragLoeschen(l, eid))}
          onVerschieben={name === "schritte" ? (eid, r) => liste("schritte", (l) => eintragVerschieben(l, eid, r)) : undefined}
          eingabeTexte={TEXTE.eingabe}
        />
        <button type="button" disabled={gesperrt} onClick={() => weiter()} className={GROSS}>
          Weiter <ArrowRight aria-hidden="true" />
        </button>
        {gesperrt && <p className="text-center text-sm text-ink-muted">{TEXTE.planen.gesperrt}</p>}
      </Karte>
    );
  }
  if (art === "plaene") {
    return (
      <Karte {...k} frage="Hast du einen Plan gezeichnet?" hinweis="Auf Papier oder mit einem Programm? Dann mach ein Foto oder lade die Datei hoch.">
        <DateienListe
          id="plaene"
          accept={UPLOAD_FORMATE.plaene}
          dateien={zustand.planDateien}
          onDateien={(d) => setZustand((z) => ({ ...z, planDateien: d }))}
        />
        <button type="button" onClick={() => weiter()} className={GROSS}>
          {zustand.planDateien.length > 0 ? "Weiter" : "Ohne Plan weiter"} <ArrowRight aria-hidden="true" />
        </button>
      </Karte>
    );
  }

  // ----- Entscheiden
  if (art === "rueckblick") {
    return (
      <Karte {...k} frage="Hast du alles?" hinweis={PHASEN_HINWEIS.entscheiden}>
        <PlanUebersicht werkzeuge={zustand.werkzeuge} materialien={zustand.materialien} schritte={zustand.schritte} />
        {zustand.planDateien.length > 0 && <DateienListe id="plaene-rueckblick" accept="" dateien={zustand.planDateien} />}
        <p className="text-center text-sm text-ink-muted">{TEXTE.entscheiden.bestaetigen}</p>
        <button type="button" onClick={() => weiter(protokolliert(VERLAUF.entschieden))} className={GROSS}>
          Ich fange an <ArrowRight aria-hidden="true" />
        </button>
        <button type="button" onClick={() => onPosition("werkzeuge")} className={cn(SEKUNDAER, "sm:self-center")}>
          Plan ändern
        </button>
      </Karte>
    );
  }

  // ----- Ausführen: ein Arbeitsschritt pro Karte
  if (art === "tun") {
    const s = zustand.schritte.find((x) => x.id === id);
    const letzter = nr === von;
    return (
      <Karte {...k} frage={s?.text ?? "Arbeitsschritt"} hinweis={letzter ? "Das ist dein letzter Arbeitsschritt." : undefined}>
        <button
          type="button"
          onClick={() =>
            weiter((z) => {
              const neu = { ...z, erledigt: z.erledigt.includes(id) ? z.erledigt : [...z.erledigt, id] };
              return letzter ? protokolliert(VERLAUF.aufbauFertig)(neu) : neu;
            })
          }
          className={GROSS}
        >
          <Check aria-hidden="true" /> Erledigt
        </button>
        <button type="button" onClick={() => onPosition("schritte")} className={cn(SEKUNDAER, "sm:self-center")}>
          Plan anpassen
        </button>
      </Karte>
    );
  }

  // ----- Kontrollieren
  // Übergang Ausführen → Kontrollieren: was jetzt kommt, in drei Teilen.
  if (art === "start-kontrolle") {
    const teile = unterSpannung
      ? [
          { titel: "Prüfen ohne Spannung", text: "Das machst du allein." },
          { titel: "Freigabe", text: "Deine Trainer:in prüft die Anlage." },
          { titel: "Prüfen unter Spannung", text: "Mit Trainer:in, dann Prüfprotokoll." },
        ]
      : [
          { titel: "Prüfen ohne Spannung", text: "Das machst du allein." },
          { titel: "Prüfprotokoll", text: "Foto oder PDF hochladen." },
        ];
    return (
      <Uebergabe
        {...k}
        ton="weiss"
        icon={ClipboardCheck}
        frage="Dein Aufbau ist fertig"
        hinweis="Jetzt kontrollierst du deine Arbeit. Das passiert in diesen Teilen:"
      >
        <ol className="flex flex-col gap-2">
          {teile.map((t, i) => (
            <li key={t.titel} className="flex items-center gap-3 rounded-zeile bg-subtle px-4 py-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">{i + 1}</span>
              <span className="flex flex-col">
                <span className="text-[15px] font-semibold">{t.titel}</span>
                <span className="text-sm">{t.text}</span>
              </span>
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => weiter()} className={cn(GROSS, "mt-4")}>
          Kontrolle beginnen <ArrowRight aria-hidden="true" />
        </button>
      </Uebergabe>
    );
  }
  if (art === "a" || art === "c") {
    const p = (art === "a" ? PRUEFLISTE_STANDARD.spannungsfrei : PRUEFLISTE_STANDARD.unterSpannung).find((x) => x.id === id);
    const feld = art === "a" ? "geprueftSpannungsfrei" : "geprueftUnterSpannung";
    return (
      <Karte
        {...k}
        frage={p?.titel ?? "Prüfung"}
        hinweis={art === "a" ? TEXTE.kontrolle.spannungsfreiText : TEXTE.kontrolle.unterSpannungText}
      >
        {art === "a" && !unterSpannung && nr === 1 && (
          <p className="rounded-zeile bg-subtle p-3 text-sm text-ink">{TEXTE.kontrolle.ohneSpannungHinweis}</p>
        )}
        <button
          type="button"
          onClick={() => weiter((z) => ({ ...z, [feld]: z[feld].includes(id) ? z[feld] : [...z[feld], id] }))}
          className={GROSS}
        >
          <Check aria-hidden="true" /> Erledigt
        </button>
      </Karte>
    );
  }
  if (art === "freigabe") {
    if (zustand.inbetriebnahmeFreigegeben) {
      return (
        <Moment
          icon={ShieldCheck}
          titel="Freigegeben"
          text="Du darfst die Spannung zuschalten. Deine Trainer:in bleibt dabei."
          knopf="Weiter prüfen"
          onWeiter={() => weiter()}
        />
      );
    }
    return (
      <Uebergabe
        {...k}
        ton="praxis"
        icon={KeyRound}
        frage="Hol deine Trainer:in"
        hinweis={`${TEXTE.kontrolle.freigabeText} Gib das Gerät ${TRAINER_PRAXIS_DEMO.name}.`}
      >
        <CodewortGate
          id="gate-jetzt-dran"
          hinweis={TEXTE.gates.kontrolle}
          label={TEXTE.codewort.label}
          buttonText="Inbetriebnahme freigeben"
          fehlerText={TEXTE.codewort.falsch}
          pruefen={pruefen}
          onFreigabe={() => {
            vibrieren();
            setZustand((z) => protokolliert(VERLAUF.freigabe)({ ...z, inbetriebnahmeFreigegeben: true }));
          }}
        />
      </Uebergabe>
    );
  }
  if (art === "protokoll") {
    return (
      <Karte {...k} frage="Lade das Prüfprotokoll hoch" hinweis={TEXTE.kontrolle.protokollText}>
        <DateienListe
          id="protokoll"
          accept={UPLOAD_FORMATE.protokoll}
          dateien={zustand.protokollDateien}
          onDateien={(d) => setZustand((z) => ({ ...z, protokollDateien: d }))}
        />
        <button type="button" disabled={zustand.protokollDateien.length === 0} onClick={() => weiter()} className={GROSS}>
          Weiter <ArrowRight aria-hidden="true" />
        </button>
      </Karte>
    );
  }

  // ----- Bewerten: ein Kriterium pro Karte, Antippen geht weiter
  if (art === "selbst" || art === "peer" || art === "fremd") {
    const kriterium = BOGEN.find((x) => x.id === id);
    if (!kriterium) return null;
    const wer = { selbst: TEXTE.bewerten.selbstText, peer: TEXTE.bewerten.peerText, fremd: TEXTE.bewerten.fremdText }[art];
    const beschreibung = kriterium.skala.length === 2 ? JA_NEIN_BESCHREIBUNGEN : NOTEN_BESCHREIBUNGEN;
    const ton = art === "selbst" ? "weiss" : art === "peer" ? "brand" : "praxis";
    const rolle = { selbst: "Deine Einschätzung", peer: "Einschätzung Peer", fremd: "Einschätzung Trainer:in" }[art];
    const wert = zustand[art][kriterium.id];
    return (
      <Karte {...k} phase={`${phase} · ${rolle}`} frage={kriterium.titel} hinweis={wer} ton={ton}>
        <div className="flex flex-wrap gap-2">
          {art === "selbst" && (
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-lime px-2.5 py-0.5 text-xs font-bold text-on-lime">
              <UserRound className="size-3.5" aria-hidden="true" /> Du bist dran
            </span>
          )}
          {kriterium.ko && (
            <span className="w-fit rounded-full bg-white/70 px-2.5 py-0.5 text-xs font-semibold text-praxis-text">K.-o.-Kriterium</span>
          )}
        </div>
        {/* Jede Stufe mit ihrer Kurzerklärung (wie in der bisherigen Ansicht), Antippen geht weiter. */}
        <ul className="flex flex-col gap-2">
          {kriterium.skala.map((p) => (
            <li key={p}>
              <button
                type="button"
                aria-pressed={wert === p}
                onClick={() => {
                  setZustand((z) => ({ ...z, [art]: { ...z[art], [kriterium.id]: p } }));
                  setTimeout(() => weiter((z) => ({ ...z, [art]: { ...z[art], [kriterium.id]: p } })), 180);
                }}
                className={cn(
                  "flex min-h-14 w-full items-center gap-4 rounded-2xl px-4 py-2.5 text-left text-ink",
                  wert === p ? "bg-ink text-white" : "bg-white hover:bg-subtle",
                  FOKUS
                )}
              >
                <span className="w-10 shrink-0 text-center text-[22px] font-bold tabular-nums">{p}</span>
                <span className={cn("text-[15px]", wert === p ? "text-white" : "text-ink")}>{beschreibung[p]}</span>
              </button>
            </li>
          ))}
        </ul>
      </Karte>
    );
  }
  if (art === "uebergabe-selbst") {
    return (
      <Uebergabe
        {...k}
        ton="lime"
        icon={UserRound}
        frage="Jetzt bist du dran"
        hinweis="Schätze zuerst selbst ein, wie gut dir der Auftrag gelungen ist. Danach schätzen eine Person aus deiner Gruppe und deine Trainer:in ein."
      >
        <button type="button" onClick={() => weiter()} className={cn(GROSS, "bg-ink text-white hover:brightness-110")}>
          Ich schätze mich ein <ArrowRight aria-hidden="true" />
        </button>
      </Uebergabe>
    );
  }
  if (art === "uebergabe-peer") {
    return (
      <Uebergabe
        {...k}
        ton="brand"
        icon={Users}
        frage="Gib das Gerät einer Person aus deiner Gruppe"
        hinweis="Sie schaut sich deine Arbeit an und schätzt sie ein. Danach bekommst du das Gerät zurück."
      >
        <button type="button" onClick={() => weiter()} className={GROSS}>
          Ich bin dran <ArrowRight aria-hidden="true" />
        </button>
      </Uebergabe>
    );
  }
  if (art === "uebergabe-trainer") {
    return (
      <Uebergabe
        {...k}
        ton="praxis"
        icon={KeyRound}
        frage="Jetzt ist deine Trainer:in dran"
        hinweis={`Gib das Gerät ${TRAINER_PRAXIS_DEMO.name}.`}
      >
        <CodewortGate
          id="gate-bewerten-jetzt-dran"
          hinweis={TEXTE.gates.bewerten}
          label={TEXTE.codewort.label}
          buttonText="Einschätzen"
          fehlerText={TEXTE.codewort.falsch}
          pruefen={pruefen}
          onFreigabe={() => weiter((z) => ({ ...z, fremdFreigegeben: true }))}
        />
      </Uebergabe>
    );
  }
  if (art === "ergebnis") {
    const unterschiede = BOGEN.filter((x) => zustand.selbst[x.id] !== zustand.fremd[x.id] || zustand.peer[x.id] !== zustand.fremd[x.id]);
    const nacharbeit = nacharbeitNoetig(BOGEN, zustand.fremd);
    return (
      <Karte
        {...k}
        frage={nacharbeit ? "Noch nicht ganz" : "Gut gemacht"}
        hinweis={
          nacharbeit
            ? TEXTE.bewerten.nacharbeitText
            : unterschiede.length === 0
              ? "Ihr wart euch überall einig."
              : "Hier wart ihr euch nicht einig. Sprich mit deiner Trainer:in darüber."
        }
      >
        <p className="text-sm text-ink-muted">Gib das Gerät zurück an die Person, die den Auftrag gemacht hat.</p>
        {unterschiede.length > 0 && (
          <ul className="flex flex-col gap-2">
            {unterschiede.map((x) => (
              <li key={x.id} className="flex flex-col gap-1.5 rounded-zeile bg-subtle px-4 py-3">
                <span className="text-[15px] font-semibold">{x.titel}</span>
                <span className="flex gap-4 text-sm text-ink-muted tabular-nums">
                  <span>Du: {zustand.selbst[x.id] ?? "–"}</span>
                  <span>Peer: {zustand.peer[x.id] ?? "–"}</span>
                  <span className="font-semibold text-ink">Trainer:in: {zustand.fremd[x.id] ?? "–"}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <details className="rounded-zeile bg-subtle px-4 py-3">
          <summary className={cn("cursor-pointer rounded-sm text-[15px] font-semibold", FOKUS)}>Alle Punkte ansehen</summary>
          <ul className="mt-3 flex flex-col gap-2">
            {BOGEN.map((x) => (
              <li key={x.id} className="flex flex-col gap-0.5 border-b border-line pb-2 last:border-b-0">
                <span className="text-[15px]">{x.titel}</span>
                <span className="flex gap-4 text-sm text-ink-muted tabular-nums">
                  <span>Du: {zustand.selbst[x.id] ?? "–"}</span>
                  <span>Peer: {zustand.peer[x.id] ?? "–"}</span>
                  <span className="font-semibold text-ink">Trainer:in: {zustand.fremd[x.id] ?? "–"}</span>
                </span>
              </li>
            ))}
          </ul>
        </details>
        <label className="flex flex-col gap-2">
          <span className="text-[15px] font-semibold">Was machst du nächstes Mal anders?</span>
          <textarea
            rows={3}
            placeholder="Ein, zwei Sätze für dich – bleibt nur in diesem Browser."
            className={cn("rounded-zeile border border-line bg-white px-4 py-3 text-[15px] text-ink placeholder:text-ink-subtle", FOKUS)}
          />
        </label>
        {nacharbeit ? (
          <button
            type="button"
            onClick={() => {
              const erster = zustand.schritte[0];
              setZustand((z) => protokolliert(VERLAUF.nacharbeit)(zurNacharbeit(z)));
              onPosition(erster ? `tun:${erster.id}` : "schritte");
            }}
            className={GROSS}
          >
            {TEXTE.bewerten.nacharbeitButton} <ArrowLeft aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => weiter((z) => protokolliert(VERLAUF.abgeschlossen)({ ...z, bewertungAbgeschlossen: true }))}
            className={GROSS}
          >
            Auftrag abschließen <Check aria-hidden="true" />
          </button>
        )}
      </Karte>
    );
  }

  // ----- Ende
  if (art === "fertig") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4 rounded-karte bg-progress p-5 text-white shadow-card md:p-6">
          <PartyPopper className="size-8 shrink-0" aria-hidden="true" />
          <div className="flex flex-col">
            <h2 className="font-heading text-[26px] leading-tight md:text-[32px]">Auftrag fertig!</h2>
            <p className="text-[15px]">Hier ist alles, was du gemacht hast. Die Akademie bestätigt deine Arbeit.</p>
          </div>
        </div>
        <AkteAusZustand zustand={zustand} unterSpannung={unterSpannung} />
      </div>
    );
  }
  return null;
}

/** Übergabe an eine andere Person: eigene Farbe, klar, wer dran ist. */
function Uebergabe({
  icon: Icon,
  frage,
  hinweis,
  ton,
  zurueck,
  phase,
  children,
}: {
  icon: typeof Camera;
  frage: string;
  hinweis: string;
  ton: "weiss" | "praxis" | "brand" | "lime";
  zurueck?: () => void;
  phase: string;
  nr?: number;
  von?: number;
  children: React.ReactNode;
}) {
  return (
    <Karte phase={phase} frage={frage} hinweis={hinweis} ton={ton} zurueck={zurueck}>
      <span
        className={cn(
          "flex size-14 items-center justify-center rounded-full",
          ton === "brand"
            ? "bg-white/15 text-white"
            : ton === "lime"
              ? "bg-white/50 text-on-lime"
              : ton === "weiss"
                ? "bg-subtle text-ink"
                : "bg-white/60 text-ink"
        )}
        aria-hidden="true"
      >
        <Icon className="size-7" />
      </span>
      <div className={cn(ton === "brand" && "rounded-zeile bg-white p-4 text-ink")}>{children}</div>
    </Karte>
  );
}

/** Großer Moment, nur bei der Freigabe. */
function Moment({
  icon: Icon,
  titel,
  text,
  knopf,
  onWeiter,
}: {
  icon: typeof Camera;
  titel: string;
  text: string;
  knopf: string;
  onWeiter: () => void;
}) {
  return (
    <section className="flex flex-col items-center gap-4 rounded-karte bg-progress p-7 text-center text-white shadow-card animate-in zoom-in-95 duration-300 motion-reduce:animate-none">
      <span className="flex size-20 items-center justify-center rounded-full bg-white/15" aria-hidden="true">
        <Icon className="size-10" />
      </span>
      <h2 className="font-heading text-[36px] leading-none md:text-[44px]">{titel}</h2>
      <p className="max-w-sm text-[16px] text-white/90">{text}</p>
      <button type="button" onClick={onWeiter} className={cn(GROSS, "max-w-sm")}>
        {knopf} <ArrowRight aria-hidden="true" />
      </button>
    </section>
  );
}

const PHASEN_HINWEIS = {
  entscheiden: "Schau dir deinen Plan an. Wenn alles passt, entscheidest du selbst, dass du anfangen kannst.",
};

/** Unterlagen zum Ansehen; geöffnete bekommen ein Häkchen (kein Zwang, alle zu öffnen). */
function UnterlagenAnsehen() {
  const [angesehen, setAngesehen] = useState<Set<string>>(new Set());
  return (
    <DateienBlock
      titel="Deine Unterlagen"
      ordner={DATEIEN_ORDNER}
      dateien={DATEIEN}
      angesehen={angesehen}
      onOeffnen={(name) => setAngesehen((alt) => new Set(alt).add(name))}
    />
  );
}
