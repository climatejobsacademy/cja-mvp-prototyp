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
  eintragAnPosition,
  eintragBearbeiten,
  eintragLoeschen,
  eintragVerschieben,
  type Eintrag,
} from "@/lib/praxisflow-liste";
import { ereignisseMelden } from "@/lib/praxisflow-ereignis";
import type { AktionErgebnis, PraxisflowDaten } from "@/lib/praxisflow-shared";
import { cn } from "@/lib/utils";

import {
  abschliessen,
  einschaetzen,
  deutungSpeichern,
  kontrolleAbhaken,
  phaseWeiter,
  planFreigeben,
  planSpeichern,
  schrittAbhaken,
  trainerEinschaetzen,
  zurueckZumPlan,
  zuschaltenFreigeben,
} from "./praxisflow-actions";
import { DateiUpload, DateiVorschau, UnterlagenLeiste } from "./praxisflow-dateien";

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
    // Reihenfolge wie in der Werkstatt: der Plan bestimmt Material und Werkzeug (Feedback 09.11.2026).
    ...s("planen", ["plaene", "materialien", "werkzeuge", "schritte"]),
    ...s("entscheiden", ["rueckblick"]),
    // Variante B (09.11.2026): Messen gehört zu Ausführen, Kontrollieren heißt Messwerte deuten.
    ...s("ausfuehren", [
      ...schritte.map((x) => `tun:${x.id}`),
      "start-kontrolle",
      ...PRUEFLISTE_STANDARD.spannungsfrei.map((p) => `a:${p.id}`),
      "freigabe",
      ...PRUEFLISTE_STANDARD.unterSpannung.map((p) => `c:${p.id}`),
      "protokoll",
    ]),
    ...s("kontrollieren", ["start-deuten", ...PRUEFPUNKTE.map((p) => `deuten:${p.id}`)]),
    ...s("bewerten", [
      "uebergabe-selbst",
      ...BOGEN.map((k) => `selbst:${k.id}`),
      "uebergabe-peer",
      ...BOGEN.map((k) => `peer:${k.id}`),
      "uebergabe-trainer",
      ...BOGEN.map((k) => `trainer:${k.id}`),
      "trainer-codewort",
      "ergebnis",
      "reflexion",
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
      return "plaene";
    case "entscheiden":
      return "rueckblick";
    case "ausfuehren": {
      const offen = (f.schritte ?? []).find((x) => !erledigt.has(x.id));
      if (offen) return `tun:${offen.id}`;
      if (kontrolle.size === 0) return "start-kontrolle";
      const a = PRUEFLISTE_STANDARD.spannungsfrei.find((p) => !kontrolle.has(p.id));
      if (a) return `a:${a.id}`;
      if (!f.zuschalten_freigegeben_am) return "freigabe";
      const c = PRUEFLISTE_STANDARD.unterSpannung.find((p) => !kontrolle.has(p.id));
      return c ? `c:${c.id}` : "protokoll";
    }
    case "kontrollieren": {
      const gedeutet = new Set((f.deutungen ?? []).map((d) => d.id));
      if (gedeutet.size === 0) return "start-deuten";
      const offen = PRUEFPUNKTE.find((p) => !gedeutet.has(p.id)) ?? PRUEFPUNKTE.at(-1);
      return `deuten:${offen?.id}`;
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

const PRUEFPUNKTE = [...PRUEFLISTE_STANDARD.spannungsfrei, ...PRUEFLISTE_STANDARD.unterSpannung];
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
  // Ende einer Phase: immer derselbe große Moment, dann weiter (ein Muster für alle Phasen).
  const [phasenMoment, setPhasenMoment] = useState<{ von: Phase; ziel: string } | null>(null);
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
  // Kontrollieren: Deutungen lokal bearbeiten, je Prüfpunkt beim Weiter speichern.
  const [deutungen, setDeutungen] = useState<Record<string, string>>(() =>
    Object.fromEntries((f.deutungen ?? []).map((d) => [d.id, d.text]))
  );

  // Ereignisse (SR-92): erster Schritt beim Öffnen, Schritt beendet beim
  // Verlassen der Seite; Wechsel meldet gehe(). Nur Kennungen, keine Inhalte.
  const positionRef = useRef(position);
  useEffect(() => {
    const abbruch = new AbortController();
    ereignisseMelden(daten.fieldJobId, [{ art: "schritt_geoeffnet", schritt: positionRef.current }], abbruch.signal);
    const verlassen = () => ereignisseMelden(daten.fieldJobId, [{ art: "schritt_beendet", schritt: positionRef.current }]);
    window.addEventListener("pagehide", verlassen);
    return () => {
      abbruch.abort();
      window.removeEventListener("pagehide", verlassen);
    };
  }, [daten.fieldJobId]);
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

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
    if (id !== position) {
      ereignisseMelden(daten.fieldJobId, [
        { art: "schritt_beendet", schritt: position },
        { art: "schritt_geoeffnet", schritt: id },
      ]);
    }
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
      () => {
        vibrieren();
        setFehler(null);
        setPhasenMoment({ von, ziel });
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
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
        <UnterlagenLeiste
          dateien={daten.dateien}
          onGeoeffnet={(art) => ereignisseMelden(daten.fieldJobId, [{ art: art === "hilfe" ? "hilfe_geoeffnet" : "vorschau_geoeffnet", schritt: art }])}
        />
        <div key={phasenMoment ? `moment-${phasenMoment.von}` : aktuell.id} className="min-w-0 flex-1 md:order-first">
          {phasenMoment ? (
            <PhasenMoment
              von={phasenMoment.von}
              onWeiter={() => {
                const ziel = phasenMoment.ziel;
                setPhasenMoment(null);
                gehe(ziel);
              }}
            />
          ) : (() => {
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
                  <button type="button" disabled={laeuft} onClick={() => phaseAbschliessen("informieren", "plaene")} className={GROSS}>
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
                materialien: "Schau in deinen Plan. Das wird deine Materialliste für das Lager.",
                schritte: "Bring die Schritte in die Reihenfolge, in der du arbeitest.",
              };
              const aendern = (fn: (l: Eintrag[]) => Eintrag[]) => setListen((l) => ({ ...l, [name]: fn(l[name]) }));
              const gesperrt = name === "schritte" && listen.schritte.length === 0;
              const zurueckZu = name === "materialien" ? "plaene" : name === "werkzeuge" ? "materialien" : "werkzeuge";
              // Der letzte Teil von Planen speichert den Plan und schließt die Phase ab.
              const weiter = () =>
                name === "schritte" ? planSichern(() => phaseAbschliessen("planen", "rueckblick")) : planSichern(() => gehe(naechster()));
              return (
                <Karte {...k} frage={fragen[name]} hinweis={hinweise[name]} zurueck={() => gehe(zurueckZu)}>
                  <ListenEditor
                    id={name}
                    {...EDITOR[name]}
                    eintraege={listen[name]}
                    onHinzufuegen={(t) => aendern((l) => eintraegeAnhaengen(l, t, () => crypto.randomUUID()))}
                    onBearbeiten={(eid, t) => aendern((l) => eintragBearbeiten(l, eid, t))}
                    onLoeschen={(eid) => aendern((l) => eintragLoeschen(l, eid))}
                    onVerschieben={name === "schritte" ? (eid, r) => aendern((l) => eintragVerschieben(l, eid, r)) : undefined}
                    onAnordnen={name === "schritte" ? (eid, ziel) => aendern((l) => eintragAnPosition(l, eid, ziel)) : undefined}
                    eingabeTexte={TEXTE.eingabe}
                  />
                  <button type="button" disabled={gesperrt || laeuft} onClick={weiter} className={GROSS}>
                    {name === "schritte" ? "Plan fertig" : "Weiter"} <ArrowRight aria-hidden="true" />
                  </button>
                  {gesperrt && <p className="text-center text-sm text-ink-muted">{TEXTE.planen.gesperrt}</p>}
                </Karte>
              );
            }
            if (art === "plaene") {
              const hat = daten.dateien.some((x) => x.art === "plan");
              return (
                <Karte {...k} frage="Zeichne deinen Plan" hinweis="Auf Papier oder mit einem Programm. Mach ein Foto oder lade die Datei hoch. Aus dem Plan ergibt sich dein Material.">
                  <DateiUpload id="upload-plan" art="plan" fieldJobId={daten.fieldJobId} learnerId={daten.learnerId} organisationId={daten.organisationId} dateien={daten.dateien} offen={offen} />
                  <button type="button" disabled={laeuft} onClick={() => gehe("materialien")} className={GROSS}>
                    {hat ? "Weiter" : "Ohne Plan weiter"} <ArrowRight aria-hidden="true" />
                  </button>
                </Karte>
              );
            }

            // ----- Entscheiden
            if (art === "rueckblick") {
              const erster = (f.schritte ?? [])[0];
              const planDateien = daten.dateien.filter((x) => x.art === "plan");
              const planAendern = (
                <button
                  type="button"
                  disabled={laeuft}
                  onClick={() => aktion(() => zurueckZumPlan(daten.fieldJobId), () => gehe("plaene"))}
                  className={cn(SEKUNDAER, "sm:self-center")}
                >
                  Plan ändern
                </button>
              );
              if (f.plan_freigegeben_am) {
                return (
                  <Karte {...k} frage="Dein Plan ist freigegeben" hinweis="Deine Trainer:in hat deinen Plan abgenommen. Du kannst anfangen.">
                    <Freigegeben am={f.plan_freigegeben_am} />
                    <button type="button" disabled={laeuft || !erster} onClick={() => erster && phaseAbschliessen("entscheiden", `tun:${erster.id}`)} className={GROSS}>
                      {TEXTE.entscheiden.button} <ArrowRight aria-hidden="true" />
                    </button>
                  </Karte>
                );
              }
              return (
                <Uebergabe {...k} ton="praxis" icon={KeyRound} frage="Zeig deinen Plan deiner Trainer:in" hinweis={TEXTE.entscheiden.bestaetigen}>
                  <div className="flex flex-col gap-3">
                  <PlanUebersicht
                    mitPlan
                    plan={planDateien.length > 0 ? <DateiVorschau dateien={planDateien} /> : undefined}
                    werkzeuge={f.werkzeuge ?? []}
                    materialien={f.materialien ?? []}
                    schritte={f.schritte ?? []}
                  />
                  <CodewortGate
                    id="gate-plan"
                    hinweis={TEXTE.gates.entscheiden}
                    label={TEXTE.codewort.label}
                    buttonText="Plan freigeben"
                    trainer={daten.trainer}
                    pruefen={async (e) => gateErgebnis(await planFreigeben(daten.fieldJobId, e))}
                    onFreigabe={() => vibrieren()}
                  />
                  {planAendern}
                  </div>
                </Uebergabe>
              );
            }

            // ----- Ausführen: ein Arbeitsschritt pro Karte
            if (art === "tun") {
              const s = (f.schritte ?? []).find((x) => x.id === id);
              const letzter = nrInPhase === inPhase.length;
              const schonErledigt = (f.erledigt ?? []).some((e) => e.id === id);
              return (
                <Karte {...k} frage={s?.text ?? "Arbeitsschritt"} hinweis={letzter ? "Das ist dein letzter Arbeitsschritt. Danach misst du." : undefined}>
                  <button
                    type="button"
                    disabled={laeuft}
                    onClick={() => {
                      // Nach dem letzten Arbeitsschritt geht es in Ausführen mit dem Messen weiter (Variante B).
                      const danach = () => gehe(naechster());
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

            // ----- Ausführen: Messen (Variante B)
            if (art === "start-kontrolle") {
              const teile = [
                { titel: "Prüfen ohne Spannung", text: "Das machst du allein." },
                { titel: "Freigabe", text: "Deine Trainer:in prüft die Anlage." },
                { titel: "Prüfen unter Spannung", text: "Mit Trainer:in: erst messen, dann die Funktion. Am Ende das Prüfprotokoll." },
              ];
              return (
                <Uebergabe {...k} ton="weiss" icon={ClipboardCheck} frage="Dein Aufbau ist fertig" hinweis="Jetzt misst du. Das passiert in diesen Teilen:">
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
                    Messen beginnen <ArrowRight aria-hidden="true" />
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
                return (
                  <Karte {...k} frage="Du darfst zuschalten" hinweis="Deine Trainer:in hat die Anlage geprüft und bleibt dabei.">
                    <Freigegeben am={f.zuschalten_freigegeben_am} />
                    <button type="button" onClick={() => gehe(naechster())} className={GROSS}>
                      Weiter messen <ArrowRight aria-hidden="true" />
                    </button>
                  </Karte>
                );
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
                  <button type="button" disabled={!hat || laeuft} onClick={() => phaseAbschliessen("ausfuehren", "start-deuten")} className={GROSS}>
                    Weiter <ArrowRight aria-hidden="true" />
                  </button>
                </Karte>
              );
            }

            // ----- Kontrollieren: Messwerte deuten (Variante B)
            if (art === "start-deuten") {
              return (
                <Uebergabe {...k} ton="weiss" icon={ClipboardCheck} frage={TEXTE.deuten.startTitel} hinweis={TEXTE.deuten.startText}>
                  <button type="button" onClick={() => gehe(naechster())} className={cn(GROSS, "mt-4")}>
                    Los geht&apos;s <ArrowRight aria-hidden="true" />
                  </button>
                </Uebergabe>
              );
            }
            if (art === "deuten") {
              const p = PRUEFPUNKTE.find((x) => x.id === id);
              const nr = PRUEFPUNKTE.findIndex((x) => x.id === id);
              const letzter = nr === PRUEFPUNKTE.length - 1;
              const text = deutungen[id] ?? "";
              return (
                <Karte
                  {...k}
                  frage={p?.titel ?? "Prüfpunkt"}
                  hinweis={TEXTE.deuten.frage}
                  zurueck={nr > 0 ? () => gehe(`deuten:${PRUEFPUNKTE[nr - 1].id}`) : undefined}
                >
                  <label className="flex flex-col gap-2">
                    <span className="sr-only">Deine Deutung zu {p?.titel}</span>
                    <textarea
                      rows={4}
                      maxLength={1000}
                      value={text}
                      placeholder={TEXTE.deuten.platzhalter}
                      onChange={(ev) => setDeutungen((d) => ({ ...d, [id]: ev.target.value }))}
                      className={cn("rounded-zeile border border-line bg-white px-4 py-3 text-[15px] text-ink placeholder:text-ink-subtle", FOKUS)}
                    />
                  </label>
                  {!text.trim() && <p className="text-sm text-ink-muted">{TEXTE.deuten.leer}</p>}
                  <button
                    type="button"
                    disabled={laeuft || !text.trim()}
                    onClick={() =>
                      aktion(
                        () => deutungSpeichern(daten.fieldJobId, id, text),
                        () => (letzter ? phaseAbschliessen("kontrollieren", "uebergabe-selbst") : gehe(naechster()))
                      )
                    }
                    className={GROSS}
                  >
                    {letzter ? "Kontrolle fertig" : "Weiter"} <ArrowRight aria-hidden="true" />
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
              // Farbe nur für „du bist dran“ (Lime-Badge) und die Trainer:in (Praxis-Coral); Peer neutral mit Symbol und Name.
              const ton = rolle === "trainer" ? "praxis" : "weiss";
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
                    {rolle === "peer" && (
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-subtle px-2.5 py-0.5 text-xs font-bold text-ink">
                        <Users className="size-3.5" aria-hidden="true" /> Peer
                      </span>
                    )}
                    {rolle === "selbst" && (
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-lime px-2.5 py-0.5 text-xs font-bold text-on-lime">
                        <UserRound className="size-3.5" aria-hidden="true" /> Du bist dran
                      </span>
                    )}
                    {kriterium.ko && <span className="w-fit rounded-full bg-white/70 px-2.5 py-0.5 text-xs font-semibold text-ink">{TEXTE.bewerten.ko}</span>}
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
                <Uebergabe {...k} ton="lime" icon={UserRound} frage="Jetzt bist du dran" hinweis="Schätze selbst ein, wie gut dir der Auftrag gelungen ist. Das ist freiwillig. Danach kann eine Person aus deiner Gruppe einschätzen, zum Schluss deine Trainer:in.">
                  <div className="flex flex-col gap-3">
                    <button type="button" onClick={() => gehe(naechster())} className={cn(GROSS, "bg-ink text-white hover:brightness-110")}>
                      Ich schätze mich ein <ArrowRight aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => gehe("uebergabe-peer")} className={cn(SEKUNDAER, "sm:self-center")}>
                      Überspringen
                    </button>
                  </div>
                </Uebergabe>
              );
            }
            if (art === "uebergabe-peer") {
              return (
                <Uebergabe {...k} ton="weiss" icon={Users} frage="Gib das Gerät einer Person aus deiner Gruppe" hinweis="Sie schaut sich deine Arbeit an und schätzt sie ein. Das ist freiwillig. Danach bekommst du das Gerät zurück.">
                  <div className="flex flex-col gap-3">
                    <button type="button" onClick={() => gehe(naechster())} className={GROSS}>
                      Ich bin dran <ArrowRight aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => gehe("uebergabe-trainer")} className={cn(SEKUNDAER, "sm:self-center")}>
                      Überspringen
                    </button>
                  </div>
                </Uebergabe>
              );
            }
            if (art === "uebergabe-trainer") {
              return (
                <Uebergabe {...k} ton="praxis" icon={KeyRound} frage="Jetzt ist deine Trainer:in dran" hinweis="Gib das Gerät deiner Trainer:in. Sie schätzt ein und bestätigt am Ende mit ihrem Codewort.">
                  <div className="flex flex-col gap-3">
                    {/* Deutungen der Messwerte vor der Einschätzung (Variante B, SR-64) */}
                    {(f.deutungen ?? []).length > 0 && (
                      <section aria-labelledby="deutungen-trainer" className="flex flex-col gap-2 rounded-zeile bg-white p-4">
                        <h3 id="deutungen-trainer" className="text-base font-bold text-ink">So deutet die lernende Person ihre Messwerte</h3>
                        <dl className="flex flex-col gap-2">
                          {PRUEFPUNKTE.map((p) => {
                            const d = (f.deutungen ?? []).find((x) => x.id === p.id);
                            return (
                              <div key={p.id} className="flex flex-col gap-0.5">
                                <dt className="text-sm font-semibold text-ink-muted">{p.titel}</dt>
                                <dd className="text-[15px] break-words text-ink">{d?.text ?? "–"}</dd>
                              </div>
                            );
                          })}
                        </dl>
                      </section>
                    )}
                    <button type="button" onClick={() => gehe(naechster())} className={GROSS}>
                      Ich bin die Trainer:in <ArrowRight aria-hidden="true" />
                    </button>
                  </div>
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
              // Nur abgegebene Einschätzungen vergleichen; Selbst und Peer sind freiwillig.
              const unterschiede = BOGEN.filter(
                (x) => (selbst[x.id] !== undefined && selbst[x.id] !== trainer[x.id]) || (peer[x.id] !== undefined && peer[x.id] !== trainer[x.id])
              );
              return (
                <Karte
                  {...k}
                  frage={ko ? TEXTE.bewerten.nacharbeitTitel : "Gut gemacht"}
                  hinweis={
                    ko
                      ? TEXTE.bewerten.nacharbeitText
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
                  <button type="button" onClick={() => gehe("reflexion")} className={GROSS}>
                    Weiter <ArrowRight aria-hidden="true" />
                  </button>
                </Karte>
              );
            }

            // Reflexion: eigene Karte, Pflicht (SR-90, 09.11.2026), auch nach einem K.-o.
            if (art === "reflexion") {
              const ko = BOGEN.some((x) => x.ko && (f.einschaetzung?.trainer ?? {})[x.id] === 0);
              const genug = naechstesMal.trim().length >= 3;
              const anfang = (t: string) => setNaechstesMal((v) => `${v.trim() ? `${v.trimEnd()}\n` : ""}${t.replace(/\s*…$/, "")} `);
              return (
                <Karte {...k} frage={TEXTE.reflexion.titel} hinweis={TEXTE.reflexion.frage} zurueck={() => gehe("ergebnis")}>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Satzanfänge">
                    {TEXTE.reflexion.anfaenge.map((t) => (
                      <button key={t} type="button" onClick={() => anfang(t)} className={cn("rounded-full bg-subtle px-3 py-1.5 text-sm font-semibold text-ink hover:bg-brand-tint", FOKUS)}>
                        {t}
                      </button>
                    ))}
                  </div>
                  <label className="flex flex-col gap-2">
                    <span className="sr-only">{TEXTE.reflexion.frage}</span>
                    <textarea
                      rows={5}
                      maxLength={2000}
                      value={naechstesMal}
                      placeholder={TEXTE.reflexion.platzhalter}
                      onChange={(ev) => setNaechstesMal(ev.target.value)}
                      className={cn("rounded-zeile border border-line bg-white px-4 py-3 text-[16px] text-ink placeholder:text-ink-subtle", FOKUS)}
                    />
                  </label>
                  <p className="text-sm text-ink-muted">{TEXTE.reflexion.hinweis}</p>
                  <button
                    type="button"
                    disabled={laeuft || !genug}
                    onClick={() =>
                      aktion(
                        () => abschliessen(daten.fieldJobId, naechstesMal),
                        (ergebnis) => {
                          if (ergebnis !== "ko") {
                            vibrieren();
                            return gehe("fertig");
                          }
                          // K.-o.: derselbe Praxisauftrag beginnt neu bei Informieren (SR-89, SR-64).
                          setWerte({ selbst: {}, peer: {}, trainer: {} });
                          setDeutungen({});
                          setNaechstesMal("");
                          gehe("auftrag", "Neuer Durchlauf");
                        }
                      )
                    }
                    className={GROSS}
                  >
                    {ko ? TEXTE.bewerten.nacharbeitButton : "Auftrag abschließen"} {ko ? <ArrowRight aria-hidden="true" /> : <Check aria-hidden="true" />}
                  </button>
                </Karte>
              );
            }

            // ----- Ende: Zusammenfassung (SR-90)
            if (art === "fertig") {
              return <Fertig daten={daten} zurueck={zurueck} />;
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
  "phase:ausfuehren": "Ausführen begonnen",
  "phase:kontrollieren": "Aufbau, Messungen und Prüfprotokoll fertig",
  "phase:bewerten": "Messwerte gedeutet",
  "zurueck:planen": "Zurück zum Plan",
  "gate:plan": "Plan freigegeben (Codewort der Trainer:in)",
  "gate:zuschalten": "Inbetriebnahme freigegeben (Codewort der Trainer:in)",
  "einschaetzung:selbst": "Selbsteinschätzung abgegeben",
  "einschaetzung:peer": "Peer-Einschätzung abgegeben",
  "einschaetzung:trainer": "Trainer-Einschätzung mit Codewort bestätigt",
  "abgeschlossen:angerechnet": "Auftrag abgeschlossen",
  "abgeschlossen:ko": "Auftrag abgeschlossen, K.-o.-Kriterium nicht erfüllt",
  "ko:informieren": "K.-o.-Kriterium nicht erfüllt, neuer Durchlauf ab Informieren",
  "abgeschlossen:ohne_trainer": "Auftrag abgeschlossen",
};

function Fertig({ daten, zurueck }: { daten: PraxisflowDaten; zurueck: { href: string; label: string } }) {
  const f = daten.fortschritt;
  const kontrolle = new Set((f.kontrolle ?? []).map((e) => e.id));
  const namen = (art: string) => daten.dateien.filter((d) => d.art === art).map((d) => d.dateiname);
  const e = f.einschaetzung ?? {};
  // Letzter K.-o.-Durchlauf zum Vergleich (SR-90).
  const letzterKo = (f.durchlaeufe ?? []).at(-1);
  const vorher = letzterKo?.einschaetzung?.trainer
    ? { durchlauf: letzterKo.nr, werte: letzterKo.einschaetzung.trainer, bezug: "Trainer:in" }
    : undefined;
  return (
    <div className="flex flex-col gap-4">
      {/* Abschluss: ein klarer nächster Schritt (SR-90); Drucken/PDF bleibt Nebenaktion in der Akte. */}
      <section aria-labelledby="frage" className="flex flex-col gap-4 rounded-karte bg-progress p-5 text-white shadow-card md:p-7 print:hidden">
        <div className="flex items-center gap-4">
          <PartyPopper className="size-8 shrink-0" aria-hidden="true" />
          <div className="flex flex-col">
            <h2 id="frage" tabIndex={-1} className="font-heading text-[26px] leading-tight outline-none md:text-[32px]">
              Auftrag fertig!
            </h2>
            <p className="text-[15px]">Unten steht alles, was du gemacht hast.</p>
          </div>
        </div>
        {daten.naechster ? (
          <Link href={`/praxistag/${daten.naechster.fieldJobId}`} className={cn(GROSS, "sm:w-auto sm:self-start")}>
            Weiter zum nächsten Auftrag: {daten.naechster.titel} <ArrowRight aria-hidden="true" />
          </Link>
        ) : (
          <Link href={zurueck.href} className={cn(GROSS, "sm:w-auto sm:self-start")}>
            Zurück zum {zurueck.label} <ArrowRight aria-hidden="true" />
          </Link>
        )}
      </section>
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
        deutungen={PRUEFPUNKTE.map((p) => ({ titel: p.titel, text: (f.deutungen ?? []).find((d) => d.id === p.id)?.text ?? null }))}
        freigabe={ZEIT(f.zuschalten_freigegeben_am)}
        kriterien={BOGEN}
        einschaetzungen={[
          { name: "Du", werte: e.selbst ?? {} },
          { name: "Peer", werte: e.peer ?? {} },
          { name: "Trainer:in", werte: e.trainer ?? {} },
        ]}
        vorher={vorher}
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
      {/* Fortschritt innerhalb der Phase: klein und neutral (Phasenwechsel bekommt den großen Moment). */}
      {nr && von && von > 1 ? (
        <div className="-mt-3 h-1.5 w-full overflow-hidden rounded-full bg-progress-track" aria-hidden="true">
          <div className="h-full rounded-full bg-progress" style={{ width: `${Math.round((nr / von) * 100)}%` }} />
        </div>
      ) : null}
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
const ALS_NAECHSTES: Record<Exclude<Phase, "informieren">, string> = {
  planen: "Du zeichnest deinen Plan und schreibst Material, Werkzeuge und Arbeitsschritte auf.",
  entscheiden: "Deine Trainer:in schaut sich deinen Plan an und gibt ihn frei.",
  ausfuehren: "Du baust auf und misst danach.",
  kontrollieren: "Du deutest deine Messwerte.",
  bewerten: "Ihr schätzt deine Arbeit ein.",
};

/** Ende einer Phase: immer derselbe große Moment (dunkelgrün, Häkchen, was als Nächstes kommt, ein Knopf). */
function PhasenMoment({ von, onWeiter }: { von: Phase; onWeiter: () => void }) {
  const nr = PHASEN.findIndex((p) => p.id === von);
  const naechste = PHASEN[nr + 1];
  return (
    <section aria-labelledby="frage" className="flex flex-col items-center gap-4 rounded-karte bg-progress p-7 text-center text-white shadow-card md:p-10">
      <span className="flex size-20 items-center justify-center rounded-full bg-white/15" aria-hidden="true">
        <Check className="size-10" strokeWidth={3} />
      </span>
      <span className="text-sm font-semibold text-white/85">Phase {nr + 1} von {PHASEN.length}</span>
      <h2 id="frage" tabIndex={-1} className="font-heading text-[36px] leading-none outline-none md:text-[44px]">
        {phasenName(von)} geschafft
      </h2>
      {naechste && naechste.id !== "informieren" && (
        <p className="max-w-sm text-[16px] text-white/90">
          Als Nächstes: <strong>{naechste.name}</strong>. {ALS_NAECHSTES[naechste.id]}
        </p>
      )}
      <button type="button" onClick={onWeiter} className={cn(GROSS, "max-w-sm")}>
        {naechste ? `Weiter zu ${naechste.name}` : "Weiter"} <ArrowRight aria-hidden="true" />
      </button>
    </section>
  );
}

/** Freigabe der Trainer:in: schlichte Bestätigung auf der Karte, kein großer Moment. */
function Freigegeben({ am }: { am: string | undefined }) {
  return (
    <p className="flex items-center gap-2 rounded-zeile bg-subtle px-4 py-3 text-[15px] font-semibold text-ink">
      <ShieldCheck className="size-5 shrink-0 text-progress" aria-hidden="true" />
      Freigegeben mit dem Codewort der Trainer:in{am ? `, ${jetztInBerlin(new Date(am)).slice(11, 16)} Uhr` : ""}
    </p>
  );
}
