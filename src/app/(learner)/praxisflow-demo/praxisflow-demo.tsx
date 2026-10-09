"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronLeft, ClipboardCheck, Hammer, ListOrdered, Search, Star, UserCheck } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Bewertung } from "@/components/praxisflow/bewertung";
import { CodewortGate } from "@/components/praxisflow/codewort-gate";
import { DemoLeiste } from "@/components/praxisflow/demo-leiste";
import { FotoVorschau } from "@/components/praxisflow/foto-vorschau";
import { Hinweis, InstruktionKarte, ListeBlock, MaterialBlock, Zusatzinfos } from "@/components/praxisflow/instruktion-karte";
import { PhasenAnzeige } from "@/components/praxisflow/phasen-anzeige";
import { SchritteCheckliste } from "@/components/praxisflow/schritte-checkliste";
import { SchritteEditor } from "@/components/praxisflow/schritte-editor";
import { FOKUS, PRIMAER, SEKUNDAER, TEXT } from "@/components/praxisflow/stile";
import {
  DEMO_AUFTRAG,
  DEMO_CODEWORT,
  DEMO_SCHRITTE,
  PHASEN,
  PUNKTE_SKALA,
  SPEICHER_PRAEFIX,
  TEXTE,
  type PhaseId,
} from "@/lib/praxisflow-daten";
import {
  alleErledigt,
  bewertungVollstaendig,
  codewortKorrekt,
  demoZuruecksetzen,
  erledigtBereinigen,
  erledigtUmschalten,
  kontrollierbarUmschalten,
  kontrollierbareSchritte,
  planVollstaendig,
  schrittBearbeiten,
  schrittHinzufuegen,
  schrittLoeschen,
  schrittVerschieben,
  startZustand,
  zustandLaden,
  zustandSpeichern,
  type DemoZustand,
  type Schritt,
} from "@/lib/praxisflow-logik";
import { cn } from "@/lib/utils";

