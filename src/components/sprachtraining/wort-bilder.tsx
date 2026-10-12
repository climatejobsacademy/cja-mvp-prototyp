// Sprachtraining-Demo (SR-24/SR-31, VORLÄUFIG, nur demo): einfache, selbst
// gezeichnete Abbildungen zu den Fachbegriffen (keine fremden Bilder).
// Schaltzeichen nach üblicher Darstellung: Diode = Dreieck mit Strich (Strich
// = Kathode), Transistor (NPN) mit Basis, Kollektor, Emitter und Pfeil am
// Emitter. Farben über currentColor bzw. Tokens, damit sie zum Thema passen.

import type { BildId } from "@/lib/sprachtraining-daten";

const LINIE = { stroke: "currentColor", strokeWidth: 3, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const TEXT = { fill: "currentColor", fontSize: 13, fontWeight: 600, fontFamily: "inherit" };

/** Diode als Bauteil: schwarzer Körper, heller Ring auf der Kathodenseite. */
function DiodeBauteil({ y = 40, beschriften = false }: { y?: number; beschriften?: boolean }) {
  return (
    <g>
      <line x1="20" y1={y} x2="95" y2={y} {...LINIE} />
      <line x1="185" y1={y} x2="260" y2={y} {...LINIE} />
      <rect x="95" y={y - 18} width="90" height="36" rx="10" className="fill-ink" />
      <rect x="160" y={y - 18} width="12" height="36" className="fill-white" opacity="0.9" />
      {beschriften && (
        <>
          <text x="20" y={y - 14} {...TEXT}>Anode</text>
          <text x="208" y={y - 14} {...TEXT}>Kathode</text>
          <text x="166" y={y + 38} textAnchor="middle" {...TEXT} fontWeight={400}>Ring</text>
        </>
      )}
    </g>
  );
}

/** Schaltzeichen der Diode: Dreieck zeigt in Durchlassrichtung, Strich = Kathode. */
function DiodeSymbol({ y = 110, beschriften = true }: { y?: number; beschriften?: boolean }) {
  return (
    <g>
      <line x1="40" y1={y} x2="115" y2={y} {...LINIE} />
      <path d={`M115 ${y - 22} L155 ${y} L115 ${y + 22} Z`} {...LINIE} />
      <line x1="155" y1={y - 22} x2="155" y2={y + 22} {...LINIE} />
      <line x1="155" y1={y} x2="240" y2={y} {...LINIE} />
      {beschriften && (
        <>
          <text x="40" y={y - 12} {...TEXT}>A</text>
          <text x="228" y={y - 12} {...TEXT}>K</text>
        </>
      )}
    </g>
  );
}

function Pfeil({ x1, x2, y, className }: { x1: number; x2: number; y: number; className: string }) {
  const rechts = x2 > x1;
  const spitze = rechts ? `M${x2 - 10} ${y - 7} L${x2} ${y} L${x2 - 10} ${y + 7}` : `M${x2 + 10} ${y - 7} L${x2} ${y} L${x2 + 10} ${y + 7}`;
  return (
    <g className={className}>
      <line x1={x1} y1={y} x2={x2} y2={y} {...LINIE} />
      <path d={spitze} {...LINIE} />
    </g>
  );
}

function TransistorSymbol({ beschriften = true }: { beschriften?: boolean }) {
  return (
    <g>
      <circle cx="150" cy="80" r="52" {...LINIE} strokeWidth={2} opacity="0.5" />
      {/* Basis */}
      <line x1="60" y1="80" x2="130" y2="80" {...LINIE} />
      <line x1="130" y1="50" x2="130" y2="110" {...LINIE} strokeWidth={4} />
      {/* Kollektor */}
      <line x1="130" y1="65" x2="172" y2="40" {...LINIE} />
      <line x1="172" y1="40" x2="172" y2="12" {...LINIE} />
      {/* Emitter mit Pfeil nach außen (NPN) */}
      <line x1="130" y1="95" x2="172" y2="120" {...LINIE} />
      <path d="M156 121 L172 120 L165 106" {...LINIE} />
      <line x1="172" y1="120" x2="172" y2="148" {...LINIE} />
      {beschriften && (
        <>
          <text x="60" y="70" {...TEXT}>B · Basis</text>
          <text x="182" y="22" {...TEXT}>C · Kollektor</text>
          <text x="182" y="146" {...TEXT}>E · Emitter</text>
        </>
      )}
    </g>
  );
}

export function WortBild({ id, className }: { id: BildId; className?: string }) {
  const titel: Record<BildId, string> = {
    diode: "Diode als Bauteil und als Schaltzeichen",
    durchlass: "Strom fließt in Durchlassrichtung von der Anode zur Kathode",
    sperr: "In Sperrrichtung fließt kein Strom",
    kathode: "Diode mit Anode und Kathode, der Ring zeigt die Kathode",
    transistor: "Schaltzeichen eines Transistors",
    anschluesse: "Transistor mit Basis, Kollektor und Emitter",
  };
  return (
    <svg viewBox="0 0 280 160" role="img" aria-label={titel[id]} className={className}>
      <title>{titel[id]}</title>
      {id === "diode" && (
        <>
          <DiodeBauteil y={40} />
          <DiodeSymbol y={115} />
        </>
      )}
      {id === "kathode" && (
        <>
          <DiodeBauteil y={60} beschriften />
          <DiodeSymbol y={130} beschriften={false} />
        </>
      )}
      {id === "durchlass" && (
        <>
          <DiodeSymbol y={70} />
          <Pfeil x1={70} x2={210} y={125} className="text-self" />
          <text x="140" y="152" textAnchor="middle" {...TEXT}>Strom fließt ✓</text>
        </>
      )}
      {id === "sperr" && (
        <>
          <DiodeSymbol y={70} />
          <Pfeil x1={210} x2={70} y={125} className="text-praxis-text" />
          <g className="text-praxis-text">
            <line x1="128" y1="112" x2="152" y2="138" {...LINIE} />
            <line x1="152" y1="112" x2="128" y2="138" {...LINIE} />
          </g>
          <text x="140" y="155" textAnchor="middle" {...TEXT}>kein Strom</text>
        </>
      )}
      {(id === "transistor" || id === "anschluesse") && <TransistorSymbol beschriften={id === "anschluesse"} />}
    </svg>
  );
}
