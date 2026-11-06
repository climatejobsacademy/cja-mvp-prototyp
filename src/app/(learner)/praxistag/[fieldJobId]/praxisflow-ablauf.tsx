"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCheck,
  KeyRound,
  ListOrdered,
  Package,
  PartyPopper,
  ShieldCheck,
  UserRound,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { Auftragsakte } from "@/components/praxisflow/auftragsakte";
import { CodewortGate, type GateErgebnis } from "@/components/praxisflow/codewort-gate";
import { ListenEditor } from "@/components/praxisflow/listen-editor";
import { PhasenAnzeige } from "@/components/praxisflow/phasen-anzeige";
import { PlanUebersicht } from "@/components/praxisflow/plan-uebersicht";
import { FOKUS, PRIMAER, SEKUNDAER, TEXT } from "@/components/praxisflow/stile";
import type { PraxisPhase, PraxisRolle } from "@/lib/database.types";
import { jetztInBerlin } from "@/lib/date";
import {
  BEWERTUNGSBOGEN_STANDARD as BOGEN,
  JA_NEIN_BESCHREIBUNGEN,
  NOTEN_BESCHREIBUNGEN,
  PHASEN,
  PRUEFLISTE_STANDARD,
  TEXTE,
} from "@/lib/praxisflow-inhalte";
import {
  eintraegeAnhaengen,
  eintragBearbeiten,
  eintragLoeschen,
  eintragVerschieben,
  type Eintrag,
} from "@/lib/praxisflow-liste";
import type { AktionErgebnis, PraxisflowDaten } from "@/lib/praxisflow-shared";
import { cn } from "@/lib/utils";

import {
  abschliessen,
  einschaetzen,
  kontrolleAbhaken,
  phaseWeiter,
  planSpeichern,
  schrittAbhaken,
  trainerEinschaetzen,
  zurueckZumPlan,
  zuschaltenFreigeben,
} from "./praxisflow-actions";
import { DateiUpload, UnterlagenLeiste } from "./praxisflow-dateien";

// Geführter Praxisflow (SR-64, SR-65, SR-88, SR-89, SR-90): die Ansicht
// "Jetzt dran" aus dem Prototyp auf `demo`, mit Stand auf dem Server. Jeder
// Schritt ist eine Karte; was zählt (Phase, Plan, Haken, Freigaben,
// Einschätzungen), schreibt nur die Datenbank über fn_praxis_*. Lokal sind
// nur die Position innerhalb einer Phase und noch nicht abgeschickte
// Eingaben (Listen beim Planen, Punkte einer Einschätzung).
//
// Farben, je eine Bedeutung: Weiß du arbeitest, Lime du bist dran, Lila
// eine Person aus deiner Gruppe, Coral deine Trainer:in, Dunkelgrün geschafft.

type Phase = Exclude<PraxisPhase, "abgeschlossen">;
type Schritt = { id: string; phase: Phase };
type Liste = "werkzeuge" | "materialien" | "schritte";

const EDITOR: Record<Liste, { icon: LucideIcon; titel: string; einzahl: string; leerText: string; platzhalter: string }> = {
  werkzeuge: { icon: Wrench, titel: "Werkzeuge", einzahl: "Werkzeug", leerText: "Noch keine Werkzeuge eingetragen.", platzhalter: "Werkzeug eintragen …" },
  materialien: { icon: Package, titel: "Material", einzahl: "Material", leerText: "Noch keine Materialien eingetragen.", platzhalter: "Material eintragen …" },
  schritte: { icon: ListOrdered, titel: "Arbeitsschritte", einzahl: "Schritt", leerText: "Noch keine Arbeitsschritte eingetragen.", platzhalter: "Arbeitsschritt eintragen …" },
};


function alleSchritte(schritte: Eintrag[]): Schritt[] {
  const s = (phase: Phase, ids: string[]) => ids.map((id) => ({ id, phase }));
  return [
    ...s("informieren", ["auftrag", "hilfen"]),
    ...s("planen", ["werkzeuge", "materialien", "schritte", "plaene"]),
    ...s("entscheiden", ["rueckblick"]),
    ...s("ausfuehren", schritte.map((x) => `tun:${x.id}`)),
    ...s("kontrollieren", [
      "start-kontrolle",
      ...PRUEFLISTE_STANDARD.spannungsfrei.map((p) => `a:${p.id}`),
      "freigabe",
      ...PRUEFLISTE_STANDARD.unterSpannung.map((p) => `c:${p.id}`),
      "protokoll",
    ]),
    ...s("bewerten", [
      "uebergabe-selbst",
      ...BOGEN.map((k) => `selbst:${k.id}`),
      "uebergabe-peer",
      ...BOGEN.map((k) => `peer:${k.id}`),
      "uebergabe-trainer",
      ...BOGEN.map((k) => `trainer:${k.id}`),
      "trainer-codewort",
      "ergebnis",
    ]),
    { id: "fertig", phase: "bewerten" },
  ];
}