function speicher(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function neueId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

const pruefen = (eingabe: string) => codewortKorrekt(eingabe, DEMO_CODEWORT);
const nichts = () => () => {};

type Zurueck = { href: string; label: string };

/**
 * Rendert den Flow erst im Browser: der Stand liegt im localStorage, der
 * Server kennt ihn nicht. So gibt es keinen Hydration-Unterschied.
 */
export function PraxisflowDemo({ zurueck }: { zurueck: Zurueck }) {
  const imBrowser = useSyncExternalStore(nichts, () => true, () => false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href={zurueck.href}
          className={cn(
            "-ml-2 inline-flex min-h-11 w-fit items-center gap-1 rounded-lg px-2 text-sm font-medium text-muted-foreground hover:bg-eco-green/10 hover:text-eco-deep-green",
            FOKUS
          )}
        >
          <ChevronLeft className="size-4" aria-hidden="true" /> {zurueck.label}
        </Link>
        <PageHeader title={DEMO_AUFTRAG.titel} />
      </div>
      {imBrowser ? <Flow /> : <p className="text-sm text-muted-foreground">Demo wird geladen …</p>}
    </div>
  );
}

function Flow() {
  const [zustand, setZustand] = useState<DemoZustand>(() => zustandLaden(speicher(), SPEICHER_PRAEFIX, DEMO_SCHRITTE));
  // Erhöht sich beim Zurücksetzen, damit Eingabefelder und Foto neu starten.
  const [durchlauf, setDurchlauf] = useState(0);

  useEffect(() => {
    zustandSpeichern(speicher(), SPEICHER_PRAEFIX, zustand);
  }, [zustand]);

  const aktuell = PHASEN.findIndex((p) => p.id === zustand.phase);

  function zuPhase(phase: PhaseId) {
    setZustand((z) => ({ ...z, phase, erledigt: erledigtBereinigen(z.erledigt, z.schritte) }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function schritte(aendern: (s: Schritt[]) => Schritt[]) {
    setZustand((z) => {
      const neu = aendern(z.schritte);
      const noten = Object.fromEntries(Object.entries(z.noten).filter(([id]) => neu.some((s) => s.id === id)));
      return { ...z, schritte: neu, erledigt: erledigtBereinigen(z.erledigt, neu), noten };
    });
  }

  function zuruecksetzen() {
    demoZuruecksetzen(speicher(), SPEICHER_PRAEFIX);
    setZustand(startZustand(DEMO_SCHRITTE));
    setDurchlauf((d) => d + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const kontrollierbar = kontrollierbareSchritte(zustand.schritte);

  return (
    <>
      <DemoLeiste kennzeichnung={DEMO_AUFTRAG.kennzeichnung} text={DEMO_AUFTRAG.banner} onZuruecksetzen={zuruecksetzen} />
      <PhasenAnzeige phasen={PHASEN} aktuell={aktuell} />

      <div key={`${durchlauf}-${zustand.phase}`} className="flex flex-col gap-6">
        {zustand.phase === "analyse" && (
          <InstruktionKarte
            icon={Search}
            titel="Analyse"
            instruktion={TEXTE.analyse.instruktion}
            definitionOfDone={TEXTE.analyse.definitionOfDone}
          >
            <div className="flex flex-col gap-1.5">
              <h3 className="text-sm font-semibold text-eco-deep-green">Arbeitsauftrag</h3>
              <p className={TEXT}>{TEXTE.analyse.arbeitsauftrag}</p>
            </div>
            <MaterialBlock eintraege={TEXTE.analyse.material} />
            <Zusatzinfos eintraege={TEXTE.analyse.zusatzinfos} />
            <button type="button" onClick={() => zuPhase("planen")} className={PRIMAER}>
              Weiter zu Planen
              <ArrowRight aria-hidden="true" />
            </button>
          </InstruktionKarte>
        )}

        {zustand.phase === "planen" && (
          <InstruktionKarte
            icon={ListOrdered}
            titel="Planen"
            instruktion={TEXTE.planen.instruktion}
            definitionOfDone={TEXTE.planen.definitionOfDone}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <ListeBlock titel="Material" eintraege={TEXTE.planen.material} />
              <ListeBlock titel="Werkzeug" eintraege={TEXTE.planen.werkzeug} />
            </div>
            <SchritteEditor
              schritte={zustand.schritte}
              onHinzufuegen={(text) => schritte((l) => schrittHinzufuegen(l, text, neueId()))}
              onBearbeiten={(id, text) => schritte((l) => schrittBearbeiten(l, id, text))}
              onLoeschen={(id) => schritte((l) => schrittLoeschen(l, id))}
              onVerschieben={(id, richtung) => schritte((l) => schrittVerschieben(l, id, richtung))}
              onKontrollierbar={(id) => schritte((l) => kontrollierbarUmschalten(l, id))}
            />
            <button
              type="button"
              onClick={() => zuPhase("entscheiden")}
              disabled={!planVollstaendig(zustand.schritte)}
              className={PRIMAER}
            >
              Plan zur Abnahme geben
              <ArrowRight aria-hidden="true" />
            </button>
          </InstruktionKarte>
        )}

        {zustand.phase === "entscheiden" && (
          <InstruktionKarte icon={UserCheck} titel="Entscheiden" instruktion={TEXTE.entscheiden.instruktion}>
            <Hinweis icon={UserCheck}>{TEXTE.entscheiden.hinweisAbnahme}</Hinweis>
            <ListeBlock titel="Dein Plan" eintraege={zustand.schritte.map((s, i) => `${i + 1}. ${s.text}${s.kontrollierbar ? " (kontrollierbar)" : ""}`)} />
            <CodewortGate
              id="gate-entscheiden"
              label={TEXTE.codewort.label}
              buttonText="Plan freigeben"
              fehlerText={TEXTE.codewort.falsch}
              pruefen={pruefen}
              onFreigabe={() => zuPhase("durchfuehren")}
            />
          </InstruktionKarte>
        )}

        {zustand.phase === "durchfuehren" && (
          <InstruktionKarte icon={Hammer} titel="Durchführen" instruktion={TEXTE.durchfuehren.instruktion}>
            <SchritteCheckliste
              schritte={zustand.schritte}
              erledigt={zustand.erledigt}
              onUmschalten={(id) => setZustand((z) => ({ ...z, erledigt: erledigtUmschalten(z.erledigt, id) }))}
              hinweisStandard={TEXTE.durchfuehren.nichtWeiterStandard}
            />
            <Hinweis icon={UserCheck}>{TEXTE.durchfuehren.hinweisGate}</Hinweis>
            <CodewortGate
              id="gate-durchfuehren"
              label={TEXTE.codewort.label}
              buttonText="Durchführung freigeben"
              aktiv={alleErledigt(zustand.schritte, zustand.erledigt)}
              gesperrtText={TEXTE.codewort.gesperrt}
              fehlerText={TEXTE.codewort.falsch}
              pruefen={pruefen}
              onFreigabe={() => zuPhase("kontrolle")}
            />
            <button type="button" onClick={() => zuPhase("planen")} className={cn(SEKUNDAER, "sm:self-start")}>
              <ArrowLeft aria-hidden="true" />
              Zurück zu Planen
            </button>
          </InstruktionKarte>
        )}

        {zustand.phase === "kontrolle" && (
          <InstruktionKarte icon={ClipboardCheck} titel="Kontrolle" instruktion={TEXTE.kontrolle.instruktion}>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-sm font-semibold text-eco-deep-green">Dokumentation</h3>
              <p className={TEXT}>{TEXTE.kontrolle.dokumentation}</p>
            </div>
            <Hinweis icon={ClipboardCheck}>{TEXTE.kontrolle.hinweisProtokoll}</Hinweis>
            <FotoVorschau hinweis={TEXTE.kontrolle.hinweisFoto} />
            <CodewortGate
              id="gate-kontrolle"
              label={TEXTE.codewort.label}
              buttonText="Kontrolle freigeben"
              fehlerText={TEXTE.codewort.falsch}
              pruefen={pruefen}
              onFreigabe={() => zuPhase("bewerten")}
            />
            <button type="button" onClick={() => zuPhase("durchfuehren")} className={cn(SEKUNDAER, "sm:self-start")}>
              <ArrowLeft aria-hidden="true" />
              Zurück zu Durchführen
            </button>
          </InstruktionKarte>
        )}

        {zustand.phase === "bewerten" && (
          <InstruktionKarte icon={Star} titel="Bewerten" instruktion={TEXTE.bewerten.instruktion}>
            <Bewertung
              schritte={kontrollierbar}
              skala={PUNKTE_SKALA}
              noten={zustand.noten}
              onNote={(id, punkte) => setZustand((z) => ({ ...z, noten: { ...z.noten, [id]: punkte } }))}
              vollstaendig={bewertungVollstaendig(zustand.schritte, zustand.noten, PUNKTE_SKALA)}
              abgeschlossen={zustand.bewertungAbgeschlossen}
              onAbschliessen={() => setZustand((z) => ({ ...z, bewertungAbgeschlossen: true }))}
              ohneSchritteText={TEXTE.bewerten.ohneKontrollierbare}
              statusLabel={TEXTE.bewerten.status}
              statusText={TEXTE.bewerten.statusText}
            />
          </InstruktionKarte>
        )}
      </div>
    </>
  );
}