/** Wo es nach dem Laden weitergeht: aus dem Stand auf dem Server. */
function startPosition(d: PraxisflowDaten): string {
  const f = d.fortschritt;
  const erledigt = new Set((f.erledigt ?? []).map((e) => e.id));
  const kontrolle = new Set((f.kontrolle ?? []).map((e) => e.id));
  switch (d.phase) {
    case "informieren":
      return d.dateien.some((x) => x.art === "auftrag") ? "hilfen" : "auftrag";
    case "planen":
      return "werkzeuge";
    case "entscheiden":
      return "rueckblick";
    case "ausfuehren": {
      const offen = (f.schritte ?? []).find((x) => !erledigt.has(x.id)) ?? (f.schritte ?? []).at(-1);
      return offen ? `tun:${offen.id}` : "rueckblick";
    }
    case "kontrollieren": {
      if (kontrolle.size === 0) return "start-kontrolle";
      const a = PRUEFLISTE_STANDARD.spannungsfrei.find((p) => !kontrolle.has(p.id));
      if (a) return `a:${a.id}`;
      if (!f.zuschalten_freigegeben_am) return "freigabe";
      const c = PRUEFLISTE_STANDARD.unterSpannung.find((p) => !kontrolle.has(p.id));
      return c ? `c:${c.id}` : "protokoll";
    }
    case "bewerten": {
      const e = f.einschaetzung ?? {};
      if (e.trainer) return "ergebnis";
      if (e.peer) return "uebergabe-trainer";
      if (e.selbst) return "uebergabe-peer";
      return "uebergabe-selbst";
    }
    default:
      return "fertig";
  }
}

const phasenName = (id: Phase) => PHASEN.find((p) => p.id === id)?.name ?? "";
const GROSS = cn(PRIMAER, "min-h-14 w-full text-[17px] sm:w-full");

function vibrieren() {
  try {
    navigator.vibrate?.(15);
  } catch {
    // ohne Vibration weiter
  }
}

export function PraxisflowAblauf({ daten, zurueck }: { daten: PraxisflowDaten; zurueck: { href: string; label: string } }) {
  const f = daten.fortschritt;
  const [position, setPosition] = useState<string>(() => startPosition(daten));
  const [meldung, setMeldung] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, starten] = useTransition();

  // Planen: Listen lokal bearbeiten, beim Weiter speichern.
  const [listen, setListen] = useState<Record<Liste, Eintrag[]>>(() => ({
    werkzeuge: f.werkzeuge ?? [],
    materialien: f.materialien ?? [],
    schritte: f.schritte ?? [],
  }));
  // Bewerten: Punkte der laufenden Einschätzung, beim letzten Kriterium speichern.
  const [werte, setWerte] = useState<Record<PraxisRolle, Record<string, number>>>({ selbst: {}, peer: {}, trainer: {} });
  const [naechstesMal, setNaechstesMal] = useState("");

  // Beim Schrittwechsel den Fokus auf die neue Frage, damit Screenreader sie ansagen.
  const erstePosition = useRef(position);
  useEffect(() => {
    if (position === erstePosition.current) return;
    erstePosition.current = "";
    document.getElementById("frage")?.focus();
  }, [position]);

  useEffect(() => {
    if (!meldung) return;
    const t = setTimeout(() => setMeldung(null), 2200);
    return () => clearTimeout(t);
  }, [meldung]);

  const schritte = alleSchritte(f.schritte ?? []);
  const index = Math.max(0, schritte.findIndex((s) => s.id === position));
  const aktuell = schritte[index];
  const inPhase = schritte.filter((s) => s.phase === aktuell.phase && s.id !== "fertig");
  const nrInPhase = inPhase.findIndex((s) => s.id === aktuell.id) + 1;
  const phasenIndex = daten.phase === "abgeschlossen" ? PHASEN.length - 1 : PHASEN.findIndex((p) => p.id === daten.phase);
  const offen = daten.phase !== "abgeschlossen";

  function gehe(id: string, phasenMeldung?: string) {
    vibrieren();
    if (phasenMeldung) setMeldung(phasenMeldung);
    setFehler(null);
    setPosition(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function naechster(von: string = aktuell.id, liste: Schritt[] = schritte): string {
    const i = liste.findIndex((s) => s.id === von);
    return liste[Math.min(i + 1, liste.length - 1)].id;
  }

  /** Server-Aktion ausführen; bei Erfolg weiter. */
  function aktion<T>(aufruf: () => Promise<AktionErgebnis<T>>, danach: (wert: T) => void) {
    setFehler(null);
    starten(async () => {
      const r = await aufruf();
      if (r.ok) danach(r.wert);
      else setFehler(r.fehler);
    });
  }

  function phaseAbschliessen(von: Phase, ziel: string) {
    aktion(
      () => phaseWeiter(daten.fieldJobId, von),
      () => gehe(ziel, `${phasenName(von)} erledigt`)
    );
  }

  function planSichern(danach: () => void) {
    aktion(
      () => planSpeichern(daten.fieldJobId, listen.werkzeuge.map((e) => e.text), listen.materialien.map((e) => e.text), listen.schritte.map((e) => e.text)),
      (flow) => {
        const neu = flow as typeof f;
        setListen({ werkzeuge: neu.werkzeuge ?? [], materialien: neu.materialien ?? [], schritte: neu.schritte ?? [] });
        danach();
      }
    );
  }

  function gateErgebnis(r: AktionErgebnis<boolean>): GateErgebnis {
    if (!r.ok) return { ok: false, fehler: r.fehler };
    return r.wert ? { ok: true } : { ok: false, fehler: TEXTE.codewort.falsch };
  }

  const k = {
    phase: phasenName(aktuell.phase),
    nr: nrInPhase,
    von: inPhase.length,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 print:hidden">
        <Link href={zurueck.href} className={cn("inline-flex w-fit items-center gap-1 rounded-sm text-sm text-ink-muted hover:text-ink", FOKUS)}>
          <ArrowLeft className="size-4" aria-hidden="true" /> {zurueck.label}
        </Link>
        <span className="text-sm text-ink-muted">Praxistag · {daten.titel}</span>
      </div>
      <div className="flex flex-col gap-3 rounded-karte bg-card px-4 pt-4 pb-3 text-ink shadow-card md:px-6 print:hidden">
        <PhasenAnzeige phasen={PHASEN} aktuell={phasenIndex} hell />
      </div>
      <p role="status" aria-live="polite" className={cn("min-h-6 text-center text-sm font-semibold text-progress print:hidden", !meldung && "sr-only")}>
        {meldung && (
          <span className="inline-flex items-center gap-1.5">
            <Check className="size-4" strokeWidth={3} aria-hidden="true" /> {meldung}
          </span>
        )}
      </p>
      {fehler && (
        <p role="alert" className="rounded-zeile bg-praxis-tint px-4 py-3 text-[15px] text-ink print:hidden">
          {fehler}
        </p>
      )}
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <UnterlagenLeiste dateien={daten.dateien} />
        <div key={aktuell.id} className="min-w-0 flex-1 md:order-first">
          {(() => {
            const [art, id] = aktuell.id.includes(":") ? aktuell.id.split(":") : [aktuell.id, ""];

            // ----- Informieren
            if (art === "auftrag") {
              const hat = daten.dateien.some((x) => x.art === "auftrag");
              return (
                <Karte {...k} frage="Hast du deinen Auftrag bekommen?" hinweis={TEXTE.analyse.auftragText}>
                  <DateiUpload id="upload-auftrag" art="auftrag" fieldJobId={daten.fieldJobId} learnerId={daten.learnerId} organisationId={daten.organisationId} dateien={daten.dateien} offen={offen} />
                  <button type="button" disabled={!hat || laeuft} onClick={() => gehe("hilfen")} className={GROSS}>
                    Auftrag angenommen <ArrowRight aria-hidden="true" />
                  </button>
                </Karte>
              );
            }
            if (art === "hilfen") {
              return (
                <Karte {...k} frage="Deine Hilfsunterlagen" hinweis="Damit planst du dein Material und deine Arbeit." zurueck={() => gehe("auftrag")}>
                  {daten.beschreibung && <p className="rounded-zeile bg-subtle p-4 text-[15px] text-ink">{daten.beschreibung}</p>}
                  <div className="flex flex-col gap-2">
                    <span className="text-[15px] font-semibold text-ink">Hast du noch etwas, das dir hilft?</span>
                    <span className="text-sm text-ink-muted">Lade es hier dazu, zum Beispiel das Handbuch eines Schalters. Das ist freiwillig.</span>
                    <DateiUpload id="upload-hilfe" art="hilfe" fieldJobId={daten.fieldJobId} learnerId={daten.learnerId} organisationId={daten.organisationId} dateien={daten.dateien} offen={offen} />
                  </div>
                  <button type="button" disabled={laeuft} onClick={() => phaseAbschliessen("informieren", "werkzeuge")} className={GROSS}>
                    Weiter zum Planen <ArrowRight aria-hidden="true" />
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
              const aendern = (fn: (l: Eintrag[]) => Eintrag[]) => setListen((l) => ({ ...l, [name]: fn(l[name]) }));
              const gesperrt = name === "schritte" && listen.schritte.length === 0;
              const zurueckZu = name === "werkzeuge" ? undefined : name === "materialien" ? "werkzeuge" : "materialien";
              return (
                <Karte {...k} frage={fragen[name]} hinweis={hinweise[name]} zurueck={zurueckZu ? () => gehe(zurueckZu) : undefined}>
                  <ListenEditor
                    id={name}
                    {...EDITOR[name]}
                    eintraege={listen[name]}
                    onHinzufuegen={(t) => aendern((l) => eintraegeAnhaengen(l, t, () => crypto.randomUUID()))}
                    onBearbeiten={(eid, t) => aendern((l) => eintragBearbeiten(l, eid, t))}
                    onLoeschen={(eid) => aendern((l) => eintragLoeschen(l, eid))}
                    onVerschieben={name === "schritte" ? (eid, r) => aendern((l) => eintragVerschieben(l, eid, r)) : undefined}
                    eingabeTexte={TEXTE.eingabe}
                  />
                  <button type="button" disabled={gesperrt || laeuft} onClick={() => planSichern(() => gehe(naechster()))} className={GROSS}>
                    Weiter <ArrowRight aria-hidden="true" />
                  </button>
                  {gesperrt && <p className="text-center text-sm text-ink-muted">{TEXTE.planen.gesperrt}</p>}
                </Karte>
              );
            }
            if (art === "plaene") {
              const hat = daten.dateien.some((x) => x.art === "plan");
              return (
                <Karte {...k} frage="Hast du einen Plan gezeichnet?" hinweis="Auf Papier oder mit einem Programm? Dann mach ein Foto oder lade die Datei hoch." zurueck={() => gehe("schritte")}>
                  <DateiUpload id="upload-plan" art="plan" fieldJobId={daten.fieldJobId} learnerId={daten.learnerId} organisationId={daten.organisationId} dateien={daten.dateien} offen={offen} />
                  <button type="button" disabled={laeuft} onClick={() => phaseAbschliessen("planen", "rueckblick")} className={GROSS}>
                    {hat ? "Weiter" : "Ohne Plan weiter"} <ArrowRight aria-hidden="true" />
                  </button>
                </Karte>
              );
            }

            // ----- Entscheiden
            if (art === "rueckblick") {
              const erster = (f.schritte ?? [])[0];
              return (
                <Karte {...k} frage="Hast du alles?" hinweis="Schau dir deinen Plan an. Wenn alles passt, entscheidest du selbst, dass du anfangen kannst.">
                  <PlanUebersicht werkzeuge={f.werkzeuge ?? []} materialien={f.materialien ?? []} schritte={f.schritte ?? []} />
                  <p className="text-center text-sm text-ink-muted">{TEXTE.entscheiden.bestaetigen}</p>
                  <button type="button" disabled={laeuft || !erster} onClick={() => phaseAbschliessen("entscheiden", erster ? `tun:${erster.id}` : "rueckblick")} className={GROSS}>
                    {TEXTE.entscheiden.button} <ArrowRight aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled={laeuft}
                    onClick={() => aktion(() => zurueckZumPlan(daten.fieldJobId), () => gehe("werkzeuge"))}
                    className={cn(SEKUNDAER, "sm:self-center")}
                  >
                    Plan ändern
                  </button>
                </Karte>
              );
            }

            // ----- Ausführen: ein Arbeitsschritt pro Karte
            if (art === "tun") {
              const s = (f.schritte ?? []).find((x) => x.id === id);
              const letzter = nrInPhase === inPhase.length;
              const schonErledigt = (f.erledigt ?? []).some((e) => e.id === id);
              return (
                <Karte {...k} frage={s?.text ?? "Arbeitsschritt"} hinweis={letzter ? "Das ist dein letzter Arbeitsschritt." : undefined}>
                  <button
                    type="button"
                    disabled={laeuft}
                    onClick={() => {
                      const danach = () => (letzter ? phaseAbschliessen("ausfuehren", "start-kontrolle") : gehe(naechster()));
                      if (schonErledigt) danach();
                      else aktion(() => schrittAbhaken(daten.fieldJobId, id), danach);
                    }}
                    className={GROSS}
                  >
                    <Check aria-hidden="true" /> Erledigt
                  </button>
                </Karte>
              );
            }

            // ----- Kontrollieren
            if (art === "start-kontrolle") {
              const teile = [
                { titel: "Prüfen ohne Spannung", text: "Das machst du allein." },
                { titel: "Freigabe", text: "Deine Trainer:in prüft die Anlage." },
                { titel: "Prüfen unter Spannung", text: "Mit Trainer:in: erst messen, dann die Funktion. Am Ende das Prüfprotokoll." },
              ];
              return (
                <Uebergabe {...k} ton="weiss" icon={ClipboardCheck} frage="Dein Aufbau ist fertig" hinweis="Jetzt kontrollierst du deine Arbeit. Das passiert in diesen Teilen:">
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
                  <button type="button" onClick={() => gehe(naechster())} className={cn(GROSS, "mt-4")}>
                    Kontrolle beginnen <ArrowRight aria-hidden="true" />
                  </button>
                </Uebergabe>
              );
            }
            if (art === "a" || art === "c") {
              const p = (art === "a" ? PRUEFLISTE_STANDARD.spannungsfrei : PRUEFLISTE_STANDARD.unterSpannung).find((x) => x.id === id);
              const schonErledigt = (f.kontrolle ?? []).some((e) => e.id === id);
              return (
                <Karte {...k} frage={p?.titel ?? "Prüfung"} hinweis={p?.text}>
                  {p?.punkte && (
                    <ul className="flex list-disc flex-col gap-1 pl-5 text-[15px] text-ink">
                      {p.punkte.map((punkt) => (
                        <li key={punkt}>{punkt}</li>
                      ))}
                    </ul>
                  )}
                  {p?.hinweis && <p className="rounded-zeile bg-subtle p-3 text-sm text-ink">{p.hinweis}</p>}
                  <p className="text-sm text-ink-muted">{art === "a" ? TEXTE.kontrolle.spannungsfreiText : TEXTE.kontrolle.unterSpannungText}</p>
                  <button
                    type="button"
                    disabled={laeuft}
                    onClick={() => (schonErledigt ? gehe(naechster()) : aktion(() => kontrolleAbhaken(daten.fieldJobId, id), () => gehe(naechster())))}
                    className={GROSS}
                  >
                    <Check aria-hidden="true" /> Erledigt
                  </button>
                </Karte>
              );
            }
            if (art === "freigabe") {
              if (f.zuschalten_freigegeben_am) {
                return <Moment icon={ShieldCheck} titel="Freigegeben" text="Du darfst die Spannung zuschalten. Deine Trainer:in bleibt dabei." knopf="Weiter prüfen" onWeiter={() => gehe(naechster())} />;
              }
              return (
                <Uebergabe {...k} ton="praxis" icon={KeyRound} frage="Hol deine Trainer:in" hinweis={`${TEXTE.kontrolle.freigabeText} Gib das Gerät deiner Trainer:in.`}>
                  <CodewortGate
                    id="gate-zuschalten"
                    hinweis={TEXTE.gates.kontrolle}
                    label={TEXTE.codewort.label}
                    buttonText="Inbetriebnahme freigeben"
                    trainer={daten.trainer}
                    pruefen={async (e) => gateErgebnis(await zuschaltenFreigeben(daten.fieldJobId, e))}
                    onFreigabe={() => vibrieren()}
                  />
                </Uebergabe>
              );
            }
            if (art === "protokoll") {
              const hat = daten.dateien.some((x) => x.art === "protokoll");
              return (
                <Karte {...k} frage="Lade das Prüfprotokoll hoch" hinweis={TEXTE.kontrolle.protokollText}>
                  <DateiUpload id="upload-protokoll" art="protokoll" fieldJobId={daten.fieldJobId} learnerId={daten.learnerId} organisationId={daten.organisationId} dateien={daten.dateien} offen={offen} />
                  <button type="button" disabled={!hat || laeuft} onClick={() => phaseAbschliessen("kontrollieren", "uebergabe-selbst")} className={GROSS}>
                    Weiter <ArrowRight aria-hidden="true" />
                  </button>
                </Karte>
              );
            }

            // ----- Bewerten: ein Kriterium pro Karte, Antippen geht weiter
            if (art === "selbst" || art === "peer" || art === "trainer") {
              const rolle = art as PraxisRolle;
              const kriterium = BOGEN.find((x) => x.id === id);
              if (!kriterium) return null;
              const nr = BOGEN.findIndex((x) => x.id === id);
              const letzter = nr === BOGEN.length - 1;
              const wer = { selbst: TEXTE.bewerten.selbstText, peer: TEXTE.bewerten.peerText, trainer: TEXTE.bewerten.fremdText }[rolle];
              const titel = { selbst: "Deine Einschätzung", peer: "Einschätzung Peer", trainer: "Einschätzung Trainer:in" }[rolle];
              const ton = rolle === "selbst" ? "weiss" : rolle === "peer" ? "brand" : "praxis";
              const beschreibung = kriterium.skala.length === 2 ? JA_NEIN_BESCHREIBUNGEN : NOTEN_BESCHREIBUNGEN;
              const wert = werte[rolle][kriterium.id];
              const zurueckZu = nr > 0 ? `${rolle}:${BOGEN[nr - 1].id}` : undefined;
              const waehlen = (p: number) => {
                const neu = { ...werte[rolle], [kriterium.id]: p };
                setWerte((w) => ({ ...w, [rolle]: neu }));
                if (!letzter || rolle === "trainer") {
                  // Trainer:in: gespeichert wird erst mit dem Codewort im nächsten Schritt.
                  setTimeout(() => gehe(naechster()), 180);
                  return;
                }
                aktion(() => einschaetzen(daten.fieldJobId, rolle, neu), () => gehe(naechster()));
              };
              return (
                <Karte {...k} phase={`${k.phase} · ${titel}`} frage={kriterium.titel} hinweis={wer} ton={ton} zurueck={zurueckZu ? () => gehe(zurueckZu) : undefined}>
                  <div className="flex flex-wrap gap-2">
                    {rolle === "selbst" && (
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-lime px-2.5 py-0.5 text-xs font-bold text-on-lime">
                        <UserRound className="size-3.5" aria-hidden="true" /> Du bist dran
                      </span>
                    )}
                    {kriterium.ko && <span className="w-fit rounded-full bg-white/70 px-2.5 py-0.5 text-xs font-semibold text-praxis-text">{TEXTE.bewerten.ko}</span>}
                  </div>
                  <ul className="flex flex-col gap-2">
                    {kriterium.skala.map((p) => (
                      <li key={p}>
                        <button
                          type="button"
                          disabled={laeuft}
                          aria-pressed={wert === p}
                          onClick={() => waehlen(p)}
                          className={cn("flex min-h-14 w-full items-center gap-4 rounded-2xl px-4 py-2.5 text-left text-ink", wert === p ? "bg-ink text-white" : "bg-white hover:bg-subtle", FOKUS)}
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
                <Uebergabe {...k} ton="lime" icon={UserRound} frage="Jetzt bist du dran" hinweis="Schätze zuerst selbst ein, wie gut dir der Auftrag gelungen ist. Danach schätzen eine Person aus deiner Gruppe und deine Trainer:in ein.">
                  <button type="button" onClick={() => gehe(naechster())} className={cn(GROSS, "bg-ink text-white hover:brightness-110")}>
                    Ich schätze mich ein <ArrowRight aria-hidden="true" />
                  </button>
                </Uebergabe>
              );
            }
            if (art === "uebergabe-peer") {
              return (
                <Uebergabe {...k} ton="brand" icon={Users} frage="Gib das Gerät einer Person aus deiner Gruppe" hinweis="Sie schaut sich deine Arbeit an und schätzt sie ein. Danach bekommst du das Gerät zurück.">
                  <button type="button" onClick={() => gehe(naechster())} className={GROSS}>
                    Ich bin dran <ArrowRight aria-hidden="true" />
                  </button>
                </Uebergabe>
              );
            }
            if (art === "uebergabe-trainer") {
              return (
                <Uebergabe {...k} ton="praxis" icon={KeyRound} frage="Jetzt ist deine Trainer:in dran" hinweis="Gib das Gerät deiner Trainer:in. Sie schätzt ein und bestätigt am Ende mit ihrem Codewort.">
                  <button type="button" onClick={() => gehe(naechster())} className={GROSS}>
                    Ich bin die Trainer:in <ArrowRight aria-hidden="true" />
                  </button>
                </Uebergabe>
              );
            }
            if (art === "trainer-codewort") {
              const vollstaendig = BOGEN.every((x) => werte.trainer[x.id] !== undefined);
              return (
                <Uebergabe {...k} ton="praxis" icon={KeyRound} frage="Einschätzung bestätigen" hinweis="Gespeichert wird deine Einschätzung erst mit deinem Codewort.">
                  {vollstaendig ? (
                    <CodewortGate
                      id="gate-bewertung"
                      hinweis={TEXTE.gates.bewerten}
                      label={TEXTE.codewort.label}
                      buttonText="Einschätzung speichern"
                      trainer={daten.trainer}
                      pruefen={async (e) => gateErgebnis(await trainerEinschaetzen(daten.fieldJobId, werte.trainer, e))}
                      onFreigabe={() => gehe(naechster())}
                    />
                  ) : (
                    <button type="button" onClick={() => gehe(`trainer:${BOGEN[0].id}`)} className={GROSS}>
                      Einschätzung vervollständigen <ArrowRight aria-hidden="true" />
                    </button>
                  )}
                </Uebergabe>
              );
            }
            if (art === "ergebnis") {
              const e = f.einschaetzung ?? {};
              const selbst = e.selbst ?? {};
              const peer = e.peer ?? {};
              const trainer = e.trainer ?? {};
              const ko = BOGEN.some((x) => x.ko && trainer[x.id] === 0);
              const unterschiede = BOGEN.filter((x) => selbst[x.id] !== trainer[x.id] || peer[x.id] !== trainer[x.id]);
              return (
                <Karte
                  {...k}
                  frage={ko ? "Noch nicht ganz" : "Gut gemacht"}
                  hinweis={
                    ko
                      ? "Bei einem K.-o.-Kriterium hat deine Trainer:in 0 Punkte gegeben. Dann zählt der Auftrag nicht für deine Kompetenzen. Wie es weitergeht, besprichst du mit deiner Trainer:in."
                      : unterschiede.length === 0
                        ? "Ihr wart euch überall einig."
                        : "Hier wart ihr euch nicht einig. Sprich mit deiner Trainer:in darüber."
                  }
                >
                  <p className="text-sm text-ink-muted">Gib das Gerät zurück an die Person, die den Auftrag gemacht hat.</p>
                  <ul className="flex flex-col gap-2">
                    {BOGEN.map((x) => (
                      <li key={x.id} className="flex flex-col gap-1 rounded-zeile bg-subtle px-4 py-3">
                        <span className="text-[15px] font-semibold">{x.titel}</span>
                        <span className="flex gap-4 text-sm text-ink-muted tabular-nums">
                          <span>Du: {selbst[x.id] ?? "–"}</span>
                          <span>Peer: {peer[x.id] ?? "–"}</span>
                          <span className="font-semibold text-ink">Trainer:in: {trainer[x.id] ?? "–"}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <label className="flex flex-col gap-2">
                    <span className="text-[15px] font-semibold">Was machst du nächstes Mal anders?</span>
                    <span className="text-sm text-ink-muted">Freiwillig, ein, zwei Sätze. Das steht danach in deiner Zusammenfassung.</span>
                    <textarea
                      rows={3}
                      maxLength={2000}
                      value={naechstesMal}
                      onChange={(ev) => setNaechstesMal(ev.target.value)}
                      className={cn("rounded-zeile border border-line bg-white px-4 py-3 text-[15px] text-ink placeholder:text-ink-subtle", FOKUS)}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={laeuft}
                    onClick={() => aktion(() => abschliessen(daten.fieldJobId, naechstesMal), () => gehe("fertig", "Auftrag abgeschlossen"))}
                    className={GROSS}
                  >
                    Auftrag abschließen <Check aria-hidden="true" />
                  </button>
                </Karte>
              );
            }

            // ----- Ende: Zusammenfassung (SR-90)
            if (art === "fertig") {
              return <Fertig daten={daten} />;
            }
            return null;
          })()}
        </div>
      </div>
    </div>
  );
}

const ZEIT = (iso: string | undefined | null) => (iso ? jetztInBerlin(new Date(iso)) : null);

const VERLAUF_TEXT: Record<string, string> = {
  "phase:planen": "Auftrag angenommen, Informieren erledigt",
  "phase:entscheiden": "Plan fertig",
  "phase:ausfuehren": "Plan bestätigt, Ausführen begonnen",
  "phase:kontrollieren": "Aufbau fertig",
  "phase:bewerten": "Kontrolle und Prüfprotokoll fertig",
  "zurueck:planen": "Zurück zum Plan",
  "gate:zuschalten": "Inbetriebnahme freigegeben (Codewort der Trainer:in)",
  "einschaetzung:selbst": "Selbsteinschätzung abgegeben",
  "einschaetzung:peer": "Peer-Einschätzung abgegeben",
  "einschaetzung:trainer": "Trainer-Einschätzung mit Codewort bestätigt",
  "abgeschlossen:angerechnet": "Auftrag abgeschlossen",
  "abgeschlossen:ko": "Auftrag abgeschlossen, K.-o.-Kriterium nicht erfüllt",
  "abgeschlossen:ohne_trainer": "Auftrag abgeschlossen",
};

function Fertig({ daten }: { daten: PraxisflowDaten }) {
  const f = daten.fortschritt;
  const kontrolle = new Set((f.kontrolle ?? []).map((e) => e.id));
  const namen = (art: string) => daten.dateien.filter((d) => d.art === art).map((d) => d.dateiname);
  const e = f.einschaetzung ?? {};
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 rounded-karte bg-progress p-5 text-white shadow-card md:p-6 print:hidden">
        <PartyPopper className="size-8 shrink-0" aria-hidden="true" />
        <div className="flex flex-col">
          <h2 className="font-heading text-[26px] leading-tight md:text-[32px]">Auftrag fertig!</h2>
          <p className="text-[15px]">Hier ist alles, was du gemacht hast. Du kannst es drucken oder als PDF sichern.</p>
        </div>
      </div>
      <Auftragsakte
        auftrag={{ titel: daten.titel, ausgabe: daten.datum.split("-").reverse().join("."), trainer: daten.trainer?.name ?? "–" }}
        auftragDateien={namen("auftrag")}
        hilfeDateien={namen("hilfe")}
        werkzeuge={f.werkzeuge ?? []}
        materialien={f.materialien ?? []}
        schritte={f.schritte ?? []}
        ausgefuehrt={(f.schritte ?? []).map((s) => ({ titel: s.text, erledigt: (f.erledigt ?? []).some((e) => e.id === s.id) }))}
        planDateien={namen("plan")}
        pruefungenOhneSpannung={PRUEFLISTE_STANDARD.spannungsfrei.map((p) => ({ titel: p.titel, erledigt: kontrolle.has(p.id) }))}
        unterSpannung
        pruefungenUnterSpannung={PRUEFLISTE_STANDARD.unterSpannung.map((p) => ({ titel: p.titel, erledigt: kontrolle.has(p.id) }))}
        protokollDateien={namen("protokoll")}
        freigabe={ZEIT(f.zuschalten_freigegeben_am)}
        kriterien={BOGEN}
        einschaetzungen={[
          { name: "Du", werte: e.selbst ?? {} },
          { name: "Peer", werte: e.peer ?? {} },
          { name: "Trainer:in", werte: e.trainer ?? {} },
        ]}
        abgabe={ZEIT(f.abgeschlossen_am)}
        status={
          f.ergebnis === "angerechnet"
            ? "Abgeschlossen, zählt für deine Kompetenzen"
            : f.ergebnis === "ko"
              ? "Abgeschlossen, zählt nicht (K.-o.-Kriterium)"
              : "Abgeschlossen, Bestätigung durch die Akademie folgt"
        }
        naechstesMal={f.naechstes_mal ?? null}
        verlauf={(f.verlauf ?? []).map((v) => ({ zeit: jetztInBerlin(new Date(v.zeit)), text: VERLAUF_TEXT[v.ereignis] ?? v.ereignis }))}
      />
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
        <h2 id="frage" tabIndex={-1} className="font-heading text-[28px] leading-tight outline-none md:text-[36px]">
          {frage}
        </h2>
        {hinweis && <p className={cn(TEXT, ton === "brand" && "text-white/90")}>{hinweis}</p>}
      </div>
      {children}
    </section>
  );
}

/** Übergabe an eine andere Person: eigene Farbe, klar, wer dran ist. */
function Uebergabe({
  icon: Icon,
  frage,
  hinweis,
  ton,
  phase,
  children,
}: {
  icon: LucideIcon;
  frage: string;
  hinweis: string;
  ton: "weiss" | "praxis" | "brand" | "lime";
  phase: string;
  nr?: number;
  von?: number;
  children: React.ReactNode;
}) {
  return (
    <Karte phase={phase} frage={frage} hinweis={hinweis} ton={ton}>
      <span
        className={cn(
          "flex size-14 items-center justify-center rounded-full",
          ton === "brand" ? "bg-white/15 text-white" : ton === "lime" ? "bg-white/50 text-on-lime" : ton === "weiss" ? "bg-subtle text-ink" : "bg-white/60 text-ink"
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
function Moment({ icon: Icon, titel, text, knopf, onWeiter }: { icon: LucideIcon; titel: string; text: string; knopf: string; onWeiter: () => void }) {
  return (
    <section className="flex flex-col items-center gap-4 rounded-karte bg-progress p-7 text-center text-white shadow-card">
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
